import React, { type ReactNode } from 'react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="h-17 flex-none flex items-center justify-between gap-4 px-6 border-b border-slate-200 bg-white">
      <div className="flex flex-col min-w-0">
        <h1 className="font-bold text-base text-slate-900 truncate leading-snug tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <span className="text-xs text-slate-500 truncate max-w-xl">
            {subtitle}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
    </header>
  );
};
