import React, { useState, useEffect } from 'react';
import { arService } from '../../services/ar.service';
import type { ARRule } from '../../types';
import { ARGroupRow, type PhaseGroupMeta } from './ARGroupRow';
import { useToast } from '../../hooks/useToast';

const PHASE_GROUPS: PhaseGroupMeta[] = [
  {
    key: 'group-intake',
    priority: 1,
    label: 'Intake Validation Rules (Pre-Checks)',
    description: 'Inspects incoming raw transaction feeds, filters out duplicates or already-processed rows, and validates data integrity before operational processing begins.',
    example: 'Flag duplicate Bank Transaction UTR numbers before processing.',
    subPhases: [
      {
        key: 'intake',
        label: 'Intake Validation',
        hint: 'Checks for duplicate UTRs, corrupted rows, and schema integrity.',
      },
    ],
  },
  {
    key: 'group-customer',
    priority: 2,
    label: 'Customer Identification Rules (Phase 1)',
    description: 'Determines, isolates, or verifies who the paying entity is — from high-confidence exact identifiers down to broader fallback and candidate-pooling strategies.',
    example: 'Match payer account number against Customer Master bank account number.',
    subPhases: [
      {
        key: 'customer-lock',
        label: 'Customer Identification',
        hint: 'Locks the paying customer before any invoice is looked at — first rule to succeed wins',
      },
      {
        key: 'candidate-pool',
        label: 'Candidate Pool',
        branchNote: 'only runs for rows Customer Identification couldn\'t lock',
        hint: 'Only runs if Customer Identification fails outright — narrows to a short list instead of guessing',
      },
    ],
  },
  {
    key: 'group-allocation',
    priority: 3,
    label: 'Financial Matching & Allocation Rules (Phase 2)',
    description: 'Governs how transaction amounts, fee deductions, and financial credits are mapped, distributed, and tied against a customer\'s open invoices or account balances.',
    example: 'Match exact invoice number found inside bank narration text.',
    subPhases: [
      {
        key: 'allocation',
        label: 'Scoped Invoice Allocation',
        hint: 'Matches the locked (or pooled) customer\'s own invoices only — never searches globally',
      },
      {
        key: 'short-pay',
        label: 'Invoice settlement / short-pay',
        hint: 'Amount tolerance below which a shortfall is not flagged as a dispute',
      },
      {
        key: 'unapplied',
        label: 'Unapplied cash',
        hint: 'Amount tolerance below which leftover cash is not flagged',
      },
    ],
  },
  {
    key: 'group-post',
    priority: 4,
    label: 'Ledger Settlement & Audit Rules (Post-Reconciliation)',
    description: 'Controls how finalized transactions post to sub-ledgers and general ledgers, manages timing schedules, and logs immutable compliance trails.',
    example: 'Flag GL control account variance exceeding tolerance.',
    subPhases: [
      {
        key: 'gl-check',
        label: 'GL Control Variance',
        hint: 'Compares AR subledger balance against General Ledger control account balance.',
      },
    ],
  },
];

export const ARRulesStudioTab: React.FC = () => {
  const [rules, setRules] = useState<ARRule[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'group-intake': true,
    'group-customer': true,
    'group-allocation': true,
    'group-post': false,
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    arService.getARRules().then((res) => {
      if (!cancelled) setRules(res);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleToggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleEditRule = (id: string) => {
    setEditingRuleId((prev) => {
      if (prev === id) {
        toast('Rule saved successfully', 'ok');
        return null;
      }
      return id;
    });
  };

  const handleToggleEnableRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast('Rule status updated', 'default');
  };

  const handleMoveRuleUp = (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const samePhase = rules
      .filter((r) => r.phase === target.phase)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    const idx = samePhase.findIndex((r) => r.id === id);
    if (idx <= 0) return;

    const prevRule = samePhase[idx - 1];
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) return { ...r, priority: prevRule.priority || 1 };
        if (r.id === prevRule.id) return { ...r, priority: target.priority || 1 };
        return r;
      })
    );
    toast(`Moved "${target.name}" up`, 'default');
  };

  const handleMoveRuleDown = (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const samePhase = rules
      .filter((r) => r.phase === target.phase)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    const idx = samePhase.findIndex((r) => r.id === id);
    if (idx === -1 || idx >= samePhase.length - 1) return;

    const nextRule = samePhase[idx + 1];
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) return { ...r, priority: nextRule.priority || 1 };
        if (r.id === nextRule.id) return { ...r, priority: target.priority || 1 };
        return r;
      })
    );
    toast(`Moved "${target.name}" down`, 'default');
  };

  const handleUpdateRule = (updated: ARRule) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleAddRule = (phaseKey: string) => {
    const rulesInPhase = rules.filter((r) => r.phase === phaseKey);
    const newRule: ARRule = {
      id: `rule-${phaseKey}-${Date.now()}`,
      phase: phaseKey,
      kind: 'threshold',
      name: `New Custom Rule ${rulesInPhase.length + 1}`,
      enabled: true,
      priority: rulesInPhase.length + 1,
      confidence: 90,
      cond: { ref: 'exact', amount: { mode: 'exact', value: 0 }, date: { days: 0 } },
    };

    setRules((prev) => [...prev, newRule]);
    setEditingRuleId(newRule.id);
  };

  return (
    <div className="p-6 space-y-5 fade-in w-full">
      {/* Header Bar */}
      <div className="pb-1">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          AR reconciliation rules
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Each phase runs its own cascading rule list, first match wins — add, edit, reorder, or enable/disable rules to see matching change live. Rules can never be deleted. This is what the reconciliation runs against.
        </p>
      </div>

      {/* Timeline Wrapper (.tl-wrap) */}
      <div className="tl-wrap">
        {PHASE_GROUPS.map((group) => (
          <ARGroupRow
            key={group.key}
            group={group}
            allRules={rules}
            isOpen={!!openGroups[group.key]}
            onToggleOpen={() => handleToggleGroup(group.key)}
            editingRuleId={editingRuleId}
            onToggleEditRule={handleToggleEditRule}
            onToggleEnableRule={handleToggleEnableRule}
            onMoveRuleUp={handleMoveRuleUp}
            onMoveRuleDown={handleMoveRuleDown}
            onUpdateRule={handleUpdateRule}
            onAddRule={handleAddRule}
          />
        ))}
      </div>
    </div>
  );
};
