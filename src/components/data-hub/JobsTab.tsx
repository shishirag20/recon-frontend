import React, { useState } from 'react';
import type { Job } from '../../types';
import { KpiCard } from '../ui/KpiCard';
import { UploadDropzone } from './UploadDropzone';
import { StatusPill } from '../ui/StatusPill';
import { Button } from '../ui/Button';

interface JobsTabProps {
  jobs: Job[];
  onViewJob: (jobId: string) => void;
  onFileUploaded: (file: File) => void;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  jobs,
  onViewJob,
  onFileUploaded,
}) => {
  const [selectedSource, setSelectedSource] = useState('Bank Statements');

  const jobsToday = jobs.length;
  const rowsInError = jobs.reduce((sum, j) => sum + j.errors, 0);

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Top KPI Row */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label="Today's Ingestion Jobs"
          value={jobsToday}
          sub="Automated & manual jobs processed"
        />
        <KpiCard
          label="Rows In Error"
          value={rowsInError}
          sub={rowsInError > 0 ? 'Requires column mapping or validation' : 'All rows clean'}
          className={rowsInError > 0 ? 'border-red-200 bg-red-50/20' : ''}
        />
      </div>

      {/* Upload Dropzone Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Ingest New Source File
            </h3>
            <span className="text-xs text-slate-500">
              Select source category and upload transaction statements
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">
              Source Ledger:
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
            >
              <option value="Bank Statements">Bank Statements</option>
              <option value="GL Sub-ledger">GL Sub-ledger (AR/AP)</option>
              <option value="Customer Master">Customer Master</option>
              <option value="Gateway Settlements">Gateway Settlements</option>
            </select>
          </div>
        </div>

        <UploadDropzone
          onFileSelect={onFileUploaded}
          label={`Upload file for ${selectedSource}`}
          hint="Supports CSV, XLS, XLSX formats up to 50MB"
        />
      </div>

      {/* Job History Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Ingestion Job History
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {jobs.length} jobs
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Source Name</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3 text-right">Rows</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => onViewJob(job.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-indigo-600 hover:underline">
                    {job.source}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium capitalize">
                      {job.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{job.format}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 tnum">
                    {job.rows.toLocaleString()}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold tnum ${
                      job.errors > 0 ? 'text-red-600' : 'text-slate-400'
                    }`}
                  >
                    {job.errors}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={job.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 tnum">
                    {new Date(job.at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewJob(job.id)}
                    >
                      View Rows
                    </Button>
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
