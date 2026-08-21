import React from 'react';
import type { ARRule } from '../../types';
import { ARRuleCard } from './ARRuleCard';
import { RuleDetailPanel } from './RuleDetailPanel';
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
  selectedRuleId: string | null;
  onSelectRule: (id: string | null) => void;
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
  selectedRuleId,
  onSelectRule,
  onToggleEnableRule,
  onMoveRuleUp,
  onMoveRuleDown,
  onUpdateRule,
  onAddRule,
}) => {
  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  return (
    <div className="tl-subphase">
      {/* Sub-phase Header (if group has multiple sub-phases) */}
      {showHeading && (
        <div className="tl-subhead mb-2.5">
          <div className="tl-subtitle font-bold text-xs text-slate-900">{label}</div>
          {branchNote && <div className="tl-branch text-[11px] text-slate-500 italic">↳ {branchNote}</div>}
          <div className="tl-hint text-xs text-slate-500 mt-0.5">{hint}</div>
        </div>
      )}

      {/* Two-pane layout container */}
      <div className="rs-two-pane grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Pane: Compact Scannable Rule List */}
        <div className={`${selectedRule ? 'lg:col-span-3' : 'lg:col-span-12'} space-y-1.5 transition-all`}>
          {rules.length > 0 ? (
            rules.map((rule, idx) => {
              const ruleNumStr = `${groupPriority}.${ruleNumbers[rule.id] || idx + 1}`;
              const isSelected = selectedRuleId === rule.id;

              return (
                <ARRuleCard
                  key={rule.id}
                  rule={rule}
                  index={idx}
                  total={rules.length}
                  matchedCount={rule.enabled ? 1 : 0}
                  ruleNumberStr={ruleNumStr}
                  isSelected={isSelected}
                  isPanelOpen={!!selectedRule}
                  onSelect={() => onSelectRule(isSelected ? null : rule.id)}
                  onToggleEnable={() => onToggleEnableRule(rule.id)}
                  onMoveUp={() => onMoveRuleUp(rule.id)}
                  onMoveDown={() => onMoveRuleDown(rule.id)}
                />
              );
            })
          ) : (
            <div className="card p-4 text-center text-[12.5px] text-slate-400">
              No rules — this phase is off.
            </div>
          )}

          {/* Add Rule Button */}
          <div className="flex justify-end pt-2 pb-1">
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => onAddRule(subPhaseKey)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Add rule
            </Button>
          </div>
        </div>

        {/* Right Pane: Sticky Detail Panel for Selected Rule */}
        {selectedRule && (
          <div className="lg:col-span-9 sticky top-4">
            <RuleDetailPanel
              rule={selectedRule}
              ruleLabel={`Rule ${groupPriority}.${ruleNumbers[selectedRule.id] || 1}`}
              matchedCount={selectedRule.enabled ? 1 : 0}
              onClose={() => onSelectRule(null)}
              onUpdateRule={onUpdateRule}
            />
          </div>
        )}
      </div>
    </div>
  );
};
