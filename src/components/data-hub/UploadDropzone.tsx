import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  label?: string;
  hint?: string;
  accept?: string;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelect,
  label = 'Drop file here or click to browse',
  hint = 'Supports CSV, XLS, XLSX, OFX up to 50MB',
  accept = '.csv,.xls,.xlsx,.ofx',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <label
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center select-none"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Upload className="w-5 h-5" />
      </div>
      <div className="text-xs font-semibold text-slate-800">{label}</div>
      <div className="text-[11px] text-slate-400">{hint}</div>
    </label>
  );
};
