/**
 * API Service Configuration & Endpoint Registry
 */

export const IS_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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
  // Ingestion & Data Hub
  DATA_HUB: {
    JOBS: `/data-hub/jobs`,
    STAGING: `/data-hub/staging`,
    MAPPINGS: `/data-hub/mappings`,
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
