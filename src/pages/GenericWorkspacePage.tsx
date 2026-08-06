import React from 'react';
import { useParams } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';

export const GenericWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Topbar
        title={`Reconciliation Workspace (${id})`}
        subtitle="Generic reconciliation workspace"
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="card p-6 text-center text-muted">
          Generic Reconciliation Workspace Shell (Phase 1 Ready - Phase 4 will populate this)
        </div>
      </div>
    </div>
  );
};
