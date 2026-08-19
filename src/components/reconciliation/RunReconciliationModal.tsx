import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../layout/Modal';
import { Button } from '../ui/Button';
import { reconciliationsService } from '../../services/reconciliations.service';
import { X, Loader2, CheckCircle2, AlertCircle, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import { POLL_INTERVAL_MS } from '../../constants/datahub'; // using same poll interval

interface RunReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  definitionId: string;
  onRunComplete: (runResult: any) => void;
}

type ModalPhase =
  | { type: 'INPUT_DATES' }
  | { type: 'STARTING' }
  | { type: 'POLLING'; run: any }
  | { type: 'COMPUTED'; run: any }
  | { type: 'FAILED'; run: any; error: string };

const TERMINAL_STATUSES = new Set(['COMPUTED', 'FAILED']);

export const RunReconciliationModal: React.FC<RunReconciliationModalProps> = ({
  isOpen,
  onClose,
  definitionId,
  onRunComplete,
}) => {
  const [phase, setPhase] = useState<ModalPhase>({ type: 'INPUT_DATES' });
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [pollCount, setPollCount] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const resetModal = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setPhase({ type: 'INPUT_DATES' });
    setPeriodStart('');
    setPeriodEnd('');
    setPollCount(0);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  const startPolling = useCallback(
    (runId: string, initialRun: any) => {
      setPhase({ type: 'POLLING', run: initialRun });
      setPollCount(0);

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(async () => {
        try {
          const latest = await reconciliationsService.getRunStatus(runId);
          setPollCount((c) => c + 1);
          setPhase({ type: 'POLLING', run: latest });

          if (TERMINAL_STATUSES.has(latest.status)) {
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;

            if (latest.status === 'COMPUTED') {
              setPhase({ type: 'COMPUTED', run: latest });
              onRunComplete(latest);
            } else {
              setPhase({
                type: 'FAILED',
                run: latest,
                error: latest.last_error || 'Run failed during computation.',
              });
            }
          }
        } catch (e: any) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setPhase((prev) => ({
            type: 'FAILED',
            run: prev.type === 'POLLING' ? prev.run : {},
            error: e.message || 'Polling error',
          }));
        }
      }, POLL_INTERVAL_MS || 3000);
    },
    [onRunComplete]
  );

  const handleStart = async () => {
    setPhase({ type: 'STARTING' });
    try {
      // Period dates are optional on the backend (RunCreate.period_start/
      // period_end both default to None) - the period-cutoff-guard and
      // Short-Pay/GL-check tolerances just don't get a period boundary to
      // compare against when omitted. Temporarily not required here so a
      // run can be started without picking dates first.
      const run = await reconciliationsService.startRun(
        definitionId,
        periodStart || undefined,
        periodEnd || undefined
      );
      // Run returns 202 QUEUED with run_id
      startPolling(run.id || run.run_id, run);
    } catch (e: any) {
      setPhase({ type: 'FAILED', run: {}, error: e.message || 'Failed to start run.' });
    }
  };

  const handleRetry = async (runId: string) => {
    setPhase({ type: 'STARTING' });
    try {
      const retried = await reconciliationsService.retryRun(runId);
      startPolling(retried.id || retried.run_id, retried);
    } catch (e: any) {
      setPhase((prev: any) => ({ ...prev, type: 'FAILED', error: e.message || 'Retry failed.' }));
    }
  };

  const renderHeader = () => {
    const title =
      phase.type === 'INPUT_DATES'
        ? 'Run Reconciliation'
        : phase.type === 'STARTING'
          ? 'Starting Run…'
          : phase.type === 'POLLING'
            ? 'Computing Matches'
            : phase.type === 'COMPUTED'
              ? 'Computation Complete'
              : 'Run Failed';

    return (
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>
        {(phase.type === 'INPUT_DATES' || phase.type === 'COMPUTED' || phase.type === 'FAILED') && (
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const renderBody = () => {
    if (phase.type === 'INPUT_DATES') {
      return (
        <div className="flex flex-col gap-4 my-2">
          <p className="text-xs text-slate-500 leading-relaxed">
            Optionally select a date window for this reconciliation run — leave blank to run against every open invoice regardless of period.
          </p>

          {/* Period Date Range */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Start Date <span className="normal-case text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex-none pb-2 text-slate-300">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                End Date <span className="normal-case text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="primary"
              onClick={handleStart}
            >
              Start Run
            </Button>
          </div>
        </div>
      );
    }

    if (phase.type === 'STARTING') {
      return (
        <div className="py-12 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Queueing run…</p>
        </div>
      );
    }

    if (phase.type === 'POLLING') {
      const dots = '.'.repeat((pollCount % 3) + 1);
      return (
        <div className="py-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Engine is computing matches{dots}</p>
            <p className="text-xs text-slate-500 mt-1">Applying rules sequentially across the dataset</p>
          </div>
        </div>
      );
    }

    if (phase.type === 'COMPUTED') {
      const { run } = phase;
      return (
        <div className="py-8 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Run completed successfully</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{run.matched_count || 0}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Matched</div>
            </div>
            <div className="border rounded-lg p-3 text-center bg-rose-50 border-rose-200">
              <div className="text-xl font-bold text-rose-700">{run.exception_count || 0}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Exceptions</div>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      );
    }

    if (phase.type === 'FAILED') {
      const { run, error } = phase;
      return (
        <div className="py-8 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Run failed</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">{error}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {run && (run.id || run.run_id) && (
              <Button variant="primary" icon={RefreshCw} onClick={() => handleRetry(run.id || run.run_id)}>
                Retry Job
              </Button>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} width="md">
      <div className="p-6 flex flex-col gap-5 text-xs">
        {renderHeader()}
        {renderBody()}
      </div>
    </Modal>
  );
};
