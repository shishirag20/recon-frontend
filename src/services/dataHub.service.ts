/**
 * Ingestion & Data Hub Service
 */
import { IS_MOCK, API_ROUTES } from './api/config';
import { api } from './api/client';
import {
  MOCK_JOBS,
  MOCK_STAGING,
  MOCK_MAPPINGS,
} from '../mocks/data-hub';
import type { Job, StagingRow, FieldMapping } from '../types';

export const dataHubService = {
  /**
   * Fetch data ingestion jobs
   */
  async getJobs(): Promise<Job[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_JOBS);
    }
    return api.get<Job[]>(API_ROUTES.DATA_HUB.JOBS);
  },

  /**
   * Fetch staged raw source data rows
   */
  async getStagingRows(jobId?: string): Promise<StagingRow[]> {
    if (IS_MOCK) {
      if (jobId && jobId !== 'all') {
        return Promise.resolve(
          MOCK_STAGING.filter((r: StagingRow) => r.jobId === jobId)
        );
      }
      return Promise.resolve(MOCK_STAGING);
    }
    return api.get<StagingRow[]>(API_ROUTES.DATA_HUB.STAGING, { params: { jobId } });
  },

  /**
   * Fetch ledger schema field mappings
   */
  async getFieldMappings(): Promise<FieldMapping[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_MAPPINGS);
    }
    return api.get<FieldMapping[]>(API_ROUTES.DATA_HUB.MAPPINGS);
  },

  /**
   * Insert new row into staging
   */
  async insertStagingRow(row: Partial<StagingRow>): Promise<StagingRow> {
    if (IS_MOCK) {
      const newRow: StagingRow = {
        id: `stg-${Date.now()}`,
        jobId: row.jobId || 'job-101',
        sourceLabel: row.sourceLabel || 'Manual Insert',
        category: row.category || 'Bank Statements',
        status: 'mapped',
        rowData: row.rowData || {},
        txnId: row.txnId || `TXN-${Date.now()}`,
        date: row.date || new Date().toISOString().slice(0, 10),
        reference: row.reference || 'REF-NEW',
        counterparty: row.counterparty || 'Sample Counterparty',
        description: row.description || 'Manual entry',
        amount: row.amount || 0,
        currency: 'INR',
      };
      MOCK_STAGING.unshift(newRow);
      return Promise.resolve(newRow);
    }
    return api.post<StagingRow>(API_ROUTES.DATA_HUB.STAGING, row);
  },
};
