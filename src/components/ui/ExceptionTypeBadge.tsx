import React from 'react';
import type { ARExceptionType } from '../../types';
import { Badge, type BadgeVariant } from './Badge';

interface ExceptionTypeBadgeProps {
  type: ARExceptionType | string;
  className?: string;
}

const TYPE_VARIANT_MAP: Record<string, BadgeVariant> = {
  'bank_charge': 'muted',
  'partial_payment': 'warn',
  'short_pay': 'bad',
  'Short-Pay': 'bad',
  'No Payment Received': 'bad',
  'over_pay': 'accent',
  'fx_variance': 'warn',
  'unidentified_remittance': 'warn',
  'multi_invoice_break': 'bad',
  'GL Control Mismatch': 'bad',
  'Double Collision': 'bad',
  'Duplicate Transaction': 'bad',
  'Unapplied Payment': 'warn',
  Suspense: 'warn',
  'Multiple Invoice Match': 'warn',
  'Standalone Bank Charge': 'muted',
  'Timing Difference': 'muted',
  'Manually Unreconciled': 'muted',
  'Gateway Variance': 'accent',
};

export const ExceptionTypeBadge: React.FC<ExceptionTypeBadgeProps> = ({
  type,
  className,
}) => {
  const variant = TYPE_VARIANT_MAP[type] || 'muted';
  return <Badge variant={variant} label={type} className={className} />;
};
