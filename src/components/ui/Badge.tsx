import React from 'react';
import { clsx } from 'clsx';

export type BadgeVariant = 'ok' | 'warn' | 'bad' | 'accent' | 'muted' | 'auto-resolved';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
  accent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
  'auto-resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const Badge: React.FC<BadgeProps> = ({ variant, label, className }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center shrink-0 whitespace-nowrap h-5 px-2 rounded-md text-xs font-semibold border',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.muted,
        className
      )}
    >
      {label}
    </span>
  );
};
