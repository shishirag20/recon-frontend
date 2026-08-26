const KNOWN_FIELD_LABELS: Record<string, string> = {
  // Bank fields
  amount: 'Amount',
  narration: 'Narration',
  narration_tokens: 'Narration Tokens',
  bank_reference: 'Bank Reference Number (UTR)',
  bank_reference_number: 'Bank Reference Number (UTR)',
  utr_number: 'UTR Number',
  bank_account_no: 'Bank Account Number',
  payer_account_no: 'Payer Account Number',
  payer_account_number: 'Payer Account Number',
  payer_ifsc: 'Payer IFSC',
  payer_name: 'Payer Company Name',
  vpa: 'UPI Handle (VPA)',
  tx_date: 'Transaction Date',
  value_date: 'Value Date',
  booking_date: 'Booking Date',
  balance_after: 'Balance After Transaction',
  account_suffix: 'Account Suffix',

  // Invoice / Sub-ledger fields
  effective_balance: 'Outstanding Balance',
  balance_due_minor: 'Outstanding Balance',
  invoice_balance: 'Outstanding Balance',
  invoice_number: 'Invoice Number',
  invoice_no: 'Invoice Number',
  invoice_number_suffix: 'Invoice Number Suffix',
  total_amount_minor: 'Invoice Total Amount',
  invoice_amount: 'Invoice Total Amount',
  total_amount: 'Invoice Total Amount',
  issue_date: 'Issue Date',
  due_date: 'Due Date',
  currency: 'Currency',
  allowed_tds_minor: 'Allowed TDS Amount',

  // Customer master fields
  company_name: 'Company Name',
  customer_name: 'Customer Name',
  customer_code: 'Customer Code',
  vpa_handle: 'Saved UPI Handle',
  gstin: 'GSTIN / PAN',
  'gstin / pan': 'GSTIN / PAN',
  pan: 'PAN Number',
  default_bank_account: 'Saved Bank Account Number',
  ifsc_code: 'Saved IFSC Code',
  default_ifsc: 'Saved IFSC Code',
  expected_utr: 'Pre-Advised UTR',

  // Special / synthetic fields
  'sum(invoice_amounts)': 'Sum of Invoice Amounts',
  shortfall_amount: 'Shortfall Amount',
  materiality_threshold: 'Materiality Threshold',
  tolerance: 'Tolerance Amount',
  on_account_credit: 'On-Account Credit',
  excess_amount: 'Excess Amount',
  partial_amount: 'Partial Amount',
};

export function humanizeField(str: string): string {
  if (!str) return '';
  // "raw:<key>" is a sentinel (ARRuleEditor's bank_field/source_field
  // pickers) for an entity's still-unmapped ingestion column, e.g.
  // "raw:Business_Partner_Description" - the prefix is only meaningful to
  // the matcher config, not something a user should see in a label.
  const withoutRawPrefix = str.startsWith('raw:') ? str.slice(4) : str;
  const trimmed = withoutRawPrefix.trim();
  const lower = trimmed.toLowerCase();
  if (KNOWN_FIELD_LABELS[lower]) return KNOWN_FIELD_LABELS[lower];
  if (KNOWN_FIELD_LABELS[trimmed]) return KNOWN_FIELD_LABELS[trimmed];

  // Convert snake_case or kebab-case to Title Case
  return trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const wLower = word.toLowerCase();
      if (['utr', 'vpa', 'ifsc', 'pan', 'gstin', 'id', 'ar', 'gl', 'tds'].includes(wLower)) {
        return wLower.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
