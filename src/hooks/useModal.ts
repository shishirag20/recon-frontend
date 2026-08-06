import { useAppStore } from '../store/useAppStore';

export const useModal = () => {
  const modalContent = useAppStore((s) => s.modalContent);
  const modalWidth = useAppStore((s) => s.modalWidth);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);

  return {
    isOpen: modalContent !== null,
    modalContent,
    modalWidth,
    openModal,
    closeModal,
  };
};
