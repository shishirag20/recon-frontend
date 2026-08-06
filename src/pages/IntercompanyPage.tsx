import React from 'react';
import { Topbar } from '../components/layout/Topbar';

export const IntercompanyPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Topbar
        title="Intercompany Reconciliation"
        subtitle="Cross-entity elimination and transfer pricing consolidation"
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="card p-6 text-center text-muted">
          Intercompany Page Shell (Phase 1 Ready - Phase 8 will populate this)
        </div>
      </div>
    </div>
  );
};
