import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  ChevronRight,
  FileWarning,
  Hash,
  Loader2,
  RotateCw,
  X,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ingestionJobService } from '../../services';
import type {
  IngestionErrorGroup,
  IngestionErrorSample,
  IngestionJobErrorsOut,
} from '../../types/datahub';

interface IngestionErrorsDrawerProps {
  /** Null closes the drawer. Changing it refetches. */
  jobId: string | null;
  onClose: () => void;
  /** Delegated to the page, which owns the store update and the toast — the
   *  drawer must not run a second, competing retry path. */
  onRetry?: (jobId: string) => void | Promise<void>;
}

/**
 * Answers one question: "why didn't my file go in, and what do I fix?"
 *
 * Scoped to *rejected* rows - the population that had no surface anywhere in
 * the app before this. Those rows were never inserted, so nothing in the Data
 * Explorer can show them and no in-app edit can repair them; the only remedy
 * is correcting the source file and re-uploading, which is why every sample
 * leads with its row number in that file.
 *
 * Flagged rows (inserted with valid=false) are deliberately NOT expanded here
 * - they already live in the Data Explorer's error filter, and duplicating
 * them would blur the one distinction this drawer exists to make. They appear
 * only in the composition bar and a single pointer line, because omitting them
 * entirely would make the totals disagree with the Errors column that opened
 * this drawer.
 */
export const IngestionErrorsDrawer: React.FC<IngestionErrorsDrawerProps> = ({
  jobId,
  onClose,
  onRetry,
}) => {
  // The parent remounts this per job (key={jobId}), so every piece of state
  // below starts fresh for each open. That is what keeps the fetch effect from
  // having to reset four things synchronously on the way in.
  const [data, setData] = useState<IngestionJobErrorsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [retrying, setRetrying] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isOpen = jobId !== null;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    ingestionJobService
      .getErrors(jobId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        // A drawer that silently shows nothing is worse than one that says it
        // couldn't load - the analyst would read "no errors" into an empty panel.
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Could not load this job’s errors.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    // Move focus into the panel so keyboard and screen-reader users land here
    // rather than continuing from the table row behind the scrim.
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const toggleGroup = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleRetry = async () => {
    if (!jobId || !onRetry) return;
    setRetrying(true);
    try {
      await onRetry(jobId);
      onClose();
    } finally {
      setRetrying(false);
    }
  };

  if (!isOpen) return null;

  const rejected = data?.rejected_row_count ?? 0;
  const flagged = data?.flagged_row_count ?? 0;
  const total = data?.row_count ?? 0;
  const clean = Math.max(total - rejected - flagged, 0);
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs scrim-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingestion-errors-title"
        tabIndex={-1}
        className="relative h-full w-full max-w-[560px] bg-white border-l border-slate-200 shadow-2xl flex flex-col drawer-in focus:outline-none"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-start gap-3 px-5 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2
              id="ingestion-errors-title"
              className="text-sm font-bold text-slate-900 tracking-tight truncate"
              title={data?.file_name || undefined}
            >
              {data?.file_name || 'Ingestion errors'}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              {data?.stream && <Badge variant="muted" label={data.stream} />}
              {data?.status && (
                <Badge
                  variant={
                    data.status === 'SUCCESS'
                      ? 'ok'
                      : data.status === 'PARTIAL'
                        ? 'warn'
                        : data.status === 'FAILED'
                          ? 'bad'
                          : 'muted'
                  }
                  label={
                    data.status === 'PARTIAL'
                      ? 'Partly ingested'
                      : data.status === 'SUCCESS'
                        ? 'Ingested'
                        : data.status === 'FAILED'
                          ? 'Failed'
                          : 'Processing'
                  }
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close ingestion errors"
            className="flex-none grid place-items-center w-9 h-9 -mr-1 -mt-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading this job&rsquo;s errors&hellip;
            </div>
          )}

          {!loading && loadError && (
            <div className="px-5 py-12 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-amber-600" />
              <p className="mt-3 text-xs font-semibold text-slate-900">
                Couldn&rsquo;t load the error detail
              </p>
              <p className="mt-1 text-xs text-slate-500">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && data && (
            <>
              {/* Verdict: the arithmetic of the file, stated plainly. This is
                  the sentence the analyst came for. */}
              <section className="px-5 py-4 border-b border-slate-200">
                <p className="text-[13px] leading-relaxed text-slate-700">
                  {total === 0 ? (
                    <>
                      No rows were read from this file.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-900 tnum">
                        {clean.toLocaleString('en-IN')}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-slate-900 tnum">
                        {total.toLocaleString('en-IN')}
                      </span>{' '}
                      rows ingested cleanly.
                      {rejected > 0 && (
                        <>
                          {' '}
                          <span className="font-semibold text-rose-700 tnum">
                            {rejected.toLocaleString('en-IN')}
                          </span>{' '}
                          {rejected === 1 ? 'row was' : 'rows were'} rejected and{' '}
                          <span className="font-semibold">not stored anywhere</span>.
                        </>
                      )}
                    </>
                  )}
                </p>

                {total > 0 && (
                  <div
                    className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label={`${clean} rows clean, ${flagged} flagged, ${rejected} rejected, of ${total} total`}
                  >
                    <div className="bg-emerald-500" style={{ width: `${pct(clean)}%` }} />
                    <div className="bg-amber-400" style={{ width: `${pct(flagged)}%` }} />
                    <div className="bg-rose-500" style={{ width: `${pct(rejected)}%` }} />
                  </div>
                )}

                {flagged > 0 && (
                  <p className="mt-2.5 text-[11.5px] text-slate-500">
                    {flagged.toLocaleString('en-IN')} more{' '}
                    {flagged === 1 ? 'row' : 'rows'} landed with problems and can be
                    corrected in the Data Explorer &mdash; those are not listed here.
                  </p>
                )}
              </section>

              {/* Job-level fatal: when the file never got far enough to produce
                  rows, the row groups are empty and this IS the whole story. */}
              {data.last_error && (
                <section className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    The job stopped before reading rows
                  </h3>
                  <p className="mt-2 text-[12.5px] text-slate-700 leading-relaxed">
                    {data.last_error}
                  </p>
                  <p className="mt-2 text-[11.5px] text-slate-500">
                    Attempt {data.attempt_count} of {data.max_attempts}
                    {data.status === 'FAILED'
                      ? ' — no further attempts will run automatically.'
                      : ' — another attempt is queued.'}
                  </p>
                </section>
              )}

              {/* Rejected rows, grouped by cause. */}
              {data.groups.length > 0 && (
                <section className="px-5 py-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    What to fix in the source file
                  </h3>

                  <ul className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                    {data.groups.map((group, i) => (
                      <ErrorGroupRow
                        key={`${group.code}-${group.reason}-${i}`}
                        group={group}
                        isExpanded={expanded.has(i)}
                        onToggle={() => toggleGroup(i)}
                      />
                    ))}
                  </ul>

                  {data.groups_truncated && (
                    <p className="mt-3 text-[11.5px] text-slate-500">
                      Only the most common causes are shown. Fix these and re-upload
                      to see what remains.
                    </p>
                  )}
                </section>
              )}

              {/* Genuinely nothing to report. */}
              {!data.last_error && data.groups.length === 0 && rejected === 0 && (
                <div className="px-5 py-12 text-center">
                  <FileWarning className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="mt-3 text-xs font-semibold text-slate-900">
                    No rejected rows on this job
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {flagged > 0
                      ? 'Every row was stored. Some carry problems you can correct in the Data Explorer.'
                      : 'Every row in this file was ingested cleanly.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!loading && !loadError && data && (
          <footer className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50/60">
            <p className="text-[11.5px] text-slate-500 leading-snug">
              {rejected > 0
                ? 'Rejected rows can only be fixed in the source file, then re-uploaded.'
                : 'Nothing here needs a re-upload.'}
            </p>
            {data.status === 'FAILED' && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCw}
                disabled={retrying}
                onClick={handleRetry}
              >
                {retrying ? 'Re-queuing…' : 'Retry job'}
              </Button>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};

// ── One reason group ─────────────────────────────────────────────────────────

const ErrorGroupRow: React.FC<{
  group: IngestionErrorGroup;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ group, isExpanded, onToggle }) => (
  <li>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="w-full flex items-start gap-3 py-3 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
    >
      <span className="flex-none w-11 pt-0.5 text-right text-[13px] font-semibold text-rose-700 tnum">
        {group.count.toLocaleString('en-IN')}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-medium text-slate-900 leading-snug">
          {group.reason}
        </span>
        {group.field && (
          <span className="inline-flex items-center mt-1.5 px-1.5 h-5 rounded bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600">
            {group.field}
          </span>
        )}
      </span>

      <ChevronRight
        className={clsx(
          'flex-none w-4 h-4 mt-0.5 text-slate-500 transition-transform duration-200 group-hover:text-slate-900',
          isExpanded && 'rotate-90'
        )}
      />
    </button>

    {isExpanded && (
      <div className="pb-3 pl-14 pr-1">
        {group.contributing_issues.length > 0 && (
          <p className="mb-2.5 text-[11.5px] text-slate-500 leading-relaxed">
            Also seen on these rows: {group.contributing_issues.join('; ')}
          </p>
        )}

        {group.samples.length === 0 ? (
          <p className="text-[11.5px] text-slate-500">No example rows were kept.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {group.samples.map((sample, i) => (
                <SampleRow key={i} sample={sample} />
              ))}
            </ul>
            {group.count > group.samples.length && (
              <p className="mt-2 text-[11.5px] text-slate-500">
                Showing {group.samples.length} of{' '}
                {group.count.toLocaleString('en-IN')} rows with this problem.
              </p>
            )}
          </>
        )}
      </div>
    )}
  </li>
);

// ── One example row, as it appeared in the file ──────────────────────────────

const SampleRow: React.FC<{ sample: IngestionErrorSample }> = ({ sample }) => {
  const entries = Object.entries(sample.raw ?? {});
  // Highlight the cell that actually broke instead of colouring the whole row
  // and making the analyst hunt for it. Issues name the column two different
  // ways - the file's own header ("Txn Date") in transform failures, and the
  // canonical field ("txn_date") in required-field failures - so compare both
  // with separators stripped. The 3-character floor keeps a stray short header
  // from matching half the sentence.
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const haystack = squash(sample.issues.join(' '));
  const isCulprit = (key: string) => {
    const k = squash(key);
    return k.length >= 3 && haystack.includes(k);
  };

  return (
    <li className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border-b border-slate-200">
        <Hash className="w-3 h-3 text-slate-500" />
        <span className="text-[11px] font-semibold text-slate-600 tnum">
          {sample.row_number != null
            ? `Row ${sample.row_number.toLocaleString('en-IN')} of your file`
            : 'Row number not recorded'}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="px-2.5 py-2 text-[11.5px] text-slate-500">
          The source row was empty.
        </p>
      ) : (
        <dl className="divide-y divide-slate-100">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-3 px-2.5 py-1.5">
              <dt
                className={clsx(
                  'flex-none w-32 truncate text-[11px]',
                  isCulprit(key)
                    ? 'font-semibold text-rose-700'
                    : 'font-medium text-slate-500'
                )}
                title={key}
              >
                {key}
              </dt>
              <dd
                className={clsx(
                  'flex-1 min-w-0 truncate text-[11.5px] tnum',
                  isCulprit(key) ? 'font-semibold text-rose-700' : 'text-slate-900'
                )}
                title={value == null ? '' : String(value)}
              >
                {value == null || String(value) === '' ? (
                  // slate-400 is 2.63:1 on white and fails AA; slate-500 is 4.76:1.
                  <span className="text-slate-500 italic">empty</span>
                ) : (
                  String(value)
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
};
