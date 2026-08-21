import React from 'react';
import type { ARRule } from '../../types';
import { Switch } from '../ui/Switch';
import { ChevronUp, ChevronDown, Target } from 'lucide-react';

interface RuleMeta {
  label?: string;
  description: string;
}

export interface RuleThresholdBadgeInfo {
  label: string;
  value: string;
  color: string;
}

export function getRuleThresholdBadge(rule: ARRule): RuleThresholdBadgeInfo | null {
  const cfg = rule.config || {};
  const cond = rule.cond || {};

  switch (rule.kind) {
    case 'write-off': {
      const rawVal =
        cfg.amount?.value_minor ??
        cfg.max_writeoff_amount ??
        cfg.materiality_threshold ??
        cond.amount?.value ??
        500;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return {
        label: 'Materiality Threshold',
        value: `≤ ₹${val.toFixed(2)}`,
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    case 'bank-fee': {
      const rawVal =
        cfg.amount?.value_minor ??
        cfg.max_fee_amount ??
        cond.amount?.value ??
        500;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return {
        label: 'Fee Variance Tolerance',
        value: `± ₹${val.toFixed(2)}`,
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    case 'tds-match': {
      const rate = cfg.tds_rate_pct ?? cfg.rate_pct ?? cfg.default_tds_rate_pct ?? 10;
      return {
        label: 'TDS Deduction Rate',
        value: `${rate}% TDS`,
        color: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    }
    case 'subset-sum': {
      const val = cfg.max_invoices ?? cfg.max_combo ?? cond.amount?.value ?? 10;
      return {
        label: 'Max Invoices Combo',
        value: `≤ ${val} Invoices`,
        color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      };
    }
    case 'fuzzy-name': {
      const val = cfg.min_similarity ? Math.round(cfg.min_similarity * 100) : rule.confidence || 85;
      return {
        label: 'Similarity Threshold',
        value: `≥ ${val}% Sim`,
        color: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    }
    case 'invoice-suffix':
    case 'account-suffix': {
      const val = cfg.min_length ?? cfg.suffix_length ?? 4;
      return {
        label: 'Min Suffix Digits',
        value: `≥ ${val} Digits`,
        color: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    }
    case 'threshold': {
      let label = 'Tolerance Threshold';
      if (rule.phase === 'short-pay') label = 'Shortfall Tolerance';
      else if (rule.phase === 'unapplied') label = 'Unapplied Cash Limit';
      else if (rule.phase === 'gl-check') label = 'GL Control Variance';
      const rawVal = cfg.amount?.value_minor ?? cond.amount?.value ?? 0;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return {
        label,
        value: `≤ ₹${val.toFixed(2)}`,
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    default:
      return null;
  }
}

export const RULE_METADATA: Record<string, RuleMeta> = {
  'expected-utr': {
    label: 'Pre-Advised UTR Match',
    description:
      'Automatically matches incoming payments to customer records using the UTR details they pre-submitted in the portal / expected remittances feed.',
  },
  'account-ifsc': {
    label: 'Payer Account & IFSC Match',
    description:
      'Automatically links incoming payments to customer accounts by verifying both their bank account number and IFSC code against saved records.',
  },
  upi: {
    label: 'UPI Handle Match',
    description:
      "Automatically links incoming payments by matching the sender's UPI ID found in the transaction narration with the customer's saved UPI handle.",
  },
  'customer-code': {
    label: 'Customer Code in Narration Match',
    description:
      "Automatically links incoming payments by identifying and matching the customer's unique code embedded within the bank transaction narration.",
  },
  'gstin-pan': {
    label: 'Tax ID & PAN Match',
    description:
      "Automatically links incoming payments by extracting the customer's GSTIN or PAN from the bank transaction narration and matching it with saved records.",
  },
  'fuzzy-name': {
    label: 'Company Name Match',
    description:
      "Automatically links incoming payments by performing a fuzzy match between the payer's name on the bank statement and the customer's saved company name.",
  },
  'account-suffix': {
    label: 'Masked Account Suffix Match',
    description:
      "Automatically links incoming payments by comparing the last 4 digits of the payer's account number from the bank statement with saved customer records.",
  },
  'narration-tokens': {
    label: 'Token-Based Narration Match',
    description:
      "Automatically links incoming payments by breaking down the transaction narration into tokens and matching them against the customer's saved company name.",
  },
  'exact-invoice-num': {
    label: 'Exact Invoice Number Match',
    description:
      "Automatically matches a payment to an invoice by finding that invoice's exact number written in the bank transaction narration.",
  },
  'invoice-suffix': {
    label: 'Truncated Invoice Number Match',
    description:
      "Automatically matches a payment to an invoice by finding a shortened or masked numeric suffix (e.g. '1046' from 'INV-XXXX1046', with 'X' masking characters and prefixes automatically stripped) in the bank narration.",
  },
  'exact-amount': {
    label: 'Exact Amount Match',
    description:
      "Automatically matches a payment to an open invoice when the payment amount exactly equals the invoice's outstanding balance.",
  },
  'tds-match': {
    label: 'TDS-Adjusted Amount Match',
    description:
      "Automatically matches a payment to an invoice when the shortfall exactly equals the customer's allowed tax-deducted-at-source (TDS) amount.",
  },
  'subset-sum': {
    label: 'Subset Sum Invoice Match',
    description:
      'Automatically matches a single payment against a combination of several open invoices whose amounts add up to the payment received.',
  },
  'bank-fee': {
    label: 'Bank Fee Variance Match',
    description:
      "Automatically matches a payment where Shortfall (Invoice Balance − Payment Received) equals the bank's explicit transfer fee or falls within configured fee tolerance, settling the invoice and booking the variance to Bank Charges GL.",
  },
  'write-off': {
    label: 'Small Balance Write-Off',
    description:
      'Automatically closes out a residual invoice balance that falls below the configured materiality threshold, rather than leaving it open as a disputed shortfall.',
  },
  overpayment: {
    label: 'Overpayment to On-Account Credit',
    description:
      'When payment cash exceeds open invoice balance, targets the closest invoice, fully settles it, and parks remaining excess cash as On-Account Advance Credit on the customer account.',
  },
  'partial-payment': {
    label: 'Partial Payment Allocation (FIFO Fallback)',
    description:
      "Universal fallback when no earlier rule matches: applies incoming cash to the customer's oldest open invoice to reduce its balance, leaving the residual shortfall open.",
  },
  threshold: {
    description:
      'Automatically decides tolerance thresholds for exceptions and GL control checks.',
  },
};

export function getRuleDisplayFields(rule: ARRule) {
  const cfg = rule.config || {};
  let bankField = rule.bankField || cfg.location || cfg.bankField || cfg.bank_field || 'narration';
  let secondField = rule.secondField || cfg.match_field || cfg.secondField || 'invoice_number';
  let secondSource = rule.secondSource || cfg.source || cfg.secondSource || 'Sub-Ledger';
  return { bankField, secondSource, secondField };
}

interface ARRuleCardProps {
  rule: ARRule;
  index: number;
  total: number;
  matchedCount?: number;
  ruleNumberStr: string;
  isSelected: boolean;
  isPanelOpen: boolean;
  onSelect: () => void;
  onToggleEnable: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const ARRuleCard: React.FC<ARRuleCardProps> = ({
  rule,
  index,
  total,
  matchedCount = 1,
  ruleNumberStr,
  isSelected,
  isPanelOpen,
  onSelect,
  onToggleEnable,
  onMoveUp,
  onMoveDown,
}) => {
  const meta: RuleMeta = RULE_METADATA[rule.kind] || {
    label: rule.name,
    description: rule.config?.description || 'Applies automated matching rule logic against incoming transaction stream.',
  };

  const confidenceVal = rule.confidence ?? 95;

  return (
    <div
      onClick={onSelect}
      className={`rs-rule-row select-none transition-all ${!rule.enabled ? 'opacity-55' : ''
        } ${isSelected ? 'selected' : ''}`}
    >
      {/* Reorder Up/Down arrows */}
      <div
        className="flex flex-col text-slate-300 flex-none opacity-40 hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className={`hover:text-slate-700 leading-none p-0.5 ${index === 0 ? 'invisible' : ''}`}
          title="Move rule up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className={`hover:text-slate-700 leading-none p-0.5 ${index === total - 1 ? 'invisible' : ''}`}
          title="Move rule down"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Priority Badge Box (e.g. 3.1) */}
      <span
        className={`font-mono text-xs font-bold px-2 py-1 rounded-md flex-none border ${isSelected
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
      >
        {ruleNumberStr}
      </span>

      {/* Title & Description */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className={`font-bold text-xs text-slate-900 ${isPanelOpen ? 'truncate flex-1 min-w-0' : 'flex-none'
            }`}
          title={rule.name}
        >
          {rule.name}
        </span>
        {!isPanelOpen && meta.description && (
          <span
            className="text-xs text-slate-500 font-normal truncate flex-1 min-w-0 hidden sm:inline"
            title={meta.description}
          >
            {meta.description}
          </span>
        )}
        {!isPanelOpen && matchedCount !== undefined && matchedCount > 0 && (
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono flex-none border border-slate-200">
            · {matchedCount}
          </span>
        )}
      </div>

      {/* Strictness / Confidence Badge (green document icon + %) */}
      {!isPanelOpen && (
        <div
          className="flex items-center gap-1 font-mono font-bold text-xs text-emerald-700 bg-emerald-50/70 px-2 py-1 rounded-md border border-emerald-200 flex-none"
          title="Required Match Confidence"
        >
          <Target className="w-3.5 h-3.5 text-emerald-600" />
          {confidenceVal}%
        </div>
      )}

      {/* Active Status Text & Switch Toggle */}
      <div
        className="flex items-center gap-2 flex-none"
        onClick={(e) => e.stopPropagation()}
        title={rule.enabled ? 'Rule is Active' : 'Rule is Inactive'}
      >
        {!isPanelOpen && (
          <span
            className={`text-xs font-bold uppercase tracking-wider ${rule.enabled ? 'text-emerald-700' : 'text-slate-400'
              }`}
          >
            {rule.enabled ? 'ACTIVE' : 'OFF'}
          </span>
        )}
        <div className="scale-95">
          <Switch checked={rule.enabled} onChange={onToggleEnable} />
        </div>
      </div>
    </div>
  );
};
