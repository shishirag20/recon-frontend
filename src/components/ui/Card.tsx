import React, { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  overflow?: 'hidden' | 'visible';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  overflow = 'hidden',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white border border-slate-200 rounded-xl shadow-xs',
        overflow === 'hidden' && 'overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
};
