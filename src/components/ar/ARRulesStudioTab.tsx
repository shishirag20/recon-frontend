import React, { useState, useEffect } from 'react';
import { arService } from '../../services/ar.service';
import { resolveARDefinitionId } from '../../services/ar.service';
import type { ARRule } from '../../types';
import { ARGroupRow, type PhaseGroupMeta } from './ARGroupRow';
import { useToast } from '../../hooks/useToast';
import { Loader2 } from 'lucide-react';

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
    key: 'group-narration-check',
    priority: 3,
    label: 'Invoice Narration Cross-Check Rules (Phase 1c)',
    description: 'Independently verifies the customer identified above against whatever invoice the transaction narration itself references — a separate check, not a competing identification signal, so it runs after Customer Identification and Candidate Pool have already had their turn for every row.',
    example: 'Narration references INV-2026-102 (Bright Textiles), but the payment was locked to Nimbus Traders via UPI — flagged instead of silently trusting the lock.',
    subPhases: [
      {
        key: 'narration-check',
        label: 'Invoice Narration Cross-Check',
        hint: 'Independently checks whether the narration references a real invoice belonging to a different customer than the one identified above — disagreement is flagged for review, never silently overridden.',
      },
    ],
  },
  {
    key: 'group-allocation',
    priority: 4,
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
    priority: 5,
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
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'group-intake': true,
    'group-customer': true,
    'group-narration-check': true,
    'group-allocation': true,
    'group-post': false,
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
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
        // Silently fail — rules stay empty
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

  const handleToggleEditRule = (id: string) => {
    setEditingRuleId((prev) => (prev === id ? null : id));
  };

  const handleToggleEnableRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target || !definitionId) return;

    const updated = { ...target, enabled: !target.enabled };
    setRules((prev) =>
      prev.map((r) => (r.id === id ? updated : r))
    );

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

  const handleAddRule = async (phaseKey: string) => {
    if (!definitionId) return;
    const rulesInPhase = rules.filter((r) => r.phase === phaseKey);
    // field-match (rules.matchers.find_matches) is the only kind that's
    // actually composable without a code change, and only for
    // CUSTOMER_LOCK/CANDIDATE_POOL (see RuleCreate's own docstring) - other
    // phases fall back to threshold, same default this always used, even
    // though it was never actually persisted before (2026-08 fix: this
    // whole function used to fabricate a fake client-side draft with a
    // Date.now() id and never call the backend at all - editing/saving it
    // would 404, since that id never existed server-side).
    const kind = phaseKey === 'customer-lock' || phaseKey === 'candidate-pool' ? 'field-match' : 'threshold';
    const priority = (rulesInPhase[rulesInPhase.length - 1]?.priority ?? 0) + 10;
    // service.create_rule validates a field-match config at creation time
    // (_validate_field_match_config - matcher/bank_field/source/
    // source_field must all be non-empty, or it 400s immediately) - an
    // empty {} config, which is what this used to send, always failed
    // right here (2026-08 fix). Give it a real, sensible starting point
    // instead (narration contains the customer's company name - same
    // spirit as the existing fuzzy-name/token_overlap rules) so creation
    // succeeds; the editor is where the user actually customizes it.
    const config = kind === 'field-match'
      ? { matcher: 'substring', bank_field: 'narration', source: 'customers', source_field: 'company_name' }
      : {};
    try {
      const created = await arService.createARRule(definitionId, {
        phase: phaseKey,
        kind,
        name: `New Custom Rule ${rulesInPhase.length + 1}`,
        priority,
        confidence: null,
        config,
      });
      setRules((prev) => [...prev, created]);
      setEditingRuleId(created.id);
      toast('Rule created', 'ok');
    } catch {
      toast('Failed to create rule on server', 'bad');
    }
  };

  return (
    <div className="p-6 space-y-5 fade-in w-full">
      {/* Header Bar */}
      <div className="pb-1">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          AR reconciliation rules
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Each phase runs its own cascading rule list, first match wins — edit, reorder, or enable/disable rules to see matching change live. Rules can never be deleted. This is what the reconciliation runs against.
        </p>
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
              editingRuleId={editingRuleId}
              onToggleEditRule={handleToggleEditRule}
              onToggleEnableRule={handleToggleEnableRule}
              onMoveRuleUp={handleMoveRuleUp}
              onMoveRuleDown={handleMoveRuleDown}
              onUpdateRule={handleUpdateRule}
              onAddRule={handleAddRule}
              definitionId={definitionId ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
