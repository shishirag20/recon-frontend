import React, { useState, useRef } from 'react';
import { Modal } from '../layout/Modal';
import { UploadDropzone } from './UploadDropzone';
import { DATA_HUB_CATEGORIES } from '../../types';
import {
  X,
  Landmark,
  BookOpen,
  Receipt,
  FileText,
  Zap,
  Users,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

interface IngestJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded: (file: File, category: string) => void;
}

const CATEGORY_META: Record<
  string,
  { icon: React.FC<{ className?: string }>; description: string; color: string }
> = {
  'Bank Statements': {
    icon: Landmark,
    description: 'Bank statements, cash deposits & MT940 / OFX wire feeds',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  'General Ledger': {
    icon: BookOpen,
    description: 'General ledger journal entries, trial balance & GL control feeds',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  'AR Sub-ledger': {
    icon: Receipt,
    description: 'Accounts receivable sub-ledger & customer open invoices',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  'AP Sub-ledger': {
    icon: FileText,
    description: 'Accounts payable sub-ledger, vendor bills & PO records',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  'Gateway Settlements': {
    icon: Zap,
    description: 'Payment gateway settlement reports (Stripe, Razorpay, PayPal)',
    color: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  'Customer Master': {
    icon: Users,
    description: 'Customer master database, GSTIN/PAN & bank account mapping',
    color: 'bg-sky-50 text-sky-600 border-sky-100',
  },
};

export const IngestJobModal: React.FC<IngestJobModalProps> = ({
  isOpen,
  onClose,
  onFileUploaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleClose = () => {
    setActiveCategory(null);
    onClose();
  };

  const handleCardClick = (category: string) => {
    setActiveCategory(category);
    // Trigger OS file chooser on next tick when category view updates
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCategory) {
      onFileUploaded(file, activeCategory);
      handleClose();
    }
  };

  const handleDropzoneFileSelect = (file: File) => {
    if (activeCategory) {
      onFileUploaded(file, activeCategory);
      handleClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} width="2xl">
      <div className="p-6 flex flex-col gap-5 text-xs">
        {/* Hidden File Input for Native File Chooser */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.ofx,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 mr-1 transition-colors"
                title="Change source category"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ingest New Job
              </h2>
              <p className="text-slate-500 mt-0.5">
                {activeCategory
                  ? `Upload statement file for ${activeCategory}`
                  : 'Select a target source category to choose and upload your file'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View State 1: Category Cards Grid */}
        {!activeCategory ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
            {DATA_HUB_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat] || {
                icon: Landmark,
                description: `Ingest statement into ${cat}`,
                color: 'bg-slate-50 text-slate-600 border-slate-200',
              };
              const IconComp = meta.icon;

              return (
                <div
                  key={cat}
                  onClick={() => handleCardClick(cat)}
                  className="group bg-white border border-slate-200 hover:border-indigo-600 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all duration-150 flex items-start gap-3.5"
                >
                  <div className={`p-2.5 rounded-lg border flex-none ${meta.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                        {cat}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors flex-none" />
                    </div>
                    <p className="text-slate-500 mt-1 leading-relaxed text-[11.5px]">
                      {meta.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View State 2: Upload Dropzone for Active Category */
          <div className="flex flex-col gap-4 py-2 fade-in">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
              <span className="font-medium text-slate-700">Target Category:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-md text-xs">
                  {activeCategory}
                </span>
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Change
                </button>
              </div>
            </div>

            <UploadDropzone
              onFileSelect={handleDropzoneFileSelect}
              label={`Drop or select statement file for ${activeCategory}`}
              hint="Supports CSV, XLS, XLSX formats up to 50MB"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
