import React from 'react';
import type { ARRule } from '../../types';
import { ConfidenceBar } from '../ui/ConfidenceBar';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ARRuleEditor } from './ARRuleEditor';

const MOCK_HIT_COUNTS: Record<string, number> = {
  'rule-intake-1': 1,
  'rule-cust-1': 1,
  'rule-cust-2': 4,
  'rule-cust-3': 2,
  'rule-cust-4': 3,
  'rule-cust-5': 1,
  'rule-cust-6': 1,
  'rule-pool-1': 0,
  'rule-pool-2': 1,
  'rule-alloc-1': 2,
  'rule-alloc-2': 1,
  'rule-alloc-3': 2,
  'rule-alloc-4': 1,
  'rule-alloc-5': 1,
  'rule-alloc-6': 1,
  'rule-alloc-7': 1,
  'rule-alloc-8': 1,
  'rule-alloc-9': 1,
  'rule-shortpay-1': 2,
  'rule-unapplied-1': 0,
  'rule-gl-1': 1,
};

const RULE_METADATA: Record<
  string,
  { label?: string; description: string; customChips?: (rule: ARRule) => React.ReactNode }
> = {
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
        <span className="chip font-mono">payer_account_number ↔ default_bank_account</span>
        <span className="chip font-mono">payer_ifsc ↔ default_ifsc</span>
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
        <span className="chip font-medium">Match threshold %: {rule.confidence || 85}</span>
      </>
    ),
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
    description:
      'Automatically matches a single payment against a combination of several open invoices whose amounts add up to the payment received.',
    customChips: (rule) => (
      <>
        <span className="chip font-mono">amount ↔ effective_balance</span>
        <span className="chip font-medium">Max combo size: {rule.cond?.amount?.value || 3}</span>
      </>
    ),
  },
  'bank-fee': {
    description:
      "Automatically matches a payment that falls just short of an invoice's balance by an amount consistent with a bank-deducted transfer fee.",
    customChips: (rule) => (
      <>
        <span className="chip font-mono">amount ↔ effective_balance</span>
        <span className="chip font-medium">
          Variance tolerance: ₹{(rule.cond?.amount?.value || 1.0).toFixed(2)}
        </span>
      </>
    ),
  },
  'write-off': {
    description:
      'Automatically closes out a residual invoice balance that falls below the configured materiality threshold, rather than leaving it open as a disputed shortfall.',
    customChips: (rule) => (
      <>
        <span className="chip font-mono">amount ↔ effective_balance</span>
        <span className="chip font-medium">
          Materiality threshold: ₹{(rule.cond?.amount?.value || 5.0).toFixed(2)}
        </span>
      </>
    ),
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
  threshold: {
    description:
      "Automatically decides tolerance thresholds for exceptions and GL control checks.",
    customChips: (rule) => {
      if (rule.phase === 'short-pay') {
        return (
          <span className="chip font-medium">
            Shortfall tolerance: ₹{(rule.cond?.amount?.value || 1.0).toFixed(2)}
          </span>
        );
      }
      if (rule.phase === 'unapplied') {
        return (
          <span className="chip font-medium">
            Unapplied cash threshold: ₹{(rule.cond?.amount?.value || 0.0).toFixed(2)}
          </span>
        );
      }
      return (
        <span className="chip font-medium">
          GL variance tolerance: ₹{(rule.cond?.amount?.value || 0.0).toFixed(2)}
        </span>
      );
    },
  },
};

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
  ruleNumberStr,
  isEditing,
  onToggleEdit,
  onToggleEnable,
  onMoveUp,
  onMoveDown,
  onUpdateRule,
}) => {
  const meta = RULE_METADATA[rule.kind] || {
    label: rule.name || 'Rule Condition',
    description: 'Applies automated matching rule logic against incoming transaction stream.',
  };

  const hitCount = MOCK_HIT_COUNTS[rule.id] !== undefined ? MOCK_HIT_COUNTS[rule.id] : 0;

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
          {rule.priority || index + 1}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Rule Title & Matched Count */}
          <div className="font-bold text-[13px] text-slate-900 flex items-center gap-2 flex-wrap">
            <span>
              <span className="text-slate-400 font-normal">{ruleNumberStr}: </span>
              {rule.name}
            </span>
            {hitCount > 0 && (
              <span className="text-[11px] font-medium text-slate-500 font-mono">
                · {hitCount} matched
              </span>
            )}
          </div>

          {/* Description Line */}
          {meta.description && (
            <div className="mt-1 text-[12px] text-slate-500 leading-snug">
              {meta.description}
            </div>
          )}

          {/* Condition Summary Chips Row matching prototype */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {meta.customChips ? (
              meta.customChips(rule)
            ) : (
              <>
                {meta.label && <span className="chip font-semibold">{meta.label}</span>}

                {rule.bankField && (
                  <span className="chip font-mono">
                    {rule.bankField} ↔ {rule.secondField || 'expected_utr'}
                  </span>
                )}

                {rule.matchMode && (
                  <span className="chip font-medium">
                    Mode: {rule.matchMode === 'contains' ? 'Contains' : 'Exact'}
                  </span>
                )}

                <span className="chip font-medium">
                  Confidence: {rule.confidence || 100}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 flex-none mt-0.5">
          <ConfidenceBar value={rule.confidence || 90} />

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleEdit}
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
          rule={rule}
          matchedCount={hitCount}
          onUpdateRule={onUpdateRule}
        />
      )}
    </div>
  );
};
