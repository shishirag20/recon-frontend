import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sub,
  className = '',
}) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-xl font-bold text-slate-900 tnum tracking-tight">
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
};
