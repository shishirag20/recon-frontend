import type { ARRule } from '../types';
import type { PhaseGroupMeta } from '../components/ar/ARGroupRow';

/**
 * Maps every rule's id to its Rules Studio display number ("2.10") - a
 * running count per phase group, walked across that group's sub-phases in
 * their declared order, with rules inside a sub-phase ordered by priority.
 * Mirrors ARGroupRow.tsx's own inline computation exactly (same inputs,
 * same order), so a rule shows the same number in Rules Studio and
 * anywhere else (e.g. ARMatchedTab's "Resolved Via" column) that needs to
 * reference it - a second, independently-written version here would drift
 * the moment either one changes.
 */
export function computeRuleNumbers(rules: ARRule[], groups: PhaseGroupMeta[]): Record<string, string> {
  const numbers: Record<string, string> = {};
  groups.forEach((group) => {
    let count = 0;
    group.subPhases.forEach((ph) => {
      rules
        .filter((r) => r.phase === ph.key)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))
        .forEach((r) => {
          count += 1;
          numbers[r.id] = `${group.priority}.${count}`;
        });
    });
  });
  return numbers;
}
