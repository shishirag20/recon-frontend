import React, { useState } from 'react';
import type { FieldMapping } from '../../types';
import { DATA_HUB_CATEGORIES } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

interface SchemasTabProps {
  mappings: FieldMapping[];
  onDeleteMapping: (id: string) => void;
  onAddMapping: () => void;
}

const getFriendlyFieldName = (key: string): string => {
  const map: Record<string, string> = {
    transaction_id: 'Transaction ID',
    transaction_date: 'Transaction Date',
    amount: 'Payment Amount',
    currency: 'ISO Currency Code',
    payer_name: 'Payer / Customer Name',
    bank_reference: 'Bank UTR / Reference',
    narration: 'Statement Narration / Memo',
    status: 'Clearing Status',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const getFriendlyDataType = (key: string): string => {
  if (key.includes('date')) return 'Date (YYYY-MM-DD)';
  if (key.includes('amount') || key.includes('balance') || key.includes('fee')) return 'Currency Amount (Decimal)';
  if (key.includes('currency')) return '3-Letter Currency Code (e.g. INR)';
  if (key.includes('id') || key.includes('ref')) return 'Alphanumeric Code / ID';
  return 'Text / String';
};

export const SchemasTab: React.FC<SchemasTabProps> = ({
  mappings,
  onDeleteMapping,
  onAddMapping,
}) => {
  const [selectedSource, setSelectedSource] = useState<string>(DATA_HUB_CATEGORIES[0]);

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Target Schema Selector Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Target Schema Definitions
          </h3>
          <span className="text-xs text-slate-500">
            Define standardized column validation rules and required fields for incoming statements
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
          >
            {DATA_HUB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat} Schema
              </option>
            ))}
          </select>

          <Button variant="primary" size="sm" icon={Plus} onClick={onAddMapping}>
            Add Field
          </Button>
        </div>
      </div>

      {/* Field Mappings Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">
            Defined Schema Fields ({mappings.length})
          </span>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Schema: {selectedSource}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Field Name (Database field name)</th>
                <th className="px-4 py-3">Expected Data Type</th>
                <th className="px-4 py-3 text-center">Requirement Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {getFriendlyFieldName(m.ledger)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      ({m.ledger})
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                      {getFriendlyDataType(m.ledger)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${m.required
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                    >
                      {m.required ? 'Mandatory (Required)' : 'Optional Field'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDeleteMapping(m.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                      title="Delete field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
