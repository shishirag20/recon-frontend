import React, { type ReactNode, useEffect } from 'react';
import { clsx } from 'clsx';
import { useAppStore, type ModalWidth } from '../../store/useAppStore';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: ModalWidth;
}

const WIDTH_CLASSES: Record<ModalWidth, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-[540px]',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  width,
}) => {
  const storeWidth = useAppStore((s) => s.modalWidth);
  const effectiveWidth = width || storeWidth || 'md';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={clsx(
          'relative w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-10',
          WIDTH_CLASSES[effectiveWidth] || WIDTH_CLASSES.md
        )}
      >
        {children}
      </div>
    </div>
  );
};
