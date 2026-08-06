/**
 * Generic Reconciliations Service
 */
import { IS_MOCK, API_ROUTES } from './api/config';
import { api } from './api/client';
import {
  MOCK_RECONCILIATION_JOBS,
  MOCK_RECONCILIATIONS,
} from '../mocks/reconciliations';
import type { Reconciliation, ReconciliationRecord } from '../types';

export const reconciliationsService = {
  /**
   * List all configured reconciliation jobs/modules
   */
  async getReconciliationJobs(): Promise<Reconciliation[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_RECONCILIATION_JOBS);
    }
    return api.get<Reconciliation[]>(API_ROUTES.RECONCILIATIONS.LIST);
  },

  /**
   * Fetch full record & dataset details for a reconciliation
   */
  async getReconciliation(id: string): Promise<ReconciliationRecord | undefined> {
    if (IS_MOCK) {
      const found = MOCK_RECONCILIATIONS.find((r) => r.id === id);
      return Promise.resolve(found || MOCK_RECONCILIATIONS[0]);
    }
    return api.get<ReconciliationRecord>(API_ROUTES.RECONCILIATIONS.DETAIL(id));
  },

  /**
   * Update metadata or configuration of a reconciliation
   */
  async updateReconciliation(
    id: string,
    patch: Partial<ReconciliationRecord>
  ): Promise<ReconciliationRecord> {
    if (IS_MOCK) {
      const idx = MOCK_RECONCILIATIONS.findIndex((r) => r.id === id);
      if (idx !== -1) {
        MOCK_RECONCILIATIONS[idx] = { ...MOCK_RECONCILIATIONS[idx], ...patch };
        return Promise.resolve(MOCK_RECONCILIATIONS[idx]);
      }
      return Promise.resolve({ ...MOCK_RECONCILIATIONS[0], ...patch });
    }
    return api.patch<ReconciliationRecord>(API_ROUTES.RECONCILIATIONS.DETAIL(id), patch);
  },

  /**
   * Trigger rule engine execution for a reconciliation
   */
  async runReconciliation(id: string): Promise<{ matched: number; breaks: number; rate: number }> {
    if (IS_MOCK) {
      return Promise.resolve({ matched: 14, breaks: 4, rate: 92.4 });
    }
    return api.post(API_ROUTES.RECONCILIATIONS.RUN(id));
  },
};
