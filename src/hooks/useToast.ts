import { useAppStore } from '../store/useAppStore';

export const useToast = () => {
  const toasts = useAppStore((s) => s.toasts);
  const toast = useAppStore((s) => s.toast);
  const removeToast = useAppStore((s) => s.removeToast);

  return { toasts, toast, removeToast };
};
