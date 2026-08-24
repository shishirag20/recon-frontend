import React from 'react';
import type { ARRule } from '../../types';
import { Switch } from '../ui/Switch';
import { ChevronUp, ChevronDown, Target } from 'lucide-react';


import { SlidersHorizontal } from 'lucide-react';

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
  const label = rule.name || 'Custom Match Rule';
  const description = rule.config?.description || 'Applies automated matching rule logic against incoming transaction stream.';

  const confidenceVal = rule.confidence ?? 95;

  let paramBadge = null;
  const firstParam = rule.config?.parameters?.[0];
  if (firstParam) {
    const keys = firstParam.key.split('.');
    let rawVal = rule.config;
    for (const k of keys) {
      if (rawVal === undefined || rawVal === null) break;
      rawVal = rawVal[k];
    }
    let val = Number(rawVal);
    if (firstParam.unit === 'minor_rupees' && !isNaN(val)) val = val / 100;

    if (!isNaN(val)) {
      const displayVal = firstParam.displayFormat ? firstParam.displayFormat.replace('{value}', val) : String(val);
      paramBadge = (
        <div className="flex items-center gap-1 font-mono font-bold text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex-none" title={firstParam.label}>
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
          {firstParam.shortLabel || 'PARAM'}: {displayVal}
        </div>
      );
    }
  }

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
          className={`font-semibold text-xs truncate max-w-full ${rule.enabled ? 'text-slate-800' : 'text-slate-500'
            }`}
          title={rule.name}
        >
          {label}
        </span>
        {!isPanelOpen && description && (
          <span
            className="text-xs text-slate-500 font-normal truncate flex-1 min-w-0 hidden sm:inline"
            title={description}
          >
            {description}
          </span>
        )}
        {!isPanelOpen && matchedCount !== undefined && matchedCount > 0 && (
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono flex-none border border-slate-200">
            · {matchedCount}
          </span>
        )}
      </div>

      {/* Param Badge & Confidence Badge */}
      {!isPanelOpen && (
        <div className="flex items-center gap-2 flex-none">
          {paramBadge}
          <div
            className="flex items-center gap-1 font-mono font-bold text-xs text-emerald-700 bg-emerald-50/70 px-2 py-1 rounded-md border border-emerald-200"
            title="Required Match Confidence"
          >
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            {confidenceVal}%
          </div>
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
