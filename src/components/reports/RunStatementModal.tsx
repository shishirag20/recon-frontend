import React from 'react';
import { Modal } from '../layout/Modal';
import { Button } from '../ui/Button';
import { Shield, Download, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export interface RunReportDetail {
  runId: string;
  date: string;
  type: string;
  volume: number;
  matched: number;
  matchRate: number;
  unappliedCash: number;
  exceptions: number;
  exceptionValue: number;
  status: 'Signed off' | 'Completed' | 'Under review';
  preparedBy: string;
  reviewedBy?: string;
  signedAt?: string;
}

interface RunStatementModalProps {
  isOpen: boolean;
  run: RunReportDetail | null;
  onClose: () => void;
}

export const RunStatementModal: React.FC<RunStatementModalProps> = ({
  isOpen,
  run,
  onClose,
}) => {
  const { toast } = useToast();

  if (!run) return null;

  const handleExportPDF = () => {
    toast(`Exported PDF summary statement for ${run.runId}`, 'ok');
  };

  const handleExportExcel = () => {
    toast(`Exported Excel workbook for ${run.runId}`, 'ok');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="xl">
      <div className="p-6 space-y-5 text-xs">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {run.runId}
              <span className="text-xs font-normal text-slate-500">
                · {run.type} reconciliation
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-slate-500">{run.date}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  run.status === 'Signed off'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : run.status === 'Completed'
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {run.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Download}
              onClick={handleExportPDF}
              className="border border-slate-200"
            >
              PDF summary
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportExcel}
            >
              Excel workbook
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shield Lock Note */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2 font-medium">
          <Shield className="w-4 h-4 text-emerald-600 flex-none" />
          <span>
            Locked snapshot · read-only · certified sign-off record
          </span>
        </div>

        {/* 6 KPI Grid */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Volume Processed
            </div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              {run.volume.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Matched Items
            </div>
            <div className="text-base font-bold font-mono text-emerald-700 mt-1">
              {run.matched.toLocaleString('en-IN')}{' '}
              <span className="text-xs text-slate-400 font-normal">
                ({run.matchRate}%)
              </span>
            </div>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Unapplied Cash
            </div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              ₹{run.unappliedCash.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Open Exceptions
            </div>
            <div className="text-base font-bold font-mono text-rose-600 mt-1">
              {run.exceptions}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Exception Value
            </div>
            <div className="text-base font-bold font-mono text-rose-600 mt-1">
              ₹{run.exceptionValue.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Currency
            </div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              INR (₹)
            </div>
          </div>
        </div>

        {/* Audit Sign-off Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Prepared By
            </div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              {run.preparedBy}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Reviewed & Signed By
            </div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              {run.reviewedBy || 'Alex Rivera (Chief Accountant)'}
            </div>
            <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
              {run.signedAt || `${run.date} 17:00:00 ISO`}
            </div>
          </div>
        </div>

        {/* Matched Sample Table */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Archived Matched Sample List
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-400 uppercase">
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Match Rule</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-600">INV/2026/001</td>
                  <td className="px-3 py-2 font-bold text-slate-900">Acme Technologies Pvt Ltd</td>
                  <td className="px-3 py-2 text-slate-500">Pre-Advised UTR Match</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">₹5,000,000.00</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-600">INV/2026/002</td>
                  <td className="px-3 py-2 font-bold text-slate-900">Acme Technologies Pvt Ltd</td>
                  <td className="px-3 py-2 text-slate-500">Exact Invoice Number Match</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">₹12,000,000.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
