import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Reconciliation } from '../../types';
import { MatchRateRing } from '../ui/MatchRateRing';
import { Button } from '../ui/Button';
import { Play } from 'lucide-react';

interface ReconciliationCardProps {
  job: Reconciliation;
}

export const ReconciliationCard: React.FC<ReconciliationCardProps> = ({ job }) => {
  const navigate = useNavigate();

  const handleOpenWorkspace = () => {
    if (job.category === 'ar-reconciliation' || job.category === 'ar') {
      navigate(`/reconciliation/ar/${job.id}`);
    } else {
      navigate(`/reconciliation/workspace/${job.id}`);
    }
  };

  const isNeedsResolution = job.status === 'Needs resolution' || (job.exceptionsCount && job.exceptionsCount > 0);
  const hasRunData = job.totalRows > 0 || job.matchedRows > 0;

  const getStatusBadge = () => {
    if (job.status === 'Needs resolution' || (job.exceptionsCount && job.exceptionsCount > 0)) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-800 border border-amber-200/60 whitespace-nowrap">
          Needs resolution
        </span>
      );
    }
    if (job.status === 'Review ready') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200/60 whitespace-nowrap">
          Review ready
        </span>
      );
    }
    if (job.status === 'Not run yet' || !hasRunData) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
          Not run
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
        {job.status}
      </span>
    );
  };

  const formattedUnreconciled =
    hasRunData
      ? '₹' + (job.unreconciledAmount ?? 0).toLocaleString('en-IN', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        })
      : '—';

  return (
    <div
      onClick={handleOpenWorkspace}
      className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-4 select-none ${
        isNeedsResolution ? 'border-amber-200/80' : 'border-slate-200'
      }`}
    >
      {/* Top Stripe Accent */}
      {isNeedsResolution && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl" />
      )}

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <MatchRateRing rate={job.matchRate} size={44} strokeWidth={4} />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight hover:text-indigo-600 transition-colors truncate">
            {job.name}
          </h3>
        </div>
        {getStatusBadge()}
      </div>

      {/* Stats Row Grid - 3 Columns */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-3 pt-3 border-t border-slate-100 text-left">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Matched</div>
          <div className="text-xs font-bold text-slate-900 tnum mt-0.5">
            {hasRunData ? job.matchedRows : '—'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Open Exceptions</div>
          <div className="text-xs font-bold text-amber-700 tnum mt-0.5">
            {hasRunData ? (job.exceptionsCount || job.unmatchedRows) : '—'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Unreconciled</div>
          <div className="text-xs font-bold text-amber-700 tnum mt-0.5">
            {formattedUnreconciled}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Owner</div>
          <div className="text-xs font-semibold text-slate-700 truncate mt-0.5">
            {job.owner ?? '—'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Due</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">
            {job.due ?? '—'}
          </div>
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[11.5px] text-slate-400 font-medium">
          {job.cadence ?? '—'} · {hasRunData && job.lastRun ? `Last run ${new Date(job.lastRun).toISOString().slice(0, 10)}` : 'Never run'}
        </span>

        <Button
          variant="ghost"
          size="sm"
          icon={Play}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenWorkspace();
          }}
          className="text-slate-500 hover:text-slate-900"
        >
          Run
        </Button>
      </div>
    </div>
  );
};
