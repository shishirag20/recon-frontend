import React from 'react';
import { Badge } from './Badge';

export type StatusKey =
  | 'matched'
  | 'suggested'
  | 'break'
  | 'resolved'
  | 'autoresolved'
  | 'completed'
  | 'writeoff'
  | 'investigate'
  | 'deferred'
  | 'journal';

interface StatusPillProps {
  status: StatusKey | string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className }) => {
  const s = status.toLowerCase();
  if (s === 'matched' || s === 'completed') {
    return <Badge variant="ok" label="Matched" className={className} />;
  }
  if (s === 'suggested') {
    return <Badge variant="accent" label="Suggested" className={className} />;
  }
  if (s === 'break' || s === 'open' || s === 'error' || s === 'failed') {
    return <Badge variant="bad" label={status === 'error' ? 'Error' : 'Break'} className={className} />;
  }
  if (s === 'resolved' || s === 'autoresolved' || s === 'auto-resolved') {
    return <Badge variant="ok" label="Resolved" className={className} />;
  }
  if (s === 'writeoff') {
    return <Badge variant="muted" label="Written off" className={className} />;
  }
  if (s === 'under review' || s === 'investigate') {
    return <Badge variant="warn" label="Under review" className={className} />;
  }
  return <Badge variant="muted" label={status} className={className} />;
};
