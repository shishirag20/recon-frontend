import React, { useState, useMemo } from 'react';
import { MOCK_AR_RESULT } from '../../mocks/ar';
import { Button } from '../ui/Button';
import { Search, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import type { ARExceptionType } from '../../types';

export interface ARExceptionItem {
  id: string;
  key: string;
  type: ARExceptionType | string;
  relatedId: string;
  description: string;
  amount: number;
  status: 'Open' | 'Resolved' | 'Auto-resolved' | 'Deferred';
  date: string;
  customer?: string;
  confidence?: number;
  suggestedInvoiceId?: string;
  suggestedCustomerId?: string;
  ambiguousInvoiceIds?: string[];
}

export const ARExceptionsTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('amount-desc');
  const [activeExceptionKey, setActiveExceptionKey] = useState<string | null>('Short-Pay:INV-2026-003');
  const [shortPayDisposition, setShortPayDisposition] = useState<'writeoff' | 'keepopen' | 'dispute'>('writeoff');
  const [resolutionNote, setResolutionNote] = useState('');
  const { toast } = useToast();

  const exceptionsList: ARExceptionItem[] = useMemo(() => {
    const raw = MOCK_AR_RESULT.exceptions || [];
    return [
      {
        id: 'EXC-001',
        key: 'Short-Pay:INV-2026-003',
        type: 'Short-Pay',
        relatedId: 'INV-2026-003',
        description: 'Beta Retail Solutions short-paid INV/2026/003 by ₹500,000.00 (UTR8803441)',
        amount: 500000,
        status: 'Open',
        date: '2026-06-12',
        customer: 'Beta Retail Solutions',
        confidence: 90,
      },
      {
        id: 'EXC-002',
        key: 'Suspense:PAY-8804',
        type: 'Suspense',
        relatedId: 'PAY-8804',
        description: '₹1,500,000.00 payment from UNKNOWN PAYER (UTR8804990) could not be identified to any customer',
        amount: 1500000,
        status: 'Open',
        date: '2026-06-14',
        customer: 'UNKNOWN PAYER',
        confidence: 20,
        suggestedCustomerId: 'CUST-002',
        suggestedInvoiceId: 'INV-2026-004',
      },
      {
        id: 'EXC-003',
        key: 'Double Collision:PAY-8806',
        type: 'Double Collision',
        relatedId: 'PAY-8806',
        description: '₹4,200,000.00 payment exactly matches open invoices for both Beta Retail and Gamma Logistics',
        amount: 4200000,
        status: 'Open',
        date: '2026-06-15',
        customer: 'Multiple Candidates',
        confidence: 50,
      },
      {
        id: 'EXC-004',
        key: 'No Payment Received:INV-2026-005',
        type: 'No Payment Received',
        relatedId: 'INV-2026-005',
        description: 'Gamma Logistics India invoice INV/2026/005 (₹3,500,000.00) has received no payment past 30 days',
        amount: 3500000,
        status: 'Open',
        date: '2026-06-10',
        customer: 'Gamma Logistics India',
        confidence: 100,
      },
      {
        id: 'EXC-005',
        key: 'Bank Charge:BTXN-8805',
        type: 'Standalone Bank Charge',
        relatedId: 'BTXN-8805',
        description: '₹25,000.00 SWIFT remittance charge HDFC — auto-posted JE (Dr 6100 Bank Charges / Cr 1010 Cash)',
        amount: 25000,
        status: 'Auto-resolved',
        date: '2026-06-14',
        customer: 'HDFC Bank',
        confidence: 100,
      },
      ...raw.map((e, i) => ({
        id: `EXC-00${i + 6}`,
        key: e.key || `exc-${i}`,
        type: e.type,
        relatedId: e.relatedId,
        description: e.description,
        amount: e.amount,
        status: (e.status || 'Open') as any,
        date: e.date || '2026-06-14',
        customer: e.customer || 'Customer',
        confidence: e.confidence || 85,
      })),
    ];
  }, []);

  const [exceptions, setExceptions] = useState<ARExceptionItem[]>(exceptionsList);

  const filteredExceptions = useMemo(() => {
    let rows = exceptions.filter((e) => {
      if (selectedType !== 'all' && e.type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          (e.customer && e.customer.toLowerCase().includes(q)) ||
          e.id.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const [key, dir] = sortOption.split('-');
    return rows.sort((a, b) => {
      let av: any = a[key as keyof ARExceptionItem] || '';
      let bv: any = b[key as keyof ARExceptionItem] || '';
      if (key === 'amount' || key === 'confidence') {
        av = Number(av);
        bv = Number(bv);
      }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [exceptions, searchQuery, selectedType, sortOption]);

  const activeException = useMemo(() => {
    return exceptions.find((e) => e.key === activeExceptionKey);
  }, [exceptions, activeExceptionKey]);

  const handleResolveActive = (status: 'Resolved' | 'Auto-resolved' | 'Deferred') => {
    if (!activeExceptionKey) return;
    setExceptions((prev) =>
      prev.map((e) => (e.key === activeExceptionKey ? { ...e, status } : e))
    );
    toast(`Exception ${activeExceptionKey.split(':')[0]} marked as ${status}`, 'ok');
    setActiveExceptionKey(null);
  };

  const renderBadge = (type: string) => {
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (type === 'Short-Pay' || type === 'Double Collision' || type === 'No Payment Received') {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (type === 'Suspense' || type === 'Multiple Invoice Match') {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (type === 'Standalone Bank Charge') {
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    }

    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${badgeClass}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-5 fade-in w-full">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, description, ID..."
            className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs min-w-47.5"
        >
          <option value="all">All Exception Types ({exceptions.length})</option>
          <option value="Short-Pay">Short-Pay</option>
          <option value="Suspense">Suspense (Unidentified)</option>
          <option value="Double Collision">Double Collision</option>
          <option value="No Payment Received">No Payment Received</option>
          <option value="Standalone Bank Charge">Standalone Bank Charge</option>
        </select>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs min-w-45"
        >
          <option value="amount-desc">Amount: high → low</option>
          <option value="amount-asc">Amount: low → high</option>
          <option value="date-desc">Date: newest first</option>
          <option value="confidence-desc">Confidence: high → low</option>
        </select>
      </div>

      {/* Exception & Action Inbox Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 h-12 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
            Exception & Action Inbox
          </h3>
          <span className="text-[11.5px] text-slate-500 font-medium">
            {filteredExceptions.length} shown ·{' '}
            <span className="text-rose-600 font-semibold">
              {exceptions.filter((e) => e.status === 'Open').length} open
            </span>{' '}
            · click a row to resolve
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Confidence</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExceptions.map((e) => {
                const isSelected = activeExceptionKey === e.key;
                return (
                  <tr
                    key={e.key}
                    onClick={() => setActiveExceptionKey(e.key)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/60 font-medium' : 'hover:bg-slate-50/80'
                      }`}
                  >
                    <td className="px-4 py-4 align-middle">{renderBadge(e.type)}</td>
                    <td className="px-4 py-4 align-middle font-bold text-slate-900">
                      {e.customer || '—'}
                    </td>
                    <td className="px-4 py-4 align-middle text-slate-600 font-normal leading-snug">
                      {e.description}
                    </td>
                    <td className="px-4 py-4 align-middle text-slate-500 font-mono text-[11.5px]">
                      {e.date}
                    </td>
                    <td className="px-4 py-4 align-middle text-right font-mono text-slate-700">
                      {e.confidence}%
                    </td>
                    <td className="px-4 py-4 align-middle text-right font-mono font-bold text-rose-700">
                      ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${e.status === 'Resolved' || e.status === 'Auto-resolved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Resolution Panel */}
      {activeException && (
        <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm fade-in">
          {/* Panel Header */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Resolve Exception — {activeException.type}</span>
                {renderBadge(activeException.type)}
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {activeException.description}
              </p>
            </div>

            <button
              onClick={() => setActiveExceptionKey(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Body Per Exception Type */}
          <div className="p-5 space-y-4">
            {/* Panel 1: Short-Pay */}
            {activeException.type === 'Short-Pay' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">
                      Invoice Total
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      ₹{(activeException.amount + 500000).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">
                      Payment Received
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">₹5,000,000.00</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold text-rose-600 uppercase">
                      Shortage Amount
                    </div>
                    <div className="text-sm font-bold text-rose-700 mt-1">
                      ₹{activeException.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Resolution Disposition
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="shortpay-action"
                        checked={shortPayDisposition === 'writeoff'}
                        onChange={() => setShortPayDisposition('writeoff')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Write off shortage as small balance variance / TDS deduction
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Applies ₹500,000.00 to TDS adjustment expense account 6120.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="shortpay-action"
                        checked={shortPayDisposition === 'keepopen'}
                        onChange={() => setShortPayDisposition('keepopen')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Keep invoice open for balance follow-up
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Leaves ₹500,000.00 effective balance open on customer account.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Resolution Note
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Enter audit note for customer dispute or TDS deduction clearance..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-900 h-16 resize-none focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {/* Panel 2: Suspense */}
            {activeException.type === 'Suspense' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
                  <span>
                    Exact payment of ₹1,500,000.00 matched open invoice INV/2026/004, but customer identity requires confirmation.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">
                      Suggested Customer Match
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1">
                      Beta Retail Solutions
                    </div>
                    <div className="text-[11px] text-slate-500">Invoice INV/2026/004 · ₹1,500,000.00</div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">
                      Bank Narration
                    </div>
                    <div className="text-xs font-mono text-slate-800 mt-1 truncate">
                      IMPS REMITTANCE REF 990123
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveExceptionKey(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                onClick={() => handleResolveActive('Resolved')}
              >
                Save Decision & Resolve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
