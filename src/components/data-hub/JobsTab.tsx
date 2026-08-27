import React, { useState, useRef, useEffect } from 'react';
import { KpiCard } from '../ui/KpiCard';
import {
  Landmark,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { IngestionJobOut, DataSourceOut, FieldMappingIn } from '../../types/datahub';
import { getStreamByCategory } from '../../types/datahub';
import { useDataHubStore } from '../../store/useDataHubStore';
import { ingestionJobService, dataSourceService, fieldMappingService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { FieldMappingTransformModal } from './FieldMappingTransformModal';
import { BatchJobStartedModal } from './BatchJobStartedModal';
import { IngestionErrorsDrawer } from './IngestionErrorsDrawer';
import {
  CATEGORY_ICONS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_COLORS,
} from '../../constants/datahub';

interface JobsTabProps {
  jobs: IngestionJobOut[];
  onViewJob: (jobId: string) => void;
  onJobComplete: (job: IngestionJobOut) => void;
  onRetry?: (jobId: string) => void;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  jobs,
  onViewJob,
  onJobComplete,
  onRetry,
}) => {
  const [dataSources, setDataSources] = useState<DataSourceOut[]>([]);
  const [errorsJobId, setErrorsJobId] = useState<string | null>(null);
  const [activeUploadingSourceId, setActiveUploadingSourceId] = useState<string | null>(null);
  const [activeUploadingStream, setActiveUploadingStream] = useState<string>('BANK');
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
      }).catch(() => { });
    }
    return () => {
      Object.values(pollTimersRef.current).forEach(clearInterval);
    };
  }, [sourcesList, setSourcesInStore]);

  const displayJobs = jobs;
  const jobsToday = displayJobs.length;
  const rowsInError = displayJobs.reduce((sum, j) => sum + j.error_count, 0);

  // ── 2-Step Ingestion Flow States ──────────────────────────────────────────
  const [pendingUpload, setPendingUpload] = useState<{
    sourceId: string;
    categoryName: string;
    stream: string;
    file: File;
  } | null>(null);

  const [createdBatchJob, setCreatedBatchJob] = useState<IngestionJobOut | null>(null);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [isBatchStartedModalOpen, setIsBatchStartedModalOpen] = useState<boolean>(false);

  // ── Handle Card Click ➔ Native OS File Dialog Trigger ───────────────────────
  const handleCardClick = (sourceId: string, categoryName: string) => {
    setActiveUploadingSourceId(sourceId);
    // Prefer the data source's own registered stream over guessing from its
    // display name - the guess is only a fallback for sources not in the
    // loaded list (e.g. mock data), matching the same "stream is a property
    // of the data source, not derived from its name" fix already made
    // server-side (see docs/data-hub.md §1).
    const source = dataSources.find((s) => s.source_id === sourceId);
    const stream = source?.stream || getStreamByCategory(categoryName);
    setActiveUploadingStream(stream);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // ── Handle File Choice ➔ Opens Step 1 Modal (Field mapping & transforms) ────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadingSourceId) return;

    const sourceObj = dataSources.find((s) => s.source_id === activeUploadingSourceId);
    const categoryName = sourceObj?.name || 'Data Source';
    const stream = activeUploadingStream;

    setPendingUpload({
      sourceId: activeUploadingSourceId,
      categoryName,
      stream,
      file,
    });
    setIsMappingModalOpen(true);
  };

  // ── Handle Confirm Mapping ➔ Saves Mapping, Uploads File & Opens Step 2 Modal ────
  const handleConfirmMapping = async (mappings: FieldMappingIn[]) => {
    if (!pendingUpload) return;
    const { sourceId, stream, file } = pendingUpload;

    try {
      // Persist whatever the user edited/AI-guessed in the modal before
      // uploading - previously this was silently discarded (the mappings
      // param went unused), so nothing typed in the modal ever reached the DB.
      await fieldMappingService.saveMapping(stream, mappings);
      const job = await ingestionJobService.upload(sourceId, stream, file);
      setIsMappingModalOpen(false);
      setCreatedBatchJob(job);
      setIsBatchStartedModalOpen(true);

      // Track in store & parent
      upsertJobInStore(job);
      onJobComplete(job);
    } catch (err: any) {
      toast(`Upload failed: ${err?.message || 'Server error'}`, 'bad');
    }
  };

  // ── Handle Done Click on Step 2 Modal ──────────────────────────────────────
  const handleBatchJobDone = (finalJob: IngestionJobOut) => {
    setIsBatchStartedModalOpen(false);
    upsertJobInStore(finalJob);
    onJobComplete(finalJob);
    setPendingUpload(null);
    setCreatedBatchJob(null);
  };

  // Helper to find the latest job for a data source
  const getLatestJobForSource = (sourceId: string): IngestionJobOut | undefined => {
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
          {/* <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            {dataSources.length} Connected Feeds
          </span> */}
        </div>

        {/* Data Source Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dataSources.map((ds) => {
            const IconComp = CATEGORY_ICONS[ds.name] || Landmark;
            const description = CATEGORY_DESCRIPTIONS[ds.name] || `Ingest statement file for ${ds.name}`;
            const colorClass = CATEGORY_COLORS[ds.name] || 'bg-indigo-50 text-indigo-600 border-indigo-100';

            const latestJob = getLatestJobForSource(ds.source_id);

            return (
              <div
                key={ds.source_id}
                onClick={() => handleCardClick(ds.source_id, ds.name)}
                className="group bg-white border border-slate-200 hover:border-indigo-600 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all duration-150 flex flex-col justify-between gap-3"
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
                      {/* <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        {ds.status}
                      </span> */}
                    </div>
                    <p className="text-slate-500 mt-1 leading-relaxed text-[11.5px]">
                      {description}
                    </p>
                  </div>
                </div>

                {/* Upload Status / Uploaded File Indicator Banner */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {latestJob && latestJob.file_name ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-slate-700 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600 flex-none" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 truncate text-[11.5px]">
                            {latestJob.file_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        {/* <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[statusKey]}`}>
                          {STATUS_LABEL[statusKey]}
                        </span> */}
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
                <th className="px-4 py-3 text-right">Started</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayJobs.map((job) => {
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
                      <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold uppercase">
                        {job.stream || 'BANK'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{job.format || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 tnum">
                      {job.row_count}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tnum">
                      {job.error_count > 0 ? (
                        // The count was previously the end of the story: an
                        // analyst could see that 37 rows broke but had nowhere
                        // to learn why. It is now the way in.
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // the row itself navigates to the Explorer
                            setErrorsJobId(job.job_id);
                          }}
                          aria-label={`View why ${job.error_count} rows errored in ${job.file_name || 'this job'}`}
                          // No padding or icon: the digits have to land on the
                          // same right edge as the plain `0` below, or the
                          // column stops being scannable as a number column.
                          className="text-rose-700 underline decoration-rose-300 underline-offset-2 hover:decoration-rose-700 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          {job.error_count}
                        </button>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {job.started_at.slice(0, 10)} {job.started_at.slice(11, 16)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {job.status === 'SUCCESS' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Ingested
                          </span>
                        )}
                        {(job.status === 'FAILED' || job.status === 'PARTIAL') && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Failure
                          </span>
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
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                    No ingestion jobs yet. Click a Data Source card above to upload your first statement file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Step 1: Field Mapping & Transforms Modal */}
      {pendingUpload && (
        <FieldMappingTransformModal
          isOpen={isMappingModalOpen}
          onClose={() => {
            setIsMappingModalOpen(false);
            setPendingUpload(null);
          }}
          stream={pendingUpload.stream}
          file={pendingUpload.file}
          categoryName={pendingUpload.categoryName}
          fileName={pendingUpload.file.name}
          onConfirmMapping={handleConfirmMapping}
        />
      )}

      {/* Why a job's rows errored — opened from the Errors count */}
      <IngestionErrorsDrawer
        key={errorsJobId ?? 'closed'}
        jobId={errorsJobId}
        onClose={() => setErrorsJobId(null)}
        onRetry={onRetry}
      />

      {/* Step 2: Batch Job Started Modal */}
      {createdBatchJob && (
        <BatchJobStartedModal
          isOpen={isBatchStartedModalOpen}
          onClose={() => setIsBatchStartedModalOpen(false)}
          job={createdBatchJob}
          categoryName={pendingUpload?.categoryName || 'Data Source'}
          onDone={handleBatchJobDone}
        />
      )}
    </div>
  );
};
