import React from 'react';
import type { ARRule } from '../../types';
import { ARRuleCard } from './ARRuleCard';
import { Button } from '../ui/Button';
import { Plus } from 'lucide-react';

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
            />
          ))
        ) : (
          <div className="card p-4 text-center text-[12.5px] text-slate-400">
            No rules — this phase is off.
          </div>
        )}
      </div>

      {/* Add Rule Button */}
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
    </div>
  );
};
