import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Plus, CreditCard, Landmark, FileText, Database, Check } from 'lucide-react';
import type { Reconciliation } from '../../types';

interface TemplateMeta {
  key: string;
  label: string;
  category: string;
  icon: React.ElementType;
  a: string;
  b: string;
  aKind: string;
  bKind: string;
}

const TEMPLATES: TemplateMeta[] = [
  {
    key: 'payments',
    label: 'Payments',
    category: 'payments',
    icon: CreditCard,
    a: 'Stripe payouts',
    b: 'Order ledger',
    aKind: 'Processor',
    bKind: 'Internal',
  },
  {
    key: 'bank',
    label: 'Bank / Cash',
    category: 'bank',
    icon: Landmark,
    a: 'Bank statement',
    b: 'GL cash account',
    aKind: 'Bank',
    bKind: 'General ledger',
  },
  {
    key: 'close',
    label: 'Subledger → GL',
    category: 'subledger',
    icon: FileText,
    a: 'AR subledger',
    b: 'GL control account',
    aKind: 'Subledger',
    bKind: 'General ledger',
  },
  {
    key: 'ar',
    label: 'Accounts Receivable',
    category: 'ar-reconciliation',
    icon: CreditCard,
    a: 'Bank deposits',
    b: 'Open invoices',
    aKind: 'Bank',
    bKind: 'AR ledger',
  },
  {
    key: 'ap',
    label: 'Accounts Payable',
    category: 'ap',
    icon: FileText,
    a: 'Vendor bills',
    b: 'Sent payments',
    aKind: 'AP ledger',
    bKind: 'Bank',
  },
  {
    key: 'payroll',
    label: 'Payroll',
    category: 'payroll',
    icon: Landmark,
    a: 'Bank withdrawals',
    b: 'Payroll register',
    aKind: 'Bank',
    bKind: 'HR system',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    category: 'inventory',
    icon: Database,
    a: 'Goods receipts',
    b: 'Vendor invoices',
    aKind: 'Warehouse',
    bKind: 'AP ledger',
  },
];

interface NewReconciliationModalProps {
  onClose: () => void;
  onCreate: (job: Reconciliation) => void;
}

export const NewReconciliationModal: React.FC<NewReconciliationModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>('ar');
  const selectedTemplate = TEMPLATES.find((t) => t.key === selectedKey) || TEMPLATES[3];
  const [name, setName] = useState<string>(`${selectedTemplate.a} ↔ ${selectedTemplate.b}`);

  const handleSelectTemplate = (tmpl: TemplateMeta) => {
    setSelectedKey(tmpl.key);
    setName(`${tmpl.a} ↔ ${tmpl.b}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newJob: Reconciliation = {
      id: `REC-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      category: selectedTemplate.category,
      status: 'Needs resolution',
      matchRate: 0,
      totalRows: 250,
      matchedRows: 0,
      unmatchedRows: 250,
      exceptionsCount: 0,
      autoResolvedCount: 0,
      owner: 'Alex Rivera',
      due: 'Jul 30',
      cadence: 'Daily',
      lastRun: new Date().toISOString(),
      sourceLeft: selectedTemplate.a,
      sourceRight: selectedTemplate.b,
    };

    onCreate(newJob);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 w-full flex flex-col gap-4 fade-in">
      {/* Modal Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">New reconciliation</h2>
        <p className="text-xs text-slate-500 mt-1">
          Pick a template — sources and a starter rule set come pre-configured.
        </p>
      </div>

      {/* Templates Grid (3 Columns) */}
      <div className="grid grid-cols-3 gap-2.5 my-1">
        {TEMPLATES.map((tmpl) => {
          const isSelected = selectedKey === tmpl.key;
          const IconComp = tmpl.icon;
          return (
            <button
              key={tmpl.key}
              type="button"
              onClick={() => handleSelectTemplate(tmpl)}
              className={`p-3 text-left rounded-xl transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-white shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <IconComp className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">{tmpl.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium leading-tight">
                  {tmpl.a} ↔ {tmpl.b}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Name Input Field */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${selectedTemplate.a} ↔ ${selectedTemplate.b}`}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 h-10 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
          required
        />
      </div>

      {/* Source Cards Row (2 Side-by-Side Cards) */}
      <div className="grid grid-cols-2 gap-3 my-1">
        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 flex-none">
            {React.createElement(selectedTemplate.icon, { className: 'w-4 h-4' })}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">{selectedTemplate.a}</div>
            <div className="text-[11px] font-medium text-slate-400">{selectedTemplate.aKind}</div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex items-center gap-1 border border-emerald-200/60 ml-auto whitespace-nowrap">
            <Check className="w-3 h-3 text-emerald-600" />
            Ready
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 flex-none">
            {React.createElement(selectedTemplate.icon, { className: 'w-4 h-4' })}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">{selectedTemplate.b}</div>
            <div className="text-[11px] font-medium text-slate-400">{selectedTemplate.bKind}</div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex items-center gap-1 border border-emerald-200/60 ml-auto whitespace-nowrap">
            <Check className="w-3 h-3 text-emerald-600" />
            Ready
          </span>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" icon={Plus}>
          Create reconciliation
        </Button>
      </div>
    </form>
  );
};
