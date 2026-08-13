/**
 * Generic Reconciliations Service
 */
import { API_ROUTES } from './api/config';
import { api } from './api/client';
import type { Reconciliation, ReconciliationRecord } from '../types';
import { resolveARDefinitionId } from './ar.service';

export const reconciliationsService = {
  /**
   * List all configured reconciliation jobs/modules
   */
  async getReconciliationJobs(): Promise<Reconciliation[]> {
    return api.get<Reconciliation[]>(API_ROUTES.RECONCILIATIONS.LIST);
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
  async startRun(id: string, periodStart: string, periodEnd: string): Promise<any> {
    const validId = await resolveARDefinitionId(id);
    return api.post(API_ROUTES.RECONCILIATIONS.RUNS(validId), {
      period_start: periodStart,
      period_end: periodEnd,
    });
  },

  async getRunStatus(runId: string): Promise<any> {
    return api.get(API_ROUTES.RECONCILIATIONS.RUN_STATUS(runId));
  },

  async retryRun(runId: string): Promise<any> {
    return api.post(API_ROUTES.RECONCILIATIONS.RUN_RETRY(runId));
  },
};
