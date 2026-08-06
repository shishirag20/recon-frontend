import React from 'react';
import type { ARRule } from '../../types';

interface ARRuleEditorProps {
  rule: ARRule;
  matchedCount?: number;
  onUpdateRule: (updated: ARRule) => void;
}

export const ARRuleEditor: React.FC<ARRuleEditorProps> = ({
  rule,
  matchedCount = 0,
  onUpdateRule,
}) => {
  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateRule({ ...rule, name: e.target.value });
  };

  const handleChangeConfidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateRule({ ...rule, confidence: Number(e.target.value) });
  };

  const handleChangeMatchMode = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateRule({
      ...rule,
      matchMode: e.target.value as 'exact' | 'contains',
    });
  };

  const handleChangeAmountTolerance = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateRule({
      ...rule,
      cond: {
        ...rule.cond,
        amount: {
          ...rule.cond.amount,
          value: Number(e.target.value),
        },
      },
    });
  };

  const handleChangeDateWindow = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateRule({
      ...rule,
      cond: {
        ...rule.cond,
        date: {
          days: Number(e.target.value),
        },
      },
    });
  };

  return (
    <div className="border-t border-slate-200 px-4 py-4 bg-slate-50/70 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs fade-in">
      {/* Live Match Count Banner */}
      <div className="md:col-span-2 -mt-1 text-[11.5px] text-slate-500 font-medium">
        Live:{' '}
        <span className={`font-mono font-semibold ${matchedCount ? 'text-emerald-700' : 'text-slate-400'}`}>
          {matchedCount} matched
        </span>{' '}
        with these settings in this run
      </div>

      {/* Rule Name Field */}
      <div className="md:col-span-2">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Rule Name
        </label>
        <input
          type="text"
          value={rule.name}
          onChange={handleChangeName}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 h-9 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
        />
      </div>

      {/* Field Comparison Row (if configurable) */}
      <div className="md:col-span-2 space-y-2">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Field Comparison Pair
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-slate-200/60 px-2.5 py-1 rounded-md text-slate-600 font-mono text-[11.5px]">
            Bank Statement
          </span>
          <select
            value={rule.bankField || 'narration'}
            onChange={(e) => onUpdateRule({ ...rule, bankField: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg px-2.5 h-8 font-mono text-[11.5px] text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="narration">narration</option>
            <option value="payer_account_number">payer_account_number</option>
            <option value="bank_reference_number">bank_reference_number</option>
            <option value="amount">amount</option>
          </select>

          <span className="text-slate-400 font-bold">↔</span>

          <span className="bg-slate-200/60 px-2.5 py-1 rounded-md text-slate-600 font-medium text-[11.5px]">
            {rule.secondSource || 'Customer / Invoice Master'}
          </span>
          <select
            value={rule.secondField || 'customer_code'}
            onChange={(e) => onUpdateRule({ ...rule, secondField: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg px-2.5 h-8 font-mono text-[11.5px] text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="customer_code">customer_code</option>
            <option value="invoice_number">invoice_number</option>
            <option value="bank_account_number">bank_account_number</option>
            <option value="gstin">gstin</option>
          </select>
        </div>
      </div>

      {/* Match Mode Picker */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Match Mode
        </label>
        <select
          value={rule.matchMode || 'exact'}
          onChange={handleChangeMatchMode}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
        >
          <option value="exact">Exact String Match</option>
          <option value="contains">Contains Substring</option>
        </select>
      </div>

      {/* Amount Tolerance */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Amount Tolerance (₹ / %)
        </label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={rule.cond?.amount?.value || 0}
          onChange={handleChangeAmountTolerance}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
        />
      </div>

      {/* Date Window */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Date Window (± Days)
        </label>
        <input
          type="number"
          min="0"
          max="60"
          value={rule.cond?.date?.days || 0}
          onChange={handleChangeDateWindow}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
        />
      </div>

      {/* Confidence Slider */}
      <div className="md:col-span-2 pt-2 border-t border-slate-200">
        <div className="flex items-center gap-4">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex-none">
            Confidence Threshold
          </label>
          <input
            type="range"
            min="50"
            max="100"
            value={rule.confidence}
            onChange={handleChangeConfidence}
            className="flex-1 max-w-xs accent-indigo-600 cursor-pointer"
          />
          <span className="font-mono text-xs font-bold text-slate-900 w-8">
            {rule.confidence}%
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Matches at or above this threshold execute automatically; below it, items surface for review in Exceptions.
        </p>
      </div>
    </div>
  );
};
