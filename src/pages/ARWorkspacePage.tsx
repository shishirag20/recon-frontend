import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { TabBar } from '../components/layout/TabBar';
import { Button } from '../components/ui/Button';
import { ChevronLeft } from 'lucide-react';
import { ARMatchedTab } from '../components/ar/ARMatchedTab';
import { ARRulesStudioTab } from '../components/ar/ARRulesStudioTab';
import { ARExceptionsTab } from '../components/ar/ARExceptionsTab';
import { reconciliationsService } from '../services/reconciliations.service';
import type { RunOut, MatchGroupOut, ExceptionOut } from '../types';

export const ARWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('matches');
  const [run, setRun] = useState<RunOut | null>(null);
  const [matches, setMatches] = useState<MatchGroupOut[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionOut[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumped by `refetch` (passed to ARExceptionsTab as onResolved) to
  // re-trigger the effect below - the fetch itself stays inline in the
  // effect body (not a separately-called useCallback) so eslint's
  // set-state-in-effect check can see it's the effect's own synchronization
  // logic, not an arbitrary external function call.
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = () => setRefreshKey((k) => k + 1);

  // Loads the latest run for this AR definition, then its matches/exceptions
  // in parallel - the single source of truth both tabs render from, so a
  // resolved exception or a freshly-completed run only needs one refetch
  // here rather than each tab independently guessing which run to show.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const latestRun = await reconciliationsService.getLatestRun();
        if (cancelled) return;
        setRun(latestRun);
        if (latestRun) {
          const [m, e] = await Promise.all([
            reconciliationsService.getMatches(latestRun.run_id),
            reconciliationsService.getExceptions(latestRun.run_id),
          ]);
          if (cancelled) return;
          setMatches(m);
          setExceptions(e);
        } else {
          setMatches([]);
          setExceptions([]);
        }
      } catch {
        // Leave whatever was already loaded in place; tabs show their own
        // empty state rather than a page-level error.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const matchesCount = matches.length;
  const exceptionsCount = exceptions.filter((e) => e.status === 'OPEN' || e.status === 'INVESTIGATING').length;

  const tabs = [
    { key: 'matches', label: 'Matched', badge: matchesCount > 0 ? matchesCount : undefined },
    { key: 'exceptions', label: 'Exceptions', badge: exceptionsCount > 0 ? exceptionsCount : undefined },
    { key: 'rules', label: 'Rules Studio' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Header */}
      <Topbar
        title="Accounts Receivable (AR) Reconciliation"
        subtitle={run ? `${run.run_no} · ${run.status}` : 'No run yet'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              onClick={() => navigate('/reconciliation/ar-reconciliation')}
            >
              Category View
            </Button>
          </div>
        }
      />

      {/* Main Tab Navigation Bar */}
      <div className="bg-white flex-none border-b border-slate-200 px-6">
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key)}
        />
      </div>

      {/* Workspace Tab Body Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'matches' && (
          <ARMatchedTab run={run} matches={matches} exceptions={exceptions} loading={loading} />
        )}

        {activeTab === 'rules' && <ARRulesStudioTab />}

        {activeTab === 'exceptions' && (
          <ARExceptionsTab exceptions={exceptions} matches={matches} loading={loading} onResolved={refetch} />
        )}
      </div>
    </div>
  );
};
