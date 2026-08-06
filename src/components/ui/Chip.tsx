import React from 'react';
import { clsx } from 'clsx';

interface ChipProps {
  label: string;
  mono?: boolean;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, mono = false, className }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center h-6 px-2 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200',
        mono && 'tnum',
        className
      )}
    >
      {label}
    </span>
  );
};
