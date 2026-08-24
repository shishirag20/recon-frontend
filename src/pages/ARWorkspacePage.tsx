import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const validTabs = ['matches', 'exceptions', 'rules'];

  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    const saved = localStorage.getItem('ar_workspace_tab');
    if (saved && validTabs.includes(saved)) {
      return saved;
    }
    return 'matches';
  });

  // Sync if URL search params change
  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (key: string) => {
    setActiveTabState(key);
    localStorage.setItem('ar_workspace_tab', key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    }, { replace: true });
  };

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

  const shortPayMatchGroupIds = React.useMemo(
    () => new Set(exceptions.filter((e) => e.exception_type === 'SHORT_PAY' && e.match_group_id).map((e) => e.match_group_id)),
    [exceptions]
  );
  const displayedMatches = React.useMemo(
    () => matches.filter((g) => !shortPayMatchGroupIds.has(g.match_group_id)),
    [matches, shortPayMatchGroupIds]
  );

  const matchesCount = run?.matched_count ?? displayedMatches.length;
  const exceptionsCount = run?.exception_count ?? exceptions.length;

  const tabs = [
    { key: 'matches', label: 'Matched', badge: run ? matchesCount : (displayedMatches.length > 0 ? displayedMatches.length : undefined) },
    { key: 'exceptions', label: 'Exceptions', badge: run ? exceptionsCount : (exceptions.length > 0 ? exceptions.length : undefined) },
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
          onTabChange={handleTabChange}
        />
      </div>

      {/* Workspace Tab Body Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'matches' && (
          <ARMatchedTab run={run} matches={matches} exceptions={exceptions} loading={loading} />
        )}

        {activeTab === 'rules' && <ARRulesStudioTab />}

        {activeTab === 'exceptions' && (
          <ARExceptionsTab run={run} exceptions={exceptions} matches={matches} loading={loading} onResolved={refetch} />
        )}
      </div>
    </div>
  );
};
