/**
 * DataHub Service Layer
 * 
 * Covers all DataHub API endpoints split into four domain groups:
 *  - dataSourceService  — Data Source registration & lookup
 *  - fieldMappingService — Active mappings fetch, save version + preview
 *  - ingestionJobService — File upload, list, poll, retry
 *  - recordsService      — List, get, and patch live canonical job records
 * 
 * Includes client-side in-memory caching to prevent duplicate API requests.
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
  IngestionJobOut,
  CanonicalRecordOut,
  CanonicalRecordUpdate,
} from '../types/datahub';

let dataSourcesCache: DataSourceOut[] | null = null;
const fieldMappingsCache = new Map<string, FieldMappingOut[]>(); // keyed by stream, not source_id
const canonicalFieldsCache = new Map<string, string[]>(); // keyed by stream; changes rarely
const canonicalRecordsCache = new Map<string, CanonicalRecordOut[]>();

export function clearDataHubServiceCaches() {
  dataSourcesCache = null;
  fieldMappingsCache.clear();
  canonicalFieldsCache.clear();
  canonicalRecordsCache.clear();
}

// ── Data Sources ────────────────────────────────────────────────────────────────

export const dataSourceService = {
  /**
   * GET /data-sources — List all registered data sources.
   * Caches in-memory to prevent duplicate network calls across components.
   */
  async list(forceRefresh = false): Promise<DataSourceOut[]> {
    if (dataSourcesCache && !forceRefresh) {
      return Promise.resolve(dataSourcesCache);
    }
    const res = await api.get<DataSourceOut[]>(API_ROUTES.DATA_HUB.DATA_SOURCES);
    dataSourcesCache = res;
    return res;
  },

  /**
   * GET /data-sources/{source_id} — Get details for a single data source.
   */
  async get(sourceId: string): Promise<DataSourceOut> {
    return api.get<DataSourceOut>(API_ROUTES.DATA_HUB.DATA_SOURCE(sourceId));
  },

  /**
   * POST /data-sources — Create a new data source.
   */
  async create(payload: { entity_id: string; name: string; kind: string }): Promise<DataSourceOut> {
    dataSourcesCache = null;
    return api.post<DataSourceOut>(API_ROUTES.DATA_HUB.DATA_SOURCES, payload);
  },

  /**
   * PATCH /data-sources/{source_id} — Update data source details.
   */
  async update(sourceId: string, payload: { name?: string; status?: string }): Promise<DataSourceOut> {
    dataSourcesCache = null;
    return api.patch<DataSourceOut>(API_ROUTES.DATA_HUB.DATA_SOURCE(sourceId), payload);
  },
};

// ── Field Mappings ──────────────────────────────────────────────────────────────
// Global per stream (BANK/INVOICE/CUSTOMER/...) - shared by every data source/
// entity/org ingesting that stream, not configured per data source.

export const fieldMappingService = {
  /**
   * GET /field-mappings/{stream}
   * Caches in-memory per stream.
   */
  async getActive(stream: string, forceRefresh = false): Promise<FieldMappingOut[]> {
    if (fieldMappingsCache.has(stream) && !forceRefresh) {
      return Promise.resolve(fieldMappingsCache.get(stream)!);
    }
    const res = await api.get<FieldMappingOut[]>(API_ROUTES.DATA_HUB.FIELD_MAPPINGS(stream));
    fieldMappingsCache.set(stream, res);
    return res;
  },

  /**
   * POST /field-mappings/{stream}/versions
   * Create a new mapping version for a stream. Affects every data source
   * that ingests this stream, not just the one the caller had in mind.
   */
  async createVersion(stream: string, mappings: FieldMappingIn[]): Promise<FieldMappingOut[]> {
    fieldMappingsCache.delete(stream);
    return api.post<FieldMappingOut[]>(API_ROUTES.DATA_HUB.FIELD_MAPPING_VERSIONS(stream), { mappings });
  },

  /**
   * POST /field-mappings/{stream}/preview
   * Dry-run mapping rules against sample rows.
   */
  async preview(stream: string, payload: MappingPreviewRequest): Promise<MappingPreviewResponse> {
    return api.post<MappingPreviewResponse>(API_ROUTES.DATA_HUB.FIELD_MAPPING_PREVIEW(stream), payload);
  },

  /**
   * POST /field-mappings/{stream}/resolve-headers
   * Checks a file's actual column headers against the stream's active
   * mapping - which are already understood vs. genuinely new for this file.
   */
  async resolveHeaders(stream: string, columns: string[]): Promise<ResolvedHeader[]> {
    const res = await api.post<{ results: ResolvedHeader[] }>(
      API_ROUTES.DATA_HUB.FIELD_MAPPING_RESOLVE(stream),
      { columns }
    );
    return res.results;
  },

  /**
   * GET /field-mappings/{stream}/canonical-fields
   * The real per-stream mapping-target list. Caches in-memory per stream.
   */
  async canonicalFields(stream: string, forceRefresh = false): Promise<string[]> {
    if (canonicalFieldsCache.has(stream) && !forceRefresh) {
      return Promise.resolve(canonicalFieldsCache.get(stream)!);
    }
    const res = await api.get<{ canonical_fields: string[] }>(
      API_ROUTES.DATA_HUB.FIELD_MAPPING_CANONICAL_FIELDS(stream)
    );
    canonicalFieldsCache.set(stream, res.canonical_fields);
    return res.canonical_fields;
  },
};

// ── Ingestion Jobs ──────────────────────────────────────────────────────────────

export const ingestionJobService = {
  /**
   * GET /ingestion-jobs — List all ingestion jobs.
   */
  async list(params?: { source_id?: string; status?: string; limit?: number; offset?: number }): Promise<IngestionJobOut[]> {
    return api.get<IngestionJobOut[]>(API_ROUTES.DATA_HUB.INGESTION_JOBS, { params });
  },

  /**
   * GET /ingestion-jobs/{job_id} — Poll job execution status.
   */
  async get(jobId: string): Promise<IngestionJobOut> {
    return api.get<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOB(jobId));
  },

  /**
   * POST /ingestion-jobs — Upload a CSV file for direct background ingestion.
   */
  async upload(sourceId: string, stream: string, file: File): Promise<IngestionJobOut> {
    const form = new FormData();
    form.append('source_id', sourceId);
    form.append('stream', stream);
    form.append('format', 'CSV');
    form.append('file', file);

    // Invalidate canonical records cache when new job uploaded
    canonicalRecordsCache.clear();
    return api.postForm<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOBS, form);
  },

  /**
   * POST /ingestion-jobs/{job_id}/retry — Reset and retry a FAILED job.
   */
  async retry(jobId: string): Promise<IngestionJobOut> {
    return api.post<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOB_RETRY(jobId));
  },
};

// ── Canonical Records (Data Explorer) ─────────────────────────────────────────────

export const recordsService = {
  /**
   * GET /records?stream={stream}&entity_id={entity_id}
   * Fetches canonical records for an entity by stream (BANK, INVOICE, CUSTOMER, LEDGER).
   */
  async listByStream(
    stream: string,
    entityId: string,
    params?: { valid?: boolean; search?: string; limit?: number; offset?: number },
    forceRefresh = false
  ): Promise<CanonicalRecordOut[]> {
    const cacheKey = `stream_${stream}_entity_${entityId}_valid_${params?.valid ?? 'all'}`;

    if (canonicalRecordsCache.has(cacheKey) && !forceRefresh && !params?.search) {
      return Promise.resolve(canonicalRecordsCache.get(cacheKey)!);
    }

    const res = await api.get<CanonicalRecordOut[]>(
      API_ROUTES.DATA_HUB.RECORDS_BY_STREAM,
      { params: { stream, entity_id: entityId, ...params } as Record<string, string | number | boolean | undefined> }
    );

    if (!params?.search) {
      canonicalRecordsCache.set(cacheKey, res);
    }
    return res;
  },

  /**
   * GET /ingestion-jobs/{job_id}/records
   * Caches in-memory by jobId + valid filter.
   */
  async list(
    jobId: string,
    params?: { valid?: boolean; search?: string; limit?: number; offset?: number },
    forceRefresh = false
  ): Promise<CanonicalRecordOut[]> {
    const cacheKey = `${jobId}_valid_${params?.valid ?? 'all'}`;

    if (canonicalRecordsCache.has(cacheKey) && !forceRefresh && !params?.search) {
      return Promise.resolve(canonicalRecordsCache.get(cacheKey)!);
    }

    const res = await api.get<CanonicalRecordOut[]>(
      API_ROUTES.DATA_HUB.INGESTION_JOB_RECORDS(jobId),
      { params: params as Record<string, string | number | boolean | undefined> }
    );

    if (!params?.search) {
      canonicalRecordsCache.set(cacheKey, res);
    }
    return res;
  },

  /**
   * GET /ingestion-jobs/{job_id}/records/{record_id}
   */
  async get(jobId: string, recordId: string): Promise<CanonicalRecordOut> {
    return api.get<CanonicalRecordOut>(
      API_ROUTES.DATA_HUB.INGESTION_JOB_RECORD(jobId, recordId)
    );
  },

  /**
   * PATCH /ingestion-jobs/{job_id}/records/{record_id} — Correct a record's canonical fields.
   */
  async patch(
    jobId: string,
    recordId: string,
    update: CanonicalRecordUpdate
  ): Promise<CanonicalRecordOut> {
    canonicalRecordsCache.clear();
    return api.patch<CanonicalRecordOut>(
      API_ROUTES.DATA_HUB.INGESTION_JOB_RECORD(jobId, recordId),
      update
    );
  },
};

// Backwards-compatibility alias for stagingService
export const stagingService = recordsService;
