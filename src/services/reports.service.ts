/**
 * Reports, Analytics & Audit Trail Service
 */
import { IS_MOCK, API_ROUTES } from './api/config';
import { api } from './api/client';
import {
  MOCK_REPORT_RUNS,
  MOCK_AUDIT_LOG,
} from '../mocks/reports';
import type { ReportRun, AuditEntry } from '../types';

export const reportsService = {
  /**
   * Fetch historical reconciliation runs summary
   */
  async getReportRuns(): Promise<ReportRun[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_REPORT_RUNS);
    }
    return api.get<ReportRun[]>(API_ROUTES.REPORTS.RUNS);
  },

  /**
   * Fetch matched transaction register
   */
  async getMatchedTransactions(runId?: string): Promise<any[]> {
    if (IS_MOCK) {
      const mockMatched = [
        {
          id: 'M-101',
          runId: 'RUN-20260701-AR001',
          date: '2026-07-01',
          invoiceNum: 'INV/2026/001',
          customer: 'Acme Technologies Pvt Ltd',
          amount: 5000000,
          paymentId: 'PAY-8801',
          matchType: 'Exact Invoice Number Match',
          status: 'Matched',
        },
      ];
      if (runId) {
        return Promise.resolve(
          mockMatched.filter((m: { runId: string }) => m.runId === runId)
        );
      }
      return Promise.resolve(mockMatched);
    }
    return api.get<any[]>(API_ROUTES.REPORTS.MATCHED, { params: { runId } });
  },

  /**
   * Fetch immutable audit log events
   */
  async getAuditLog(): Promise<AuditEntry[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_AUDIT_LOG);
    }
    return api.get<AuditEntry[]>(API_ROUTES.REPORTS.AUDIT_LOG);
  },

  /**
   * Trigger server-side export download (CSV/XLS/PDF)
   */
  async exportReport(kind: 'runs' | 'matched' | 'exceptions', format: 'csv' | 'xls' | 'pdf'): Promise<Blob> {
    if (IS_MOCK) {
      const csvData = "Run ID,Date,Type,Volume,Status\nRUN-20260701-AR001,2026-07-01,AR,14,Under review";
      return Promise.resolve(new Blob([csvData], { type: 'text/csv' }));
    }
    return api.get<Blob>(API_ROUTES.REPORTS.EXPORT(kind, format));
  },
};
