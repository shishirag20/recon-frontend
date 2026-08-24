/**
 * Generic Reconciliations Service
 */
import { API_ROUTES } from './api/config';
import { api } from './api/client';
import type {
  Reconciliation,
  ReconciliationRecord,
  RunOut,
  MatchGroupOut,
  ExceptionOut,
  ExceptionUpdatePayload,
  PaymentOut,
  ResolveNoPaymentPayload,
  InvoiceSummaryOut,
  ResolveSuspensePayload,
} from '../types';
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
  async startRun(id: string, periodStart?: string, periodEnd?: string): Promise<any> {
    const validId = await resolveARDefinitionId(id);
    return api.post(API_ROUTES.RECONCILIATIONS.RUNS(validId), {
      period_start: periodStart || null,
      period_end: periodEnd || null,
    });
  },

  async rerunRun(id: string, periodStart?: string, periodEnd?: string): Promise<any> {
    const validId = await resolveARDefinitionId(id);
    return api.post(API_ROUTES.RECONCILIATIONS.RUN_RERUN(validId), {
      period_start: periodStart || null,
      period_end: periodEnd || null,
    });
  },

  async getRunStatus(runId: string): Promise<any> {
    return api.get(API_ROUTES.RECONCILIATIONS.RUN_STATUS(runId));
  },

  async retryRun(runId: string): Promise<any> {
    return api.post(API_ROUTES.RECONCILIATIONS.RUN_RETRY(runId));
  },

  /**
   * List every run for a definition - backend already orders by
   * started_at DESC, most recent first.
   */
  async listRuns(id?: string): Promise<RunOut[]> {
    const validId = await resolveARDefinitionId(id);
    const raw = await api.get<RunOut[]>(API_ROUTES.RECONCILIATIONS.RUNS(validId));
    return Array.isArray(raw) ? raw : [];
  },

  /**
   * The run the AR workspace should show: the most recent COMPUTED run if
   * one exists (real results to show), otherwise just the most recent run
   * of any status (so an in-progress/failed run is still visible instead
   * of silently falling back to nothing). Null if this definition has
   * never been run at all.
   */
  async getLatestRun(id?: string): Promise<RunOut | null> {
    const runs = await this.listRuns(id);
    if (runs.length === 0) return null;
    return runs.find((r) => r.status === 'COMPUTED') ?? runs[0];
  },

  /**
   * Every match group Phase 2 committed for a run, each with its nested
   * `allocations` - the invoices it settled money against.
   */
  async getMatches(runId: string): Promise<MatchGroupOut[]> {
    const raw = await api.get<MatchGroupOut[]>(API_ROUTES.RECONCILIATIONS.RUN_MATCHES(runId));
    return Array.isArray(raw) ? raw : [];
  },

  /**
   * Every exception a run raised, optionally filtered by status
   * (one of OPEN|INVESTIGATING|RESOLVED|AUTO_RESOLVED|DEFERRED|
   * WRITTEN_OFF|ADJUSTED|CARRIED_FORWARD).
   */
  async getExceptions(runId: string, status?: string): Promise<ExceptionOut[]> {
    const raw = await api.get<ExceptionOut[]>(API_ROUTES.RECONCILIATIONS.RUN_EXCEPTIONS(runId), {
      params: status ? { status_filter: status } : undefined,
    });
    return Array.isArray(raw) ? raw : [];
  },

  /**
   * Resolve or annotate an exception. `resolved_at` is stamped
   * automatically server-side the moment `status` moves away from
   * OPEN/INVESTIGATING - not settable from here.
   */
  async updateException(exceptionId: string, payload: ExceptionUpdatePayload): Promise<ExceptionOut> {
    return api.patch<ExceptionOut>(API_ROUTES.RECONCILIATIONS.EXCEPTION_UPDATE(exceptionId), payload);
  },

  /**
   * Payments with real leftover cash (unapplied_minor > 0) for a run's
   * entity - the candidate pool the No-Payment-Received resolution panel
   * offers to manually match against an open invoice.
   */
  async getOpenPayments(runId: string): Promise<PaymentOut[]> {
    const raw = await api.get<PaymentOut[]>(API_ROUTES.RECONCILIATIONS.RUN_PAYMENTS(runId));
    return Array.isArray(raw) ? raw : [];
  },

  /**
   * Manually matches a NO_PAYMENT exception's invoice to one or more
   * selected open payments - applies real cash, writes a MANUAL match
   * group, and cross-resolves any Suspense exception those payments had.
   */
  async resolveNoPayment(exceptionId: string, payload: ResolveNoPaymentPayload): Promise<ExceptionOut> {
    return api.post<ExceptionOut>(API_ROUTES.RECONCILIATIONS.EXCEPTION_RESOLVE_NO_PAYMENT(exceptionId), payload);
  },

  /**
   * A customer's open invoices - the Suspense resolution panel's invoice
   * picker, once a candidate customer is selected (suggested, from the
   * pool, or picked manually).
   */
  async getOpenInvoicesForCustomer(customerId: string): Promise<InvoiceSummaryOut[]> {
    const raw = await api.get<InvoiceSummaryOut[]>(API_ROUTES.RECONCILIATIONS.CUSTOMER_OPEN_INVOICES(customerId));
    return Array.isArray(raw) ? raw : [];
  },

  /**
   * Every open invoice for a run's entity, across every customer,
   * optionally filtered by invoice number / customer name - the Suspense
   * resolution panel's "match to a different invoice" fallback.
   */
  async getOpenInvoicesForRun(runId: string, search?: string): Promise<InvoiceSummaryOut[]> {
    const raw = await api.get<InvoiceSummaryOut[]>(API_ROUTES.RECONCILIATIONS.RUN_OPEN_INVOICES(runId), {
      params: search ? { search } : undefined,
    });
    return Array.isArray(raw) ? raw : [];
  },

  /**
   * Manually matches a SUSPENSE exception's payment to a confirmed
   * customer and (optionally) specific open invoices of theirs.
   */
  async resolveSuspense(exceptionId: string, payload: ResolveSuspensePayload): Promise<ExceptionOut> {
    return api.post<ExceptionOut>(API_ROUTES.RECONCILIATIONS.EXCEPTION_RESOLVE_SUSPENSE(exceptionId), payload);
  },
};
