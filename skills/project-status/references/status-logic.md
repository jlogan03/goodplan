# Status Logic Reference

## No `.project/` Directory

If `.project/` does not exist, respond: "No `.project/` directory found — run `/create-epic` to set up structured project planning." Stop.

## Scope Resolution Order

Determine active scope. File-existence takes precedence over `state.md` hints.

1. **Work Stack** top entry from `state.md` (highest priority)
2. **Active epic's active slice** — detect via `ls .project/epics/__active__*/ 2>/dev/null`. If an `__active__` epic exists, scan its `slices/` using the per-slice state machine to find an in-progress slice
3. **Active epic itself** — if `__active__` epic exists but no slice is in progress within it, the epic is the active scope
4. **Active Slice from state.md** (if not "none") — fallback only when no `__active__` epic was found in steps 2-3. If state.md's Active Slice references a path that no longer exists on disk (directory renamed/deleted), treat it as stale and skip
5. **Project level** (fallback)

## File-Existence State Machine

Authoritative source of truth. `state.md` is an optimization hint — these rules override it.

### Per Slice or Quest

Directories with a `~~archived~~` prefix are already completed/archived. Skip them when looking for active work. Include them when counting completed items.

Check in order — **first match wins**:

| # | Condition | State |
|---|---|---|
| 1 | `abandoned.md` exists | Abandoned (check FIRST — takes precedence) |
| 2 | `interrupted.md` exists | Paused by a side quest |
| 3 | `completion/learnings.md` exists | Complete |
| 4 | `after-implementation-fixes-and-polish.md` exists, no `completion/` | Needs completion & propagation |
| 5 | All impl phases passing, no `after-implementation-fixes-and-polish.md` | Needs QA & polish |
| 6 | `plan-refined.md` exists, `implementation/` has phase dirs with at least one iteration, not all phases passing | Implementation in progress |
| 7 | `plan-refined.md` exists, not all impl phases passing | Needs implementation |
| 8 | `plan.md` exists, `plan-refining.md` or `plan-refining/` exists, no `plan-refined.md` | Plan refinement in progress |
| 9 | `plan.md` exists, no `plan-refined.md` | Needs refinement |
| 10 | `explore-complete.md` or `explore-skipped.md` exists, no `plan.md` | Needs plan |
| 11 | `goal.md` + files in `research/` or `brainstorm/`, no `explore-complete.md` | Explore in progress |
| 12 | Only `goal.md` | Explore or plan writing |

Side quests (`side-quests/<name>/`) follow this same state machine.

### Checking Implementation Progress

To evaluate states #5, #6, and #7:

1. List directories under `implementation/` — each `phase-N-*/` is a phase
2. For each phase directory, check if `review.md` exists
3. A review is **passing** if it contains "READY FOR IMPLEMENTATION" (case-insensitive). If absent or contains "NEEDS CHANGES", the phase is not passing.
4. **All phases passing** = every phase directory has a passing `review.md`
5. If no phase directories exist under `implementation/`, implementation has not started (state #7 applies if `plan-refined.md` exists)

### Per Epic

Epic-level state machine is defined in `~/.claude/skills/_shared/references/epic-conventions.md`. Uses the same first-match-wins pattern. Check that file for epic state resolution, directory structure, and transition tables.

**First vs subsequent epic**: The first epic is named `initial` and created as `__active__initial/` (auto-active, no approval gate, writes directly to `architecture/`). Subsequent epics start without `__active__` prefix, use `architecture-proposal/` instead, and require `/start-epic` approval. Use the directory name to disambiguate which state table to apply.

#### `__active__` Detection

```bash
ls -d .project/epics/__active__*/ 2>/dev/null
```

At most one `__active__` epic exists at a time. If found, this epic is the primary context for scope resolution (see Scope Resolution Order above).

#### Epic Directory Scanning

When scanning `.project/epics/`:
- Skip `~~archived~~`-prefixed directories (completed/abandoned)
- Identify the `__active__`-prefixed directory (if any) as the active epic
- Remaining directories are non-active epics (exploring, proposal pending, etc.)
- For the active epic, also scan its `slices/` and apply the per-slice state machine

### Project Level

| Condition | State |
|---|---|
| `idea.md` exists, no `architecture/` | Explore or define architecture |
| `explore-complete.md` or `explore-skipped.md` at `.project/` root | Project-level explore done |
| `architecture/_overview.md` exists, no `slices/sequencing.md` | Needs slice planning |
| `slices/sequencing.md` exists | Check individual slice statuses |

## State-to-Next-Skill Mapping

### Epic States

Load `~/.claude/skills/_shared/references/epic-conventions.md` for the full state machine. Mappings:

| State | Next Skill |
|---|---|
| Epic: ready for exploration | `/explore <epic-path>` |
| Epic: exploring | `/explore <epic-path>` |
| Epic: needs architecture (first) | `/create-architecture <epic-path>` |
| Epic: needs architecture proposal (subsequent) | `/create-architecture <epic-path>` |
| Epic: proposal pending review | `/start-epic <epic-path>` |
| Epic: needs slice planning | `/create-slices <epic-path>` |
| Epic: executing slices | (check individual slice states below) |
| Epic: needs completion | `/complete <epic-path>` |
| Epic: abandoned | (no action) |
| Epic: complete | (no action) |
| No active epic, non-archived/non-abandoned epics exist | Suggest next skill for the most advanced in-progress epic (e.g., `/explore`, `/create-architecture`, `/start-epic`) |
| No active epic, all epics archived/abandoned | `/create-epic` |

### Slice / Quest States

| State | Next Skill |
|---|---|
| Slice: explore in progress | `/explore <path>` |
| Slice: needs plan | `/create-plan <path>` |
| Slice: needs refinement | `/refine-plan <path>/plan.md` |
| Slice: plan refinement in progress | `/refine-plan <path>/plan.md` (resume) |
| Slice: needs implementation | `/implement-plan <path>/plan-refined.md` |
| Slice: implementation in progress | `/implement-plan <path>/plan-refined.md` (resume) |
| Slice: needs QA & polish | (conversational — no skill) |
| Slice: needs completion | `/complete <path>` |
| Interrupted work | Resume work stack top entry first |

### Project States

| State | Next Skill |
|---|---|
| No `.project/` directory | `/create-epic` |
| Project: `idea.md`, no architecture | `/explore` or `/create-architecture` |
| Project: architecture done, no sequencing | `/create-slices` |

## Archive Convention

Completed, superseded, or abandoned scopes are renamed with a `~~archived~~` prefix (e.g., `~~archived~~03-explore/`). When scanning directories:

- **Counting completed work**: Include `~~archived~~`-prefixed directories (they have `completion/learnings.md`)
- **Finding active work**: Skip `~~archived~~`-prefixed directories — they are not actionable
- **Display**: Show `~~archived~~` items in a separate "Completed" section, or just count them (e.g., "7 completed")

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
- side-quests/<name> (interrupted slices/<name> at <phase>)

## Next Step
<Actionable one-sentence instruction>
```

`phase`: kebab-case identifier (e.g. `implement-plan`). `status`: `complete`, `started`, or `in-progress`.
