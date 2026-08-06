import React, { useState } from 'react';
import type { FieldMapping } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

interface SchemasTabProps {
  mappings: FieldMapping[];
  onDeleteMapping: (id: string) => void;
  onAddMapping: () => void;
}

export const SchemasTab: React.FC<SchemasTabProps> = ({
  mappings,
  onDeleteMapping,
  onAddMapping,
}) => {
  const [selectedSource, setSelectedSource] = useState('Bank Statements');

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Target Schema Selector Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Target Schema Definitions
          </h3>
          <span className="text-xs text-slate-500">
            Define canonical column validation rules for incoming ingestion files
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option value="Bank Statements">Bank Statements Schema</option>
            <option value="AR Subledger">AR Sub-ledger Schema</option>
            <option value="AP Subledger">AP Sub-ledger Schema</option>
            <option value="Customer Master">Customer Master Schema</option>
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
            Defined Columns ({mappings.length})
          </span>
          <span className="text-xs text-slate-400">
            Schema: {selectedSource}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Canonical Field Name</th>
                <th className="px-4 py-3">Data Type</th>
                <th className="px-4 py-3 text-center">Validation Requirement</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {m.ledger}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-medium uppercase">
                    {m.ledger.includes('date')
                      ? 'Date'
                      : m.ledger.includes('amount')
                      ? 'Decimal (12,2)'
                      : 'String'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        m.required
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {m.required ? 'Required' : 'Optional'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDeleteMapping(m.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                      title="Delete mapping"
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
