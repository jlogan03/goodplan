# Status Logic Reference

## No Project Detected

If `goodplan status --json` returns a `DATA_NO_PROJECT` error, respond: "No `.project/` directory found — run `/create-epic` to set up structured project planning." Stop.

## Scope Resolution Order

Determine active scope from `goodplan status --json` response fields.

1. **Active quest** — `activeQuest` field (highest priority)
2. **Active slice** — `activeSlice` field
3. **Active epic** — `activeEpic` field (when no active slice)
4. **Project level** (fallback — no active entities)

## File-Existence State Machine

Authoritative source of truth. These rules define state semantics.

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

Use CLI commands (`state --json --query`, `show --json`) to evaluate these conditions — not direct filesystem access.

To evaluate states #5, #6, and #7:

1. Query implementation phase directories via `state --json --query` — each `phase-N-*/` key is a phase
2. For each phase, check if `review.md` exists in the state tree or read it via the Read tool (LLM-owned markdown)
3. A review is **passing** if it contains "READY FOR IMPLEMENTATION" (case-insensitive). If absent or contains "NEEDS CHANGES", the phase is not passing.
4. **All phases passing** = every phase directory has a passing `review.md`
5. If no phase directories exist under `implementation/`, implementation has not started (state #7 applies if `plan-refined.md` exists)

### Per Epic

Epic-level state machine is defined in `~/.claude/skills/_shared/references/epic-conventions.md`. Uses the same first-match-wins pattern. Check that file for epic state resolution, directory structure, and transition tables.

**First vs subsequent epic**: The first epic is named `initial` and created as `__active__initial/` (auto-active, no approval gate, writes directly to `architecture/`). Subsequent epics start without `__active__` prefix, use `architecture-proposal/` instead, and require `/start-epic` approval. Use the directory name to disambiguate which state table to apply.

#### Active Epic Detection

Use `goodplan status --json` → `activeEpic` field. At most one active epic exists at a time.

#### Epic Directory Scanning

Use `goodplan epic:list --json` to get all epics with statuses. Categorize:
- **Archived** (archived status or `~~archived~~` prefix): count as archived, skip further checks
- **Active** (matches `activeEpic` from status): primary context for scope resolution
- **Other**: non-active epics — use their status for reporting
- For the active epic, use `goodplan slice:list --json` to get its slices

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

## State Orientation (CLI)

Skills no longer read or write `state.md`. Use `goodplan status --json` for active entities and phase information. See `~/.claude/skills/_shared/references/cli-interaction.md` section 6 for the full migration reference.
