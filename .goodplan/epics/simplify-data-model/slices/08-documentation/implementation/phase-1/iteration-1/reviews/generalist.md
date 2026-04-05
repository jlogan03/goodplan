# Generalist Review — Phase 1: Rewrite start-epic Skill

## Summary

The start-epic SKILL.md has been rewritten from a v1.0.3 filesystem-manipulation skill (~335 lines) to a clean CLI-based skill (~133 lines) that delegates all state operations to `gp epic:show`, `gp epic:list`, and `gp epic:activate`. The plan tasks are marked complete and the plan-refined.md checkboxes updated accordingly.

## Score: 8/10

## Findings

### IMPORTANT (1)

**I1 — Verification criteria mismatch: `test -f` still present**

The plan specifies that after implementation, `grep -c 'ls -d\|test -f\|mv .goodplan' skills/start-epic/SKILL.md` should return 0. However, it returns 1 because Step 3 (Pre-activation Guard) uses `test -f <epic-path>/architecture/_overview.md && echo "exists"` on line 83.

The plan itself explicitly calls for this guard in task step 3 ("Verify `architecture/_overview.md` exists under the epic directory"), so the implementation correctly follows the plan's *intent*. The issue is that the verification grep pattern in the plan's "Expected Behavior" section is too broad — `test -f` was meant to catch v1.0.3-style state file checks (`test -f "$dir/approved.md"`, `test -f "$dir/explore-complete.md"`), not a legitimate architecture file existence check.

**Resolution options:**
- (a) Update the verification grep to exclude the architecture guard (e.g., `grep -c 'ls -d\|mv .goodplan' skills/start-epic/SKILL.md` + a separate more-targeted check for old state file tests).
- (b) Replace the `test -f` with a CLI-based check if one exists (e.g., check `architectureFiles` in the `epic:show` JSON response). However, the plan explicitly specifies using `test -f` here, and it is a pragmatic belt-and-suspenders guard against inconsistent state, so this seems intentional.

Recommend option (a): adjust the verification criteria, since the implementation matches the plan's task specification.

### Minor (2)

**M1 — Duplicate trigger phrase in frontmatter**

Line 6 of SKILL.md lists `'start epic'` twice in the `Common triggers` list. This was present before the rewrite and was carried over unchanged. Not a regression, but a low-effort cleanup.

**M2 — Step 1 calls `epic:show` before `epic:list`**

When an argument is passed and the epic doesn't exist, Step 1 calls `epic:show` (which will fail), then falls back to `epic:list`. This is correct behavior but slightly inefficient — calling `epic:list` first would avoid the error. However, for the common case (argument is valid), `epic:show` is the right first call. This is a reasonable tradeoff, not a defect.

## Plan Adherence

The implementation matches the plan's 8-step structure exactly:

| Plan Step | Implemented | Notes |
|---|---|---|
| Step 0 — Version Check | Yes | `$GP --version --json` |
| Step 1 — Scope Resolution | Yes | Argument normalization + `epic:list` auto-detect |
| Step 2 — Pre-activation Check | Yes | Full status handling with `nextCommands` |
| Step 3 — Pre-activation Guard | Yes | `test -f` architecture check (triggers I1) |
| Step 4 — Present Architecture | Yes | Epic-scoped files, structured summary |
| Step 5 — User Approval | Yes | 3-option AskUserQuestion |
| Step 6 — Activate | Yes | `epic:activate --json` with status verification |
| Step 7 — Done Summary | Yes | Slice count, next steps |

## Removed References

All v1.0.3 artifacts confirmed absent:

- `architecture-proposal/` — removed
- `approved.md` — removed
- `explore-complete.md` / `explore-skipped.md` — removed
- `__active__` prefix — removed
- `state.md` / `activity-log.jsonl` — removed
- `/create-architecture` / `/create-slices` / `/explore` / `/complete` — removed
- `mv .goodplan` directory rename — removed
- `epic-conventions.md` / `state-and-activity-formats.md` references — removed

## Context Discipline

The skill correctly documents its legitimate exception (reading architecture files for user presentation) with a visible **Context Discipline** callout at the top. This matches the project's orchestrator exception pattern.

## Cross-File Integration

- The plan-refined.md task checkboxes are correctly updated (3 tasks marked `[x]`).
- No other files were touched, which is correct for this phase.
