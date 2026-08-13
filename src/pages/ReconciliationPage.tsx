import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, CreditCard, FileText, Landmark, ArrowRight } from 'lucide-react';
import { ReconciliationCard } from '../components/reconciliation/ReconciliationCard';
import { NewReconciliationModal } from '../components/reconciliation/NewReconciliationModal';
import { RunReconciliationModal } from '../components/reconciliation/RunReconciliationModal';
import { useReconciliationStore } from '../store/useReconciliationStore';
import { useModal } from '../hooks/useModal';
import { useToast } from '../hooks/useToast';
import type { Reconciliation } from '../types';

interface LibraryCategory {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const LIBRARY_CATEGORIES: LibraryCategory[] = [
  {
    key: 'ar-reconciliation',
    title: 'Accounts Receivable (AR) Reconciliation',
    description:
      'Identifies which customer sent each incoming payment, allocates it against their open invoices, and works down a rule-based waterfall to auto-match as much as it can. Short-pays, unapplied cash, and ambiguous payments are flagged for review, and a final GL control check confirms the subledger and general ledger agree.',
    icon: CreditCard,
  },
  {
    key: 'ap',
    title: 'Accounts Payable (AP) Reconciliation',
    description:
      "Matches outgoing supplier payments to open vendor bills by bill number, then amount and payment date, catching early-payment discounts along the way. Runs a 3-way match against the purchase order and goods receipt too, so a bill can't be paid without a matching PO and confirmed delivery.",
    icon: FileText,
  },
  {
    key: 'bank',
    title: 'Bank Reconciliation',
    description:
      'Ties the general ledger cash balance to the bank statement, transaction by transaction — matching on reference and amount first, then amount plus a date window, then rounding-tolerant matching for bank fees. Flags timing differences, unrecorded charges, and deposits still in transit for review.',
    icon: Landmark,
  },
];

export const ReconciliationPage: React.FC = () => {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const [subFilter, setSubFilter] = useState<'all' | 'mine' | 'needs-resolution' | 'completed'>('all');
  const [selectedRunJob, setSelectedRunJob] = useState<Reconciliation | null>(null);

  const jobs = useReconciliationStore((s) => s.jobs);
  const fetchJobs = useReconciliationStore((s) => s.fetchJobs);
  const addJob = useReconciliationStore((s) => s.addJob);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const handleCreateNew = () => {
    openModal(
      <NewReconciliationModal
        onClose={closeModal}
        onCreate={(newJob: Reconciliation) => {
          closeModal();
          addJob(newJob);
          toast(`Reconciliation job "${newJob.name}" created!`, 'ok');
        }}
      />,
      'lg'
    );
  };

  // If no category param in URL, render Screen 1: The Reconciliation Library Main Grid
  if (!category) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <Topbar title="Reconciliation Library" subtitle="July 2026" />

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {LIBRARY_CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              return (
                <div
                  key={cat.key}
                  onClick={() => navigate(`/reconciliation/${cat.key}`)}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-none">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {cat.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed flex-1">
                    {cat.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                    <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Find category meta
  const currentCategoryMeta = LIBRARY_CATEGORIES.find(
    (c) => c.key === category || (category === 'ar' && c.key === 'ar-reconciliation')
  ) || LIBRARY_CATEGORIES[0];

  // Filter jobs for this category
  const categoryJobs = jobs.filter((j) => {
    if (category === 'ar' || category === 'ar-reconciliation') {
      return j.category === 'ar' || j.category === 'ar-reconciliation';
    }
    return j.category === category;
  });

  // Filter jobs by subtab
  const filteredJobs = categoryJobs.filter((j) => {
    if (subFilter === 'mine') return j.owner === 'Alex Rivera' || j.owner === 'Priya Nair';
    if (subFilter === 'needs-resolution')
      return j.status === 'Needs resolution' || (j.exceptionsCount && j.exceptionsCount > 0);
    if (subFilter === 'completed') return j.arFinished || j.status === 'Review ready';
    return true;
  });

  const counts = {
    all: categoryJobs.length,
    mine: categoryJobs.filter((j) => j.owner === 'Alex Rivera' || j.owner === 'Priya Nair').length,
    'needs-resolution': categoryJobs.filter(
      (j) => j.status === 'Needs resolution' || (j.exceptionsCount && j.exceptionsCount > 0)
    ).length,
    completed: categoryJobs.filter((j) => j.arFinished || j.status === 'Review ready').length,
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Header */}
      <Topbar
        title={currentCategoryMeta.title}
        subtitle={`July 2026 · ${categoryJobs.length} active definition${categoryJobs.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              onClick={() => navigate('/reconciliation')}
            >
              Reconciliation Library
            </Button>
            <Button variant="primary" icon={Plus} onClick={handleCreateNew}>
              New reconciliation
            </Button>
          </div>
        }
      />

      {/* Category Navigation Subtabs */}
      <div className="px-6 bg-white border-b border-slate-200 flex items-center gap-1 flex-none">
        <button
          onClick={() => setSubFilter('all')}
          className={`h-10 px-3 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
            subFilter === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          All <span className="text-[11px] font-mono text-slate-400">{counts.all}</span>
        </button>

        <button
          onClick={() => setSubFilter('mine')}
          className={`h-10 px-3 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
            subFilter === 'mine'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          My Assignments <span className="text-[11px] font-mono text-slate-400">{counts.mine}</span>
        </button>

        <button
          onClick={() => setSubFilter('needs-resolution')}
          className={`h-10 px-3 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
            subFilter === 'needs-resolution'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Needs Resolution <span className="text-[11px] font-mono text-amber-600 font-bold">{counts['needs-resolution']}</span>
        </button>

        <button
          onClick={() => setSubFilter('completed')}
          className={`h-10 px-3 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
            subFilter === 'completed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Completed <span className="text-[11px] font-mono text-slate-400">{counts.completed}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job) => (
              <ReconciliationCard
                key={job.id}
                job={job}
                onRun={(jobToRun) => setSelectedRunJob(jobToRun)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500 max-w-md mx-auto my-12">
            No reconciliations match the current filter.
          </div>
        )}
      </div>

      {selectedRunJob && (
        <RunReconciliationModal
          isOpen={!!selectedRunJob}
          onClose={() => setSelectedRunJob(null)}
          definitionId={selectedRunJob.id || 'rec-ar-001'}
          onRunComplete={async () => {
            await fetchJobs();
          }}
        />
      )}
    </div>
  );
};
