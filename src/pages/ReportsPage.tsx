import React, { useState, useMemo, useEffect } from 'react';
import { Topbar } from '../components/layout/Topbar';
import { TabBar } from '../components/layout/TabBar';
import { Button } from '../components/ui/Button';
import { Search, Download, Shield, FileText, ChevronRight } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { reportsService } from '../services/reports.service';
import { arService } from '../services/ar.service';
import { RunStatementModal, type RunReportDetail } from '../components/reports/RunStatementModal';

interface MatchedReportItem {
  id: string;
  runId: string;
  date: string;
  invoiceNum: string;
  customer: string;
  amount: number;
  paymentId: string;
  matchType: string;
  status: string;
}

interface AuditLogItem {
  id: string;
  at: string;
  user: string;
  action: string;
  category: 'engine' | 'mapping' | 'override' | 'signoff' | 'action';
  detail: string;
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [matchedStream, setMatchedStream] = useState<'bank-cash' | 'gateway' | 'gl'>('bank-cash');
  const [selectedRunModal, setSelectedRunModal] = useState<RunReportDetail | null>(null);
  const [fetchedRuns, setFetchedRuns] = useState<RunReportDetail[]>([]);
  const [arExceptions, setArExceptions] = useState<any[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    let cancelled = false;
    
    reportsService.getReportRuns().then((runs: any) => {
      if (!cancelled && runs && runs.length > 0) {
        setFetchedRuns(runs);
      }
    }).catch(() => {});

    arService.getARReconciliation().then((ar) => {
      if (!cancelled && ar && ar.exceptions) {
        setArExceptions(ar.exceptions);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const reportRuns: RunReportDetail[] = useMemo(() => {
    if (fetchedRuns.length > 0) return fetchedRuns;
    return [
    {
      runId: 'RUN-20260701-AR001',
      date: '2026-07-01',
      type: 'Accounts Receivable (AR)',
      volume: 14,
      matched: 10,
      matchRate: 85.5,
      unappliedCash: 0,
      exceptions: 4,
      exceptionValue: 2000000,
      status: 'Under review',
      preparedBy: 'Alex Rivera',
      reviewedBy: 'Alex Rivera',
      signedAt: '2026-07-01 17:00:00 ISO',
    },
    {
      runId: 'RUN-20260615-AR002',
      date: '2026-06-15',
      type: 'Accounts Receivable (AR)',
      volume: 42,
      matched: 40,
      matchRate: 95.2,
      unappliedCash: 1500000,
      exceptions: 2,
      exceptionValue: 500000,
      status: 'Signed off',
      preparedBy: 'Alex Rivera',
      reviewedBy: 'Marcus Feld',
      signedAt: '2026-06-15 18:30:00 ISO',
    },
    {
      runId: 'RUN-20260601-AP001',
      date: '2026-06-01',
      type: 'Accounts Payable (AP)',
      volume: 120,
      matched: 118,
      matchRate: 98.3,
      unappliedCash: 0,
      exceptions: 0,
      exceptionValue: 0,
      status: 'Signed off',
      preparedBy: 'Priya Nair',
      reviewedBy: 'Priya Nair',
      signedAt: '2026-06-01 16:45:00 ISO',
    },
    {
      runId: 'RUN-20260515-GL001',
      date: '2026-05-15',
      type: 'GL Subledger Control',
      volume: 85,
      matched: 85,
      matchRate: 100.0,
      unappliedCash: 0,
      exceptions: 0,
      exceptionValue: 0,
      status: 'Signed off',
      preparedBy: 'Marcus Feld',
      reviewedBy: 'Marcus Feld',
      signedAt: '2026-05-15 15:10:00 ISO',
    },
  ];
  }, [fetchedRuns]);

  const reportMatched: MatchedReportItem[] = useMemo(() => [
    {
      id: 'M-101',
      runId: 'RUN-20260701-AR001',
      date: '2026-07-01',
      invoiceNum: 'INV/2026/001',
      customer: 'Acme Technologies Pvt Ltd',
      amount: 5000000,
      paymentId: 'PAY-8801',
      matchType: 'Exact Invoice Number Match',
      status: 'Matched',
    },
    {
      id: 'M-102',
      runId: 'RUN-20260701-AR001',
      date: '2026-07-01',
      invoiceNum: 'INV/2026/002',
      customer: 'Acme Technologies Pvt Ltd',
      amount: 12000000,
      paymentId: 'PAY-8802',
      matchType: 'Exact Invoice Number Match',
      status: 'Matched',
    },
    {
      id: 'M-103',
      runId: 'RUN-20260615-AR002',
      date: '2026-06-15',
      invoiceNum: 'INV/2026/003',
      customer: 'Beta Retail Solutions',
      amount: 8000000,
      paymentId: 'PAY-8803',
      matchType: 'TDS-Adjusted Match',
      status: 'Matched',
    },
  ], []);

  const auditLogs: AuditLogItem[] = useMemo(() => [
    {
      id: 'AUD-001',
      at: '2026-07-01 10:30:14',
      user: 'Alex Rivera',
      action: 'Ran reconciliation',
      category: 'engine',
      detail: 'Executed AR Reconciliation engine against 14 records',
    },
    {
      id: 'AUD-002',
      at: '2026-07-01 10:45:00',
      user: 'Alex Rivera',
      action: 'Resolved Short-Pay Exception',
      category: 'override',
      detail: 'Accepted ₹500,000.00 TDS write-off for Beta Retail Solutions',
    },
    {
      id: 'AUD-003',
      at: '2026-06-15 17:00:22',
      user: 'Marcus Feld',
      action: 'Finished reconciliation sign-off',
      category: 'signoff',
      detail: 'Certified RUN-20260615-AR002 signed off without open variances',
    },
  ], []);

  const handleExportCSV = (reportName: string) => {
    const csvContent = "data:text/csv;charset=utf-8,Run ID,Date,Type,Volume,Status\nRUN-20260701-AR001,2026-07-01,AR,14,Under review";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportName.toLowerCase().replace(/\s+/g, '-')}-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast(`Exported ${reportName} to CSV`, 'ok');
  };

  // Exact tabs matching index copy.html
  const tabs = [
    { key: 'summary', label: 'Summary Statements', badge: reportRuns.length },
    { key: 'matched', label: 'Matched Transactions', badge: reportMatched.length },
    { key: 'exceptions', label: 'Exception & Adjustment Logs', badge: arExceptions.length },
    { key: 'audit', label: 'Audit Trails', badge: auditLogs.length },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <Topbar
        title="Reports & Audit Archive"
        subtitle="Historical archive of completed reconciliation runs — read-only certified statements"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Download}
              onClick={() => handleExportCSV('Reconciliation Summary Report')}
              className="border border-slate-200"
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FileText}
              onClick={() => toast('Opening print preview for Audit Report...', 'ok')}
            >
              Print Audit Report
            </Button>
          </div>
        }
      />

      {/* Main Tab Bar */}
      <div className="bg-white flex-none border-b border-slate-200 px-6">
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key)}
        />
      </div>

      {/* Tab Body Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 fade-in w-full">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Completed Runs
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {reportRuns.length}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                Reconciliations run to date
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Signed Off
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {reportRuns.filter((r) => r.status === 'Signed off').length}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                Certified & locked runs
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Matched Value
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                ₹25,000,000.00
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                Across all runs
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Exceptions Logged
              </div>
              <div className="text-xl font-bold font-mono text-rose-600 mt-1">
                {arExceptions.length}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                Currently open
              </div>
            </div>
          </div>

          {/* TAB 1: Summary Statements */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Filter Toolbar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Run ID, type, preparer..."
                    className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs min-w-37.5"
                >
                  <option value="all">All Statuses</option>
                  <option value="Signed off">Signed off</option>
                  <option value="Completed">Completed</option>
                  <option value="Under review">Under review</option>
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => handleExportCSV('Completed Runs')}
                  className="ml-auto border border-slate-200"
                >
                  Export List
                </Button>
              </div>

              {/* Runs Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Run ID</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Volume</th>
                        <th className="px-4 py-3 text-right">Matched</th>
                        <th className="px-4 py-3 text-right">Unapplied Cash</th>
                        <th className="px-4 py-3 text-right">Exceptions</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportRuns.map((r) => (
                        <tr
                          key={r.runId}
                          onClick={() => setSelectedRunModal(r)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3.5 font-mono font-bold text-indigo-600">
                            {r.runId}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-500">
                            {r.date}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {r.type}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900">
                            {r.volume}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-700">
                            {r.matched}{' '}
                            <span className="text-[10.5px] text-slate-400 font-normal">
                              ({r.matchRate}%)
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700">
                            ₹{r.unappliedCash.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600">
                            {r.exceptions || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${r.status === 'Signed off'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : r.status === 'Completed'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Matched Transactions */}
          {activeTab === 'matched' && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg shadow-xs">
                <button
                  onClick={() => setMatchedStream('bank-cash')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold ${matchedStream === 'bank-cash'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Bank Deposits ↔ Open Invoices
                </button>
                <button
                  onClick={() => setMatchedStream('gateway')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold ${matchedStream === 'gateway'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Gateway Settlements
                </button>
                <button
                  onClick={() => setMatchedStream('gl')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold ${matchedStream === 'gl'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  GL Control Schedule
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Invoice / Item</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Payment / Deposit</th>
                        <th className="px-4 py-3">Match Type</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportMatched.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {m.invoiceNum}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {m.customer}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                            ₹{m.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-600">
                            {m.paymentId}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                              {m.matchType}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Exception & Adjustment Logs */}
          {activeTab === 'exceptions' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Run ID</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {arExceptions.map((exc: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3.5 font-mono text-slate-500">
                            {exc.date || '2026-06-12'}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-indigo-600 font-bold">
                            RUN-20260701-AR001
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                              {exc.type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {exc.customer || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-700">
                            ₹{exc.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                              {exc.status || 'Open'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Audit Trails */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600 flex-none" />
                  <span className="font-medium">
                    Immutable Compliance Audit Trail — all manual overrides, rule executions, and sign-offs are logged.
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => handleExportCSV('Audit Log Trail')}
                  className="bg-white border border-indigo-200"
                >
                  Export Log
                </Button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3.5 font-mono text-slate-500">
                            {log.at}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {log.user}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {log.action}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 uppercase">
                              {log.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-normal">
                            {log.detail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Run Statement Snapshot Modal */}
      <RunStatementModal
        isOpen={!!selectedRunModal}
        run={selectedRunModal}
        onClose={() => setSelectedRunModal(null)}
      />
    </div>
  );
};
