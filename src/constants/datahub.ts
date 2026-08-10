import React from 'react';
import {
  Landmark,
  BookOpen,
  Receipt,
  FileText,
  Users,
  Zap,
} from 'lucide-react';
import type { JobStatus } from '../types/datahub';

export type DisplayJobStatus = JobStatus | 'PROMOTED' | 'PROMOTING';

export const STATUS_STYLES: Record<DisplayJobStatus, string> = {
  PROMOTED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  PROMOTING: 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border border-amber-200',
  FAILED: 'bg-rose-50 text-rose-700 border border-rose-200',
  RUNNING: 'bg-sky-50 text-sky-700 border border-sky-200',
  PENDING: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export const STATUS_LABEL: Record<DisplayJobStatus, string> = {
  PROMOTED: 'Promoted',
  PROMOTING: 'Promoting...',
  SUCCESS: 'Staged',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
  RUNNING: 'Running',
  PENDING: 'Pending',
};

export const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'Bank Statements': Landmark,
  'General Ledger': BookOpen,
  'Sub-ledger': Receipt,
  'AR Sub-ledger': Receipt,
  'AP Sub-ledger': FileText,
  'Customer Master Feed': Users,
  'Customer Master': Users,
  'Gateway Settlements': Zap,
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Bank Statements': 'Bank statements, cash deposits & MT940 / OFX wire feeds',
  'General Ledger': 'General ledger journal entries, trial balance & GL control feeds',
  'Sub-ledger': 'Accounts receivable & payable sub-ledgers, vendor bills & open invoices',
  'AR Sub-ledger': 'Accounts receivable sub-ledger & customer open invoices',
  'AP Sub-ledger': 'Accounts payable sub-ledger, vendor bills & PO records',
  'Customer Master': 'Customer master database, GSTIN/PAN & bank account mapping',
  'Gateway Settlements': 'Payment gateway settlement reports (Stripe, Razorpay, PayPal)',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Bank Statements': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'General Ledger': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Sub-ledger': 'bg-blue-50 text-blue-600 border-blue-100',
  'AR Sub-ledger': 'bg-blue-50 text-blue-600 border-blue-100',
  'AP Sub-ledger': 'bg-amber-50 text-amber-600 border-amber-100',
  'Customer Master': 'bg-sky-50 text-sky-600 border-sky-100',
  'Gateway Settlements': 'bg-purple-50 text-purple-600 border-purple-100',
};

export const CATEGORY_META: Record<
  string,
  { icon: React.FC<{ className?: string }>; description: string; color: string }
> = {
  'Bank Statements': {
    icon: Landmark,
    description: CATEGORY_DESCRIPTIONS['Bank Statements'],
    color: CATEGORY_COLORS['Bank Statements'],
  },
  'General Ledger': {
    icon: BookOpen,
    description: CATEGORY_DESCRIPTIONS['General Ledger'],
    color: CATEGORY_COLORS['General Ledger'],
  },
  'AR Sub-ledger': {
    icon: Receipt,
    description: CATEGORY_DESCRIPTIONS['AR Sub-ledger'],
    color: CATEGORY_COLORS['AR Sub-ledger'],
  },
  'AP Sub-ledger': {
    icon: FileText,
    description: CATEGORY_DESCRIPTIONS['AP Sub-ledger'],
    color: CATEGORY_COLORS['AP Sub-ledger'],
  },
  'Gateway Settlements': {
    icon: Zap,
    description: CATEGORY_DESCRIPTIONS['Gateway Settlements'],
    color: CATEGORY_COLORS['Gateway Settlements'],
  },
  'Customer Master': {
    icon: Users,
    description: CATEGORY_DESCRIPTIONS['Customer Master'],
    color: CATEGORY_COLORS['Customer Master'],
  },
};

export const POLL_INTERVAL_MS = 5000;
export const TERMINAL_STATUSES = new Set(['SUCCESS', 'PARTIAL', 'FAILED']);
