import React from 'react';

interface ConfidenceBarProps {
  value: number; // 0-100
  showText?: boolean;
  className?: string;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  value,
  showText = true,
  className = '',
}) => {
  const capped = Math.min(100, Math.max(0, value));

  const getSegmentBg = (threshold: number) => {
    if (capped < threshold - 15) return 'bg-slate-200';
    if (capped >= 90) return 'bg-emerald-600';
    if (capped >= 75) return 'bg-indigo-600';
    return 'bg-amber-500';
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="inline-flex items-end gap-0.5">
        {[20, 40, 60, 80, 100].map((t) => (
          <span
            key={t}
            className={`w-1.25 h-3 rounded-px ${getSegmentBg(t)}`}
          />
        ))}
      </div>
      {showText && (
        <span className="font-mono text-[12px] text-slate-600 font-normal">
          {capped}
        </span>
      )}
    </div>
  );
};
