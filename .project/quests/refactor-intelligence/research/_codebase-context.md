# Codebase Context — Refactor Intelligence Side Quest

**Fetched**: 2026-03-19

## Fresh Documentation

- `workflow.md` — Full development workflow specification, including per-slice lifecycle (Step 9 = cleanup check)
- `.project/idea.md` — Project goal/scope/constraints for the goodplan skill suite
- `skills/complete/SKILL.md` — Current `/complete` skill definition (Step 9 at lines 223-227)
- `skills/complete/references/guidance.md` — Guidance document for `/complete` (Debt Evaluation Protocol, Signal Tracking, etc.)

## Key Context for Reviewers

### Current Step 9 (what the plan replaces)
- **SKILL.md lines 223-227**: For slices/quests, asks "Do you want a cleanup/refactor pass before moving to the next slice?" For initiative scope, presents leftover temp files/stale state/dangling references.
- Very simple — a yes/no question with no analysis.

### Adjacent Steps (must not overlap)
- **Step 6c (Debt Evaluation Protocol)**: Evaluates *architectural* debt — localized vs systemic, at subsystem boundaries. Classification: localized (inline fix) vs systemic (side quest proposal).
- **Step 6d (Signal Tracking)**: Trend detection across last 3 completed slices (refinement effort, architectural changes).
- **Step 9 target**: *Code-level* refactoring patterns — duplication, divergent patterns, warranted abstractions. Distinct from Step 6c's architectural focus.

### Graceful Stop Cases
- Step 9 falls between Steps 6d and 10. Case (d) in graceful stop covers "signal tracking done, further steps pending" — this should still apply after Step 9 rewrite.

### Active Decisions
- `2026-03-17-simplicity-as-default.md`: Simplicity is the default. Complexity requires justification. Applies to all skills including `/complete`.

### Scope Types
The plan must handle 4 scope types:
- `top-level-slice`, `side-quest`, `initiative-slice`: Run detection algorithm
- `initiative`: Skip detection, keep current behavior (cleanup findings only)
