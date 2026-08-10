import React, { type ReactNode, type ComponentType } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'bad' | 'success' | 'warning';
  size?: 'default' | 'sm' | 'xs';
  icon?: ComponentType<{ className?: string }>;
  iconRight?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
  title?: string;
  'aria-label'?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'ghost',
  size = 'default',
  icon: IconLeft,
  iconRight: IconRight,
  disabled = false,
  onClick,
  children,
  className,
  type = 'button',
  id,
  title,
  'aria-label': ariaLabel,
}) => {
  const baseClass =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer select-none whitespace-nowrap';

  const variantClass =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
      : variant === 'bad'
      ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
      : variant === 'success'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
      : variant === 'warning'
      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900';

  const sizeClass =
    size === 'xs'
      ? 'h-6 px-2.5 text-[10px] rounded-md gap-1 font-bold'
      : size === 'sm'
      ? 'h-8 px-3 text-xs'
      : 'h-9 px-4 text-sm';

  const iconSizeClass =
    size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={clsx(baseClass, variantClass, sizeClass, disabledClass, className)}
    >
      {IconLeft && <IconLeft className={iconSizeClass} />}
      {children}
      {IconRight && <IconRight className={iconSizeClass} />}
    </button>
  );
};
