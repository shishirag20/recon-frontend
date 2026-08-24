import React, { useState, useEffect } from 'react';
import type { ARRule } from '../../types';
import { ConfidenceBar } from '../ui/ConfidenceBar';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ARRuleEditor } from './ARRuleEditor';
import { humanizeField } from '../../utils/formatters';

interface RuleMeta {
  label?: string;
  description: string;
  customChips?: (rule: ARRule) => React.ReactNode;
}

// Exported so other views that only need a rule's display label (e.g.
// ARMatchedTab's "Resolved Via" column, keyed by rule.kind rather than
// rendering a full card) can reuse the same polished names instead of a
// second hardcoded copy.
export const RULE_METADATA: Record<string, RuleMeta> = {
  'dup-utr': {
    label: 'Duplicate UTR Check',
    description:
      'Automatically detects and excludes bank rows that share an already-used UTR (unique transaction reference), preventing the same payment from being processed or matched twice.',
  },
  'expected-utr': {
    label: 'Pre-Advised UTR Match',
    description:
      'Automatically matches incoming payments to customer records using the UTR details they pre-submitted in the portal.',
  },
  'account-ifsc': {
    label: 'Payer Account & IFSC Match',
    description:
      'Automatically links incoming payments to customer accounts by verifying both their bank account number and IFSC code against saved records.',
    customChips: () => (
      <>
        <span className="chip font-semibold">Payer Account & IFSC Match</span>
        <span className="chip font-mono">payer_account_no & ifsc ↔ bank_account_no & ifsc_code</span>
      </>
    ),
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
    customChips: (rule) => (
      <>
        <span className="chip font-semibold">Company Name Match</span>
        <span className="chip font-mono">payer_name ↔ company_name</span>
        <span className="chip font-medium">
          Match threshold: {rule.config?.min_similarity ? Math.round(rule.config.min_similarity * 100) : (rule.confidence || 85)}%
        </span>
      </>
    ),
  },
  'invoice-number-in-narration': {
    label: 'Invoice Number in Narration',
    description:
      "Independently checks whether the transaction narration references a real invoice belonging to a different customer than the one Customer Identification / Candidate Pool already identified. Runs after both, for every row - a disagreement is flagged for review instead of letting the identified customer stand unquestioned.",
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
      'Automatically matches a payment to an invoice by finding a shortened or partial version of the invoice number in the bank narration.',
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
    customChips: (rule) => (
      <>
        <span className="chip font-semibold">Subset Sum Invoice Match</span>
        <span className="chip font-mono">amount ↔ sum(invoice_amounts)</span>
        <span className="chip font-medium">
          Max combo size: {rule.config?.max_combo ?? rule.cond?.amount?.value ?? 3}
        </span>
      </>
    ),
  },
  'bank-fee': {
    label: 'Bank Fee Tolerance Match',
    description:
      "Automatically matches a payment that falls just short of an invoice's balance by an amount consistent with a bank-deducted transfer fee.",
    customChips: (rule) => (
      <>
        <span className="chip font-semibold">Bank Fee Tolerance Match</span>
        <span className="chip font-mono">amount + fee ↔ invoice_amount</span>
        <span className="chip font-medium">
          Max fee: ₹{Number(rule.config?.max_fee_amount ?? rule.cond?.amount?.value ?? 150.0).toFixed(2)}
        </span>
      </>
    ),
  },
  'write-off': {
    label: 'Small Balance Write-Off',
    description:
      'Automatically closes out a residual invoice balance that falls below the configured materiality threshold, rather than leaving it open as a disputed shortfall.',
    customChips: (rule) => {
      const rawVal = rule.config?.amount?.value_minor ?? rule.config?.max_writeoff_amount ?? rule.config?.materiality_threshold ?? rule.cond?.amount?.value ?? 500;
      const thresholdVal = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return (
        <>
          <span className="chip font-mono">amount ↔ effective_balance</span>
          <span className="chip font-medium">
            Materiality threshold: ₹{thresholdVal.toFixed(2)}
          </span>
        </>
      );
    },
  },
  overpayment: {
    label: 'Overpayment to On-Account Credit',
    description:
      'Automatically records any amount received beyond an invoice\'s balance as an on-account credit for that customer, available to apply to future invoices.',
  },
  'partial-payment': {
    label: 'Partial Payment Allocation',
    description:
      "Automatically applies a payment that doesn't fully cover an invoice as a partial settlement, leaving the remaining balance open.",
  },
  'period-cutoff-guard': {
    label: 'Period Cutoff Guard',
    description:
      'Filters out invoices issued after the reconciliation period end date.',
  },
  'memo-netoff-guard': {
    label: 'Credit / Debit Memo Net-off',
    description:
      'Nets off open credit and debit memos before allocation.',
  },
  threshold: {
    description:
      'Automatically decides tolerance thresholds for exceptions and GL control checks.',
    customChips: (rule) => {
      if (rule.phase === 'short-pay') {
        return (
          <span className="chip font-medium">
            Shortfall tolerance: ₹{Number(rule.config?.max_shortfall_amount ?? rule.cond?.amount?.value ?? 1.0).toFixed(2)}
          </span>
        );
      }
      if (rule.phase === 'unapplied') {
        return (
          <span className="chip font-medium">
            Unapplied cash threshold: ₹{Number(rule.config?.unapplied_threshold ?? rule.cond?.amount?.value ?? 0.0).toFixed(2)}
          </span>
        );
      }
      return (
        <span className="chip font-medium">
          GL variance tolerance: ₹{Number(rule.config?.max_gl_variance ?? rule.cond?.amount?.value ?? 0.0).toFixed(2)}
        </span>
      );
    },
  },
};

export function getRuleDisplayFields(rule: ARRule) {
  const cfg = rule.config || {};
  
  let bankField = rule.bankField || cfg.location || cfg.bankField || cfg.bank_field;
  let secondSource = rule.secondSource || cfg.source || cfg.secondSource;
  let secondField = rule.secondField || cfg.match_field || cfg.secondField;

  if (Array.isArray(cfg.match_fields)) {
    secondField = cfg.match_fields.join(' & ');
  } else if (Array.isArray(cfg.extract)) {
    secondField = cfg.extract.join(' / ');
  } else if (typeof cfg.extract === 'string') {
    secondField = cfg.extract;
  }

  // Kind specific fallbacks for clean visual presentation matching reference prototype
  switch (rule.kind) {
    case 'dup-utr':
      bankField = bankField || 'bank_reference';
      secondSource = secondSource || 'Prior Runs';
      secondField = secondField || 'matched_utr';
      break;
    case 'expected-utr':
      bankField = bankField || 'utr_number';
      secondSource = secondSource || 'Expected Remittances';
      secondField = secondField || 'utr_number';
      break;
    case 'account-ifsc':
      bankField = bankField || 'payer_account_no & ifsc';
      secondSource = secondSource || 'Customer Master';
      secondField = secondField || 'bank_account_no & ifsc_code';
      break;
    case 'upi':
      bankField = bankField || 'vpa';
      secondSource = secondSource || 'Customer Master';
      secondField = secondField || 'vpa_handle';
      break;
    case 'customer-code':
      bankField = bankField || 'narration';
      secondSource = secondSource || 'Customer Reference Codes';
      secondField = secondField || 'customer_code';
      break;
    case 'gstin-pan':
      bankField = bankField || 'narration';
      secondSource = secondSource || 'Customer Master';
      secondField = secondField || 'gstin / pan';
      break;
    case 'fuzzy-name':
      bankField = bankField || 'payer_name';
      secondSource = secondSource || 'Customer Master';
      secondField = secondField || 'company_name';
      break;
    case 'account-suffix':
      bankField = bankField || 'account_suffix';
      secondSource = secondSource || 'Customer Master';
      secondField = secondField || 'bank_account_no';
      break;
    case 'narration-tokens':
      bankField = bankField || 'narration_tokens';
      secondSource = secondSource || 'Customer Master';
      secondField = secondField || 'company_name';
      break;
    case 'exact-invoice-num':
      bankField = bankField || 'narration';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'invoice_number';
      break;
    case 'invoice-suffix':
      bankField = bankField || 'narration';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'invoice_number_suffix';
      break;
    case 'exact-amount':
      bankField = bankField || 'amount';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'invoice_amount';
      break;
    case 'tds-match':
      bankField = bankField || 'amount + tds';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'invoice_amount';
      break;
    case 'subset-sum':
      bankField = bankField || 'amount';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'sum(invoice_amounts)';
      break;
    case 'bank-fee':
      bankField = bankField || 'amount + fee';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'invoice_amount';
      break;
    case 'write-off':
      bankField = bankField || 'amount';
      secondSource = secondSource || 'Sub-Ledger (Invoices)';
      secondField = secondField || 'effective_balance';
      break;
    case 'overpayment':
      bankField = bankField || 'excess_amount';
      secondSource = secondSource || 'Customer Master';
      secondField = secondField || 'on_account_credit';
      break;
    case 'partial-payment':
      bankField = bankField || 'partial_amount';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'invoice_balance';
      break;
    case 'period-cutoff-guard':
      bankField = bankField || 'due_date';
      secondSource = secondSource || 'Period Control';
      secondField = secondField || 'lte_period_end';
      break;
    case 'memo-netoff-guard':
      bankField = bankField || 'memo_date';
      secondSource = secondSource || 'Credit/Debit Memos';
      secondField = secondField || 'lte_period_end';
      break;
    default:
      bankField = bankField || 'narration';
      secondSource = secondSource || 'Sub-Ledger (Invoice)';
      secondField = secondField || 'invoice_number';
  }

  return { bankField, secondSource, secondField };
}

interface ARRuleCardProps {
  rule: ARRule;
  index: number;
  total: number;
  matchedCount?: number;
  ruleNumberStr: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleEnable: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateRule: (updated: ARRule) => void;
}

export const ARRuleCard: React.FC<ARRuleCardProps> = ({
  rule,
  index,
  total,
  matchedCount,
  ruleNumberStr,
  isEditing,
  onToggleEdit,
  onToggleEnable,
  onMoveUp,
  onMoveDown,
  onUpdateRule,
}) => {
  const [draftRule, setDraftRule] = useState<ARRule>(rule);

  // Sync draft with external rule changes when not actively editing
  useEffect(() => {
    if (!isEditing) {
      setDraftRule(rule);
    }
  }, [rule, isEditing]);

  const meta: RuleMeta = RULE_METADATA[rule.kind] || {
    label: rule.name,
    description: rule.config?.description || 'Applies automated matching rule logic against incoming transaction stream.',
  };

  const { bankField, secondField } = getRuleDisplayFields(rule);
  const displayPriority = rule.priority !== undefined && rule.priority !== null ? rule.priority : index + 1;

  const handleDoneClick = () => {
    if (isEditing) {
      // Check if draftRule actually changed compared to incoming rule
      const hasChanged = JSON.stringify(draftRule) !== JSON.stringify(rule);
      if (hasChanged) {
        onUpdateRule(draftRule);
      }
      onToggleEdit();
    } else {
      setDraftRule(rule);
      onToggleEdit();
    }
  };

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-all shadow-2xs ${
        !rule.enabled ? 'opacity-60' : ''
      } ${isEditing ? 'ring-1 ring-indigo-600 border-indigo-600' : ''}`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5 select-none">
        {/* Reorder Up/Down arrows */}
        <div className="flex flex-col text-slate-300 mt-0.5 flex-none">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className={`hover:text-slate-700 transition-colors ${index === 0 ? 'invisible' : ''}`}
            title="Move rule up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className={`hover:text-slate-700 transition-colors ${
              index === total - 1 ? 'invisible' : ''
            }`}
            title="Move rule down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Priority Number */}
        <div className="font-mono text-[12px] text-slate-400 w-4 mt-0.5 flex-none font-normal">
          {displayPriority}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Rule Title */}
          <div className="font-bold text-[13px] text-slate-900 flex items-center gap-2 flex-wrap">
            <span>
              <span className="text-slate-400 font-normal">{ruleNumberStr}: </span>
              {rule.name}
            </span>
            {matchedCount !== undefined && matchedCount > 0 && (
              <span className="text-[11px] font-medium text-slate-500 font-mono">
                · {matchedCount} matched
              </span>
            )}
          </div>

          {/* Description Line */}
          {meta.description && (
            <div className="mt-1 text-[12px] text-slate-500 leading-snug">
              {meta.description}
            </div>
          )}

          {/* Condition Chips Row matching prototype design */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {meta.customChips ? (
              meta.customChips(rule)
            ) : (
              <>
                <span className="chip font-semibold">{meta.label || rule.name}</span>
                <span className="chip font-mono">{humanizeField(bankField)} ↔ {humanizeField(secondField)}</span>
                {rule.confidence !== null && rule.confidence !== undefined && (
                  <span className="chip font-medium">Confidence: {rule.confidence}%</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 flex-none mt-0.5">
          {rule.confidence !== null && rule.confidence !== undefined && (
            <ConfidenceBar value={rule.confidence} />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDoneClick}
            className="text-xs font-semibold px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-md"
          >
            {isEditing ? 'Done' : 'Edit'}
          </Button>

          <Switch checked={rule.enabled} onChange={onToggleEnable} />
        </div>
      </div>

      {/* Expanded Rule Editor */}
      {isEditing && (
        <ARRuleEditor
          rule={draftRule}
          matchedCount={matchedCount}
          onUpdateRule={setDraftRule}
        />
      )}
    </div>
  );
};
