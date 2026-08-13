/**
 * Generic Reconciliations Service
 */
import { API_ROUTES } from './api/config';
import { api } from './api/client';
import type { Reconciliation, ReconciliationRecord } from '../types';
import { resolveARDefinitionId } from './ar.service';

/** Maps backend recon_type (e.g. "AR", "AP", "BANK") to frontend category strings */
function mapReconType(recon_type?: string): Reconciliation['category'] {
  switch ((recon_type ?? '').toUpperCase()) {
    case 'AR': return 'ar-reconciliation';
    case 'AP': return 'ap';
    case 'BANK': return 'bank';
    default: return recon_type?.toLowerCase() ?? 'ar-reconciliation';
  }
}

export const reconciliationsService = {
  /**
   * List all configured reconciliation jobs/modules.
   * Maps the backend `DefinitionOut` shape (definition_id, recon_type, cadence…)
   * to the frontend `Reconciliation` interface expected by ReconciliationCard.
   */
  async getReconciliationJobs(): Promise<Reconciliation[]> {
    const raw = await api.get<any[]>(API_ROUTES.RECONCILIATIONS.LIST);
    if (!Array.isArray(raw)) return [];
    return raw.map((d: any): Reconciliation => ({
      id: d.definition_id ?? d.id ?? '',
      name: d.name ?? '',
      category: mapReconType(d.recon_type),
      // Run-derived stats — only available after a COMPUTED run; absent from DefinitionOut
      status: d.status ?? 'Not run yet',
      matchRate: d.match_rate ?? 0,
      totalRows: d.total_rows ?? 0,
      matchedRows: d.matched_rows ?? d.matched_count ?? 0,
      unmatchedRows: d.unmatched_rows ?? 0,
      exceptionsCount: d.exception_count ?? d.exceptions_count ?? 0,
      autoResolvedCount: d.auto_resolved_count ?? 0,
      unreconciledAmount: d.unreconciled_amount ?? undefined,
      // Definition-level metadata
      owner: d.owner_user_id ?? d.owner ?? undefined,
      due: d.due_date ?? d.due ?? undefined,
      cadence: d.cadence ?? undefined,
      lastRun: d.last_run_at ?? d.last_run ?? undefined,
      sourceLeft: d.source_left ?? '',
      sourceRight: d.source_right ?? '',
    }));
  },

  /**
   * Fetch full record & dataset details for a reconciliation
   */
  async getReconciliation(id: string): Promise<ReconciliationRecord | undefined> {
    const validId = await resolveARDefinitionId(id);
    return api.get<ReconciliationRecord>(API_ROUTES.RECONCILIATIONS.DETAIL(validId));
  },

  /**
   * Update metadata or configuration of a reconciliation
   */
  async updateReconciliation(
    id: string,
    patch: Partial<ReconciliationRecord>
  ): Promise<ReconciliationRecord> {
    const validId = await resolveARDefinitionId(id);
    return api.patch<ReconciliationRecord>(API_ROUTES.RECONCILIATIONS.DETAIL(validId), patch);
  },

  /**
   * Trigger rule engine execution for a reconciliation
   */
  async startRun(id: string, periodStart: string, periodEnd: string, lookbackDate?: string): Promise<any> {
    const validId = await resolveARDefinitionId(id);
    return api.post(API_ROUTES.RECONCILIATIONS.RUNS(validId), {
      period_start: periodStart,
      period_end: periodEnd,
      ...(lookbackDate ? { lookback_date: lookbackDate } : {}),
    });
  },

  async getRunStatus(runId: string): Promise<any> {
    return api.get(API_ROUTES.RECONCILIATIONS.RUN_STATUS(runId));
  },

  async retryRun(runId: string): Promise<any> {
    return api.post(API_ROUTES.RECONCILIATIONS.RUN_RETRY(runId));
  },
};
