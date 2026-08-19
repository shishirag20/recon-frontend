import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../layout/Modal';
import { DATA_HUB_CATEGORIES } from '../../types';
import { getStreamByCategory } from '../../types/datahub';
import { useDataHubStore } from '../../store/useDataHubStore';
import { ingestionJobService } from '../../services';
import type { IngestionJobOut } from '../../types/datahub';
import {
  X,
  Landmark,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpCircle,
  ArrowLeft,
} from 'lucide-react';

interface IngestJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobComplete: (job: IngestionJobOut) => void;
}

type ModalPhase =
  | { type: 'SELECT_CATEGORY' }
  | { type: 'UPLOADING' }
  | { type: 'POLLING'; job: IngestionJobOut }
  | { type: 'SUCCESS'; job: IngestionJobOut }
  | { type: 'PARTIAL'; job: IngestionJobOut }
  | { type: 'FAILED'; job: IngestionJobOut; error: string };

import {
  CATEGORY_META,
  POLL_INTERVAL_MS,
  TERMINAL_STATUSES,
} from '../../constants/datahub';

export const IngestJobModal: React.FC<IngestJobModalProps> = ({
  isOpen,
  onClose,
  onJobComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [phase, setPhase] = useState<ModalPhase>({ type: 'SELECT_CATEGORY' });
  const [pollCount, setPollCount] = useState(0);

  const getSourceId = useDataHubStore((s) => s.getSourceId);

  // Clear polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const resetModal = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setActiveCategory(null);
    setPhase({ type: 'SELECT_CATEGORY' });
    setPollCount(0);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  // ── Polling logic ────────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string, initialJob: IngestionJobOut) => {
    setPhase({ type: 'POLLING', job: initialJob });
    setPollCount(0);

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const latest = await ingestionJobService.get(jobId);
        setPollCount((c) => c + 1);
        setPhase({ type: 'POLLING', job: latest });

        if (TERMINAL_STATUSES.has(latest.status)) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;

          if (latest.status === 'SUCCESS') {
            setPhase({ type: 'SUCCESS', job: latest });
            onJobComplete(latest);
          } else if (latest.status === 'PARTIAL') {
            setPhase({ type: 'PARTIAL', job: latest });
            onJobComplete(latest);
          } else {
            setPhase({
              type: 'FAILED',
              job: latest,
              error: latest.last_error || 'Job failed during processing.',
            });
          }
        }
      } catch (e: unknown) {
        clearInterval(pollTimerRef.current!);
        pollTimerRef.current = null;
        const msg = e instanceof Error ? e.message : 'Polling error';
        setPhase((prev) => ({
          type: 'FAILED',
          job: prev.type === 'POLLING' ? prev.job : ({} as IngestionJobOut),
          error: msg,
        }));
      }
    }, POLL_INTERVAL_MS);
  }, [onJobComplete]);

  // ── Upload handler ───────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeCategory) return;

      const sourceId = getSourceId(activeCategory) ?? `mock-src-${activeCategory.toLowerCase().replace(/\s+/g, '-')}`;
      const stream = getStreamByCategory(activeCategory);

      setPhase({ type: 'UPLOADING' });

      try {
        const job = await ingestionJobService.upload(sourceId, stream, file);
        startPolling(job.job_id, job);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed. Please try again.';
        setPhase({ type: 'FAILED', job: {} as IngestionJobOut, error: msg });
      }
    },
    [activeCategory, getSourceId, startPolling]
  );

  const handleRetry = useCallback(
    async (jobId: string) => {
      try {
        const retried = await ingestionJobService.retry(jobId);
        startPolling(retried.job_id, retried);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Retry failed.';
        setPhase((prev) => ({ ...prev as any, error: msg }));
      }
    },
    [startPolling]
  );

  const handleCardClick = (category: string) => {
    setActiveCategory(category);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 50);
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderHeader = () => {
    const title =
      phase.type === 'SELECT_CATEGORY'
        ? 'Ingest New Job'
        : phase.type === 'UPLOADING'
          ? 'Uploading File…'
          : phase.type === 'POLLING'
            ? 'Processing Upload'
            : phase.type === 'SUCCESS'
              ? 'Upload Complete'
              : phase.type === 'PARTIAL'
                ? 'Upload Complete with Errors'
                : 'Upload Failed';

    const subtitle =
      phase.type === 'SELECT_CATEGORY'
        ? 'Select a target source category to upload your statement file'
        : activeCategory
          ? `Source: ${activeCategory}`
          : '';

    return (
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          {phase.type === 'SELECT_CATEGORY' && activeCategory && (
            <button
              onClick={() => { setActiveCategory(null); setPhase({ type: 'SELECT_CATEGORY' }); }}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-slate-500 mt-0.5 text-xs">{subtitle}</p>}
          </div>
        </div>
        {(phase.type === 'SELECT_CATEGORY' || phase.type === 'SUCCESS' || phase.type === 'PARTIAL' || phase.type === 'FAILED') && (
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const renderBody = () => {
    // Category selection grid
    if (phase.type === 'SELECT_CATEGORY') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
          {DATA_HUB_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat] || {
              icon: Landmark,
              description: `Ingest statement into ${cat}`,
              color: 'bg-slate-50 text-slate-600 border-slate-200',
            };
            const IconComp = meta.icon;
            return (
              <div
                key={cat}
                onClick={() => handleCardClick(cat)}
                className="group bg-white border border-slate-200 hover:border-indigo-600 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all duration-150 flex items-start gap-3.5"
              >
                <div className={`p-2.5 rounded-lg border flex-none ${meta.color}`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                      {cat}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors flex-none" />
                  </div>
                  <p className="text-slate-500 mt-1 leading-relaxed text-[11.5px]">
                    {meta.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Uploading state
    if (phase.type === 'UPLOADING') {
      return (
        <div className="py-12 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Uploading file to server…</p>
          <p className="text-xs text-slate-400">Please wait</p>
        </div>
      );
    }

    // Polling — fake AI processing state
    if (phase.type === 'POLLING') {
      const { job } = phase;
      const dots = '.'.repeat((pollCount % 3) + 1);
      return (
        <div className="py-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">AI is processing and mapping columns{dots}</p>
            <p className="text-xs text-slate-500 mt-1">
              Analysing structure, applying field transform rules & validating rows
            </p>
          </div>

          {/* Progress steps */}
          <div className="w-full max-w-sm flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
            {[
              { label: 'File received & queued', done: true },
              { label: 'Parsing rows & detecting schema', done: job.status === 'RUNNING' || job.status === 'SUCCESS' },
              { label: 'Applying field mapping transforms', done: false },
              { label: 'Validating canonical fields', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {step.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-none" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-none" />
                )}
                <span className={step.done ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400">Job ID: {job.job_id}</p>
        </div>
      );
    }

    // Success
    if (phase.type === 'SUCCESS' || phase.type === 'PARTIAL') {
      const { job } = phase;
      const isPartial = phase.type === 'PARTIAL';
      return (
        <div className="py-8 flex flex-col items-center gap-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isPartial ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <CheckCircle2 className={`w-8 h-8 ${isPartial ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">
              {isPartial ? 'Upload complete with errors' : 'Upload successful!'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isPartial
                ? `${job.row_count} rows processed, ${job.error_count} rows have validation errors`
                : `${job.row_count} rows processed successfully`}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{job.row_count}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Rows Ingested</div>
            </div>
            <div className={`border rounded-lg p-3 text-center ${job.error_count > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`text-xl font-bold ${job.error_count > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{job.error_count}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Error Rows</div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full max-w-xs">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={handleClose}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Review Staging
            </button>
          </div>
        </div>
      );
    }

    // Failed
    if (phase.type === 'FAILED') {
      const { job, error } = phase;
      return (
        <div className="py-8 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Upload failed</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">{error}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            {job.job_id && (
              <button
                onClick={() => handleRetry(job.job_id)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Job
              </button>
            )}
            {!job.job_id && (
              <button
                onClick={() => setPhase({ type: 'SELECT_CATEGORY' })}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Determine modal width based on phase
  const width = phase.type === 'SELECT_CATEGORY' ? '2xl' : 'md';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} width={width}>
      <div className="p-6 flex flex-col gap-5 text-xs">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.ofx"
          onChange={handleFileChange}
          className="hidden"
        />

        {renderHeader()}
        {renderBody()}
      </div>
    </Modal>
  );
};
