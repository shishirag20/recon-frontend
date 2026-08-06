import React from 'react';
import { MatchRateRing } from '../ui/MatchRateRing';
import { ExceptionTypeBadge } from '../ui/ExceptionTypeBadge';
import { MOCK_AR_RESULT } from '../../mocks/ar';
import { CreditCard, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';

interface AROverviewTabProps {
  onNavigateTab: (tab: string) => void;
}

export const AROverviewTab: React.FC<AROverviewTabProps> = ({ onNavigateTab }) => {
  const arData = MOCK_AR_RESULT;

  const invoices = arData.invoices || [];
  const matches = arData.matches || [];
  const exceptions = arData.exceptions || [];
  const bankStatements = arData.bankStatements || [];
  const customers = arData.customers || [];

  const totalInvoiceVal = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const matchedVal = matches.reduce((s, m) => s + (m.amount || 0), 0);
  const openExceptions = exceptions.filter((e) => e.status === 'Open');

  // Age buckets calculation
  const agingBuckets = [
    { label: 'Current', amount: 250000 },
    { label: '31–60 days', amount: 180000 },
    { label: '61–90 days', amount: 96500 },
    { label: '90+ days', amount: 53500 },
  ];

  return (
    <div className="p-6 space-y-6 fade-in max-w-7xl mx-auto">
      {/* Top 5 KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* KPI 1: Total Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Invoices
          </div>
          <div className="text-xl font-bold text-slate-900 tnum mt-1">
            {invoices.length}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            ₹{totalInvoiceVal.toLocaleString('en-IN')}
          </div>
        </div>

        {/* KPI 2: Identified Customers */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Identified Customers
          </div>
          <div className="text-xl font-bold text-slate-900 tnum mt-1">
            {customers.length}
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-0.5">
            100% Phase 1 lock
          </div>
        </div>

        {/* KPI 3: Matched Payments */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Matched Payments
          </div>
          <div className="text-xl font-bold text-slate-900 tnum mt-1">
            {matches.length}
          </div>
          <div className="text-xs text-emerald-600 font-mono font-semibold mt-0.5">
            ₹{matchedVal.toLocaleString('en-IN')}
          </div>
        </div>

        {/* KPI 4: Open Exceptions */}
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Open Exceptions
          </div>
          <div className="text-xl font-bold text-amber-700 tnum mt-1">
            {openExceptions.length}
          </div>
          <div className="text-xs text-amber-600 font-semibold mt-0.5">
            Needs manual review
          </div>
        </div>

        {/* KPI 5: Match Rate Gauge Ring */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Match Rate
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">26.0%</div>
            <div className="text-[11px] text-slate-500 font-medium">10 / 12 invoices</div>
          </div>
          <MatchRateRing rate={26} size={48} strokeWidth={4} />
        </div>
      </div>

      {/* Middle Section: 2 Columns (Exception Breakdown & Bank Receipts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exception Types & Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Exceptions Breakdown
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('exceptions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View Exceptions <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {openExceptions.map((exc) => (
              <div
                key={exc.id}
                onClick={() => onNavigateTab('exceptions')}
                className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <ExceptionTypeBadge type={exc.type} />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{exc.description}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {exc.customer || exc.relatedId}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 tnum">
                    ₹{exc.amount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase">
                    {exc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Statements Summary */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Bank Statement Transactions
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {bankStatements.length} total rows
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-70 overflow-y-auto">
            {bankStatements.map((bs) => (
              <div key={bs.bankTxnId} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900">{bs.payerName}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {bs.bankTxnId} · {bs.transactionDate}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 tnum">
                    ₹{(bs.amount || 0).toLocaleString('en-IN')}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold ${bs.clearingStatus === 'Reconciled'
                      ? 'text-emerald-600'
                      : bs.clearingStatus === 'Bank Charge'
                        ? 'text-indigo-600'
                        : 'text-amber-600'
                      }`}
                  >
                    {bs.clearingStatus === 'Reconciled' && <CheckCircle2 className="w-3 h-3" />}
                    {bs.clearingStatus === 'Exception' && <AlertTriangle className="w-3 h-3" />}
                    {bs.clearingStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Aging Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Invoice Aging Breakdown
          </h3>
          <span className="text-xs text-slate-500">Open receivables by age bucket</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
          {agingBuckets.map((bucket, idx) => (
            <div key={bucket.label} className="p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {bucket.label}
              </div>
              <div
                className={`text-lg font-bold tnum mt-1 ${idx >= 2 ? 'text-amber-700' : 'text-slate-900'
                  }`}
              >
                ₹{bucket.amount.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
