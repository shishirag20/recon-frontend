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
  const [canonicalFieldOptions, setCanonicalFieldOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    // Case/whitespace-insensitive key, mirroring the backend's
    // normalize_header() (app/datahub/transforms.py) - kept in sync manually
    // since it's a stable one-liner, not worth a round trip to duplicate.
    const normalizeHeader = (s: string) => s.trim().toLowerCase();

    const load = async () => {
      setIsLoading(true);
      try {
        // The stream's full synonym dictionary (shared globally per stream -
        // see migration 0026). Every row here, not just the ones relevant to
        // this file - filtered down below once we know the file's headers.
        const [mappings, fields] = await Promise.all([
          fieldMappingService.getActive(stream, true),
          fieldMappingService.canonicalFields(stream, true),
        ]);
        if (cancelled) return;
        setCanonicalFieldOptions(fields);

        const validCanonicalSet = new Set(fields);

        const toRows = (list: typeof mappings): MappingRow[] => {
          const usedTargets = new Set<string>();
          return list.map((m, idx) => {
            let isTargetValid = !!(m.canonical_field && validCanonicalSet.has(m.canonical_field));
            if (isTargetValid && m.transform !== 'CONST') {
              if (usedTargets.has(m.canonical_field)) {
                isTargetValid = false;
              } else {
                usedTargets.add(m.canonical_field);
              }
            }
            return {
              id: m.mapping_id || `map-${idx}`,
              source_field: m.source_field,
              canonical_field: isTargetValid ? m.canonical_field : '',
              transform: isTargetValid ? (m.transform || 'NONE') : 'NONE',
            };
          });
        };

        // Filter the full dictionary down to what's actually relevant to this
        // file: a row whose source_field appears (normalized) among the
        // file's real headers, or a CONST row - CONST ignores the raw value
        // entirely, so its source_field is a placeholder that never needs to
        // appear in the file (e.g. one "amount" column driving amount_minor,
        // currency, and dr_cr via three separate rows). Without this, every
        // synonym ever saved for the stream would show up regardless of what
        // was actually uploaded. Best-effort: a non-CSV file or a read
        // failure falls back to showing the full active mapping below.
        try {
          const headers = await readCsvHeaders(file);
          if (headers.length > 0) {
            const normalizedHeaders = new Set(headers.map(normalizeHeader));
            const relevantRows = toRows(
              mappings.filter(
                (m) => m.transform === 'CONST' || normalizedHeaders.has(normalizeHeader(m.source_field))
              )
            ).map((r) => {
              if (r.canonical_field && !validCanonicalSet.has(r.canonical_field)) {
                return { ...r, canonical_field: '', transform: 'NONE' as TransformType };
              }
              return r;
            });

            // Enrichment: check this file's headers against the DB
            // dictionary and append only the ones genuinely not covered yet -
            // surfaces what's actually new about this file.
            const resolved = await fieldMappingService.resolveHeaders(stream, headers);
            const newRows: MappingRow[] = resolved
              .filter((r) => !r.matched)
              .map((r, idx) => ({
                id: `new-${idx}-${r.source_field}`,
                source_field: r.source_field,
                canonical_field: '',
                transform: 'NONE' as TransformType,
                isNew: true,
              }));
            if (!cancelled) {
              setRows([...relevantRows, ...newRows]);
              return;
            }
          }
        } catch {
          // fall through to the full active mapping below
        }
        if (!cancelled) {
          const sanitizedFullRows = toRows(mappings).map((r) => {
            if (r.canonical_field && !validCanonicalSet.has(r.canonical_field)) {
              return { ...r, canonical_field: '', transform: 'NONE' as TransformType };
            }
            return r;
          });
          setRows(sanitizedFullRows);
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
    return () => { cancelled = true; };
  }, [isOpen, stream, file]);

  const handleAddRow = () => {
    const newId = `map-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      { id: newId, source_field: 'new_column', canonical_field: '', transform: 'NONE' },
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
      const payload: FieldMappingIn[] = rows.map((r) => ({
        source_field: r.source_field,
        canonical_field: r.canonical_field,
        transform: r.transform,
      }));
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
                        <option value={row.source_field}>{row.source_field}</option>
                        {canonicalFieldOptions.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
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
