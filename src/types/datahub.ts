/**
 * DataHub API Types — aligned with backend API spec
 * These are the canonical TypeScript interfaces for all DataHub endpoints.
 */

// ── Enums & Primitives ──────────────────────────────────────────────────────

export type DataSourceKind = 'BANK_FEED' | 'GATEWAY' | 'ERP' | 'MANUAL_UPLOAD';
export type DataSourceStatus = 'CONNECTED' | 'PENDING' | 'ERROR';
export type IngestionStream = 'BANK' | 'LEDGER' | 'INVOICE' | 'GATEWAY' | 'CUSTOMER';
export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type TransformType =
  | 'NONE'
  | 'TRIM'
  | 'UPPER'
  | 'LOWER'
  | 'CONST'
  | 'TO_MINOR_UNITS'
  | 'NEGATE'
  | 'PARSE_DATE'
  | 'REGEX';

// ── Category → Stream mapping (frontend labels → backend enum) ───────────────

export const STREAM_BY_CATEGORY: Record<string, IngestionStream> = {
  'Bank Statements': 'BANK',
  'General Ledger': 'LEDGER',
  'AR Sub-ledger': 'INVOICE',
  'AP Sub-ledger': 'INVOICE',
  'Gateway Settlements': 'GATEWAY',
  'Customer Master': 'CUSTOMER',
};

// ── Data Sources ─────────────────────────────────────────────────────────────

export interface DataSourceCreate {
  entity_id: string;
  name: string;
  kind: DataSourceKind;
}

export interface DataSourceUpdate {
  name?: string | null;
  status?: DataSourceStatus | null;
}

export interface DataSourceOut {
  source_id: string;
  entity_id: string;
  name: string;
  kind: DataSourceKind;
  status: DataSourceStatus;
}

// ── Field Mappings ────────────────────────────────────────────────────────────

export interface FieldMappingIn {
  source_field: string;
  canonical_field: string;
  transform: TransformType;
  transform_param?: string | null;
}

export interface FieldMappingOut extends FieldMappingIn {
  mapping_id: string;
  source_id: string;
  version: number;
  is_active: boolean;
}

export interface FieldMappingVersionCreate {
  mappings: FieldMappingIn[];
}

// ── Mapping Preview ───────────────────────────────────────────────────────────

export interface MappingPreviewRequest {
  sample_rows: Record<string, unknown>[];
  mappings?: FieldMappingIn[] | null;
}

export interface MappingPreviewRow {
  raw: Record<string, unknown>;
  canonical: Record<string, unknown>;
  issues: string[];
}

export interface MappingPreviewResponse {
  rows: MappingPreviewRow[];
}

// ── Ingestion Jobs ────────────────────────────────────────────────────────────

export interface IngestionJobOut {
  job_id: string;
  source_id: string | null;
  stream: IngestionStream | null;
  file_name: string | null;
  format: string | null;
  status: JobStatus;
  row_count: number;
  error_count: number;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  mapping_version: number | null;
  started_at: string; // ISO DateTime string
  failed_rows?: Record<string, unknown>[] | null;
}

// ── Canonical Records (Direct-to-canonical Data Explorer) ─────────────────────

export interface CanonicalRecordOut {
  record_id?: string;
  staging_id?: string; // Fallback alias
  statement_id?: string;
  invoice_id?: string;
  customer_id?: string;
  job_id?: string;
  source_job_id?: string;
  txn_date?: string | null;
  statement_date?: string | null;
  invoice_date?: string | null;
  bank_reference?: string | null;
  invoice_number?: string | null;
  company_name?: string | null;
  reference?: string | null;
  counterparty?: string | null;
  payer_name?: string | null;
  customer_name?: string | null;
  amount_minor?: number | null;
  total_amount_minor?: number | null;
  amount?: number | null;
  amount_home_minor?: number | null;
  currency?: string | null;
  dr_cr?: string | null;
  raw?: Record<string, unknown>;
  valid?: boolean;
  issues?: string[] | null;
  [key: string]: any;
}

// Alias for backwards compatibility
export type StagingRecordOut = CanonicalRecordOut;
export type StagingRecordUpdate = Record<string, unknown>;
export type CanonicalRecordUpdate = Record<string, unknown>;
