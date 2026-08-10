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
    RECONCILIATION: (id: string) => `/ar/reconciliations/${id}`,
    RULES: (id: string) => `/ar/reconciliations/${id}/rules`,
    RULE_BY_ID: (id: string, ruleId: string) => `/ar/reconciliations/${id}/rules/${ruleId}`,
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
    RUN: (id: string) => `/reconciliations/${id}/run`,
  },
  // DataHub — Data Sources
  DATA_HUB: {
    DATA_SOURCES: `/data-sources`,
    DATA_SOURCE: (id: string) => `/data-sources/${id}`,
    FIELD_MAPPINGS: (id: string) => `/data-sources/${id}/field-mappings`,
    FIELD_MAPPING_VERSIONS: (id: string) => `/data-sources/${id}/field-mappings/versions`,
    FIELD_MAPPING_PREVIEW: (id: string) => `/data-sources/${id}/field-mappings/preview`,
    INGESTION_JOBS: `/ingestion-jobs`,
    INGESTION_JOB: (id: string) => `/ingestion-jobs/${id}`,
    INGESTION_JOB_RETRY: (id: string) => `/ingestion-jobs/${id}/retry`,
    INGESTION_JOB_RECORDS: (id: string) => `/ingestion-jobs/${id}/records`,
    INGESTION_JOB_RECORD: (jobId: string, recordId: string) => `/ingestion-jobs/${jobId}/records/${recordId}`,
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
