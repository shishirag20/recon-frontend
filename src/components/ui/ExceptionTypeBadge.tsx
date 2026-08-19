import React from 'react';
import type { ARExceptionType } from '../../types';
import { Badge, type BadgeVariant } from './Badge';

interface ExceptionTypeBadgeProps {
  type: ARExceptionType | string;
  className?: string;
}

interface TypeMeta {
  variant: BadgeVariant;
  /** Display label override - falls back to the raw `type` value when unset. */
  label?: string;
}

const TYPE_META: Record<string, TypeMeta> = {
  // Legacy ARExceptionType values - still fed by AROverviewTab's mock data
  // (src/mocks/ar.ts), which already carries its own display-ready strings.
  'bank_charge': { variant: 'muted' },
  'partial_payment': { variant: 'warn' },
  'short_pay': { variant: 'bad' },
  'Short-Pay': { variant: 'bad' },
  'No Payment Received': { variant: 'bad' },
  'over_pay': { variant: 'accent' },
  'fx_variance': { variant: 'warn' },
  'unidentified_remittance': { variant: 'warn' },
  'multi_invoice_break': { variant: 'bad' },
  'GL Control Mismatch': { variant: 'bad' },
  'Double Collision': { variant: 'bad' },
  'Duplicate Transaction': { variant: 'bad' },
  'Unapplied Payment': { variant: 'warn' },
  Suspense: { variant: 'warn' },
  'Multiple Invoice Match': { variant: 'warn' },
  'Standalone Bank Charge': { variant: 'muted' },
  'Timing Difference': { variant: 'muted' },
  'Manually Unreconciled': { variant: 'muted' },
  'Gateway Variance': { variant: 'accent' },

  // Real backend exception_type enum (ExceptionOut['exception_type']) - fed
  // by the live API on the Exceptions and Matched tabs. Every value here is
  // a real constants.EXCEPTION_TYPES entry the backend can actually raise
  // (see docs/reconciliation.md §8).
  SHORT_PAY: { variant: 'bad', label: 'Short-Pay' },
  SUSPENSE: { variant: 'warn', label: 'Suspense' },
  DOUBLE_COLLISION: { variant: 'bad', label: 'Double Collision' },
  MULTIPLE_INVOICE_MATCH: { variant: 'warn', label: 'Multiple Invoice Match' },
  UNAPPLIED_CASH: { variant: 'warn', label: 'Unapplied Cash' },
  NO_PAYMENT: { variant: 'bad', label: 'No Payment Received' },
  GL_VARIANCE: { variant: 'bad', label: 'GL Variance' },
  DUPLICATE: { variant: 'muted', label: 'Duplicate' },
  BANK_CHARGE: { variant: 'muted', label: 'Bank Charge' },
  OVERPAYMENT: { variant: 'accent', label: 'Overpayment' },
  TIMING_DIFFERENCE: { variant: 'muted', label: 'Timing Difference' },
  GATEWAY_VARIANCE: { variant: 'accent', label: 'Gateway Variance' },
};

/** Single source of truth for both the color and the display label of an
 * exception type, so callers never hand-roll their own badge classes. */
export const exceptionTypeLabel = (type: string): string => TYPE_META[type]?.label || type;

export const ExceptionTypeBadge: React.FC<ExceptionTypeBadgeProps> = ({
  type,
  className,
}) => {
  const meta = TYPE_META[type];
  return <Badge variant={meta?.variant || 'muted'} label={meta?.label || type} className={className} />;
};
