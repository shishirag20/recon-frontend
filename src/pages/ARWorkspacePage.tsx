import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { TabBar } from '../components/layout/TabBar';
import { Button } from '../components/ui/Button';
import { ChevronLeft, Play, CheckCircle2 } from 'lucide-react';
import { ARMatchedTab } from '../components/ar/ARMatchedTab';
import { ARRulesStudioTab } from '../components/ar/ARRulesStudioTab';
import { ARExceptionsTab } from '../components/ar/ARExceptionsTab';
import { useToast } from '../hooks/useToast';
import { MOCK_AR_RESULT } from '../mocks/ar';

export const ARWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('matches');
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const { toast } = useToast();

  const handleRunReconciliation = () => {
    toast('Executing AR Reconciliation engine (Phase 1 to Phase 4)...', 'ok');
    setTimeout(() => {
      toast('Reconciliation run completed. 10 invoices matched, 4 open exceptions.', 'ok');
    }, 600);
  };

  const handleFinishReconciliation = () => {
    setIsFinished(true);
    toast('Reconciliation signed off and marked as Finished.', 'ok');
  };

  const matchesCount = (MOCK_AR_RESULT.matches || []).length;
  const exceptionsCount = (MOCK_AR_RESULT.exceptions || []).filter((e) => e.status === 'Open').length;

  const tabs = [
    { key: 'matches', label: 'Matched', badge: matchesCount },
    { key: 'exceptions', label: 'Exceptions', badge: exceptionsCount },
    { key: 'rules', label: 'Rules Studio' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Header */}
      <Topbar
        title="Accounts Receivable (AR) Reconciliation"
        subtitle={`July 2026 · Alex Rivera ${isFinished ? '· Signed off' : ''}`}
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

            {isFinished ? (
              <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Reconciliation finished
              </span>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFinishReconciliation}
                  className="border border-slate-200"
                >
                  Finish reconciliation
                </Button>
                <Button
                  variant="primary"
                  icon={Play}
                  onClick={handleRunReconciliation}
                >
                  Run reconciliation
                </Button>
              </>
            )}
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
        {activeTab === 'matches' && <ARMatchedTab />}

        {activeTab === 'rules' && <ARRulesStudioTab />}

        {activeTab === 'exceptions' && <ARExceptionsTab />}
      </div>
    </div>
  );
};
