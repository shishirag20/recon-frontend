import type { PipelineBlockData } from '../components/ar/PipelineBlock';

export const DEFAULT_PIPELINES_BY_KIND: Record<string, PipelineBlockData[]> = {
  'expected-utr': [
    {
      id: 'blk-exp-1',
      type: 'filter',
      title: 'Verify Bank Reference Exists',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'bank_reference', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-exp-2',
      type: 'match',
      title: 'Match Reference Number Against Customer Expected UTR',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'bank_reference',
      targetEntity: 'Expected Remittances',
      targetAttribute: 'utr_number',
      matchMode: 'exact',
      confidence: 98,
      fetchedOutputs: ['Customer ID', 'Reconciled']
    }
  ],
  'account-ifsc': [
    {
      id: 'blk-acct-1',
      type: 'filter',
      title: 'Verify Payer Account Exists',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'account_number', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-acct-2',
      type: 'match',
      title: 'Dual Account & IFSC Match',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'payer_account_no, payer_ifsc',
      targetEntity: 'Customers',
      targetAttribute: 'account_number, ifsc_code',
      matchMode: 'exact_dual',
      confidence: 98,
      fetchedOutputs: ['Customer ID']
    }
  ],
  upi: [
    {
      id: 'blk-upi-1',
      type: 'filter',
      title: 'Verify Narration Exists',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'narration', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-upi-2',
      type: 'extract',
      title: 'Extract UPI VPA Handle',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'narration',
      pattern: '[a-zA-Z0-9._-]+@[a-zA-Z]+',
      outputVar: 'extracted_vpa'
    },
    {
      id: 'blk-upi-3',
      type: 'match',
      title: 'Match Customer VPA Handle',
      tag: 'STEP 3',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'extracted_vpa',
      targetEntity: 'Customers',
      targetAttribute: 'vpa_handle',
      matchMode: 'exact',
      confidence: 95,
      fetchedOutputs: ['Customer ID']
    }
  ],
  'customer-code': [
    {
      id: 'blk-cc-1',
      type: 'filter',
      title: 'Verify Narration Exists',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'narration', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-cc-2',
      type: 'match',
      title: 'Match Customer Code in Narration',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'narration',
      targetEntity: 'Customers',
      targetAttribute: 'customer_code',
      matchMode: 'contains',
      confidence: 95,
      fetchedOutputs: ['Customer ID']
    }
  ],
  'gstin-pan': [
    {
      id: 'blk-gst-1',
      type: 'filter',
      title: 'Verify Narration Exists',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'narration', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-gst-2',
      type: 'extract',
      title: 'Extract GSTIN / PAN Token',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'narration',
      pattern: '[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}',
      outputVar: 'extracted_tax_id'
    },
    {
      id: 'blk-gst-3',
      type: 'match',
      title: 'Match Tax Identification Number',
      tag: 'STEP 3',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'extracted_tax_id',
      targetEntity: 'Customers',
      targetAttribute: 'gstin_pan',
      matchMode: 'exact',
      confidence: 95,
      fetchedOutputs: ['Customer ID']
    }
  ],
  'fuzzy-name': [
    {
      id: 'blk-fuz-1',
      type: 'filter',
      title: 'Verify Payer Name Exists',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'payer_name', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-fuz-2',
      type: 'match',
      title: 'Fuzzy Company Name Similarity',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'payer_name',
      targetEntity: 'Customers',
      targetAttribute: 'customer_name',
      matchMode: 'fuzzy_score',
      confidence: 85,
      fetchedOutputs: ['Customer ID']
    }
  ],
  'account-suffix': [
    {
      id: 'blk-sfx-1',
      type: 'filter',
      title: 'Verify Payer Account Number Is Not Empty',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'payer_account_no', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-sfx-2',
      type: 'extract',
      title: 'Extract Masked Suffix (Last Digits) from Account Number',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'payer_account_no',
      pattern: '[0-9]+$',
      outputVar: 'account_suffix'
    },
    {
      id: 'blk-sfx-3',
      type: 'match',
      title: 'Match Extracted Suffix Against Customer Bank Account',
      tag: 'STEP 3',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'account_suffix',
      targetEntity: 'Customers',
      targetAttribute: 'account_number',
      matchMode: 'suffix_ends_with',
      confidence: 60,
      fetchedOutputs: ['Customer ID']
    }
  ],
  'narration-tokens': [
    {
      id: 'blk-ntk-1',
      type: 'filter',
      title: 'Verify Bank Narration Is Not Empty',
      tag: 'STEP 1',
      dataset: 'Bank Statement',
      conditions: [
        { entity: 'Bank Statement', attribute: 'narration', operator: '!=', value: "''" }
      ]
    },
    {
      id: 'blk-ntk-2',
      type: 'extract',
      title: 'Extract 3+ Letter Keywords from Narration',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'narration',
      pattern: '[A-Z0-9]{3,}',
      outputVar: 'narration_tokens'
    },
    {
      id: 'blk-ntk-3',
      type: 'match',
      title: 'Match Any Keyword to Customer Company Name',
      tag: 'STEP 3',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'narration_tokens',
      targetEntity: 'Customers',
      targetAttribute: 'company_name',
      matchMode: 'token_substring',
      confidence: 50,
      fetchedOutputs: ['Customer ID']
    }
  ],
  'exact-invoice-num': [
    {
      id: 'blk-inv-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-inv-2',
      type: 'match',
      title: 'Match Exact Invoice Number',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'narration',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'invoice_number',
      matchMode: 'contains',
      confidence: 98,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    }
  ],
  'invoice-suffix': [
    {
      id: 'blk-isf-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-isf-2',
      type: 'extract',
      title: "Extract Numeric Suffix / Strip Masked 'X's (e.g. INV-XXXX1046 → 1046)",
      tag: 'STEP 2',
      sourceEntity: 'Sub-Ledger',
      sourceAttribute: 'invoice_number',
      pattern: '\\d{4,}$',
      outputVar: 'invoice_suffix'
    },
    {
      id: 'blk-isf-3',
      type: 'match',
      title: 'Match Extracted Suffix ($invoice_suffix) Against Bank Narration',
      tag: 'STEP 3',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'narration',
      targetEntity: 'Sub-Ledger',
      targetAttribute: '$invoice_suffix',
      matchMode: 'suffix_ends_with',
      confidence: 90,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    }
  ],
  'exact-amount': [
    {
      id: 'blk-amt-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-amt-2',
      type: 'match',
      title: 'Match Exact Outstanding Balance',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'amount_minor',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'balance_due_minor',
      matchMode: 'exact_amount',
      confidence: 95,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    }
  ],
  'tds-match': [
    {
      id: 'blk-tds-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-tds-2',
      type: 'match',
      title: 'Payment = Invoice Balance Minus Allowed TDS Deduction',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'amount_minor',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'balance_due_minor',
      matchMode: 'tds_deduction',
      confidence: 93,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    }
  ],
  'subset-sum': [
    {
      id: 'blk-ss-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-ss-2',
      type: 'match',
      title: 'Subset Sum Multi-Invoice Combination',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'amount_minor',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'balance_due_minor',
      matchMode: 'subset_sum',
      confidence: 85,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    }
  ],
  'bank-fee': [
    {
      id: 'blk-fee-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-fee-2',
      type: 'match',
      title: 'Match Bank Fee Variance (Variance = Balance Due − Payment Received)',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'amount_minor',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'balance_due_minor',
      matchMode: 'variance_tolerance',
      confidence: 80,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    },
    {
      id: 'blk-fee-3',
      type: 'action',
      title: 'Book Variance to Bank Fee Expense GL & Settle Invoice',
      tag: 'STEP 3',
      description: 'Closes the invoice in full (close_full=true), and routes the calculated shortfall (Variance = Balance Due − Payment Received) to the Bank Charges / Fee Expense GL account.'
    }
  ],
  'write-off': [
    {
      id: 'blk-wof-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-wof-2',
      type: 'match',
      title: 'Small Balance Write-Off',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'amount_minor',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'balance_due_minor',
      matchMode: 'variance_tolerance',
      confidence: 100,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    }
  ],
  'overpayment': [
    {
      id: 'blk-ovp-1',
      type: 'filter',
      title: 'Choose Candidate Invoices',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-ovp-2',
      type: 'match',
      title: 'Match Invoice with Smallest Excess (Payment > Balance Due)',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'amount_minor',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'balance_due_minor',
      matchMode: 'overpayment',
      confidence: 100,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    },
    {
      id: 'blk-ovp-3',
      type: 'action',
      title: 'Fully Settle Invoice & Book Excess Cash to On-Account Credit',
      tag: 'STEP 3',
      description: 'Fully clears the target invoice (close_full=true). The remaining excess cash (Payment Received − Invoice Balance Due) is recorded as On-Account Credit on the customer account (payments.unapplied_minor) for future invoices or refund.'
    }
  ],
  'partial-payment': [
    {
      id: 'blk-par-1',
      type: 'filter',
      title: 'Filter Candidate Invoices Sorted by Due Date (FIFO)',
      tag: 'STEP 1',
      dataset: 'Sub-Ledger',
      conditions: [
        { entity: 'Invoice', attribute: 'Status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
        { entity: 'Invoice', attribute: 'Invoice Date', operator: '<=', value: 'Period End Date (As-Of)' },
        { entity: 'Invoice', attribute: 'Customer ID', operator: '==', value: 'Locked Payer ID (Phase 1)' }
      ]
    },
    {
      id: 'blk-par-2',
      type: 'match',
      title: 'Allocate Cash to Oldest-Due Open Invoice (FIFO Fallback)',
      tag: 'STEP 2',
      sourceEntity: 'Bank Statement',
      sourceAttribute: 'amount_minor',
      targetEntity: 'Sub-Ledger',
      targetAttribute: 'balance_due_minor',
      matchMode: 'partial_payment',
      confidence: 100,
      fetchedOutputs: ['Invoice ID', 'Invoice Amount']
    },
    {
      id: 'blk-par-3',
      type: 'action',
      title: 'Partially Reduce Invoice Balance & Keep Residual Open',
      tag: 'STEP 3',
      description: 'Applies received cash to reduce the oldest invoice balance (close_full=false). The remaining unpaid balance stays open on the sub-ledger (or escalates to Phase 3 Short-Pay review if the shortfall exceeds the configured tolerance limit).'
    }
  ]
};

export function getPipelineForKind(kind: string): PipelineBlockData[] {
  return (
    DEFAULT_PIPELINES_BY_KIND[kind] || [
      {
        id: `blk-${kind}-1`,
        type: 'filter',
        title: 'Verify Candidate Records',
        tag: 'STEP 1',
        dataset: 'Bank Statement',
        conditions: [
          { entity: 'Bank Statement', attribute: 'Reference Number', operator: '!=', value: "''" }
        ]
      },
      {
        id: `blk-${kind}-2`,
        type: 'match',
        title: 'Evaluate Match Criteria',
        tag: 'STEP 2',
        sourceEntity: 'Bank Statement',
        sourceAttribute: 'Reference Number',
        targetEntity: 'Customers',
        targetAttribute: 'Expected UTR',
        matchMode: 'exact',
        confidence: 90,
        fetchedOutputs: ['Record ID', 'Status']
      }
    ]
  );
}
