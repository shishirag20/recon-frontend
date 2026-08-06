import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X, Plus } from 'lucide-react';

interface InsertRowModalProps {
  onClose: () => void;
  onAdd: (row: any) => void;
}

export const InsertRowModal: React.FC<InsertRowModalProps> = ({
  onClose,
  onAdd,
}) => {
  const [formData, setFormData] = useState({
    date: '2026-06-15',
    description: '',
    reference: '',
    amount: '',
    currency: 'INR',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    onAdd(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Insert Manual Data Row
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Transaction Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Description / Counterparty
          </label>
          <input
            type="text"
            placeholder="e.g. Acme Corp NEFT Inward"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Reference / UTR Number
          </label>
          <input
            type="text"
            placeholder="e.g. UTR998811"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Amount
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" icon={Plus}>
          Add Row
        </Button>
      </div>
    </form>
  );
};
