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
  lastRun: string;
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
  confidence?: number;
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
  confidence?: number;
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
export interface Job {
  id: string;
  source: string;
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
