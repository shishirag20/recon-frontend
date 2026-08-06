import { create } from 'zustand';
import type { ReactNode } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  variant?: 'ok' | 'warn' | 'bad' | 'default';
}

export type ModalWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface AppStoreState {
  // Toast notifications state
  toasts: ToastMessage[];
  toast: (message: string, variant?: ToastMessage['variant']) => void;
  removeToast: (id: string) => void;

  // Modal overlay state
  modalContent: ReactNode | null;
  modalWidth: ModalWidth;
  openModal: (content: ReactNode, width?: ModalWidth) => void;
  closeModal: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  toasts: [],
  toast: (message, variant = 'ok') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  modalContent: null,
  modalWidth: 'md',
  openModal: (content, width = 'md') =>
    set({
      modalContent: content,
      modalWidth: width,
    }),
  closeModal: () =>
    set({
      modalContent: null,
    }),
}));
