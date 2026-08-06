import React, { useState } from 'react';
import type { Job } from '../../types';
import { KpiCard } from '../ui/KpiCard';
import { Button } from '../ui/Button';
import { Plus } from 'lucide-react';
import { IngestJobModal } from './IngestJobModal';

interface JobsTabProps {
  jobs: Job[];
  onViewJob: (jobId: string) => void;
  onFileUploaded: (file: File, category: string) => void;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  jobs,
  onViewJob,
  onFileUploaded,
}) => {
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

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

      {/* Job History Table Card with Ingest New Job Action Button */}
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

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsIngestModalOpen(true)}
          >
            Ingest New Job
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Category / Source</th>
                <th className="px-4 py-3">File / Source Name</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3 text-right">Rows</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => onViewJob(job.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[11px] border border-indigo-100">
                      {job.category || 'Bank Statements'}
                    </span>
                  </td>
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
                    {job.rows}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-600 tnum">
                    {job.errors}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        job.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : job.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {job.at.slice(0, 10)} {job.at.slice(11, 16)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingest Job Category Selection & Upload Modal */}
      <IngestJobModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onFileUploaded={onFileUploaded}
      />
    </div>
  );
};
