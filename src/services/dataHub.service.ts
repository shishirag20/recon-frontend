/**
 * DataHub Service Layer
 * 
 * Covers all DataHub API endpoints split into four domain groups:
 *  - dataSourceService  — Data Source registration & lookup
 *  - fieldMappingService — Active mappings fetch, save (full replace) + preview
 *  - ingestionJobService — File upload, list, poll, retry
 *  - recordsService      — List, get, and patch live canonical job records
 * 
 * Includes client-side in-memory caching (using Promises) to prevent duplicate API requests
 * and eliminate race conditions when multiple components request the same data concurrently.
 */
import { API_ROUTES } from './api/config';
import { api } from './api/client';
import type {
  DataSourceOut,
  FieldMappingOut,
  FieldMappingIn,
  MappingPreviewRequest,
  MappingPreviewResponse,
  ResolvedHeader,
  ResolveMappingResponse,
  IngestionJobOut,
  CanonicalRecordOut,
  CanonicalRecordUpdate,
} from '../types/datahub';

let dataSourcesPromise: Promise<DataSourceOut[]> | null = null;
const fieldMappingsPromises = new Map<string, Promise<FieldMappingOut[]>>();
const canonicalFieldsPromises = new Map<string, Promise<string[]>>();
const canonicalRecordsPromises = new Map<string, Promise<CanonicalRecordOut[]>>();

// Deduplicate concurrent requests for ingestion jobs (React Strict Mode double-fetches)
// but don't cache permanently since jobs are highly dynamic.
let pendingIngestionJobsPromise: Promise<IngestionJobOut[]> | null = null;
let pendingIngestionJobsParamsStr = '';

export function clearDataHubServiceCaches() {
  dataSourcesPromise = null;
  fieldMappingsPromises.clear();
  canonicalFieldsPromises.clear();
  canonicalRecordsPromises.clear();
}

// ── Data Sources ────────────────────────────────────────────────────────────────

export const dataSourceService = {
  async list(forceRefresh = false): Promise<DataSourceOut[]> {
    if (dataSourcesPromise && !forceRefresh) {
      return dataSourcesPromise;
    }
    dataSourcesPromise = api.get<DataSourceOut[]>(API_ROUTES.DATA_HUB.DATA_SOURCES).catch(err => {
      dataSourcesPromise = null;
      throw err;
    });
    return dataSourcesPromise;
  },

  async get(sourceId: string): Promise<DataSourceOut> {
    return api.get<DataSourceOut>(API_ROUTES.DATA_HUB.DATA_SOURCE(sourceId));
  },

  async create(payload: { entity_id: string; name: string; kind: string }): Promise<DataSourceOut> {
    dataSourcesPromise = null;
    return api.post<DataSourceOut>(API_ROUTES.DATA_HUB.DATA_SOURCES, payload);
  },

  async update(sourceId: string, payload: { name?: string; status?: string }): Promise<DataSourceOut> {
    dataSourcesPromise = null;
    return api.patch<DataSourceOut>(API_ROUTES.DATA_HUB.DATA_SOURCE(sourceId), payload);
  },
};

// ── Field Mappings ──────────────────────────────────────────────────────────────

export const fieldMappingService = {
  async getActive(stream: string, forceRefresh = false): Promise<FieldMappingOut[]> {
    if (fieldMappingsPromises.has(stream) && !forceRefresh) {
      return fieldMappingsPromises.get(stream)!;
    }
    const promise = api.get<FieldMappingOut[]>(API_ROUTES.DATA_HUB.FIELD_MAPPINGS(stream)).catch(err => {
      fieldMappingsPromises.delete(stream);
      throw err;
    });
    fieldMappingsPromises.set(stream, promise);
    return promise;
  },

  /**
   * PUT /field-mappings/{stream} — replaces the stream's entire mapping.
   * True replace, not a merge: omit a row and it's gone. No version history
   * (migration 0032) - this is the only representation of the mapping.
   */
  async saveMapping(stream: string, mappings: FieldMappingIn[]): Promise<FieldMappingOut[]> {
    fieldMappingsPromises.delete(stream);
    return api.put<FieldMappingOut[]>(API_ROUTES.DATA_HUB.FIELD_MAPPINGS(stream), { mappings });
  },

  async preview(stream: string, payload: MappingPreviewRequest): Promise<MappingPreviewResponse> {
    return api.post<MappingPreviewResponse>(API_ROUTES.DATA_HUB.FIELD_MAPPING_PREVIEW(stream), payload);
  },

  async resolveHeaders(stream: string, columns: string[]): Promise<ResolvedHeader[]> {
    const res = await api.post<{ results: ResolvedHeader[] }>(
      API_ROUTES.DATA_HUB.FIELD_MAPPING_RESOLVE(stream),
      { columns }
    );
    return res.results;
  },

  async resolveMapping(stream: string, headers: string[]): Promise<ResolveMappingResponse> {
    return api.post<ResolveMappingResponse>(
      API_ROUTES.DATA_HUB.FIELD_MAPPING_RESOLVE_MAPPING(stream),
      { headers }
    );
  },

  async canonicalFields(stream: string, forceRefresh = false): Promise<string[]> {
    if (canonicalFieldsPromises.has(stream) && !forceRefresh) {
      return canonicalFieldsPromises.get(stream)!;
    }
    const promise = api.get<{ canonical_fields: string[] }>(
      API_ROUTES.DATA_HUB.FIELD_MAPPING_CANONICAL_FIELDS(stream)
    ).then(res => res.canonical_fields).catch(err => {
      canonicalFieldsPromises.delete(stream);
      throw err;
    });
    canonicalFieldsPromises.set(stream, promise);
    return promise;
  },
};

// ── Ingestion Jobs ──────────────────────────────────────────────────────────────

export const ingestionJobService = {
  async list(params?: { source_id?: string; status?: string; limit?: number; offset?: number }): Promise<IngestionJobOut[]> {
    const paramsStr = JSON.stringify(params || {});
    
    // Deduplicate identical concurrent inflight requests (e.g. from React Strict Mode double-render)
    if (pendingIngestionJobsPromise && pendingIngestionJobsParamsStr === paramsStr) {
      return pendingIngestionJobsPromise;
    }
    
    const promise = api.get<IngestionJobOut[]>(API_ROUTES.DATA_HUB.INGESTION_JOBS, { params })
      .finally(() => {
        if (pendingIngestionJobsPromise === promise) {
          pendingIngestionJobsPromise = null;
        }
      });
      
    pendingIngestionJobsPromise = promise;
    pendingIngestionJobsParamsStr = paramsStr;
    
    return promise;
  },

  async get(jobId: string): Promise<IngestionJobOut> {
    return api.get<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOB(jobId));
  },

  async upload(sourceId: string, stream: string, file: File): Promise<IngestionJobOut> {
    const form = new FormData();
    form.append('source_id', sourceId);
    form.append('stream', stream);
    form.append('format', 'CSV');
    form.append('file', file);

    canonicalRecordsPromises.clear();
    return api.postForm<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOBS, form);
  },

  async retry(jobId: string): Promise<IngestionJobOut> {
    return api.post<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOB_RETRY(jobId));
  },
};

// ── Canonical Records (Data Explorer) ─────────────────────────────────────────────

export const recordsService = {
  async listByStream(
    stream: string,
    entityId: string,
    params?: { valid?: boolean; search?: string; limit?: number; offset?: number },
    forceRefresh = false
  ): Promise<CanonicalRecordOut[]> {
    const cacheKey = `stream_${stream}_entity_${entityId}_valid_${params?.valid ?? 'all'}`;

    if (canonicalRecordsPromises.has(cacheKey) && !forceRefresh && !params?.search) {
      return canonicalRecordsPromises.get(cacheKey)!;
    }

    const promise = api.get<CanonicalRecordOut[]>(
      API_ROUTES.DATA_HUB.RECORDS_BY_STREAM,
      { params: { stream, entity_id: entityId, ...params } as Record<string, string | number | boolean | undefined> }
    ).catch(err => {
      canonicalRecordsPromises.delete(cacheKey);
      throw err;
    });

    if (!params?.search) {
      canonicalRecordsPromises.set(cacheKey, promise);
    }
    return promise;
  },

  async list(
    jobId: string,
    params?: { valid?: boolean; search?: string; limit?: number; offset?: number },
    forceRefresh = false
  ): Promise<CanonicalRecordOut[]> {
    const cacheKey = `${jobId}_valid_${params?.valid ?? 'all'}`;

    if (canonicalRecordsPromises.has(cacheKey) && !forceRefresh && !params?.search) {
      return canonicalRecordsPromises.get(cacheKey)!;
    }

    const promise = api.get<CanonicalRecordOut[]>(
      API_ROUTES.DATA_HUB.INGESTION_JOB_RECORDS(jobId),
      { params: params as Record<string, string | number | boolean | undefined> }
    ).catch(err => {
      canonicalRecordsPromises.delete(cacheKey);
      throw err;
    });

    if (!params?.search) {
      canonicalRecordsPromises.set(cacheKey, promise);
    }
    return promise;
  },

  async get(jobId: string, recordId: string): Promise<CanonicalRecordOut> {
    return api.get<CanonicalRecordOut>(
      API_ROUTES.DATA_HUB.INGESTION_JOB_RECORD(jobId, recordId)
    );
  },

  async patch(
    jobId: string,
    recordId: string,
    update: CanonicalRecordUpdate
  ): Promise<CanonicalRecordOut> {
    canonicalRecordsPromises.clear();
    return api.patch<CanonicalRecordOut>(
      API_ROUTES.DATA_HUB.INGESTION_JOB_RECORD(jobId, recordId),
      update
    );
  },
};

// Backwards-compatibility alias for stagingService
export const stagingService = recordsService;
