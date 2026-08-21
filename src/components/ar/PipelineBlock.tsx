import React from 'react';
import { Trash2, ArrowDown, FileText, ChevronDown } from 'lucide-react';
import { getCachedDataSources, getCachedFieldsForEntity } from '../../utils/dataSources';

export interface PipelineCondition {
  entity: string;
  attribute: string;
  operator: string;
  value: string | string[];
}

export interface PipelineBlockData {
  id?: string;
  type: 'filter' | 'extract' | 'match' | 'action';
  tag?: string;
  title: string;
  description?: string;
  dataset?: string;
  conditions?: PipelineCondition[];
  // extract fields
  sourceEntity?: string;
  sourceAttribute?: string;
  sourceField?: string;
  pattern?: string;
  outputVar?: string;
  fn?: string;
  // match fields
  targetEntity?: string;
  targetAttribute?: string;
  targetDataset?: string;
  targetField?: string;
  compareWith?: string;
  matchMode?: string;
  confidence?: number;
  fetchedOutputs?: string[];
  readonly?: boolean;
}

export interface ExtractedVariableInfo {
  name: string;
  stepTag?: string;
  title?: string;
  sourceEntity?: string;
}

interface PipelineBlockProps {
  block: PipelineBlockData;
  index: number;
  total: number;
  isEditMode: boolean;
  availableVariables?: ExtractedVariableInfo[];
  onUpdateBlock: (updated: PipelineBlockData) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDeleteBlock?: () => void;
}

export const PipelineBlock: React.FC<PipelineBlockProps> = ({
  block,
  index,
  total,
  isEditMode,
  availableVariables = [],
  onUpdateBlock,
  onMoveUp,
  onMoveDown,
  onDeleteBlock,
}) => {
  const isFilter = block.type === 'filter';
  const isExtract = block.type === 'extract';
  const isMatch = block.type === 'match';
  const isAction = block.type === 'action';
  const tag = block.tag || `STEP ${index + 1}`;

  const availableDataSources = Array.from(
    new Set([...getCachedDataSources(), ...(block.conditions || []).map((c) => c.entity), block.sourceEntity, block.targetEntity, block.dataset, 'Invoice', 'Sub-Ledger'].filter(Boolean))
  ) as string[];

  const handleChange = (field: keyof PipelineBlockData, val: any) => {
    onUpdateBlock({ ...block, [field]: val });
  };

  const handleConditionChange = (condIdx: number, key: keyof PipelineCondition, val: any) => {
    const nextConds = [...(block.conditions || [])];
    if (nextConds[condIdx]) {
      nextConds[condIdx] = { ...nextConds[condIdx], [key]: val };
      onUpdateBlock({ ...block, conditions: nextConds });
    }
  };

  const handleAddCondition = () => {
    const nextConds = [
      ...(block.conditions || []),
      { entity: 'Invoices', attribute: 'status', operator: 'IS IN', value: ["'OPEN'", "'Partially Settled'"] },
    ];
    onUpdateBlock({ ...block, conditions: nextConds });
  };

  const handleRemoveCondition = (condIdx: number) => {
    const nextConds = (block.conditions || []).filter((_, idx) => idx !== condIdx);
    onUpdateBlock({ ...block, conditions: nextConds });
  };

  // Default values for options
  const sourceEntity = block.sourceEntity || block.dataset || 'Bank Statement';
  const sourceAttr = block.sourceAttribute || block.sourceField || 'Reference Number';
  const targetEntity = block.targetEntity || block.targetDataset || 'Customers';
  const targetAttr = block.targetAttribute || block.targetField || 'Expected UTR';
  const mode = block.matchMode || 'exact';

  const defaultOutputsForEntity = (entity: string) => {
    const norm = entity.toLowerCase();
    if (norm.includes('cust')) return ['Customer ID'];
    if (norm.includes('inv') || norm.includes('ledger') || norm.includes('sub-ledger')) return ['Invoice ID', 'Invoice Amount'];
    if (norm.includes('bank')) return ['Duplicate Status', 'Transaction ID'];
    return ['Record ID', 'Status'];
  };

  const fetchedOutputs = block.fetchedOutputs || defaultOutputsForEntity(targetEntity);

  const modeLabels: Record<string, string> = {
    exact: 'Exact Match (==)',
    contains: 'Substring Containment (in)',
    suffix_ends_with: 'Suffix / Ends-With',
    fuzzy_score: 'Fuzzy Similarity (>= threshold)',
    exact_amount: 'Exact Amount Match',
    exact_dual: 'Dual-Field (Account + IFSC)',
    token_substring: 'Any Token Match (in set)',
    variance_tolerance: 'Variance / Fee Tolerance (|Invoice - Payment| <= Tolerance)',
    subset_sum: 'Subset Sum Combinations (Σ Balances == Payment)',
    overpayment: 'Overpayment Match (Payment > Balance Due, Smallest Excess)',
    partial_payment: 'Partial Payment FIFO (Oldest Due Open Invoice)',
  };
  const modeLabel = modeLabels[mode] || mode.toUpperCase();
  const modeSymbol =
    mode === 'contains'
      ? '⊆'
      : mode === 'suffix_ends_with'
        ? '⊣'
        : mode === 'fuzzy_score'
          ? '≈'
          : mode === 'token_substring'
            ? '∈'
            : mode === 'variance_tolerance'
              ? '±'
              : mode === 'subset_sum'
                ? '∑'
                : mode === 'overpayment'
                  ? '>'
                  : mode === 'partial_payment'
                    ? '↘'
                    : '=';

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`w-full rounded-lg transition-all text-xs font-sans p-4 shadow-2xs ${isFilter
          ? 'border border-slate-300 bg-[#fbfdff]'
          : isExtract
            ? 'border-2 border-dashed border-[#6C63FF] bg-[#fbfcff]'
            : isMatch
              ? 'border-[1.5px] border-[#10B981] bg-[rgba(16,185,129,0.03)]'
              : 'border border-[#F59E0B] bg-[rgba(245,158,11,0.03)]'
          }`}
      >
        {/* Block Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <span
              className={`font-bold text-xs flex-none ${isFilter
                ? 'text-slate-700'
                : isExtract
                  ? 'text-purple-700'
                  : isMatch
                    ? 'text-emerald-800'
                    : 'text-amber-800'
                }`}
            >
              {tag}:
            </span>
            {isEditMode ? (
              <input
                className="font-bold text-xs text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500"
                value={block.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            ) : (
              <span className="font-bold text-xs text-slate-800 truncate">{block.title}</span>
            )}
          </div>

          {isEditMode && (
            <div className="flex items-center gap-1 flex-none">
              {onMoveUp && index > 0 && (
                <button
                  type="button"
                  onClick={onMoveUp}
                  className="p-1 text-slate-400 hover:text-slate-700 text-xs"
                  title="Move up"
                >
                  ▲
                </button>
              )}
              {onMoveDown && index < total - 1 && (
                <button
                  type="button"
                  onClick={onMoveDown}
                  className="p-1 text-slate-400 hover:text-slate-700 text-xs"
                  title="Move down"
                >
                  ▼
                </button>
              )}
              {onDeleteBlock && (
                <button
                  type="button"
                  onClick={onDeleteBlock}
                  className="p-1 text-slate-400 hover:text-rose-600"
                  title="Delete block"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* FILTER BLOCK */}
        {isFilter && (
          <div className="space-y-2">
            <div className="border border-[#dfe5ef] rounded-lg overflow-hidden bg-white text-xs">
              {(block.conditions || []).map((cond, cIdx) => {
                const valDisplay = Array.isArray(cond.value)
                  ? cond.value.join(', ')
                  : String(cond.value ?? '');
                const isLast = cIdx === (block.conditions?.length || 0) - 1;
                const condFields = Array.from(
                  new Set([...getCachedFieldsForEntity(cond.entity), cond.attribute].filter(Boolean))
                );

                return (
                  <React.Fragment key={cIdx}>
                    <div className="flex items-center gap-2.5 p-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Entity Select / Pill */}
                        {isEditMode ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={cond.entity}
                              onChange={(e) => handleConditionChange(cIdx, 'entity', e.target.value)}
                              className="appearance-none bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer outline-none hover:border-indigo-300 transition-all pr-7"
                            >
                              {availableDataSources.map((ds) => (
                                <option key={ds} value={ds}>
                                  {ds}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-700 absolute right-2 pointer-events-none" />
                          </div>
                        ) : (
                          <span className="bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1">
                            {cond.entity} <ChevronDown className="w-3 h-3 text-indigo-400" />
                          </span>
                        )}

                        {/* Attribute Select / Pill */}
                        {isEditMode ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={cond.attribute}
                              onChange={(e) => handleConditionChange(cIdx, 'attribute', e.target.value)}
                              className="appearance-none bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer outline-none hover:border-emerald-300 transition-all pr-7"
                            >
                              {condFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-emerald-700 absolute right-2 pointer-events-none" />
                          </div>
                        ) : (
                          <span className="bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-semibold">
                            {cond.attribute}
                          </span>
                        )}
                      </div>

                      {/* Operator Badge Select / Pill */}
                      {isEditMode ? (
                        <div className="relative inline-flex items-center">
                          <select
                            value={cond.operator}
                            onChange={(e) => handleConditionChange(cIdx, 'operator', e.target.value)}
                            className="appearance-none bg-purple-100 text-purple-700 border border-purple-200 rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer outline-none hover:border-purple-300 transition-all pr-6"
                          >
                            <option value="!=">!=</option>
                            <option value="==">==</option>
                            <option value="IS IN">IS IN</option>
                            <option value="<=">&lt;=</option>
                            <option value=">=">&gt;=</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-purple-600 absolute right-1.5 pointer-events-none" />
                        </div>
                      ) : (
                        <span className="bg-purple-100 text-purple-700 border border-purple-200 rounded-lg px-3.5 py-1.5 text-xs font-bold">
                          {cond.operator}
                        </span>
                      )}

                      <div className="flex items-center gap-1 flex-1 min-w-[100px]">
                        <span className="text-slate-400 font-mono text-sm">[</span>
                        {isEditMode ? (
                          <input
                            className="bg-transparent border-none outline-none font-mono text-xs text-slate-800 flex-1 min-w-0"
                            value={valDisplay}
                            onChange={(e) => handleConditionChange(cIdx, 'value', e.target.value)}
                            placeholder="value..."
                          />
                        ) : (
                          <span className="font-mono text-xs text-slate-800">{valDisplay}</span>
                        )}
                        <span className="text-slate-400 font-mono text-sm">]</span>
                      </div>

                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(cIdx)}
                          className="text-slate-400 hover:text-slate-700 text-base font-bold px-1"
                          title="Remove condition"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {!isLast && (
                      <div className="bg-slate-50 border-t border-b border-[#dfe5ef] px-3 py-1 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold text-[9.5px]">
                          AND
                        </span>
                        <span className="text-slate-500 font-normal">All conditions must be satisfied</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {isEditMode && (
              <button
                type="button"
                onClick={handleAddCondition}
                className="mt-2 text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800"
              >
                + Add condition
              </button>
            )}
          </div>
        )}

        {/* EXTRACT BLOCK */}
        {isExtract && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-purple-200 rounded-lg p-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-700 mb-1">
                INPUT SOURCE (ENTITY - ATTRIBUTE)
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isEditMode ? (
                  <>
                    <select
                      value={sourceEntity}
                      onChange={(e) => handleChange('sourceEntity', e.target.value)}
                      className="appearance-none bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-indigo-300 pr-6"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%233730a3' d='M6 8L3 5h6z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 6px center',
                      }}
                    >
                      {availableDataSources.map((ds) => (
                        <option key={ds} value={ds}>
                          {ds}
                        </option>
                      ))}
                    </select>

                    <select
                      value={sourceAttr}
                      onChange={(e) => handleChange('sourceAttribute', e.target.value)}
                      className="appearance-none bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-emerald-300 pr-6"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2315803d' d='M6 8L3 5h6z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 6px center',
                      }}
                    >
                      {getCachedFieldsForEntity(sourceEntity).map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <span className="bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-semibold">
                      {sourceEntity} ▾
                    </span>
                    <span className="bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold">
                      {sourceAttr}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-purple-700 mb-1">
                REGEX PATTERN USED
              </div>
              {isEditMode ? (
                <input
                  className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 font-mono text-xs text-purple-800 bg-white outline-none focus:border-purple-500"
                  value={block.pattern || '^[A-Za-z0-9]+$'}
                  onChange={(e) => handleChange('pattern', e.target.value)}
                />
              ) : (
                <div className="font-mono text-xs text-purple-800 bg-purple-50/50 px-2.5 py-1.5 rounded-md border border-purple-100">
                  {block.pattern || '^[A-Za-z0-9]+$'}
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-purple-700 mb-1">
                OUTPUT STORED AS
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-md px-2.5 py-1.5 font-mono text-xs font-bold text-indigo-700 flex items-center">
                {isEditMode ? (
                  <input
                    className="bg-transparent border-none outline-none font-mono font-bold text-indigo-700 w-full"
                    value={block.outputVar || 'extracted_utr'}
                    onChange={(e) => handleChange('outputVar', e.target.value)}
                  />
                ) : (
                  <span>${block.outputVar || 'extracted_utr'}</span>
                )}
              </div>
            </div>

            <div className="col-span-full mt-1 bg-purple-50/80 border border-purple-200 rounded-md p-2.5 text-[11px] text-purple-950 flex items-start gap-2">
              <div className="flex-1 space-y-0.5">
                <div>
                  <span className="font-bold">Extracted Variable: </span>
                  Produces <code className="bg-purple-100 px-1 py-0.5 rounded font-mono font-bold text-purple-900">${block.outputVar || 'extracted_var'}</code> passed directly into downstream matching blocks.
                </div>
                {(block.pattern?.includes('\\d') || block.title.toLowerCase().includes('suffix') || block.title.toLowerCase().includes('truncated') || block.title.toLowerCase().includes('mask')) && (
                  <div className="text-[10.5px] text-purple-800">
                    <strong>Masking &apos;X&apos;s &amp; Prefix Handling:</strong> Any leading prefixes and masked characters (such as <code>&apos;X&apos;</code> or <code>&apos;XXXX1046&apos;</code>) are ignored and stripped so the clean 4+ digit numeric tail (<code>1046</code>) is isolated.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MATCH BLOCK */}
        {isMatch && (() => {
          const isSourceExtracted = sourceAttr.startsWith('$') || availableVariables.some(v => v.name === sourceAttr || `$${v.name}` === sourceAttr);
          const sourceExtractedVar = availableVariables.find(v => v.name === sourceAttr || `$${v.name}` === sourceAttr);

          const isTargetExtracted = targetAttr.startsWith('$') || availableVariables.some(v => v.name === targetAttr || `$${v.name}` === targetAttr);
          const targetExtractedVar = availableVariables.find(v => v.name === targetAttr || `$${v.name}` === targetAttr);

          return (
            <div className="space-y-3">
              {/* Comparison Card (Target 1 vs Target 2) */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_56px_1fr] gap-2.5 items-center">
                {/* Left Box (Source Field / Target 1) */}
                <div className="border border-indigo-300 bg-indigo-50/40 rounded-lg p-3">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5">
                    COMPARE TARGET 1 · SOURCE FIELD
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isEditMode ? (
                      <>
                        <div className="relative inline-flex items-center">
                          <select
                            value={sourceEntity}
                            onChange={(e) => handleChange('sourceEntity', e.target.value)}
                            className="appearance-none bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-indigo-300 pr-6"
                          >
                            {availableDataSources.map((ds) => (
                              <option key={ds} value={ds}>
                                {ds}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-700 absolute right-1.5 pointer-events-none" />
                        </div>

                        <div className="relative inline-flex items-center">
                          <select
                            value={sourceAttr}
                            onChange={(e) => handleChange('sourceAttribute', e.target.value)}
                            className="appearance-none bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-emerald-300 pr-6"
                          >
                            {availableVariables.length > 0 && (
                              <optgroup label="Extracted Variables (From Previous Steps)">
                                {availableVariables.map((v) => {
                                  const val = v.name.startsWith('$') ? v.name : `$${v.name}`;
                                  return (
                                    <option key={v.name} value={val}>
                                      {val} ({v.stepTag || 'Extracted'})
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                            <optgroup label={`${sourceEntity} Fields`}>
                              {Array.from(new Set([...getCachedFieldsForEntity(sourceEntity), sourceAttr]))
                                .filter((f) => !f.startsWith('$') && !availableVariables.some((v) => v.name === f))
                                .map((f) => (
                                  <option key={f} value={f}>
                                    {f}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-700 absolute right-1.5 pointer-events-none" />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                          {sourceEntity} <ChevronDown className="w-3 h-3 text-indigo-400" />
                        </span>
                        {isSourceExtracted ? (
                          <span className="bg-purple-100 text-purple-900 border border-purple-300 rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                            <span>{sourceAttr.startsWith('$') ? sourceAttr : `$${sourceAttr}`}</span>
                            <span className="text-[9.5px] font-bold text-purple-700 bg-purple-200 px-1 py-0.5 rounded">
                              {sourceExtractedVar?.stepTag || 'Extracted Field'}
                            </span>
                          </span>
                        ) : (
                          <span className="bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold">
                            {sourceAttr}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-indigo-500 mt-1 font-medium">
                    From {sourceEntity} dataset
                  </div>
                </div>

                {/* Middle Operator Circle */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-600 bg-emerald-50 flex items-center justify-center font-bold text-emerald-700 text-sm">
                    {modeSymbol}
                  </div>
                  <div className="text-[9px] font-bold text-emerald-700 text-center mt-1 tracking-tight uppercase">
                    {modeLabel}
                  </div>
                </div>

                {/* Right Box (Target Field / Target 2) */}
                <div className="border border-emerald-300 bg-emerald-50/40 rounded-lg p-3">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                    COMPARE TARGET 2 · TARGET FIELD
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isEditMode ? (
                      <>
                        <div className="relative inline-flex items-center">
                          <select
                            value={targetEntity}
                            onChange={(e) => handleChange('targetEntity', e.target.value)}
                            className="appearance-none bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-indigo-300 pr-6"
                          >
                            {availableDataSources.map((ds) => (
                              <option key={ds} value={ds}>
                                {ds}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-700 absolute right-1.5 pointer-events-none" />
                        </div>

                        <div className="relative inline-flex items-center">
                          <select
                            value={targetAttr}
                            onChange={(e) => handleChange('targetAttribute', e.target.value)}
                            className="appearance-none bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-emerald-300 pr-6"
                          >
                            {availableVariables.length > 0 && (
                              <optgroup label=" Extracted Variables (From Previous Steps)">
                                {availableVariables.map((v) => {
                                  const val = v.name.startsWith('$') ? v.name : `$${v.name}`;
                                  return (
                                    <option key={v.name} value={val}>
                                      {val} ({v.stepTag || 'Extracted'})
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                            <optgroup label={`${targetEntity} Attributes`}>
                              {Array.from(new Set([...getCachedFieldsForEntity(targetEntity), targetAttr]))
                                .filter((f) => !f.startsWith('$') && !availableVariables.some((v) => v.name === f))
                                .map((f) => (
                                  <option key={f} value={f}>
                                    {f}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-700 absolute right-1.5 pointer-events-none" />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="bg-indigo-50/90 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-semibold">
                          {targetEntity} ▾
                        </span>
                        {isTargetExtracted ? (
                          <span className="bg-purple-100 text-purple-900 border border-purple-300 rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                            <span>{targetAttr.startsWith('$') ? targetAttr : `$${targetAttr}`}</span>
                            <span className="text-[9.5px] font-bold text-purple-700 bg-purple-200 px-1 py-0.5 rounded">
                              {targetExtractedVar?.stepTag || 'Extracted Field'}
                            </span>
                          </span>
                        ) : (
                          <span className="bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold">
                            {targetAttr}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1 font-medium">
                    {isTargetExtracted ? `Extracted in ${targetExtractedVar?.stepTag || 'Step 2'}` : `From ${targetEntity} dataset`}
                  </div>
                </div>
              </div>

              {/* Match Algorithm & Confidence Row */}
              <div className="flex items-center gap-3 p-3 bg-white border border-emerald-200 rounded-lg text-xs">
                <div className="flex-1">
                  <label className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                    MATCH ALGORITHM
                  </label>
                  {isEditMode ? (
                    <select
                      className="w-full bg-white border border-emerald-200 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                      value={mode}
                      onChange={(e) => handleChange('matchMode', e.target.value)}
                    >
                      <option value="exact">Exact Match (==)</option>
                      <option value="contains">Substring Containment (in)</option>
                      <option value="suffix_ends_with">Suffix / Ends-With</option>
                      <option value="fuzzy_score">Fuzzy Similarity (&ge; threshold)</option>
                      <option value="exact_amount">Exact Amount Match</option>
                      <option value="token_substring">Any Token Match (in set)</option>
                      <option value="variance_tolerance">Variance / Fee Tolerance (Shortfall &le; Limit)</option>
                      <option value="subset_sum">Subset Sum (Combination &Sigma; Balances == Payment)</option>
                      <option value="overpayment">Overpayment Match (Payment &gt; Balance Due, Smallest Excess)</option>
                      <option value="partial_payment">Partial Payment FIFO (Oldest Due Open Invoice)</option>
                    </select>
                  ) : (
                    <div className="text-xs font-semibold text-slate-800 py-1">
                      {modeLabel}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Fetched Output Variables Row */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>FETCHED OUTPUT VARIABLES (ON MATCH SUCCESS):</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {fetchedOutputs.map((v, vIdx) => (
                    <span
                      key={vIdx}
                      className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded font-semibold text-[11px] flex items-center gap-1"
                    >
                      {v}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = fetchedOutputs.filter((_, idx) => idx !== vIdx);
                            handleChange('fetchedOutputs', next);
                          }}
                          className="text-emerald-500 hover:text-emerald-900 font-bold text-xs"
                          title="Remove variable"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ACTION BLOCK */}
        {isAction && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 font-medium leading-relaxed">
            {block.description || 'Executes rule outcome disposition.'}
          </div>
        )}
      </div>

      {/* Down Connector Arrow */}
      {index < total - 1 && (
        <div className="my-2 text-indigo-500 flex items-center justify-center">
          <ArrowDown className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
