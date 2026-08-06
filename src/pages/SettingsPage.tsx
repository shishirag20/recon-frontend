import React from 'react';
import { Topbar } from '../components/layout/Topbar';

export const SettingsPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Topbar
        title="Settings"
        subtitle="User profile, company configuration, and entities"
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="card p-6 text-center text-muted">
          Settings Page Shell (Phase 1 Ready - Phase 7 will populate this)
        </div>
      </div>
    </div>
  );
};
