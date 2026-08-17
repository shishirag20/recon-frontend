/**
 * API Service Configuration & Endpoint Registry
 */

export const IS_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const AUTH_TOKEN_KEY =
  import.meta.env.VITE_AUTH_TOKEN_KEY || 'recon_auth_token';

export const API_ROUTES = {
  // Accounts Receivable (AR)
  AR: {
    RECONCILIATION: (id: string) => `/reconciliations/${id}`,
    RULES: (id: string) => `/reconciliations/${id}/rules`,
    RULE_BY_ID: (id: string, ruleId: string) => `/reconciliations/${id}/rules/${ruleId}`,
    INVOICES: `/ar/invoices`,
    BANK_STATEMENTS: `/ar/bank-statements`,
    CUSTOMERS: `/ar/customers`,
    RESOLVE_EXCEPTION: (id: string) => `/ar/exceptions/${id}/resolve`,
    SIGN_OFF: (id: string) => `/ar/reconciliations/${id}/sign-off`,
  },
  // Generic Reconciliations
  RECONCILIATIONS: {
    LIST: `/reconciliations`,
    DETAIL: (id: string) => `/reconciliations/${id}`,
    // Same URL serves both POST (create/enqueue a run) and GET (list runs)
    // on the real backend - /reconciliations/{id}/runs, plural.
    RUNS: (id: string) => `/reconciliations/${id}/runs`,
    RUN_STATUS: (runId: string) => `/runs/${runId}`,
    RUN_RETRY: (runId: string) => `/runs/${runId}/retry`,
    RUN_MATCHES: (runId: string) => `/runs/${runId}/matches`,
    RUN_EXCEPTIONS: (runId: string) => `/runs/${runId}/exceptions`,
    RUN_PAYMENTS: (runId: string) => `/runs/${runId}/payments`,
    EXCEPTION_UPDATE: (exceptionId: string) => `/exceptions/${exceptionId}`,
    EXCEPTION_RESOLVE_NO_PAYMENT: (exceptionId: string) => `/exceptions/${exceptionId}/resolve-no-payment`,
  },
  // DataHub — Data Sources
  DATA_HUB: {
    DATA_SOURCES: `/data-sources`,
    DATA_SOURCE: (id: string) => `/data-sources/${id}`,
    // Global per-stream mapping (BANK/INVOICE/CUSTOMER/...) - shared by every
    // data source/entity/org ingesting that stream, not scoped to one source.
    FIELD_MAPPINGS: (stream: string) => `/field-mappings/${stream}`,
    FIELD_MAPPING_VERSIONS: (stream: string) => `/field-mappings/${stream}/versions`,
    FIELD_MAPPING_PREVIEW: (stream: string) => `/field-mappings/${stream}/preview`,
    FIELD_MAPPING_RESOLVE: (stream: string) => `/field-mappings/${stream}/resolve-headers`,
    FIELD_MAPPING_RESOLVE_MAPPING: (stream: string) => `/field-mappings/${stream}/resolve-mapping`,
    FIELD_MAPPING_CANONICAL_FIELDS: (stream: string) => `/field-mappings/${stream}/canonical-fields`,
    INGESTION_JOBS: `/ingestion-jobs`,
    INGESTION_JOB: (id: string) => `/ingestion-jobs/${id}`,
    INGESTION_JOB_RETRY: (id: string) => `/ingestion-jobs/${id}/retry`,
    INGESTION_JOB_RECORDS: (id: string) => `/ingestion-jobs/${id}/records`,
    INGESTION_JOB_RECORD: (jobId: string, recordId: string) => `/ingestion-jobs/${jobId}/records/${recordId}`,
    RECORDS_BY_STREAM: `/records`,
  },
  // Reports & Audit
  REPORTS: {
    RUNS: `/reports/runs`,
    MATCHED: `/reports/matched`,
    EXCEPTIONS: `/reports/exceptions`,
    AUDIT_LOG: `/reports/audit-log`,
    EXPORT: (kind: string, format: string) => `/reports/export?kind=${kind}&format=${format}`,
  },
  // Intercompany
  INTERCOMPANY: {
    ENTITIES: `/intercompany/entities`,
    TRANSACTIONS: `/intercompany/transactions`,
    RULES: `/intercompany/rules`,
  },
};
