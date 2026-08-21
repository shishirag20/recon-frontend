import React, { useState, useEffect } from 'react';
import type { ARRule } from '../../types';
import { PipelineBlock, type PipelineBlockData } from './PipelineBlock';
import { getPipelineForKind } from '../../utils/rulePipelines';
import {
  fetchDynamicDataSourcesAndFields,
  getCachedDataSources,
  getCachedFieldsForEntity,
  resolveDatasetsForRule,
} from '../../utils/dataSources';
import { X, Pencil, Save, Target, Table, Sparkles, Check, ArrowLeftRight, AlertTriangle, ChevronDown, FileText, SlidersHorizontal } from 'lucide-react';
import { RULE_METADATA } from './ARRuleCard';

interface RuleDetailPanelProps {
  rule: ARRule;
  ruleLabel: string;
  matchedCount?: number;
  onClose: () => void;
  onUpdateRule: (updated: ARRule) => void;
}

export interface RuleThresholdParam {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  displayValue: string;
  unit: string;
  step: number;
  min: number;
  max?: number;
  helperText: string;
  onChange: (val: number) => void;
}

export function getRuleThresholdParams(
  rule: ARRule,
  updateFn: (updater: (prev: ARRule) => ARRule) => void
): RuleThresholdParam[] {
  const cfg = rule.config || {};
  const cond = rule.cond || {};

  switch (rule.kind) {
    case 'write-off': {
      const rawVal =
        cfg.amount?.value_minor ??
        cfg.max_writeoff_amount ??
        cfg.materiality_threshold ??
        cond.amount?.value ??
        500;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return [
        {
          key: 'materiality_threshold',
          label: 'Materiality Write-Off Limit',
          shortLabel: 'LIMIT',
          value: val,
          displayValue: `≤ ₹${val.toFixed(2)}`,
          unit: '₹',
          step: 0.1,
          min: 0,
          helperText: 'Residual invoice balances at or below this threshold are automatically written off.',
          onChange: (newVal) => {
            const minor = Math.round(newVal * 100);
            updateFn((prev) => ({
              ...prev,
              config: {
                ...(prev.config || {}),
                amount: { mode: 'tolerance', value_minor: minor },
                max_writeoff_amount: minor,
                materiality_threshold: minor,
              },
              cond: { ...(prev.cond || {}), amount: { mode: 'abs', value: minor } },
            }));
          },
        },
      ];
    }
    case 'bank-fee': {
      const rawVal =
        cfg.amount?.value_minor ??
        cfg.max_fee_amount ??
        cond.amount?.value ??
        500;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return [
        {
          key: 'fee_tolerance',
          label: 'Fee Variance Tolerance',
          shortLabel: 'TOLERANCE',
          value: val,
          displayValue: `± ₹${val.toFixed(2)}`,
          unit: '₹',
          step: 0.1,
          min: 0,
          helperText: 'Max allowable shortfall variance consistent with bank wire/transfer fees.',
          onChange: (newVal) => {
            const minor = Math.round(newVal * 100);
            updateFn((prev) => ({
              ...prev,
              config: {
                ...(prev.config || {}),
                amount: { mode: 'tolerance', value_minor: minor },
                max_fee_amount: minor,
              },
              cond: { ...(prev.cond || {}), amount: { mode: 'abs', value: minor } },
            }));
          },
        },
      ];
    }
    case 'subset-sum': {
      const val = cfg.max_invoices ?? cfg.max_combo ?? cond.amount?.value ?? 10;
      return [
        {
          key: 'max_invoices',
          label: 'Max Combo Invoices',
          shortLabel: 'MAX COMBO',
          value: Number(val),
          displayValue: `≤ ${val} Invoices`,
          unit: 'Invoices',
          step: 1,
          min: 2,
          max: 20,
          helperText: 'Maximum number of open invoices searched in combinatorial subset sums.',
          onChange: (newVal) => {
            updateFn((prev) => ({
              ...prev,
              config: {
                ...(prev.config || {}),
                max_invoices: newVal,
                max_combo: newVal,
              },
              cond: { ...(prev.cond || {}), amount: { mode: 'abs', value: newVal } },
            }));
          },
        },
      ];
    }
    case 'fuzzy-name': {
      const val = cfg.min_similarity ? Math.round(cfg.min_similarity * 100) : rule.confidence || 85;
      return [
        {
          key: 'min_similarity',
          label: 'Match Similarity Threshold',
          shortLabel: 'SIMILARITY',
          value: Number(val),
          displayValue: `≥ ${val}%`,
          unit: '%',
          step: 1,
          min: 50,
          max: 100,
          helperText: 'Trigram string similarity score required to lock customer identity.',
          onChange: (newVal) => {
            updateFn((prev) => ({
              ...prev,
              config: {
                ...(prev.config || {}),
                min_similarity: newVal / 100,
              },
            }));
          },
        },
      ];
    }
    case 'invoice-suffix':
    case 'account-suffix': {
      const val = cfg.min_length ?? cfg.suffix_length ?? 4;
      return [
        {
          key: 'min_length',
          label: 'Min Suffix Digits',
          shortLabel: 'MIN DIGITS',
          value: Number(val),
          displayValue: `≥ ${val} Digits`,
          unit: 'Digits',
          step: 1,
          min: 3,
          max: 12,
          helperText: 'Minimum count of trailing unmasked digits extracted from narration or account.',
          onChange: (newVal) => {
            updateFn((prev) => ({
              ...prev,
              config: {
                ...(prev.config || {}),
                min_length: newVal,
                suffix_length: newVal,
              },
            }));
          },
        },
      ];
    }
    case 'threshold': {
      let label = 'Tolerance Threshold';
      let shortLabel = 'THRESHOLD';
      let helperText = 'Dispute threshold deciding when exceptions are flagged.';
      if (rule.phase === 'short-pay') {
        label = 'Shortfall Tolerance Limit';
        shortLabel = 'SHORTFALL TOLERANCE';
        helperText = 'Maximum allowable shortfall before raising a Short-Pay exception.';
      } else if (rule.phase === 'unapplied') {
        label = 'Unapplied Cash Limit';
        shortLabel = 'UNAPPLIED LIMIT';
        helperText = 'Maximum leftover cash balance permitted before raising an Unapplied Cash exception.';
      } else if (rule.phase === 'gl-check') {
        label = 'GL Control Variance Tolerance';
        shortLabel = 'GL VARIANCE';
        helperText = 'Permitted discrepancy gap between AR sub-ledger and GL control account.';
      }

      const rawVal = cfg.amount?.value_minor ?? cond.amount?.value ?? 0;
      const val = typeof rawVal === 'number' && rawVal >= 100 ? rawVal / 100 : Number(rawVal);
      return [
        {
          key: 'threshold_amount',
          label,
          shortLabel,
          value: val,
          displayValue: `≤ ₹${val.toFixed(2)}`,
          unit: '₹',
          step: 0.1,
          min: 0,
          helperText,
          onChange: (newVal) => {
            const minor = Math.round(newVal * 100);
            updateFn((prev) => ({
              ...prev,
              config: {
                ...(prev.config || {}),
                amount: { mode: 'abs', value_minor: minor },
                value_minor: minor,
              },
              cond: { ...(prev.cond || {}), amount: { mode: 'abs', value: minor } },
            }));
          },
        },
      ];
    }
    default:
      return [];
  }
}

const AccountingOutcomeBlock: React.FC<{ cards?: string[] }> = ({ cards }) => {
  if (!cards || cards.length === 0) return null;

  const showFull = cards.includes('full');
  const showPartial = cards.includes('partial');
  const showOverpayment = cards.includes('overpayment');

  return (
    <div className="mt-5 p-4 bg-white border border-slate-200 shadow-2xs rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-indigo-700 font-bold text-[10px] tracking-wider uppercase">
        <FileText className="w-3.5 h-3.5" />
        Accounting Outcome &amp; Settlement Action
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {showFull && (
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-emerald-800">Payment = Invoice</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                P == I
              </span>
            </div>
            <div className="text-sm font-bold text-emerald-900 mb-1">Full Settlement</div>
            <div className="text-[11px] text-emerald-600">Invoice fully closed &amp; matched</div>
          </div>
        )}

        {showPartial && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-amber-800">Payment &lt; Invoice</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                P &lt; I
              </span>
            </div>
            <div className="text-sm font-bold text-amber-900 mb-1">Partial Settlement</div>
            <div className="text-[11px] text-amber-600">Remaining balance stays open</div>
          </div>
        )}

        {showOverpayment && (
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-indigo-800">Payment &gt; Invoice</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                P &gt; I
              </span>
            </div>
            <div className="text-sm font-bold text-indigo-900 mb-1">Settled + Excess to GL</div>
            <div className="text-[11px] text-indigo-600">Overpayment to Unapplied Cash</div>
          </div>
        )}
      </div>
    </div>
  );
};

export const RuleDetailPanel: React.FC<RuleDetailPanelProps> = ({
  rule,
  ruleLabel,
  matchedCount: _matchedCount = 0,
  onClose,
  onUpdateRule,
}) => {
  const [activeTab, setActiveTabState] = useState<'pipeline' | 'outcome' | 'sandbox'>(() => {
    const saved = localStorage.getItem('ar_rule_detail_tab') as 'pipeline' | 'outcome' | 'sandbox';
    if (saved && ['pipeline', 'outcome', 'sandbox'].includes(saved)) {
      return saved;
    }
    return 'pipeline';
  });

  const setActiveTab = (tab: 'pipeline' | 'outcome' | 'sandbox') => {
    setActiveTabState(tab);
    localStorage.setItem('ar_rule_detail_tab', tab);
  };

  const [isEditMode, setIsEditMode] = useState(false);
  const [draftRule, setDraftRule] = useState<ARRule>(rule);

  const defaults = resolveDatasetsForRule(rule);

  const [primaryEntity, setPrimaryEntity] = useState<string>(
    draftRule.config?.primaryDataset || defaults.primaryDataset
  );
  const [primaryAttribute, setPrimaryAttribute] = useState<string>(
    draftRule.config?.primaryField || defaults.primaryField
  );
  const [targetEntity, setTargetEntity] = useState<string>(
    draftRule.config?.targetDataset || defaults.targetDataset
  );
  const [targetAttribute, setTargetAttribute] = useState<string>(
    draftRule.config?.targetField || defaults.targetField
  );

  const [dataSources, setDataSources] = useState<string[]>(getCachedDataSources());

  useEffect(() => {
    let cancelled = false;
    fetchDynamicDataSourcesAndFields().then((res) => {
      if (!cancelled) {
        setDataSources(res.dataSources);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [confidenceInput, setConfidenceInput] = useState<string>(
    String(rule.confidence ?? 95)
  );

  // Sync draft rule when incoming rule changes
  useEffect(() => {
    const defs = resolveDatasetsForRule(rule);
    setDraftRule(rule);
    setConfidenceInput(String(rule.confidence ?? 95));
    setPrimaryEntity(rule.config?.primaryDataset || defs.primaryDataset);
    setPrimaryAttribute(rule.config?.primaryField || defs.primaryField);
    setTargetEntity(rule.config?.targetDataset || defs.targetDataset);
    setTargetAttribute(rule.config?.targetField || defs.targetField);
  }, [rule]);

  const handleConfidenceChange = (valStr: string) => {
    setConfidenceInput(valStr);
    if (valStr.trim() === '') {
      setDraftRule((prev) => ({ ...prev, confidence: undefined }));
    } else {
      const num = Number(valStr);
      if (!isNaN(num)) {
        setDraftRule((prev) => ({ ...prev, confidence: num }));
      }
    }
  };

  const handleConfidenceBlur = () => {
    if (confidenceInput.trim() === '' || isNaN(Number(confidenceInput))) {
      const fallback = rule.confidence ?? 95;
      setConfidenceInput(String(fallback));
      setDraftRule((prev) => ({ ...prev, confidence: fallback }));
    } else {
      const clamped = Math.min(100, Math.max(0, Number(confidenceInput)));
      setConfidenceInput(String(clamped));
      setDraftRule((prev) => ({ ...prev, confidence: clamped }));
    }
  };

  const meta = RULE_METADATA[rule.kind] || {
    label: rule.name,
    description: rule.config?.description || 'Applies automated matching rule logic against incoming transaction stream.',
  };

  const pipelineBlocks: PipelineBlockData[] =
    draftRule.config?.pipeline || rule.config?.pipeline || getPipelineForKind(rule.kind);

  const handleUpdatePipelineBlock = (blkIdx: number, updatedBlk: PipelineBlockData) => {
    const nextPipeline = [...pipelineBlocks];
    nextPipeline[blkIdx] = updatedBlk;
    const nextConfig = { ...(draftRule.config || {}), pipeline: nextPipeline };
    const nextRule = { ...draftRule, config: nextConfig };
    setDraftRule(nextRule);
  };

  const handleAddPipelineBlock = (type: 'filter' | 'extract' | 'match' | 'action') => {
    const newBlk: PipelineBlockData = {
      id: `blk-${Date.now()}`,
      type,
      title: type === 'filter' ? 'New Filter Condition' : type === 'extract' ? 'New Extractor Step' : type === 'match' ? 'New Match Step' : 'New Custom Action',
      tag: `STEP ${pipelineBlocks.length + 1}`,
      ...(type === 'filter'
        ? { dataset: 'Bank Statement', conditions: [{ entity: 'Bank Statement', attribute: 'Reference Number', operator: '!=', value: "''" }] }
        : type === 'extract'
          ? { sourceEntity: 'Bank Statement', sourceAttribute: 'narration', pattern: 'Standard Extractor', outputVar: 'custom_var' }
          : type === 'match'
            ? { sourceEntity: 'Bank Statement', sourceAttribute: 'Reference Number', targetEntity: 'Customers', targetAttribute: 'Expected UTR', compareWith: 'custom_var', matchMode: 'exact' }
            : { description: 'Custom rule disposition action' }),
    };

    const nextPipeline = [...pipelineBlocks, newBlk];
    const nextConfig = { ...(draftRule.config || {}), pipeline: nextPipeline };
    setDraftRule({ ...draftRule, config: nextConfig });
  };

  const handleRemovePipelineBlock = (blkIdx: number) => {
    const nextPipeline = pipelineBlocks.filter((_, idx) => idx !== blkIdx);
    const nextConfig = { ...(draftRule.config || {}), pipeline: nextPipeline };
    setDraftRule({ ...draftRule, config: nextConfig });
  };

  const handleMovePipelineBlock = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pipelineBlocks.length) return;
    const nextPipeline = [...pipelineBlocks];
    const [moved] = nextPipeline.splice(fromIdx, 1);
    nextPipeline.splice(toIdx, 0, moved);
    const nextConfig = { ...(draftRule.config || {}), pipeline: nextPipeline };
    setDraftRule({ ...draftRule, config: nextConfig });
  };

  const handleDeleteBlock = (blkIdx: number) => {
    handleRemovePipelineBlock(blkIdx);
  };

  const handleMoveBlockUp = (blkIdx: number) => {
    handleMovePipelineBlock(blkIdx, blkIdx - 1);
  };

  const handleMoveBlockDown = (blkIdx: number) => {
    handleMovePipelineBlock(blkIdx, blkIdx + 1);
  };

  const handleDatasetFieldChange = (key: string, val: string) => {
    if (key === 'primaryEntity') setPrimaryEntity(val);
    if (key === 'primaryAttribute') setPrimaryAttribute(val);
    if (key === 'targetEntity') setTargetEntity(val);
    if (key === 'targetAttribute') setTargetAttribute(val);

    const nextConfig = {
      ...(draftRule.config || {}),
      primaryDataset: key === 'primaryEntity' ? val : primaryEntity,
      primaryField: key === 'primaryAttribute' ? val : primaryAttribute,
      targetDataset: key === 'targetEntity' ? val : targetEntity,
      targetField: key === 'targetAttribute' ? val : targetAttribute,
    };
    setDraftRule({ ...draftRule, config: nextConfig });
  };

  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<'CLOSE_PANEL' | 'CANCEL_EDIT' | null>(null);

  const handleRequestExit = (action: 'CLOSE_PANEL' | 'CANCEL_EDIT') => {
    if (isEditMode) {
      setPendingExitAction(action);
      setShowExitConfirmModal(true);
    } else {
      if (action === 'CLOSE_PANEL') {
        onClose();
      }
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    const defs = resolveDatasetsForRule(rule);
    setDraftRule(rule);
    setConfidenceInput(String(rule.confidence ?? 95));
    setPrimaryEntity(rule.config?.primaryDataset || defs.primaryDataset);
    setPrimaryAttribute(rule.config?.primaryField || defs.primaryField);
    setTargetEntity(rule.config?.targetDataset || defs.targetDataset);
    setTargetAttribute(rule.config?.targetField || defs.targetField);
    setIsEditMode(false);

    if (pendingExitAction === 'CLOSE_PANEL') {
      onClose();
    }
    setPendingExitAction(null);
  };

  const handleSaveClick = () => {
    if (isEditMode) {
      onUpdateRule(draftRule);
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  };

  const primaryFields = getCachedFieldsForEntity(primaryEntity);
  const targetFields = getCachedFieldsForEntity(targetEntity);

  const currentOutcome = draftRule.config?.outcome || draftRule.config?.rule_outcomes || {
    ifMatched: '',
    else: '',
  };

  return (
    <div className="rs-detail-panel bg-white border border-slate-300 rounded-xl overflow-hidden shadow-lg fade-in relative">
      {/* Exit Without Saving Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-full flex-none mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900">Exit Without Saving?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You are currently editing this rule. Any unsaved modifications to pipeline steps or settings will be lost.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  setPendingExitAction(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-all"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-indigo-700 uppercase tracking-wide bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
              {ruleLabel}
            </span>
            <h4 className="font-bold text-base text-slate-900">{draftRule.name}</h4>
          </div>
          {meta.description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{meta.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-none flex-wrap justify-end">
          {/* Strictness / Confidence Badge & Input */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${isEditMode
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-emerald-50/80 border-emerald-200'
              }`}
            title={isEditMode ? 'Click to edit required match confidence score (0-100%)' : 'Required Match Confidence'}
          >
            <Target className="w-4 h-4 text-emerald-600 flex-none" />
            <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              CONFIDENCE:
              {isEditMode && <Pencil className="w-3 h-3 text-emerald-600 animate-pulse" />}
            </label>
            <div className="flex items-center gap-0.5">
              {isEditMode ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={confidenceInput}
                  onChange={(e) => handleConfidenceChange(e.target.value)}
                  onBlur={handleConfidenceBlur}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="95"
                  className="w-12 bg-white text-emerald-950 font-extrabold text-xs border border-emerald-400 rounded px-1.5 py-0.5 text-center outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  title="Enter confidence percentage (0-100)"
                />
              ) : (
                <span className="font-bold text-xs text-emerald-900 px-1 py-0.5">
                  {confidenceInput || (rule.confidence ?? 95)}
                </span>
              )}
              <span className="font-bold text-xs text-emerald-900">%</span>
            </div>
          </div>

          {/* Cancel Edit Button (shown in Edit Mode) */}
          {isEditMode && (
            <button
              type="button"
              onClick={() => handleRequestExit('CANCEL_EDIT')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
          )}

          {/* Edit / Save Rule Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            className={`btn text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all ${isEditMode
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600'
              : 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900'
              }`}
          >
            {isEditMode ? (
              <>
                <Save className="w-3.5 h-3.5" /> Save Rule
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" /> Edit Rule
              </>
            )}
          </button>

          {/* Close Panel Button */}
          <button
            type="button"
            onClick={() => handleRequestExit('CLOSE_PANEL')}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="flex items-center gap-1 px-5 pt-2 border-b border-slate-200 bg-slate-50/60 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'pipeline'
            ? 'border-indigo-600 text-indigo-700 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Pipeline Flow
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outcome')}
          className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'outcome'
            ? 'border-indigo-600 text-indigo-700 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Rule Outcome
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sandbox')}
          className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'sandbox'
            ? 'border-indigo-600 text-indigo-700 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Live Sandbox
        </button>
      </div>

      {/* Detail Tab Content Area */}
      <div className="p-5 bg-slate-50/30 max-h-[640px] overflow-y-auto">
        {/* PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4 fade-in">
            {/* Datasets Considered Tile */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-slate-400" />
                <span>DATASETS CONSIDERED</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isEditMode ? (
                    <>
                      <div className="relative inline-flex items-center">
                        <select
                          value={primaryEntity}
                          onChange={(e) => handleDatasetFieldChange('primaryEntity', e.target.value)}
                          className="appearance-none bg-slate-100 text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer outline-none hover:border-indigo-400 pr-6"
                        >
                          {dataSources.map((ds) => (
                            <option key={ds} value={ds}>
                              {ds}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-1.5 pointer-events-none" />
                      </div>

                      <div className="relative inline-flex items-center">
                        <select
                          value={primaryAttribute}
                          onChange={(e) => handleDatasetFieldChange('primaryAttribute', e.target.value)}
                          className="appearance-none bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-indigo-300 pr-6"
                        >
                          {primaryFields.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-indigo-700 absolute right-1.5 pointer-events-none" />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="dataset-tile entity">{primaryEntity}</span>
                      <span className="dataset-tile attribute">{primaryAttribute}</span>
                    </>
                  )}
                </div>

                <ArrowLeftRight className="w-4 h-4 text-slate-300 mx-1" />

                <div className="flex items-center gap-1.5 flex-wrap">
                  {isEditMode ? (
                    <>
                      <div className="relative inline-flex items-center">
                        <select
                          value={targetEntity}
                          onChange={(e) => handleDatasetFieldChange('targetEntity', e.target.value)}
                          className="appearance-none bg-slate-100 text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer outline-none hover:border-indigo-400 pr-6"
                        >
                          {dataSources.map((ds) => (
                            <option key={ds} value={ds}>
                              {ds}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-1.5 pointer-events-none" />
                      </div>

                      <div className="relative inline-flex items-center">
                        <select
                          value={targetAttribute}
                          onChange={(e) => handleDatasetFieldChange('targetAttribute', e.target.value)}
                          className="appearance-none bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none hover:border-emerald-300 pr-6"
                        >
                          {targetFields.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-emerald-700 absolute right-1.5 pointer-events-none" />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="dataset-tile entity">{targetEntity}</span>
                      <span className="dataset-tile attribute">{targetAttribute}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Configured Thresholds & Tolerance Parameters Tile */}
            {(() => {
              const thresholdParams = getRuleThresholdParams(draftRule, setDraftRule);
              if (thresholdParams.length === 0) return null;

              return (
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                      <span>CONFIGURED THRESHOLDS &amp; TOLERANCES</span>
                    </div>
                    {isEditMode && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                        Editable in Edit Mode
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {thresholdParams.map((param) => (
                      <div
                        key={param.key}
                        className="bg-white border border-amber-200/90 rounded-lg p-2.5 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800">{param.label}</span>
                          <span className="font-mono text-xs font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {param.displayValue}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">{param.helperText}</p>

                        {isEditMode && (
                          <div className="pt-1.5 border-t border-slate-100 flex items-center gap-2">
                            <label className="text-[10.5px] font-semibold text-slate-600">Adjust Value:</label>
                            <div className="flex items-center gap-1">
                              {param.unit === '₹' && <span className="text-xs font-bold text-slate-700">₹</span>}
                              <input
                                type="number"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={param.value}
                                onChange={(e) => param.onChange(Number(e.target.value))}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-20 bg-amber-50 text-slate-900 font-bold text-xs border border-amber-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield]"
                              />
                              {param.unit !== '₹' && <span className="text-xs font-bold text-slate-700">{param.unit}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Pipeline Flow Steps */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  PIPELINE FLOW STEPS
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
                  {pipelineBlocks.length} STEPS
                </span>
              </div>

              <div className="space-y-2">
                {pipelineBlocks.map((blk, idx) => {
                  const availableVariables = pipelineBlocks
                    .slice(0, idx)
                    .filter((b) => b.type === 'extract' && b.outputVar)
                    .map((b, bIdx) => ({
                      name: b.outputVar!,
                      stepTag: b.tag || `STEP ${bIdx + 1}`,
                      title: b.title,
                      sourceEntity: b.sourceEntity || 'Sub-Ledger',
                    }));

                  return (
                    <PipelineBlock
                      key={blk.id || idx}
                      block={blk}
                      index={idx}
                      total={pipelineBlocks.length}
                      isEditMode={isEditMode}
                      availableVariables={availableVariables}
                      onUpdateBlock={(updated) => handleUpdatePipelineBlock(idx, updated)}
                      onMoveUp={() => handleMoveBlockUp(idx)}
                      onMoveDown={() => handleMoveBlockDown(idx)}
                      onDeleteBlock={() => handleDeleteBlock(idx)}
                    />
                  );
                })}
              </div>

              {isEditMode && (
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500">Add Block:</span>
                  <button
                    type="button"
                    onClick={() => handleAddPipelineBlock('filter')}
                    className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200"
                  >
                    + Filter
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPipelineBlock('extract')}
                    className="text-xs font-semibold px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md border border-purple-200"
                  >
                    + Extractor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPipelineBlock('match')}
                    className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200"
                  >
                    + Match
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OUTCOME TAB */}
        {activeTab === 'outcome' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              {isEditMode && (
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Editable Outcome
                </span>
              )}
            </div>

            {/* IF MATCHED BLOCK */}
            <div className="flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-600 flex-none mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold text-emerald-800 text-xs">IF MATCHED:</span>
                {isEditMode ? (
                  <textarea
                    rows={2}
                    placeholder="Enter description for match outcome..."
                    className="w-full border border-emerald-300 rounded-lg p-2 font-sans text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20"
                    value={currentOutcome.ifMatched || ''}
                    onChange={(e) => {
                      const nextOutcome = { ...currentOutcome, ifMatched: e.target.value };
                      setDraftRule({
                        ...draftRule,
                        config: { ...(draftRule.config || {}), outcome: nextOutcome, rule_outcomes: nextOutcome },
                      });
                    }}
                  />
                ) : (
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {currentOutcome.ifMatched || <span className="text-slate-400 italic">No outcome description configured in database for match condition.</span>}
                  </p>
                )}
              </div>
            </div>

            {/* ELSE BLOCK */}
            <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
              <Check className="w-4 h-4 text-slate-400 flex-none mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold text-slate-700 text-xs">ELSE:</span>
                {isEditMode ? (
                  <textarea
                    rows={2}
                    placeholder="Enter description for non-match/skip outcome..."
                    className="w-full border border-slate-300 rounded-lg p-2 font-sans text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                    value={currentOutcome.else || ''}
                    onChange={(e) => {
                      const nextOutcome = { ...currentOutcome, else: e.target.value };
                      setDraftRule({
                        ...draftRule,
                        config: { ...(draftRule.config || {}), outcome: nextOutcome, rule_outcomes: nextOutcome },
                      });
                    }}
                  />
                ) : (
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {currentOutcome.else || <span className="text-slate-400 italic">No outcome description configured in database for skip condition.</span>}
                  </p>
                )}
              </div>
            </div>

            <AccountingOutcomeBlock cards={currentOutcome.cards} />
          </div>
        )}

        {/* SANDBOX TAB */}
        {activeTab === 'sandbox' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500 space-y-2 fade-in">
            <div className="font-bold text-slate-800 text-sm">Live Sandbox Test</div>
            <p className="max-w-md mx-auto leading-relaxed">
              Test input feeds and real-time execution tracing against live datasets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
