import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { TabBar } from '../components/layout/TabBar';
import { Button } from '../components/ui/Button';
import { ChevronLeft } from 'lucide-react';
import { ARMatchedTab } from '../components/ar/ARMatchedTab';
import { ARRulesStudioTab } from '../components/ar/ARRulesStudioTab';
import { ARExceptionsTab } from '../components/ar/ARExceptionsTab';
import { arService } from '../services/ar.service';
import type { AREngineResult } from '../types';

export const ARWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('matches');
  const [arData, setArData] = useState<AREngineResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAR = async () => {
      try {
        const result = await arService.getARReconciliation('rec-ar-001');
        if (!cancelled) {
          setArData(result);
        }
      } catch {
        // Fallback silently if offline
      }
    };
    fetchAR();
    return () => { cancelled = true; };
  }, []);

  const matchesCount = arData ? (arData.matches || []).length : 0;
  const exceptionsCount = arData ? (arData.exceptions || []).filter((e) => e.status === 'Open').length : 0;

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
        subtitle="July 2026 · Alex Rivera"
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
        {activeTab === 'matches' && <ARMatchedTab />}

        {activeTab === 'rules' && <ARRulesStudioTab />}

        {activeTab === 'exceptions' && <ARExceptionsTab />}
      </div>
    </div>
  );
};
