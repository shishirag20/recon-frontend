import React, { useState, useEffect } from 'react';
import { Modal } from '../layout/Modal';
import { Button } from '../ui/Button';
import {
  Zap,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { fieldMappingService } from '../../services/dataHub.service';
import { readCsvHeaders } from '../../utils/csv';
import type { FieldMappingIn, TransformType } from '../../types/datahub';

interface MappingRow {
  id: string;
  source_field: string;
  canonical_field: string;
  transform: TransformType;
  isNew?: boolean; // present in the uploaded file's headers but not in the active mapping
}

interface FieldMappingTransformModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: string;
  file: File;
  categoryName: string;
  fileName: string;
  onConfirmMapping: (mappings: FieldMappingIn[]) => Promise<void>;
}

const TRANSFORM_OPTIONS: { value: TransformType; label: string }[] = [
  { value: 'NONE', label: 'No transform' },
  { value: 'TRIM', label: 'TRIM (strip whitespace)' },
  { value: 'UPPER', label: 'UPPERCASE' },
  { value: 'LOWER', label: 'lowercase' },
  { value: 'TO_MINOR_UNITS', label: 'To Minor Units (* 100)' },
  { value: 'PARSE_DATE', label: 'Parse Date (YYYY-MM-DD)' },
  { value: 'NEGATE', label: 'Negate Amount (-x)' },
  { value: 'CONST', label: 'Constant Value' },
  { value: 'REGEX', label: 'Regex Extract' },
];

export const FieldMappingTransformModal: React.FC<FieldMappingTransformModalProps> = ({
  isOpen,
  onClose,
  stream,
  file,
  categoryName,
  fileName,
  onConfirmMapping,
}) => {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [canonicalFieldOptions, setCanonicalFieldOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        let headers: string[] = [];
        try {
          headers = await readCsvHeaders(file);
        } catch {
          headers = [];
        }

        if (cancelled) return;
        setCsvHeaders(headers);

        if (headers.length > 0) {
          const res = await fieldMappingService.resolveMapping(stream, headers);
          if (cancelled) return;

          setCanonicalFieldOptions(res.canonical_fields || []);

          const modalRows: MappingRow[] = res.mappings.map((m, idx) => ({
            id: `map-${idx}-${m.source_field}`,
            source_field: m.source_field,
            canonical_field: m.canonical_field || '',
            transform: (m.transform || 'NONE') as TransformType,
            isNew: !m.is_matched,
          }));

          setRows(modalRows);
        } else {
          // Fallback if file has no readable headers
          const [mappings, fields] = await Promise.all([
            fieldMappingService.getActive(stream, true),
            fieldMappingService.canonicalFields(stream, true),
          ]);
          if (cancelled) return;
          setCanonicalFieldOptions(fields);
          setRows(
            mappings.map((m, idx) => ({
              id: m.mapping_id || `map-${idx}`,
              source_field: m.source_field,
              canonical_field: m.canonical_field || '',
              transform: (m.transform || 'NONE') as TransformType,
              isNew: false,
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setCanonicalFieldOptions([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, stream, file]);

  const handleAddRow = () => {
    const newId = `map-${Date.now()}`;
    const unusedHeader =
      csvHeaders.find((h) => !rows.some((r) => r.source_field.toLowerCase() === h.toLowerCase())) ||
      csvHeaders[0] ||
      'new_column';
    setRows((prev) => [
      ...prev,
      { id: newId, source_field: unusedHeader, canonical_field: '', transform: 'NONE' },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof MappingRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAiAutoMap = () => {
    setRows((prev) => {
      const usedCanonical = new Set<string>();
      return prev.map((r) => {
        const normSource = r.source_field.toLowerCase().trim();
        let target = '';
        let t: TransformType = 'NONE';

        if (normSource.includes('date')) {
          target = 'transaction_date';
          t = 'PARSE_DATE';
        } else if (normSource === 'amount' || normSource.includes('amount_minor')) {
          target = 'amount_minor';
          t = 'TO_MINOR_UNITS';
        } else if (normSource.includes('ref') || normSource.includes('utr')) {
          target = 'bank_reference';
          t = 'TRIM';
        } else if (normSource.includes('payer') || normSource.includes('account_no')) {
          target = 'payer_account_no';
          t = 'TRIM';
        } else if (normSource.includes('charge')) {
          target = 'is_bank_charge';
          t = 'NONE';
        }

        // If target was already assigned to another column or unmatched, set to '-' ('')
        if (target && usedCanonical.has(target)) {
          target = '';
          t = 'NONE';
        }
        if (target) {
          usedCanonical.add(target);
        }

        return { ...r, canonical_field: target, transform: t };
      });
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const seen = new Set<string>();
      const payload: FieldMappingIn[] = [];

      for (const r of rows) {
        const src = r.source_field.trim();
        const canon = r.canonical_field.trim();
        if (!src || !canon || canon === '-') continue;
        const key = `${src.toLowerCase()}::${canon.toLowerCase()}::${r.transform}`;
        if (!seen.has(key)) {
          seen.add(key);
          payload.push({
            source_field: src,
            canonical_field: canon,
            transform: r.transform,
          });
        }
      }

      await onConfirmMapping(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="xl">
      <div className="flex flex-col h-full bg-white text-slate-900 rounded-2xl overflow-hidden">
        {/* Modal Header matching screenshot 2 */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Field mapping & transforms
              </h2>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                {categoryName}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Uploaded file: <span className="font-semibold text-slate-700">{fileName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ai" size="sm" icon={Zap} onClick={handleAiAutoMap}>
              Map with AI
            </Button>
            <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddRow}>
              Add mapping
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onClose}
              aria-label="Close"
              className="px-2 border-none shadow-none text-slate-400 hover:text-slate-600 ml-1"
            />
          </div>
        </div>

        {/* Table Body Container */}
        <div className="p-6 overflow-y-auto max-h-110">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Reading file & checking against saved mappings...</span>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              {/* Header Titles */}
              <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-4">SOURCE FIELD</div>
                <div className="col-span-4">TARGET FIELD (DB COLUMN)</div>
                <div className="col-span-3">TRANSFORM</div>
                <div className="col-span-1 text-center"></div>
              </div>

              {/* Mapping Rows */}
              <div className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-12 items-center px-4 py-2.5 gap-2 hover:bg-slate-50/50 transition-colors ${row.isNew ? 'bg-amber-50/40' : ''}`}
                  >
                    {/* Source Field */}
                    <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                      <select
                        value={row.source_field}
                        onChange={(e) => handleRowChange(row.id, 'source_field', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                      >
                        {row.source_field && !csvHeaders.includes(row.source_field) && (
                          <option value={row.source_field}>{row.source_field}</option>
                        )}
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                        {csvHeaders.length === 0 && !row.source_field && (
                          <option value="new_column">new_column</option>
                        )}
                      </select>
                      {row.isNew && (
                        <span
                          title="Present in this file but not in the saved mapping yet"
                          className="flex-none flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> NEW
                        </span>
                      )}
                    </div>

                    {/* Arrow Divider */}
                    <div className="col-span-4 flex items-center gap-2">
                      <span className="text-slate-300 font-semibold text-xs">→</span>
                      <select
                        value={row.canonical_field}
                        onChange={(e) => handleRowChange(row.id, 'canonical_field', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-</option>
                        {canonicalFieldOptions.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    {/* Transform Dropdown */}
                    <div className="col-span-3">
                      <select
                        value={row.transform}
                        onChange={(e) =>
                          handleRowChange(row.id, 'transform', e.target.value as TransformType)
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
                      >
                        {TRANSFORM_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Delete Action Button */}
                    <div className="col-span-1 flex items-center justify-center">
                      <Button
                        variant="bad"
                        size="xs"
                        icon={Trash2}
                        onClick={() => handleDeleteRow(row.id)}
                        title="Delete mapping"
                        className="px-1.5"
                      />
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active field mappings defined for this stream yet. Click "+ Add mapping" to define your column rules.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer help note and actions matching screenshot 2 */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Zap className="w-3.5 h-3.5 text-purple-600 flex-none" />
            <span>
              Example: Txn Date "01-07-2026" → parse date → 2026-07-01 · Withdrawal "216.00" → negate → -216.00
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              loading={isSubmitting}
              disabled={isLoading}
              onClick={handleConfirm}
            >
              Confirm mapping
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
