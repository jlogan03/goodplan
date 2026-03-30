# Codebase Context: Skills Update (04-skills-update)

## File Activity Classification

### Actively Changing (multiple commits in last 3 months)

All 12 files in scope have changed recently — this is an active codebase. Most-touched in order:

- `skills/complete/SKILL.md` — 6 commits (most active; last: [task-capture] Phase 3)
- `skills/complete/references/guidance.md` — 5 commits
- `skills/create-slices/SKILL.md` — 5 commits
- `skills/create-slices/references/guidance.md` — 5 commits
- `skills/create-plan/SKILL.md` — 5 commits
- `skills/create-plan/references/guidance.md` — 5 commits
- `skills/explore/SKILL.md` — 4 commits
- `skills/project-status/SKILL.md` — 4 commits
- `skills/refine-slices/SKILL.md` — 3 commits
- `skills/_shared/references/cli-interaction.md` — 6 commits
- `skills/explore/references/explore-logic.md` — 2 commits (least active)
- `skills/_shared/references/state-and-activity-formats.md` — 2 commits

**None of these files are stable** — all are in active development. The plan should treat the files at their current HEAD state (not the state from the plan's initial grep count, which may have drifted).

### Already Partially Updated (nested paths present)

Several files already use `epics/` paths alongside remaining flat `.project/slices/` paths. They have **mixed** state — partial migration already done by earlier slices in the epic:

- `skills/complete/SKILL.md` — has `epics/<epic-name>/` for `$EPIC_DIR` but `$SLICES_DIR` still set to `.project/slices/` for epic-slice scope (lines 31–32). Line 154 explicitly says "NOT `.project/epics/<epic>/slices/<name>/`" — this is the primary stale comment to remove/correct.
- `skills/create-plan/SKILL.md` — already references `.project/epics/<name>/slices/` as a lookup target (line 42, 44), but still falls back to `.project/slices/<activeSlice.name>/` (line 44) without the nested path. Line 65 has `fall back to .project/slices/sequencing.md` which needs updating.
- `skills/create-slices/SKILL.md` — already handles the `$EPIC_DIR` case (line 48) correctly. The remaining flat references (lines 50, 52, 188, 196, 208) are the no-active-epic fallback (`.project/slices/` for legacy) and stale path migration notes — these are intentional and should stay.
- `skills/refine-slices/SKILL.md` — correctly handles both paths via `$SLICES_ROOT` variable already (line 27, 33, 37). The remaining `.project/slices/` references are the fallback case and the IMPORTANT note about exclusions — appropriate.
- `skills/project-status/SKILL.md` — line 211 already uses nested path for epic case and flat for non-epic. The fallback `.project/slices/` check at line 256 is for legacy/pre-epic projects — intentional.
- `skills/explore/SKILL.md` — line 69 still derives activeSlice scope as `.project/slices/<activeSlice.name>/` without epic nesting (main bug). Lines 47, 52, 87 reference flat paths for scan/resolution.

**The `epics/` path pattern is already well-established in these files** — implementors are not inventing new patterns, they are completing an in-progress migration.

## Actual Flat `.project/slices/` Reference Count

Running `grep -rc '\.project/slices/' skills/` totals **36** matches across all skill files. This matches the plan's pre-implementation expected count.

Key locations of flat references that need changing (not already intentional fallbacks):

| File | Key Flat References |
|---|---|
| `complete/SKILL.md` | `$SLICES_DIR` = `.project/slices/` for epic-slice (lines 31–32), stat path (line 82), glob patterns (lines 266–267), sequencing.md reference (line 341) |
| `complete/references/guidance.md` | Glob pattern for completion scanning (line 111), learnings.md path format (lines 15, 34) |
| `create-plan/SKILL.md` | Active slice path derivation without epic (line 44), sequencing.md fallback (line 65) |
| `create-plan/references/guidance.md` | Auto-detect scan path (line 7), summary table (line 13 — omitted in grep output) |
| `explore/SKILL.md` | Active slice path (line 69), ls scan (line 87) |
| `explore/references/explore-logic.md` | Slice scope directory examples (line 9) |
| `_shared/references/cli-interaction.md` | Example paths in CLI response examples (lines 188–189) |
| `_shared/references/state-and-activity-formats.md` | Scope format examples |

## Intentional `.project/slices/` References (do NOT change)

These are correct fallbacks or legacy-project handling — leave them:

- `create-slices/SKILL.md` lines 50, 52 — "No active epic" fallback (`.project/slices/` is the correct path for projects without an active epic)
- `create-slices/references/guidance.md` lines 28, 37 — same fallback + migration note for stale paths
- `refine-slices/SKILL.md` line 33 — "If no active epic, use `.project/slices/`"
- `refine-slices/SKILL.md` line 37 — IMPORTANT exclusion note
- `project-status/SKILL.md` line 256 — "When no `epics/` directory exists (legacy/pre-epic projects)" block

## Target Architecture: Entity Restructuring Epic

From `.project/epics/entity-restructuring/architecture/_overview.md`:

### What Changed (target state)
1. **Nested slice paths**: `.project/slices/<name>/` → `.project/epics/<epic>/slices/<name>/`
2. **Consolidated overview**: single `epics/overview.json` with embedded slices array; `slices/overview.json` and top-level `slices/` directory eliminated
3. **Learnings source of truth**: `learnings.jsonl` via CLI payload only; remove direct `.project/learnings.md` writes from `/complete`

### Key Invariants
- `activeSlice` is only meaningful when `activeEpic` is set (they're always co-present after this epic)
- Quests remain flat at `.project/quests/<name>/` — only slices moved
- `$SLICES_DIR` for epic-slice scope should be `.project/epics/<epic>/slices/` (NOT `.project/slices/`)
- The no-active-epic fallback path (`.project/slices/`) is valid for legacy/pre-epic projects

### Scope format changes
- Activity log scopes: `slices/<name>` → `epics/<epic>/slices/<name>` for epic-scoped slices
- `state.md` Active Slice field: same nested format

## Learnings.md Situation in /complete

This is more nuanced than the plan implies. There are **two distinct concepts**:

1. **`completion/learnings.md`** (local to slice) — synthesis artifact written during Step 5. Keep all references to this. It feeds into the `slice:complete` payload.
2. **`.project/learnings.md`** (project-level) — human-readable rollup. The plan says to **remove the direct edit instructions** for this file from `/complete`.

**Current state in `complete/SKILL.md`**:
- Line 185: "Read `.project/learnings.md`. **Idempotency check**... Add new entries at the top..." — this is the direct-write instruction to remove
- Line 189: Explicit comment "LLM-owned `.project/learnings.md` synthesis: This step is a content authoring step..." — also to remove
- Line 233: "update the top-level learnings rollup" — remove
- Line 109: `.project/learnings.md — existing learnings to avoid duplication` (artifact loading) — remove (no longer needed once write is removed)
- Line 135: `.project/learnings.md (to avoid duplication in rollup)` (epic artifact loading) — remove

**Current state in `complete/references/guidance.md`**:
- Line 34: "Newest first, below header. **Idempotency:** in top-level `.project/learnings.md`, check for existing `_Source: <slice-name>_`..." — the idempotency and direct-write instructions to remove
- Line 38: "The LLM-owned `.project/learnings.md` synthesis (human-readable markdown) remains a direct content authoring step." — contradicts target; remove
- Line 15: `.project/learnings.md` in the artifact loading list — remove

**Critical distinction**: `refine-slices/SKILL.md` line 81 and `create-plan/SKILL.md` line 64 both reference `.project/learnings.md` for **reading context** — these are fine to keep (reading for context is different from writing).

## Relevant Learnings

**Skill-only slices don't need formal review cycles** (`skills-cli-integration` epic): Grep + smoke test is sufficient. The plan correctly calls this out.

**Scattered path references in large functions need exhaustive grep-based enumeration** (`02-rpc-and-commands`): `complete/SKILL.md` is a long file (450+ lines). Implementors must grep ALL string literals containing `.project/slices/` rather than listing only obvious ones.

**Run actual verification commands during planning, not estimated counts** (`05-planning-execution-skills`): The plan's pre-condition count of 36 was verified. Re-run grep during implementation to confirm the actual count before making changes.

**Convention-doc-first enables consistent cross-cutting migrations** (`skills-cli-integration`): The shared references (`cli-interaction.md`, `state-and-activity-formats.md`) should be updated last — after the individual skill files — to ensure consistency.

**Entity paths are now nested under parent entities** (`03-core-skill-validation`, updated by `02-rpc-and-commands`): This is the ground truth. `resolveEntityDir` places slices at `.project/epics/<epic>/slices/<name>/`. Skills must match this.

**Only extract templates with structural identity to shared files** (`skill-workflow-bugs`): Don't consolidate or restructure during this migration — mechanical find-and-replace only.

## Gotchas

1. **`$SLICES_DIR` in `complete/SKILL.md` is explicitly wrong**: Line 31 has a parenthetical comment "slices live at `.project/slices/<name>/`, NOT under epic directory" — this was the old architecture and must be inverted.

2. **The stat path in `complete/SKILL.md` line 82** uses a hardcoded `.project/slices/<name>/` — must use `$SLICES_DIR/<name>/` or the resolved epic path.

3. **Completion glob patterns** (lines 266–267 of `complete/SKILL.md`) scan `.project/slices/*/completion/learnings.md` — this pattern needs to expand to cover both nested epic paths and flat paths (for legacy quests), or change to use the state query approach.

4. **The plan's learnings.md removal task** should also remove the `learnings.md` loading step (Step 4 artifact list, line 109) since the file is no longer read for deduplication once writes are removed.

5. **`complete/SKILL.md` line 154** has an explicit "NOT `.project/epics/<epic>/slices/<name>/`" note — this whole comment block needs inverting/removal.

6. **`state-and-activity-formats.md`**: The scope format examples (e.g., `slices/<name>` → `epics/<epic>/slices/<name>`) need updating. Per the epic architecture, the activity log scope format changed.

7. **`cli-interaction.md` example paths** (lines 188–189) show `/abs/path/to/.project/slices/my-slice/` — update to nested epic path. These are example outputs shown to Claude in skill instructions; stale examples cause agents to generate wrong paths.

8. **No TypeScript changes**: This slice is purely markdown edits. No build, no tests, no Biome lint needed. Verification is grep-based.
