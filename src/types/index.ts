// ── User & Period ──
export interface User {
  id: string;
  name: string;
  role: string;
  initials: string;
  email: string;
}

export interface Period {
  label: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
}

// ── Generic API Wrappers ──
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface Entity {
  id: string;
  name: string;
  code: string;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'SGD';
  timezone: string;
  chartOfAccountsPrefix: string;
  revenue?: number;
}

export interface Account {
  id: string;
  name: string;
  kind: 'checking' | 'savings' | 'card' | 'gateway';
  balance: number;
  currency: string;
  status: 'connected' | 'error' | 'pending';
  lastSync?: string;
}

// ── Reconciliation Job / Record ──
export type ReconciliationType =
  | 'payments'
  | 'bank'
  | 'ap'
  | 'payroll'
  | 'inventory'
  | 'subledger'
  | 'ar-reconciliation'
  | 'intercompany';

export interface Reconciliation {
  id: string;
  name: string;
  category: 'bank-cash' | 'ar' | 'ar-reconciliation' | 'intercompany' | 'ap' | 'bank' | string;
  status: 'active' | 'draft' | 'paused' | 'Needs resolution' | 'Review ready' | 'In progress' | 'Not run yet';
  matchRate: number;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  exceptionsCount: number;
  autoResolvedCount: number;
  unreconciledAmount?: number;
  owner?: string;
  due?: string;
  cadence?: string;
  lastRun?: string;
  sourceLeft: string;
  sourceRight: string;
  arFinished?: boolean;
}

export interface ReconciliationRecord {
  id: string;
  name: string;
  type: ReconciliationType;
  owner: string;
  createdAt: string;
  lastRun?: {
    at: string;
    rate: number;
    matched: number;
    breaks: number;
    history: number[];
  };
  rules?: Rule[];
  records?: GenericRecord[];
  confirmed?: MatchPair[];
  rejected?: MatchPair[];
  arRules?: ARRule[];
  arData?: ARData;
  arManualMatches?: ARManualMatch[];
  arResolved?: Record<string, ARResolution>;
  arUnreconciled?: ARUnreconciledGroup[];
  arFinished?: { at: string; by: string; hash: string };
  arBankChargePolicy?: BankChargePolicy;
  tax?: TaxEntry[];
  threeway?: ThreeWayEntry[];
  glControlBalances?: GLControlBalance;
}

export interface BankChargePolicy {
  autoPostMaxAmount: number;
  debitAccount: string;
  creditAccount: string;
}

export interface TaxEntry {
  jurisdiction: string;
  accrued: number;
  paid: number;
  variance: number;
  status?: string;
}

export interface ThreeWayEntry {
  poNumber: string;
  invoiceAmount: number;
  receivingAmount: number;
  vendor?: string;
  status: 'matched' | 'variance' | string;
}

export interface GLControlBalance {
  glAccount?: string;
  account?: string;
  glBalance: number;
  subledgerBalance: number;
  variance: number;
}

// ── Generic Matching Engine Specs ──
export type RuleType = 'exact' | 'fuzzy' | 'one-to-many' | 'date-window';

export interface Rule {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  priority?: number;
  confidence?: number | null;
  fieldMap?: Record<string, string>;
  toleranceAmount?: number;
  windowDays?: number;
}

export interface GenericRecord {
  id: string;
  side: 'left' | 'right' | 'A' | 'B';
  date: string;
  reference: string;
  counterparty: string;
  amount: number;
  currency: string;
  memo?: string;
  status: 'matched' | 'unmatched' | 'break';
}

export interface MatchPair {
  id: string;
  leftId: string;
  rightId: string;
  ruleName: string;
  confidence: number;
  matchedAt: string;
  matchedBy: 'system' | 'user';
}

// ── Accounts Receivable (AR Engine) Specs ──
export type ARExceptionType =
  | 'bank_charge'
  | 'partial_payment'
  | 'short_pay'
  | 'over_pay'
  | 'fx_variance'
  | 'unidentified_remittance'
  | 'multi_invoice_break'
  | 'Short-Pay'
  | 'No Payment Received';

export interface ARRule {
  id: string;
  name?: string;
  kind: string;
  phase?: number | string;
  priority?: number;
  confidence?: number | null;
  cond?: any;
  bankField?: string;
  secondSource?: string;
  secondField?: string;
  matchMode?: string;
  enabled: boolean;
  score?: number;
  order?: number;
  config?: Record<string, any>;
}

export interface Customer {
  id?: string;
  customerId?: string;
  customerCode?: string;
  companyName?: string;
  gstin?: string;
  pan?: string;
  upiHandle?: string;
  bankIfsc?: string;
  bankAccountNumber?: string;
  name?: string;
  code?: string;
  creditLimit?: number;
  outstandingBalance?: number;
}

export interface Invoice {
  id?: string;
  id_alias?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId?: string;
  issueDate?: string;
  effectiveBalance?: number;
  invNo?: string;
  custName?: string;
  code?: string;
  date?: string;
  dueDate?: string;
  amt?: number;
  paidAmt?: number;
  openAmt?: number;
  status?: string;
  customerCode?: string;
  customerName?: string;
  totalAmount?: number;
  amountPaid?: number;
  balance?: number;
}

export interface BankStatement {
  id?: string;
  bankTxnId?: string;
  payerName?: string;
  narration?: string;
  bankReferenceNumber?: string;
  clearingStatus?: string;
  isBankCharge?: boolean;
  explicitFee?: number;
  date?: string;
  transactionDate?: string;
  desc?: string;
  ref?: string;
  amt?: number;
  status?: string;
  txnId?: string;
  description?: string;
  amount?: number;
  utr?: string;
}

// ── Real backend shapes (app/reconciliation/schema.py) - M2/M3 run results ──
export interface RunOut {
  run_id: string;
  definition_id: string;
  run_no: string;
  period_start: string | null;
  period_end: string | null;
  status: 'DRAFT' | 'QUEUED' | 'RUNNING' | 'COMPUTED' | 'APPROVED' | 'CLOSED' | 'FAILED' | string;
  volume: number | null;
  matched_count: number | null;
  exception_count: number | null;
  matched_value_minor: number | null;
  exception_value_minor: number | null;
  unapplied_minor: number | null;
  prepared_by: string | null;
  reviewed_by: string | null;
  signed_at: string | null;
  run_hash: string | null;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  started_at: string;
}

export interface AllocationOut {
  allocation_id: string;
  invoice_id: string;
  /** Real, human-readable invoice number - invoice_id is the internal row UUID. */
  invoice_number: string | null;
  /** The invoice's own total (what was owed) - not necessarily what this allocation actually applied. */
  invoice_amount_minor: number | null;
  payment_id: string;
  /** The payment's own total received - may exceed or fall short of allocated_minor (overpayment/short-pay/fee cases). */
  payment_amount_minor: number | null;
  bank_txn_id: string | null;
  /** Real bank reference/UTR from the source file - bank_txn_id is the internal generated row UUID. */
  bank_reference: string | null;
  /** How much of this payment was actually applied to this invoice. */
  allocated_minor: number;
}

export interface MatchGroupOut {
  match_group_id: string;
  run_id: string;
  match_type: 'EXACT' | 'TOLERANCE' | 'PARTIAL' | 'SUBSET_SUM' | 'MANY_TO_ONE' | 'ONE_TO_MANY' | 'MANUAL' | string;
  /** The ALLOCATION-phase rule that committed this match group. */
  rule_id: string | null;
  /** The CUSTOMER_LOCK-phase rule that identified the payment's customer. */
  locked_by_rule_id: string | null;
  confidence: number | null;
  status: 'AUTO_MATCHED' | 'SUGGESTED' | 'CONFIRMED' | 'REJECTED' | string;
  reason: string | null;
  created_at: string;
  allocations: AllocationOut[];
}

export interface ExceptionOut {
  exception_id: string;
  run_id: string;
  exception_no: string | null;
  exception_type:
    | 'SHORT_PAY' | 'OVERPAYMENT' | 'UNAPPLIED_CASH' | 'TIMING_DIFFERENCE' | 'GL_VARIANCE'
    | 'DUPLICATE' | 'MULTIPLE_INVOICE_MATCH' | 'DOUBLE_COLLISION' | 'SUSPENSE' | 'BANK_CHARGE'
    | 'GATEWAY_VARIANCE' | 'NO_PAYMENT' | string;
  bank_txn_id: string | null;
  invoice_id: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  customer_code?: string | null;
  invoice_number?: string | null;
  bank_reference?: string | null;
  payer_name?: string | null;
  narration?: string | null;
  discrepancy_minor: number | null;
  amount_minor?: number | null;
  reason_code: string | null;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'AUTO_RESOLVED' | 'DEFERRED' | 'WRITTEN_OFF' | 'ADJUSTED' | 'CARRIED_FORWARD' | string;
  resolution_outcome: 'WRITEOFF' | 'KEEPOPEN' | 'DISPUTE' | 'JOURNAL' | 'ON_ACCOUNT' | 'MANUAL_MATCH' | string | null;
  resolver_id: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  detail: Record<string, unknown> | null;
  match_group_id: string | null;
}

/** A run's open/unapplied payments - the candidate pool the
 * No-Payment-Received resolution panel offers to manually match against an
 * open invoice (app/reconciliation/schema.py's PaymentOut). */
export interface PaymentOut {
  payment_id: string;
  bank_txn_id: string;
  bank_reference: string | null;
  customer_id: string | null;
  customer_name: string | null;
  total_received_minor: number;
  /** Cash from this payment not yet applied to any invoice. */
  unapplied_minor: number;
  created_at: string;
}

export interface ResolveNoPaymentPayload {
  payment_ids: string[];
  note?: string;
}

/** A customer's open invoices - the Suspense resolution panel's invoice
 * picker, once a candidate customer is selected
 * (app/reconciliation/schema.py's InvoiceSummaryOut). */
export interface InvoiceSummaryOut {
  invoice_id: string;
  invoice_number: string;
  balance_due_minor: number;
  due_date: string;
  customer_id: string;
  customer_name: string;
}

export interface ResolveSuspensePayload {
  customer_id: string;
  invoice_ids?: string[];
  note?: string;
}

export interface ExceptionUpdatePayload {
  status?: string;
  resolution_outcome?: string;
  resolution_notes?: string;
}

export interface AREngineResult {
  matchRate?: number;
  autoMatched?: number;
  manualMatches?: number;
  unresolvedCount?: number;
  customers?: Customer[];
  invoices?: Invoice[];
  statements?: BankStatement[];
  bankStatements?: BankStatement[];
  payments?: any[];
  matches?: any[];
  shortPays?: any[];
  overpays?: any[];
  unmatchedInvoices?: any[];
  unapplied?: any[];
  exceptions?: any[];
  glControlBalances?: GLControlBalance;
  glMismatch?: any;
  rate?: number;
  matchedVal?: number;
  unmatchedVal?: number;
  breakVal?: number;
  breaks?: any[];
  matched?: any[];
  perRule?: any[];
  autoGroups?: any[];
  gatewaySettlements?: GatewaySettlement[];
}

export interface MatchResult {
  invoiceId: string;
  invoiceNum: string;
  customer: string;
  amount: number;
  paymentId: string;
  ruleId?: string;
  ruleName?: string;
  note?: string;
  overage?: number;
  paid?: number;
  shortage?: number;
}

export interface GatewaySettlement {
  settlementId: string;
  gateway: string;
  transactionId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  settlementDate: string;
  customer?: string;
  matched: boolean;
}

export interface ARBankRecord {
  id: string;
  date: string;
  desc: string;
  ref: string;
  amt: number;
  status?: string;
  matchedInvoiceIds?: string[];
  bankCharge?: number;
}

export interface ARInvoiceRecord {
  id: string;
  invNo: string;
  custName: string;
  code: string;
  date: string;
  dueDate?: string;
  amt: number;
  paidAmt?: number;
  openAmt: number;
  status?: string;
}

export interface ARData {
  bank: ARBankRecord[];
  inv: ARInvoiceRecord[];
}

export interface ARManualMatch {
  id: string;
  bankId: string;
  invIds: string[];
  confidence: number;
  score: number;
  ruleName: string;
  suggestedAt: string;
  approved?: boolean;
}

export interface ARResolution {
  type: 'writeoff' | 'bank_charge' | 'fx_diff' | 'partial';
  amount: number;
  account: string;
  notes?: string;
  resolvedAt: string;
  resolvedBy: string;
}

export interface ARUnreconciledGroup {
  id: string;
  bankId: string;
  reason: string;
  flaggedAt: string;
}

// ── Ingestion Data Hub Specs ──
export const DATA_HUB_CATEGORIES = [
  'Bank Statements',
  'General Ledger',
  'AR Sub-ledger',
  'AP Sub-ledger',
  'Gateway Settlements',
  'Customer Master',
] as const;

export type DataHubCategory = (typeof DATA_HUB_CATEGORIES)[number];

export interface Job {
  id: string;
  source: string;
  category?: string;
  kind: 'auto' | 'manual';
  format: 'CSV' | 'XLS' | 'OFX' | 'PDF';
  rows: number;
  errors: number;
  status: 'success' | 'failed' | 'running';
  at: string;
}

export interface FieldMapping {
  id: string;
  ledger: string;
  required: boolean;
}

export interface StagingRow {
  id: string;
  jobId: string;
  sourceLabel: string;
  category: string;
  status: 'mapped' | 'error';
  rowData: Record<string, any>;
  txnId: string;
  date: string;
  reference: string;
  counterparty: string;
  description: string;
  amount: number;
  currency: string;
}

// ── Reports & Audit Specs ──
export interface ReportRun {
  id?: string;
  runId?: string;
  recId?: string;
  date?: string;
  volume?: number;
  matched?: number;
  matchRate?: number;
  unappliedCash?: number;
  exceptions?: number;
  status?: string;
  preparedBy?: string;
  reviewedBy?: string | null;
  signedAt?: string | null;
  matchedValue?: number;
  exceptionValue?: number;
  currency?: string;
  title?: string;
  type?: string;
  generatedAt?: string;
  user?: string;
}

export interface AuditEntry {
  id: string;
  at?: string;
  category?: string;
  timestamp?: string;
  user: string;
  action: string;
  details?: string;
  detail?: string;
  ip?: string;
}

export interface ReportSummary {
  period: string;
  totalVolume: number;
  matchedValue: number;
  unmatchedValue: number;
  matchRatePercent: number;
  exceptionCount: number;
  auditTrailCount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  ip: string;
}

// ── Intercompany Specs ──
export interface ICTransaction {
  id: string;
  fromEntityId?: string;
  toEntityId?: string;
  category?: string;
  description?: string;
  arAmount?: number;
  apAmount?: number;
  delta?: number;
  eliminated?: boolean;
  entityA?: string;
  entityB?: string;
  refA?: string;
  refB?: string;
  ref?: string;
  amountA?: number;
  amountB?: number;
  currency?: string;
  status: 'matched' | 'mismatch' | 'pending' | 'unmatched';
}

export interface TransferPricingEntry {
  id?: string;
  from?: string;
  to?: string;
  category?: string;
  agreed?: boolean | number;
  actual?: number;
  status?: string;
  entityFrom?: string;
  entityTo?: string;
  method?: string;
  markupPercent?: number;
}

export interface IntercompanyEntity {
  id: string;
  name: string;
  code: string;
  openPayables: number;
  openReceivables: number;
  variance: number;
  status: 'balanced' | 'discrepancy';
}

export interface IntercompanyTxn {
  id: string;
  entityA: string;
  entityB: string;
  refA: string;
  refB: string;
  amountA: number;
  amountB: number;
  currency?: string;
  status: 'matched' | 'mismatch' | 'pending' | 'unmatched';
}
