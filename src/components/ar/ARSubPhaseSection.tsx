import React from 'react';
import type { ARRule } from '../../types';
import { ARRuleCard } from './ARRuleCard';
import { Button } from '../ui/Button';
import { Plus } from 'lucide-react';

// Phases service.create_rule can actually create a new rule for -
// CUSTOMER_LOCK/CANDIDATE_POOL via kind="field-match", SHORT_PAY/UNAPPLIED/
// GL_CHECK via kind="threshold" (_THRESHOLD_ONLY_PHASES). NARRATION_CHECK
// isn't here on purpose - it has no per-kind registry at all, its one rule
// is called directly by engine.py rather than dispatched by kind, and
// creating a new one there used to 500 (KeyError, 2026-08 fix - now a clean
// 400, but there's still nothing meaningful to create). ALLOCATION isn't
// here either - its only registered kinds (exact-invoice-num/invoice-suffix/
// sequential-amount-match) aren't parameterizable building blocks the way
// field-match is, so "Add rule" wouldn't have anything sensible to default
// to. INTAKE_VALIDATION is technically registry-backed (shares
// IDENTIFICATION_RULES with CUSTOMER_LOCK) but field-match there would be a
// customer-identification check sitting in what's meant to be a dup-utr
// reject-only phase - left out as a product choice, not a backend limit.
const ADDABLE_SUB_PHASES = new Set(['customer-lock', 'candidate-pool', 'short-pay', 'unapplied', 'gl-check']);

interface ARSubPhaseSectionProps {
  subPhaseKey: string;
  label: string;
  hint: string;
  branchNote?: string;
  rules: ARRule[];
  groupPriority: number;
  ruleNumbers: Record<string, number>;
  showHeading: boolean;
  editingRuleId: string | null;
  onToggleEditRule: (id: string) => void;
  onToggleEnableRule: (id: string) => void;
  onMoveRuleUp: (id: string) => void;
  onMoveRuleDown: (id: string) => void;
  onUpdateRule: (r: ARRule) => void;
  onAddRule: (phaseKey: string) => void;
  definitionId?: string;
}

export const ARSubPhaseSection: React.FC<ARSubPhaseSectionProps> = ({
  subPhaseKey,
  label,
  hint,
  branchNote,
  rules,
  groupPriority,
  ruleNumbers,
  showHeading,
  editingRuleId,
  onToggleEditRule,
  onToggleEnableRule,
  onMoveRuleUp,
  onMoveRuleDown,
  onUpdateRule,
  onAddRule,
  definitionId,
}) => {
  return (
    <div className="tl-subphase">
      {/* Sub-phase Header (if group has multiple sub-phases) */}
      {showHeading && (
        <div className="tl-subhead">
          <div className="tl-subtitle">{label}</div>
          {branchNote && <div className="tl-branch">↳ {branchNote}</div>}
          <div className="tl-hint">{hint}</div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-2.5">
        {rules.length > 0 ? (
          rules.map((rule, idx) => (
            <ARRuleCard
              key={rule.id}
              rule={rule}
              index={idx}
              total={rules.length}
              matchedCount={rule.enabled ? 1 : 0}
              ruleNumberStr={`Rule ${groupPriority}.${ruleNumbers[rule.id] || idx + 1}`}
              isEditing={editingRuleId === rule.id}
              onToggleEdit={() => onToggleEditRule(rule.id)}
              onToggleEnable={() => onToggleEnableRule(rule.id)}
              onMoveUp={() => onMoveRuleUp(rule.id)}
              onMoveDown={() => onMoveRuleDown(rule.id)}
              onUpdateRule={onUpdateRule}
              definitionId={definitionId}
            />
          ))
        ) : (
          <div className="card p-4 text-center text-[12.5px] text-slate-400">
            No rules — this phase is off.
          </div>
        )}
      </div>

      {/* Add Rule Button - only where the backend can actually create
          something (see ADDABLE_SUB_PHASES above) */}
      {ADDABLE_SUB_PHASES.has(subPhaseKey) && (
        <div className="flex justify-end pt-2.5 pb-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={() => onAddRule(subPhaseKey)}
            className="text-xs text-slate-700 hover:text-slate-900 font-semibold"
          >
            Add rule
          </Button>
        </div>
      )}
    </div>
  );
};
