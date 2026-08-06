import React from 'react';
import type { Job } from '../../types';
import { Button } from '../ui/Button';
import { X, FileText } from 'lucide-react';
import { StatusPill } from '../ui/StatusPill';
import { MOCK_STAGING } from '../../mocks/data-hub';

interface JobDataModalProps {
  job: Job;
  onClose: () => void;
}

export const JobDataModal: React.FC<JobDataModalProps> = ({ job, onClose }) => {
  const rows = MOCK_STAGING.filter((r) => r.jobId === job.id);

  return (
    <div className="p-6 flex flex-col gap-5 fade-in max-h-[85vh] w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Ingestion Job Details
            </h2>
            <StatusPill status={job.status} />
          </div>
          <span className="text-xs text-slate-500 mt-0.5">
            Job ID: {job.id} · Source: {job.source}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Metadata KPI Row */}
      <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">{job.format}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</div>
          <div className="text-sm font-bold text-slate-900 tnum mt-0.5">{job.rows.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Error Count</div>
          <div className={`text-sm font-bold tnum mt-0.5 ${job.errors > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {job.errors}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingested At</div>
          <div className="text-sm text-slate-700 tnum mt-0.5">
            {new Date(job.at).toLocaleDateString()} {new Date(job.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Staging Rows Preview</span>
          </span>
          <span className="text-xs text-slate-500 font-normal">
            Showing {rows.length > 0 ? rows.length : 0} rows
          </span>
        </div>

        <div className="overflow-y-auto max-h-72">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-3 w-28">Txn ID</th>
                <th className="px-4 py-3 w-28">Date</th>
                <th className="px-4 py-3 w-64">Counterparty / Description</th>
                <th className="px-4 py-3 w-40">Reference</th>
                <th className="px-4 py-3 w-32 text-right">Amount</th>
                <th className="px-4 py-3 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-indigo-600 tnum truncate">{r.txnId}</td>
                    <td className="px-4 py-3 text-slate-500 tnum truncate">{r.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 truncate">{r.counterparty}</div>
                      <div className="text-[11px] text-slate-500 truncate">{r.description}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium truncate">{r.reference}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tnum truncate">
                      ₹{r.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No staging rows available for this job
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-slate-200 pt-4">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};
