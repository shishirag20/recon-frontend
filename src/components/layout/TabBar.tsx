import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  badge?: number | string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <div
      className={`px-6 border-b border-slate-200 bg-white flex items-center gap-2 flex-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`h-10 px-3 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${isActive
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isActive
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600'
                  }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
