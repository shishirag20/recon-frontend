import React from 'react';
import { NavLink } from 'react-router-dom';
import { Landmark, GitMerge, FileText, Plus, Settings, type LucideIcon } from 'lucide-react';
import { MOCK_USER } from '../../mocks/users';

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'data-hub',
    label: 'Data Hub',
    icon: Landmark,
    path: '/data-hub',
  },
  {
    key: 'reconciliation',
    label: 'Reconciliation',
    icon: GitMerge,
    path: '/reconciliation',
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileText,
    path: '/reports',
  },
];

interface SidebarProps {
  onNewReconciliation?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewReconciliation }) => {
  return (
    <aside className="w-60 flex-none bg-white border-r border-slate-200 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-17 flex items-center gap-3 px-4 border-b border-slate-200 flex-none">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
          <GitMerge className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-900 tracking-tight">
            Stack Books
          </span>
          <span className="text-[11px] text-slate-500 font-medium leading-none">
            Reconciliation
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="p-3 space-y-1 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const ItemIcon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <ItemIcon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`mono text-xs px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* New Reconciliation Button */}
      <div className="p-3 border-t border-slate-200 flex-none">
        <button
          onClick={onNewReconciliation}
          className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Plus className="w-4 h-4 text-slate-400" />
          <span>New reconciliation</span>
        </button>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-200 flex items-center gap-3 flex-none">
        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold flex-none">
          {MOCK_USER.initials}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-900 truncate">
            {MOCK_USER.name}
          </span>
          <span className="text-[11px] text-slate-500 truncate">
            {MOCK_USER.role}
          </span>
        </div>
        <NavLink
          to="/settings"
          className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </NavLink>
      </div>
    </aside>
  );
};
