# Status Logic Reference

## No `.project/` Directory

If `.project/` does not exist, respond: "No `.project/` directory found — run `/start-project` to set up structured project planning." Stop.

## Scope Resolution Order

Determine active scope from `state.md` (if present):
1. Work Stack top entry (highest priority)
2. Active Slice (if not "none")
3. Project level (fallback)

## File-Existence State Machine

Authoritative source of truth. `state.md` is an optimization hint — these rules override it.

### Per Slice or Quest

Check in order — **first match wins**:

| # | Condition | State |
|---|---|---|
| 1 | `abandoned.md` exists | Abandoned (check FIRST — takes precedence) |
| 2 | `interrupted.md` exists | Paused by a side quest |
| 3 | `completion/learnings.md` exists | Complete |
| 4 | `after-implementation-fixes-and-polish.md` exists, no `completion/` | Needs completion & propagation |
| 5 | All impl phases passing, no `after-implementation-fixes-and-polish.md` | Needs QA & polish |
| 6 | `plan-refined.md` exists, not all impl phases passing | Needs implementation |
| 7 | `plan.md` exists, no `plan-refined.md` | Needs refinement |
| 8 | `explore-complete.md` or `explore-skipped.md` exists, no `plan.md` | Needs plan |
| 9 | `goal.md` + files in `research/` or `brainstorm/`, no `explore-complete.md` | Explore in progress |
| 10 | Only `goal.md` | Explore or plan writing |

Side quests (`side-quests/<name>/`) follow this same state machine.

### Checking Implementation Progress

To evaluate states #5 and #6:

1. List directories under `implementation/` — each `phase-N-*/` is a phase
2. For each phase directory, check if `review.md` exists
3. A review is **passing** if it contains "READY FOR IMPLEMENTATION" (case-insensitive). If absent or contains "NEEDS CHANGES", the phase is not passing.
4. **All phases passing** = every phase directory has a passing `review.md`
5. If no phase directories exist under `implementation/`, implementation has not started (state #6 applies if `plan-refined.md` exists)

### Project Level

| Condition | State |
|---|---|
| `idea.md` exists, no `architecture/` | Explore or define architecture |
| `explore-complete.md` or `explore-skipped.md` at `.project/` root | Project-level explore done |
| `architecture/_overview.md` exists, no `vertical-slices/sequencing.md` | Needs slice planning |
| `vertical-slices/sequencing.md` exists | Check individual slice statuses |

## State-to-Next-Skill Mapping

| State | Next Skill |
|---|---|
| No `.project/` directory | `/start-project` |
| Project: `idea.md`, no architecture | `/explore` or `/define-architecture` |
| Project: architecture done, no sequencing | `/define-slices` |
| Slice: explore in progress | `/explore <path>` |
| Slice: needs plan | `/create-plan <path>` |
| Slice: needs refinement | `/refine-plan <path>/plan.md` |
| Slice: needs implementation | `/implement-plan <path>/plan-refined.md` |
| Slice: needs QA & polish | (conversational — no skill) |
| Slice: needs completion | `/complete-slice <path>` |
| Interrupted work | Resume work stack top entry first |

## state.md Write-Back Format

All four sections required:

```markdown
# State

## Current Phase
<phase> <status> — <brief context>

## Active Slice
<slice path | "none (working at project level)">

## Work Stack
<LIFO entries or "(empty)">
- side-quests/<name> (interrupted vertical-slices/<name> at <phase>)

## Next Step
<Actionable one-sentence instruction>
```

`phase`: kebab-case identifier (e.g. `implement-plan`). `status`: `complete`, `started`, or `in-progress`.
