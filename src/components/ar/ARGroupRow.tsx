import React from 'react';
import type { ARRule } from '../../types';
import { ARSubPhaseSection } from './ARSubPhaseSection';
import { ChevronDown, Info } from 'lucide-react';

interface SubPhaseMeta {
  key: string;
  label: string;
  hint: string;
  branchNote?: string;
}

export interface PhaseGroupMeta {
  key: string;
  priority: number;
  label: string;
  description: string;
  example: string;
  subPhases: SubPhaseMeta[];
}

interface ARGroupRowProps {
  group: PhaseGroupMeta;
  allRules: ARRule[];
  isOpen: boolean;
  onToggleOpen: () => void;
  selectedRuleId: string | null;
  onSelectRule: (id: string | null) => void;
  onToggleEnableRule: (id: string) => void;
  onMoveRuleUp: (id: string) => void;
  onMoveRuleDown: (id: string) => void;
  onUpdateRule: (r: ARRule) => void;
  onAddRule: (phaseKey: string) => void;
  onDeleteRule: (id: string) => void;
}

export const ARGroupRow: React.FC<ARGroupRowProps> = ({
  group,
  allRules,
  isOpen,
  onToggleOpen,
  selectedRuleId,
  onSelectRule,
  onToggleEnableRule,
  onMoveRuleUp,
  onMoveRuleDown,
  onUpdateRule,
  onAddRule,
  onDeleteRule,
}) => {
  // Compute flattened rule numbers across the whole group
  const ruleNumbers: Record<string, number> = {};
  let count = 0;
  group.subPhases.forEach((ph) => {
    const rulesInPhase = allRules
      .filter((r) => r.phase === ph.key)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    rulesInPhase.forEach((r) => {
      count += 1;
      ruleNumbers[r.id] = count;
    });
  });

  return (
    <div className="tl-row">
      {/* Left Timeline Rail Node */}
      <div className="tl-rail">
        <div className="tl-node">{group.priority}</div>
      </div>

      {/* Timeline Accordion Card */}
      <div className={`tl-card ${isOpen ? 'open' : ''}`}>
        {/* Accordion Card Header */}
        <div className="tl-header-wrap" onClick={onToggleOpen}>
          <div className="tl-head-main">
            <div className="tl-title">{group.label}</div>
            <div className="tl-hint">{group.description}</div>
          </div>

          {/* Info Tooltip */}
          <div className="tl-info-wrap">
            <button
              type="button"
              className="tl-info-btn"
              aria-label={`Example: ${group.example}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            <div className="tl-info-tooltip">{group.example}</div>
          </div>

          {/* Chevron Indicator */}
          <span className="tl-chev">
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Accordion Card Body */}
        {isOpen && (
          <div className="tl-body">
            {group.subPhases.map((ph, idx) => {
              const phaseRules = allRules
                .filter((r) => r.phase === ph.key)
                .sort((a, b) => (a.priority || 0) - (b.priority || 0));

              return (
                <React.Fragment key={ph.key}>
                  <ARSubPhaseSection
                    subPhaseKey={ph.key}
                    label={ph.label}
                    hint={ph.hint}
                    branchNote={ph.branchNote}
                    rules={phaseRules}
                    groupPriority={group.priority}
                    ruleNumbers={ruleNumbers}
                    showHeading={group.subPhases.length > 1}
                    selectedRuleId={selectedRuleId}
                    onSelectRule={onSelectRule}
                    onToggleEnableRule={onToggleEnableRule}
                    onMoveRuleUp={onMoveRuleUp}
                    onMoveRuleDown={onMoveRuleDown}
                    onUpdateRule={onUpdateRule}
                    onAddRule={onAddRule}
                    onDeleteRule={onDeleteRule}
                  />
                  {idx < group.subPhases.length - 1 && <div className="tl-subdivider" />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
