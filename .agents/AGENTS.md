# Workspace Project Rules

## Phase Execution & Review Workflow

1. **Automatic Phase Review**:
   - Immediately upon completing a full implementation phase (Phase 1, Phase 2, Phase 3, etc.), the assistant MUST automatically run the `phase-review` skill, execute `bun run build`, and output a Senior Developer Code Review Report.
   - Do NOT run `phase-review` on minor mid-phase user tweaks, bug fixes, or minor styling edits.

2. **Explicit User Approval Gate**:
   - After presenting the Phase Review Report, the assistant MUST ALWAYS STOP and wait for the user's explicit confirmation (e.g. *"Move to Phase N"*, *"Proceed"*) before beginning the next phase.
   - Never automatically jump to the next phase without explicit user confirmation.
