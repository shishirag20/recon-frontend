---
name: phase-review
description: Performs a rigorous senior-developer level code review of completed implementation phases for correctness, code quality, TypeScript safety, visual accuracy, and acceptance criteria verification. Automatically executed ONLY after completing a full phase.
---

# Senior Developer Phase Review Skill

This skill acts as a Senior Staff Frontend Architect reviewing completed implementation phases of the `reconciliation-frontend` application.

---

## Execution Rules & Scope

1. **Automatic Execution on Phase Completion**:
   - This skill is executed **automatically** by the assistant **ONLY when a full implementation phase is completed** (e.g. Phase 1, Phase 2, Phase 3, etc.).
   - It **does NOT run** during minor follow-up tweaks, bug fixes, or style adjustments requested by the user mid-phase.

2. **Phase Progression Control**:
   - After generating the phase review report, the assistant MUST **STOP** and wait for the user's explicit confirmation (e.g. *"Proceed to next phase"*, *"Start Phase 3"*) before starting work on the next phase.

---

## Review Protocol & Steps

### Step 1: Automated Health & Build Verification
1. Run `bun run build` in the terminal to verify zero TypeScript errors and clean Vite production bundling.
2. Verify zero unhandled type errors, missing key props, or unused imports.

### Step 2: PRD Acceptance Criteria Audit
1. Compare implemented files against the PRD specs for the targeted phase in `implementation_plan.md`.
2. Verify that all required views, components, props, modals, and user actions specified in the PRD are present and functional.

### Step 3: Architecture & Code Quality Review
Inspect code files for:
- **TypeScript Strictness**: Ensure proper interfaces (imported with `import type`), zero `any` types, and proper fallback values.
- **Component Hygiene**: Key props on mapped arrays, proper event handler signatures, clean state management without anti-patterns.
- **Styling Consistency**: Standard Tailwind CSS utility usage, harmonious color hierarchy (`slate-50` canvas, `white` card surface, `indigo-600` primary accent, `emerald-50` ok, `amber-50` warn, `red-50` bad).
- **Accessibility & UX**: Keyboard accessibility, ARIA attributes on icon-only buttons, loading states, error boundaries, responsive layout bounds.

### Step 4: Verification Report Generation
Generate a structured, professional code review report formatted as follows:

```markdown
# Phase Review Report: [Phase Name]
**Reviewer**: Senior Staff Frontend Architect
**Status**: [PASS | PASS WITH WARNINGS | REQUIRES CHANGES]

## 1. Build & Type Safety Audit
- [ ] TypeScript Compilation: 0 Errors
- [ ] Vite Production Bundle: OK
- [ ] Code Splitting & Imports: Verified

## 2. PRD Acceptance Criteria Checklist
- [ ] Feature 1: Verified
- [ ] Feature 2: Verified

## 3. Code Quality & Architectural Observations
- **Strengths**: Clean component modularity, strict typing.
- **Refactoring Opportunities / Warnings** (if any): ...

## 4. Verdict & Next Steps
- Final recommendation on whether to proceed to the next phase.
```
