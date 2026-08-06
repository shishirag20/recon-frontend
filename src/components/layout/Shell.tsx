import React, { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Modal } from './Modal';
import { Toast } from './Toast';
import { useModal } from '../../hooks/useModal';

interface ShellProps {
  children: ReactNode;
  onNewReconciliation?: () => void;
}

export const Shell: React.FC<ShellProps> = ({ children, onNewReconciliation }) => {
  const { isOpen, closeModal, modalContent } = useModal();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Fixed Sidebar */}
      <Sidebar onNewReconciliation={onNewReconciliation} />

      {/* Main Routed Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {children}
      </main>

      {/* Global Active Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        {modalContent}
      </Modal>

      {/* Global Toast Stack */}
      <Toast />
    </div>
  );
};
