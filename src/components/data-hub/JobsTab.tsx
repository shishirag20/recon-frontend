import React, { useState, useRef, useEffect } from 'react';
import { KpiCard } from '../ui/KpiCard';
import {
  Landmark,
  UploadCloud,
  Loader2,
  RefreshCw,
  ArrowUpCircle,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import type { IngestionJobOut, DataSourceOut } from '../../types/datahub';
import { STREAM_BY_CATEGORY } from '../../types/datahub';
import { useDataHubStore } from '../../store/useDataHubStore';
import { ingestionJobService, dataSourceService } from '../../services';
import { useToast } from '../../hooks/useToast';
import {
  CATEGORY_ICONS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_COLORS,
  STATUS_STYLES,
  STATUS_LABEL,
  POLL_INTERVAL_MS,
  TERMINAL_STATUSES,
  type DisplayJobStatus,
} from '../../constants/datahub';

interface JobsTabProps {
  jobs: IngestionJobOut[];
  onViewJob: (jobId: string) => void;
  onJobComplete: (job: IngestionJobOut) => void;
  onPromote: (jobId: string) => void;
  onRetry: (jobId: string) => void;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  jobs,
  onViewJob,
  onJobComplete,
  onPromote,
  onRetry,
}) => {
  const [dataSources, setDataSources] = useState<DataSourceOut[]>([]);
  const [activeUploadingSourceId, setActiveUploadingSourceId] = useState<string | null>(null);
  const [activeUploadingStream, setActiveUploadingStream] = useState<string>('BANK');
  const [pollingJobsMap, setPollingJobsMap] = useState<Record<string, { job: IngestionJobOut; text: string }>>({});
  const [actioningJobId, setActioningJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const { toast } = useToast();
  const sourcesList = useDataHubStore((s) => s.sourcesList);
  const setSourcesInStore = useDataHubStore((s) => s.setSources);
  const upsertJobInStore = useDataHubStore((s) => s.upsertJob);

  // ── Sync Data Sources from Store ─────────────────────────────────────────────
  useEffect(() => {
    if (sourcesList.length > 0) {
      setDataSources(sourcesList);
    } else {
      dataSourceService.list().then((sources) => {
        if (sources.length > 0) {
          setDataSources(sources);
          setSourcesInStore(sources);
        }
      }).catch(() => {});
    }
    return () => {
      Object.values(pollTimersRef.current).forEach(clearInterval);
    };
  }, [sourcesList, setSourcesInStore]);

  // ── Aggregate INGEST jobs with child PROMOTE jobs ───────────────────────────
  const processDisplayJobs = (rawJobs: IngestionJobOut[]) => {
    const promoteMap = new Map<string, IngestionJobOut>();

    rawJobs.forEach((j) => {
      if (j.job_type === 'PROMOTE' && j.parent_job_id) {
        promoteMap.set(j.parent_job_id, j);
      }
    });

    return rawJobs
      .filter((j) => j.job_type === 'INGEST')
      .map((j) => {
        const childPromote = promoteMap.get(j.job_id);
        let displayStatus: DisplayJobStatus = j.status;

        if (childPromote) {
          if (childPromote.status === 'SUCCESS') {
            displayStatus = 'PROMOTED';
          } else if (childPromote.status === 'RUNNING' || childPromote.status === 'PENDING') {
            displayStatus = 'PROMOTING';
          }
        }

        return {
          ...j,
          displayStatus,
          childPromote,
        };
      });
  };

  const displayJobs = processDisplayJobs(jobs);
  const jobsToday = displayJobs.length;
  const rowsInError = displayJobs.reduce((sum, j) => sum + j.error_count, 0);

  // ── Handle Card Click ➔ Native OS File Dialog Trigger ───────────────────────
  const handleCardClick = (sourceId: string, categoryName: string) => {
    setActiveUploadingSourceId(sourceId);
    const stream = STREAM_BY_CATEGORY[categoryName] || 'BANK';
    setActiveUploadingStream(stream);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // ── Handle File Choice & Upload ─────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadingSourceId) return;

    const sourceId = activeUploadingSourceId;
    const stream = activeUploadingStream;

    setPollingJobsMap((prev) => ({
      ...prev,
      [sourceId]: {
        job: {
          job_id: `uploading-${Date.now()}`,
          source_id: sourceId,
          job_type: 'INGEST',
          parent_job_id: null,
          stream: stream as any,
          file_name: file.name,
          format: 'CSV',
          status: 'PENDING',
          row_count: 0,
          error_count: 0,
          attempt_count: 0,
          max_attempts: 3,
          last_error: null,
          mapping_version: 1,
          started_at: new Date().toISOString(),
        },
        text: 'Uploading file to server...',
      },
    }));

    try {
      const initialJob = await ingestionJobService.upload(sourceId, stream, file);

      setPollingJobsMap((prev) => ({
        ...prev,
        [sourceId]: {
          job: initialJob,
          text: 'AI is processing & mapping columns...',
        },
      }));

      if (pollTimersRef.current[sourceId]) {
        clearInterval(pollTimersRef.current[sourceId]);
      }

      pollTimersRef.current[sourceId] = setInterval(async () => {
        try {
          const latest = await ingestionJobService.get(initialJob.job_id);
          upsertJobInStore(latest);

          setPollingJobsMap((prev) => ({
            ...prev,
            [sourceId]: {
              job: latest,
              text:
                latest.status === 'RUNNING' || latest.status === 'PENDING'
                  ? 'AI is processing & mapping columns...'
                  : latest.status === 'SUCCESS'
                  ? 'Processed successfully'
                  : latest.status === 'PARTIAL'
                  ? 'Processed with error rows'
                  : 'Processing failed',
            },
          }));

          if (TERMINAL_STATUSES.has(latest.status)) {
            clearInterval(pollTimersRef.current[sourceId]);
            delete pollTimersRef.current[sourceId];
            onJobComplete(latest);
          }
        } catch {
          clearInterval(pollTimersRef.current[sourceId]);
          delete pollTimersRef.current[sourceId];
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'bad');
      setPollingJobsMap((prev) => {
        const next = { ...prev };
        delete next[sourceId];
        return next;
      });
    }
  };

  const handlePromote = async (jobId: string) => {
    setActioningJobId(jobId);
    await onPromote(jobId);
    setActioningJobId(null);
  };

  const handleRetry = async (jobId: string) => {
    setActioningJobId(jobId);
    await onRetry(jobId);
    setActioningJobId(null);
  };

  // Helper to find the latest INGEST job for a data source
  const getLatestJobForSource = (sourceId: string): (IngestionJobOut & { displayStatus?: DisplayJobStatus }) | undefined => {
    if (pollingJobsMap[sourceId]) return pollingJobsMap[sourceId].job;
    return displayJobs.find((j) => j.source_id === sourceId || j.source_id === null);
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Hidden File Input for Native File Browser */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx,.ofx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label="Ingestion Jobs"
          value={jobsToday}
          sub="Automated & manual jobs processed"
        />
        <KpiCard
          label="Rows In Error"
          value={rowsInError}
          sub={rowsInError > 0 ? 'Requires review before promotion' : 'All rows clean'}
          className={rowsInError > 0 ? 'border-red-200 bg-red-50/20' : ''}
        />
      </div>

      {/* Data Sources Grid Cards Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Data Sources & Ingestion Feeds
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any source card below to select and upload a statement file
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            {dataSources.length} Connected Feeds
          </span>
        </div>

        {/* Data Source Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dataSources.map((ds) => {
            const IconComp = CATEGORY_ICONS[ds.name] || Landmark;
            const description = CATEGORY_DESCRIPTIONS[ds.name] || `Ingest statement file for ${ds.name}`;
            const colorClass = CATEGORY_COLORS[ds.name] || 'bg-indigo-50 text-indigo-600 border-indigo-100';

            const activePollState = pollingJobsMap[ds.source_id];
            const latestJob = getLatestJobForSource(ds.source_id);
            const isPolling = activePollState && !TERMINAL_STATUSES.has(activePollState.job.status);
            const statusKey = latestJob?.displayStatus || latestJob?.status || 'PENDING';

            return (
              <div
                key={ds.source_id}
                onClick={() => !isPolling && handleCardClick(ds.source_id, ds.name)}
                className={`group bg-white border border-slate-200 hover:border-indigo-600 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all duration-150 flex flex-col justify-between gap-3 ${
                  isPolling ? 'ring-2 ring-indigo-500/20 border-indigo-400' : ''
                }`}
              >
                {/* Top Card Info */}
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-lg border flex-none ${colorClass}`}>
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                        {ds.name}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        {ds.status}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1 leading-relaxed text-[11.5px]">
                      {description}
                    </p>
                  </div>
                </div>

                {/* Upload Status / Uploaded File Indicator Banner */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {isPolling ? (
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin flex-none" />
                      <span className="truncate">{activePollState?.text || 'AI processing...'}</span>
                    </div>
                  ) : latestJob && latestJob.file_name ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-slate-700 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600 flex-none" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 truncate text-[11.5px]">
                            {latestJob.file_name}
                          </span>
                          <span className="text-[10px] text-slate-400 tnum">
                            {latestJob.row_count} rows • {latestJob.error_count} errors
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[statusKey]}`}>
                          {STATUS_LABEL[statusKey]}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600 group-hover:underline">
                          Re-upload
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <div className="flex items-center gap-1.5 font-medium">
                        <UploadCloud className="w-4 h-4" />
                        <span>Click to upload statement file (.csv)</span>
                      </div>
                      <span className="text-[11px] font-bold">Select File ➔</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ingestion Job History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Ingestion Job History
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {displayJobs.length} jobs
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3 text-right">Rows</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Started</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayJobs.map((job) => {
                const statusKey = job.displayStatus;
                const isPromoted = statusKey === 'PROMOTED';
                const isPromoting = statusKey === 'PROMOTING';

                return (
                  <tr
                    key={job.job_id}
                    onClick={() => onViewJob(job.job_id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-indigo-600 hover:underline max-w-[180px] truncate">
                      {job.file_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium capitalize">
                        {job.job_type.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{job.format || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 tnum">
                      {job.row_count}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tnum">
                      <span className={job.error_count > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {job.error_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[statusKey]}`}>
                        {STATUS_LABEL[statusKey]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {job.started_at.slice(0, 10)} {job.started_at.slice(11, 16)}
                    </td>
                    {/* Action Buttons — stop row click propagation */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {isPromoted && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                            Promoted
                          </span>
                        )}
                        {isPromoting && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Promoting…
                          </span>
                        )}
                        {!isPromoted && !isPromoting && (job.status === 'SUCCESS' || job.status === 'PARTIAL') && (
                          <button
                            onClick={() => handlePromote(job.job_id)}
                            disabled={actioningJobId === job.job_id}
                            title="Promote staged records to canonical tables"
                            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                          >
                            <ArrowUpCircle className="w-3 h-3" />
                            Promote
                          </button>
                        )}
                        {job.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(job.job_id)}
                            disabled={actioningJobId === job.job_id}
                            title="Reset and retry this failed job"
                            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                          </button>
                        )}
                        {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                          <span className="text-[10px] text-slate-400 font-medium">Processing…</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayJobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                    No ingestion jobs yet. Click a Data Source card above to upload your first statement file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
