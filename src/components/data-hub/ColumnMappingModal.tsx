import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { MOCK_MAPPINGS } from '../../mocks/data-hub';

interface ColumnMappingModalProps {
  fileName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  fileName,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [mapped, setMapped] = useState(false);

  const handleAiMap = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMapped(true);
    }, 850);
  };

  return (
    <div className="p-6 flex flex-col gap-5 fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Column Mapping Configuration
          </h2>
          <span className="text-xs text-slate-500 font-mono mt-0.5">
            File: {fileName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
        <span className="text-xs text-slate-600 font-medium">
          Map incoming CSV columns to canonical sub-ledger fields
        </span>
        <Button
          variant="ghost"
          size="sm"
          icon={Sparkles}
          onClick={handleAiMap}
          disabled={loading}
        >
          {loading ? 'Analyzing with AI...' : mapped ? 'AI Re-Map' : 'AI Map Fields'}
        </Button>
      </div>

      {mapped && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded-md flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>8 columns automatically matched with 98.4% confidence!</span>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3 bg-white">
        {MOCK_MAPPINGS.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-4 py-1.5 px-2 hover:bg-slate-50 rounded-md"
          >
            <div className="flex items-center gap-2 w-1/3">
              <span className="text-xs font-mono font-semibold text-slate-900">
                {m.ledger}
              </span>
              {m.required && (
                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">
                  REQ
                </span>
              )}
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 flex-none" />

            <div className="w-1/2 flex gap-2">
              <select className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-600">
                <option>{m.ledger}</option>
                <option>Custom Field</option>
                <option>Ignore Column</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
        >
          Save Column Mappings
        </button>
      </div>
    </div>
  );
};
