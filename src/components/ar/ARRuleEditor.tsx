import React, { useState, useEffect } from 'react';
import type { ARRule } from '../../types';
import { getRuleDisplayFields } from './ARRuleCard';
import { fieldMappingService } from '../../services/dataHub.service';
import { humanizeField } from '../../utils/formatters';

interface ARRuleEditorProps {
  rule: ARRule;
  matchedCount?: number;
  onUpdateRule: (updated: ARRule) => void;
}

interface RuleParamConfig {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (val: number) => void;
}

function getRuleParamConfig(rule: ARRule, onUpdateRule: (updated: ARRule) => void): RuleParamConfig | null {
  switch (rule.kind) {
    case 'write-off': {
      const rawVal =
        rule.config?.amount?.value_minor ??
        rule.config?.max_writeoff_amount ??
        rule.config?.materiality_threshold ??
        rule.cond?.amount?.value ??
        500;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return {
        label: 'MATERIALITY THRESHOLD',
        value: val,
        step: 0.1,
        min: 0,
        onChange: (newVal) => {
          const minor = Math.round(newVal * 100);
          const newConfig = {
            ...(rule.config || {}),
            amount: { mode: 'tolerance', value_minor: minor },
            max_writeoff_amount: minor,
            materiality_threshold: minor,
          };
          onUpdateRule({
            ...rule,
            config: newConfig,
            cond: { ...(rule.cond || {}), amount: { mode: 'abs', value: minor } },
          });
        },
      };
    }
    case 'bank-fee': {
      const rawVal =
        rule.config?.amount?.value_minor ??
        rule.config?.max_fee_amount ??
        rule.cond?.amount?.value ??
        100;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return {
        label: 'VARIANCE TOLERANCE',
        value: val,
        step: 0.1,
        min: 0,
        onChange: (newVal) => {
          const minor = Math.round(newVal * 100);
          const newConfig = {
            ...(rule.config || {}),
            amount: { mode: 'tolerance', value_minor: minor },
            max_fee_amount: minor,
          };
          onUpdateRule({
            ...rule,
            config: newConfig,
            cond: { ...(rule.cond || {}), amount: { mode: 'abs', value: minor } },
          });
        },
      };
    }
    case 'subset-sum': {
      const val =
        rule.config?.max_invoices ??
        rule.config?.max_combo ??
        rule.cond?.amount?.value ??
        3;
      return {
        label: 'MAX COMBO SIZE',
        value: Number(val),
        step: 1,
        min: 2,
        onChange: (newVal) => {
          const newConfig = {
            ...(rule.config || {}),
            max_invoices: newVal,
            max_combo: newVal,
          };
          onUpdateRule({
            ...rule,
            config: newConfig,
            cond: { ...(rule.cond || {}), amount: { mode: 'abs', value: newVal } },
          });
        },
      };
    }
    case 'fuzzy-name': {
      const val = rule.config?.min_similarity
        ? Math.round(rule.config.min_similarity * 100)
        : rule.confidence || 85;
      return {
        label: 'MATCH THRESHOLD (%)',
        value: Number(val),
        step: 1,
        min: 50,
        onChange: (newVal) => {
          const newConfig = {
            ...(rule.config || {}),
            min_similarity: newVal / 100,
          };
          onUpdateRule({ ...rule, config: newConfig });
        },
      };
    }
    case 'threshold': {
      let label = 'THRESHOLD';
      if (rule.phase === 'short-pay') label = 'SHORTFALL TOLERANCE';
      else if (rule.phase === 'unapplied') label = 'UNAPPLIED CASH THRESHOLD';
      else if (rule.phase === 'gl-check') label = 'GL CONTROL VARIANCE TOLERANCE';
      const rawVal = rule.config?.amount?.value_minor ?? rule.cond?.amount?.value ?? 0;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return {
        label,
        value: val,
        step: 0.1,
        min: 0,
        onChange: (newVal) => {
          const minor = Math.round(newVal * 100);
          const newConfig = {
            ...(rule.config || {}),
            amount: { mode: 'abs', value_minor: minor },
          };
          onUpdateRule({
            ...rule,
            config: newConfig,
            cond: { ...(rule.cond || {}), amount: { mode: 'abs', value: minor } },
          });
        },
      };
    }
    default:
      return null;
  }
}

const formatSecondSourceLabel = (s: string) => {
  if (s.toLowerCase().includes('invoice') || s === 'invoice') return 'Sub-Ledger (Invoices)';
  if (s.toLowerCase().includes('customer') || s === 'customer') return 'Customer Master';
  if (s.toLowerCase().includes('remittance') || s.toLowerCase().includes('expected')) return 'Expected Remittances';
  return humanizeField(s);
};

export const ARRuleEditor: React.FC<ARRuleEditorProps> = ({
  rule,
  matchedCount = 0,
  onUpdateRule,
}) => {
  const { bankField, secondSource, secondField } = getRuleDisplayFields(rule);
  const [bankFieldOptions, setBankFieldOptions] = useState<string[]>([]);
  const [targetFieldOptions, setTargetFieldOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadFields = async () => {
      try {
        const [bankFields, invoiceFields] = await Promise.all([
          fieldMappingService.canonicalFields('BANK'),
          fieldMappingService.canonicalFields('INVOICE'),
        ]);
        if (!cancelled) {
          setBankFieldOptions(bankFields);
          setTargetFieldOptions(invoiceFields);
        }
      } catch {
        // Fallback gracefully to existing options
      }
    };
    loadFields();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateRule({ ...rule, name: e.target.value });
  };

  const handleChangeConfidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateRule({ ...rule, confidence: Number(e.target.value) });
  };

  const paramConfig = getRuleParamConfig(rule, onUpdateRule);

  return (
    <div className="border-t border-slate-200 px-5 py-4 bg-slate-50/70 flex flex-col gap-4 text-xs fade-in">
      {/* Live Match Count Banner */}
      <div className="-mt-0.5 text-[11.5px] text-slate-500 font-medium">
        Live:{' '}
        <span className={`font-mono font-semibold ${matchedCount ? 'text-emerald-700' : 'text-slate-400'}`}>
          {matchedCount} matched
        </span>{' '}
        with these settings, in this run
      </div>

      {/* Row 1: MATCHER & RULE NAME */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            MATCHER
          </label>
          <select
            value={rule.kind}
            onChange={(e) => onUpdateRule({ ...rule, kind: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 h-9 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
          >
            <option value={rule.kind}>{rule.name}</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            RULE NAME
          </label>
          <input
            type="text"
            value={rule.name}
            onChange={handleChangeName}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 h-9 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Row 2: COMPARES */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          COMPARES
        </label>
        {rule.kind === 'dup-utr' ? (
          <div className="text-[11.5px] text-slate-600 font-mono bg-slate-200/60 px-2.5 py-1.5 rounded-md inline-block">
            Bank reference number (UTR) ↔ every other bank reference number in this run
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-slate-200/70 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 font-medium text-[11.5px]">
              Bank Statement
            </span>

            <select
              value={bankField}
              onChange={(e) => {
                const val = e.target.value;
                const newConfig = { ...(rule.config || {}), location: val, bankField: val };
                onUpdateRule({ ...rule, bankField: val, config: newConfig });
              }}
              className="bg-white border border-slate-200 rounded-lg px-3 h-9 font-medium text-[11.5px] text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs min-w-35"
            >
              <option value={bankField}>{humanizeField(bankField)}</option>
              {bankFieldOptions
                .filter((f) => f !== bankField)
                .map((f) => (
                  <option key={f} value={f}>
                    {humanizeField(f)}
                  </option>
                ))}
            </select>

            <span className="text-slate-400 font-bold text-xs px-0.5">↔</span>

            <select
              value={secondSource}
              onChange={(e) => {
                const val = e.target.value;
                const newConfig = { ...(rule.config || {}), source: val };
                onUpdateRule({ ...rule, secondSource: val, config: newConfig });
              }}
              className="bg-white border border-slate-200 rounded-lg px-3 h-9 font-medium text-[11.5px] text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs min-w-40"
            >
              <option value={secondSource}>{formatSecondSourceLabel(secondSource)}</option>
              <option value="Sub-Ledger (Invoices)">Sub-Ledger (Invoices)</option>
              <option value="Customer Master">Customer Master</option>
              <option value="Expected Remittances">Expected Remittances</option>
            </select>

            <select
              value={secondField}
              onChange={(e) => {
                const val = e.target.value;
                const newConfig = { ...(rule.config || {}), match_field: val };
                onUpdateRule({ ...rule, secondField: val, config: newConfig });
              }}
              className="bg-white border border-slate-200 rounded-lg px-3 h-9 font-mono text-[11.5px] text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs min-w-40"
            >
              <option value={secondField}>{humanizeField(secondField)}</option>
              {targetFieldOptions
                .filter((f) => f !== secondField)
                .map((f) => (
                  <option key={f} value={f}>
                    {humanizeField(f)}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Row 3: TUNABLE PARAMETER & CONFIDENCE */}
      <div className="pt-2 border-t border-slate-200/80 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {paramConfig ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {paramConfig.label}
              </label>
              <input
                type="number"
                step={paramConfig.step ?? 0.1}
                min={paramConfig.min ?? 0}
                value={paramConfig.value}
                onChange={(e) => paramConfig.onChange(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 h-9 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
              />
            </div>
          ) : (
            <div />
          )}

          {rule.confidence !== null && rule.confidence !== undefined && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                CONFIDENCE
              </label>
              <div className="flex items-center gap-3 h-9">
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={rule.confidence}
                  onChange={handleChangeConfidence}
                  className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md flex-none">
                  {rule.confidence}
                </span>
              </div>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          How much to trust this match — at or above the auto-match threshold it applies automatically, below it's suggested for review.
        </p>
      </div>
    </div>
  );
};
