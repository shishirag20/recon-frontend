/**
 * DataHub Service Layer
 * 
 * Covers all 15 DataHub API endpoints split into four domain groups:
 *  - dataSourceService  — Data Source registration & lookup
 *  - fieldMappingService — Active mappings fetch + preview
 *  - ingestionJobService — File upload, list, poll, retry, promote
 *  - stagingService      — List, get, and patch staging records
 * 
 * Includes client-side in-memory caching to prevent duplicate API requests.
 */
import { API_ROUTES } from './api/config';
import { api } from './api/client';
import type {
  DataSourceOut,
  FieldMappingOut,
  MappingPreviewRequest,
  MappingPreviewResponse,
  IngestionJobOut,
  StagingRecordOut,
  StagingRecordUpdate,
} from '../types/datahub';

let dataSourcesCache: DataSourceOut[] | null = null;
const fieldMappingsCache = new Map<string, FieldMappingOut[]>();
const stagingRecordsCache = new Map<string, StagingRecordOut[]>();

export function clearDataHubServiceCaches() {
  dataSourcesCache = null;
  fieldMappingsCache.clear();
  stagingRecordsCache.clear();
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
};

// ── Field Mappings ──────────────────────────────────────────────────────────────

export const fieldMappingService = {
  /**
   * GET /data-sources/{source_id}/field-mappings
   * Caches in-memory per source_id.
   */
  async getActive(sourceId: string, forceRefresh = false): Promise<FieldMappingOut[]> {
    if (fieldMappingsCache.has(sourceId) && !forceRefresh) {
      return Promise.resolve(fieldMappingsCache.get(sourceId)!);
    }
    const res = await api.get<FieldMappingOut[]>(API_ROUTES.DATA_HUB.FIELD_MAPPINGS(sourceId));
    fieldMappingsCache.set(sourceId, res);
    return res;
  },

  /**
   * POST /data-sources/{source_id}/field-mappings/preview
   * Dry-run mapping rules against sample rows.
   */
  async preview(sourceId: string, payload: MappingPreviewRequest): Promise<MappingPreviewResponse> {
    return api.post<MappingPreviewResponse>(API_ROUTES.DATA_HUB.FIELD_MAPPING_PREVIEW(sourceId), payload);
  },
};

// ── Ingestion Jobs ──────────────────────────────────────────────────────────────

export const ingestionJobService = {
  /**
   * GET /ingestion-jobs — List all ingestion and promotion jobs.
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
   * POST /ingestion-jobs — Upload a CSV file for background ingestion.
   */
  async upload(sourceId: string, stream: string, file: File): Promise<IngestionJobOut> {
    const form = new FormData();
    form.append('source_id', sourceId);
    form.append('stream', stream);
    form.append('format', 'CSV');
    form.append('file', file);

    // Invalidate staging cache when new job uploaded
    stagingRecordsCache.clear();
    return api.postForm<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOBS, form);
  },

  /**
   * POST /ingestion-jobs/{job_id}/retry — Reset and retry a FAILED job.
   */
  async retry(jobId: string): Promise<IngestionJobOut> {
    return api.post<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOB_RETRY(jobId));
  },

  /**
   * POST /ingestion-jobs/{job_id}/promote — Promote staged records to canonical tables.
   */
  async promote(jobId: string): Promise<IngestionJobOut> {
    return api.post<IngestionJobOut>(API_ROUTES.DATA_HUB.INGESTION_JOB_PROMOTE(jobId));
  },
};

// ── Staging Records ─────────────────────────────────────────────────────────────

export const stagingService = {
  /**
   * GET /ingestion-jobs/{job_id}/staging-records
   * Caches in-memory by jobId + valid filter.
   */
  async list(
    jobId: string,
    params?: { valid?: boolean; search?: string; limit?: number; offset?: number },
    forceRefresh = false
  ): Promise<StagingRecordOut[]> {
    const cacheKey = `${jobId}_valid_${params?.valid ?? 'all'}`;

    if (stagingRecordsCache.has(cacheKey) && !forceRefresh && !params?.search) {
      return Promise.resolve(stagingRecordsCache.get(cacheKey)!);
    }

    const res = await api.get<StagingRecordOut[]>(API_ROUTES.DATA_HUB.INGESTION_JOB_STAGING(jobId), {
      params: params as Record<string, string | number | boolean | undefined>,
    });

    if (!params?.search) {
      stagingRecordsCache.set(cacheKey, res);
    }
    return res;
  },

  /**
   * PATCH /staging-records/{staging_id} — Correct a staging record's canonical fields.
   * Clears stagingRecordsCache on edit to ensure fresh data.
   */
  async patch(stagingId: string, update: StagingRecordUpdate): Promise<StagingRecordOut> {
    stagingRecordsCache.clear();
    return api.patch<StagingRecordOut>(API_ROUTES.DATA_HUB.STAGING_RECORD(stagingId), update);
  },
};
