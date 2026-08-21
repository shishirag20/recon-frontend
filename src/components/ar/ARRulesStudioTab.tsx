import React, { useState, useEffect } from 'react';
import { arService, resolveARDefinitionId } from '../../services/ar.service';
import type { ARRule } from '../../types';
import { ARGroupRow, type PhaseGroupMeta } from './ARGroupRow';
import { useToast } from '../../hooks/useToast';
import { Loader2, RotateCcw } from 'lucide-react';

const PHASE_GROUPS: PhaseGroupMeta[] = [
  {
    key: 'group-customer',
    priority: 1,
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
      {
        key: 'narration-cross-check',
        label: 'Invoice Narration Cross-Check Rules (Phase 1c)',
        hint: 'Independently verifies the customer identified above against whatever invoice the transaction narration itself references — a separate check, not a competing identification signal, so it runs after Customer Identification and Candidate Pool have already had their turn for every row.',
      },
    ],
  },
  {
    key: 'group-allocation',
    priority: 2,
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
    priority: 3,
    label: 'Ledger Settlement & Audit Rules (Phase 3)',
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
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'group-customer': true,
    'group-allocation': true,
    'group-post': false,
  });
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const id = await resolveARDefinitionId();
        if (!cancelled) setDefinitionId(id);
        const res = await arService.getARRules(id);
        if (!cancelled) setRules(res);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleToggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectRule = (id: string | null) => {
    setSelectedRuleId(id);
  };

  const handleToggleEnableRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target || !definitionId) return;

    const updated = { ...target, enabled: !target.enabled };
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));

    try {
      await arService.updateARRule(definitionId, updated);
      toast('Rule status updated', 'default');
    } catch {
      toast('Failed to update rule status on server', 'bad');
    }
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

  const handleUpdateRule = async (updated: ARRule) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (definitionId) {
      try {
        await arService.updateARRule(definitionId, updated);
        toast('Rule saved successfully', 'ok');
      } catch {
        toast('Failed to save rule on server', 'bad');
      }
    }
  };

  const handleAddRule = (phaseKey: string) => {
    const rulesInPhase = rules.filter((r) => r.phase === phaseKey);
    const newRule: ARRule = {
      id: `rule-${phaseKey}-${Date.now()}`,
      phase: phaseKey,
      kind: 'threshold',
      name: `New Custom Rule ${rulesInPhase.length + 1}`,
      enabled: true,
      priority: (rulesInPhase[rulesInPhase.length - 1]?.priority ?? 0) + 10,
      confidence: 90,
      config: {},
    };

    setRules((prev) => [...prev, newRule]);
    setSelectedRuleId(newRule.id);
  };

  return (
    <div className="p-6 space-y-5 fade-in w-full">
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 pb-1">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            AR reconciliation rules
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Each phase runs its own cascading rule list, first match wins — click any rule to view its full execution pipeline flow, rule outcome, and live sandbox. Rules can never be deleted.
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast('Rules reset to defaults', 'default')}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 flex-none"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading rules…</span>
        </div>
      ) : (
        <div className="tl-wrap">
          {PHASE_GROUPS.map((group) => (
            <ARGroupRow
              key={group.key}
              group={group}
              allRules={rules}
              isOpen={!!openGroups[group.key]}
              onToggleOpen={() => handleToggleGroup(group.key)}
              selectedRuleId={selectedRuleId}
              onSelectRule={handleSelectRule}
              onToggleEnableRule={handleToggleEnableRule}
              onMoveRuleUp={handleMoveRuleUp}
              onMoveRuleDown={handleMoveRuleDown}
              onUpdateRule={handleUpdateRule}
              onAddRule={handleAddRule}
            />
          ))}
        </div>
      )}
    </div>
  );
};
