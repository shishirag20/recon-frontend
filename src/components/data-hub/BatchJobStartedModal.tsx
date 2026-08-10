import React, { useEffect, useState, useRef } from 'react';
import { Modal } from '../layout/Modal';
import { Button } from '../ui/Button';
import { Play, Check, CheckCircle2 } from 'lucide-react';
import { ingestionJobService } from '../../services/dataHub.service';
import type { IngestionJobOut } from '../../types/datahub';

interface BatchJobStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: IngestionJobOut | null;
  categoryName: string;
  onDone: (finalJob: IngestionJobOut) => void;
}

export const BatchJobStartedModal: React.FC<BatchJobStartedModalProps> = ({
  isOpen,
  onClose,
  job: initialJob,
  categoryName,
  onDone,
}) => {
  const [currentJob, setCurrentJob] = useState<IngestionJobOut | null>(initialJob);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCurrentJob(initialJob);
  }, [initialJob]);

  // Poll job status until terminal
  useEffect(() => {
    if (!isOpen || !initialJob?.job_id) return;

    const poll = async () => {
      try {
        const latest = await ingestionJobService.get(initialJob.job_id);
        setCurrentJob(latest);
        if (latest.status === 'SUCCESS' || latest.status === 'PARTIAL' || latest.status === 'FAILED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch {
        // Silently retry polling
      }
    };

    pollTimerRef.current = setInterval(poll, 2500);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, initialJob?.job_id]);

  if (!currentJob) return null;

  const handleDoneClick = () => {
    onDone(currentJob);
    onClose();
  };

  const isRunning = currentJob.status === 'RUNNING' || currentJob.status === 'PENDING';
  const isSuccess = currentJob.status === 'SUCCESS';

  return (
    <Modal isOpen={isOpen} onClose={handleDoneClick} width="lg">
      <div className="p-8 flex flex-col items-center gap-6 bg-white text-slate-900 rounded-2xl">
        {/* Top Play/Check Icon matching screenshot 1 */}
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shadow-2xs">
          {isRunning ? (
            <Play className="w-6 h-6 text-emerald-600 fill-emerald-600 ml-0.5" />
          ) : (
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          )}
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col items-center text-center gap-1.5 max-w-sm">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Batch job started
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ingestion batch job{' '}
            <span className="font-mono font-bold text-indigo-600">
              {currentJob.job_id}
            </span>{' '}
            has been successfully initiated and schema mapping confirmed.
          </p>
        </div>

        {/* Info Card Box matching screenshot 1 */}
        <div className="w-full bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Job ID</span>
            <span className="font-mono font-bold text-indigo-600">{currentJob.job_id}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Source File</span>
            <span className="font-semibold text-slate-800">{currentJob.file_name || 'Uploaded File'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Category</span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-200/70 font-semibold text-slate-700 text-[11px]">
              {categoryName}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Rows Loaded</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {currentJob.row_count} <span className="text-xs font-normal text-slate-500">rows</span>
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
            <span className="text-slate-500 font-medium">Status</span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Batch Job Running
                </>
              ) : isSuccess ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Completed & Staged
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {currentJob.status}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Done Action Button matching screenshot 1 */}
        <Button
          variant="primary"
          icon={Check}
          onClick={handleDoneClick}
          className="w-full py-3 h-auto rounded-xl font-bold text-sm shadow-xs mt-1"
        >
          Done
        </Button>
      </div>
    </Modal>
  );
};
