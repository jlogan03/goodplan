---
name: status
requires: gp >= 1.0.0
description: Query project state via the goodplan CLI — including epic detection, slice progress, and side quests — and report the current phase, recent activity, and what to do next. Use at the start of any session, after context compaction, after completing a slice or epic, or whenever you need to re-orient in a project using the goodplan structured development workflow. Common triggers: 'status', 'where am I', 'what's next', 'project state', 'orient', 're-orient'.
user-invocable: true
---

# Status

## References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/decisions-format.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/epic-conventions.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/expertise-tracking.md

## Step 1 — Detect gp CLI and Project

**Stage A — Binary exists:**

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

**Stage B — Project exists:**

```bash
$GP status --json
```

If this returns a `DATA_NO_PROJECT` error (exit code 1), tell the user:

> No `.goodplan/` directory found — run `/gp:create-epic` to set up structured project planning.

**Stop here** — do not continue with subsequent steps.

If successful, save the `status --json` response for use in subsequent steps.

## Step 2 — Load Decisions

Load `.goodplan/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Count active decisions and note any with `revisiting` status for the status report.

## Step 3 — Get Project Status

Use the `status --json` response saved from Step 1B. Extract:
- Active entities (`activeEpic`, `activeSlice`, `activeQuest`)
- Entity statuses and phases
- Recommendations (suggested next actions)
- Warnings (stale entities)

This replaces the previous `state.md` read — `status --json` is now the authoritative source for active entities and phase information.

## Step 4 — Get Recent Activity

Run:

```bash
$GP state --json --query '.["activity-log.jsonl"] | .[-5:]'
# Note: `gp state` accesses raw state data with jq queries.
# `gp status` returns processed project state (active entities, recommendations).
# Use `status` for high-level orientation, `state` for deep state queries.
```

Parse the returned array and extract: `phase`, `scope`, `status`, and `ts` (timestamp). Format timestamps as human-readable short form (e.g., "Mar 15 16:45"). Arrange entries most recent first for the status report.

## Step 5 — Determine Active Scope

Derive the active scope from the `status --json` response:

1. Check `activeQuest` — if non-null, the active quest is highest priority
2. Check `activeSlice` — if non-null, this is the active slice
3. Check `activeEpic` — if non-null but no active slice, the epic is the active scope
4. Fall back to project level

For Format B reporting (all slices/epics/quests with states), use:

```bash
$GP slice:list --json
$GP quest:list --json
$GP epic:list --json
```

Note: `epic:list --json` has no `--status` filter — filtering is client-side.

For interrupted work detection, use:

```bash
$GP state --json --query '.epics | .. | .["interrupted.md"]? // empty'
```

> Note: recursive `..` queries traverse all values (strings, arrays, objects) and may need optimization for larger state trees. A more targeted alternative: `.epics[][].slices[][] | select(has("interrupted.md")) | .["interrupted.md"]`

For sequencing order, resolve the path via the CLI (epic directories may use an `__active__` prefix — do not construct paths manually). See Step 8 Format B for the safe sequencing resolution pattern.

## Step 6 — Derive Entity State and Details

Use `status --json` for phase derivation and entity status. For entity details, use `show --json`:

```bash
$GP slice:show --slice <name> --json
$GP epic:show --epic <name> --json
$GP quest:show --quest <name> --json
```

Skills can rely on `status`, `name`, `goal` fields from entity JSON. The `artifacts` field is not yet available (deferred to slice 02).

For deeper lookups where `show --json` is insufficient, use `state --json --query`. First get the active epic name from `$GP status --json` (`.activeEpic.name`), then use it to construct the query path:

```bash
# Get the active epic name dynamically
EPIC_NAME=$($GP status --json | jq -r '.activeEpic.name')
$GP state --json --query ".epics[\"$EPIC_NAME\"].slices | keys"
```

### Slice / Quest State

Use the `status` field from `show --json` or `list --json` responses. See the **Status Logic Reference** section below for state-to-next-skill mappings.

For implementation progress checking (when the status indicates implementation is in progress), use `state --json --query` to check implementation phase directories:

```bash
EPIC_NAME=$($GP status --json | jq -r '.activeEpic.name')
$GP state --json --query ".epics[\"$EPIC_NAME\"].slices[\"<slice>\"].implementation | keys"
```

Then check for passing reviews via the Read tool on `review.md` files (these are LLM-owned markdown).

### Epic Directory Scanning

Epic scanning always runs when epics exist — needed for Format B reporting. Use `epic:list --json` to get all epics with their statuses:

```bash
$GP epic:list --json
```

For each epic, categorize by CLI status:
- **Completed** (`status === "completed"`): count as completed, skip further checks
- **Active** (matches `activeEpic.name` from `status --json`): this is the active epic — also get its slices via `slice:list --json`
- **Other**: non-active epics — use their status for reporting

## Step 7 — Check for Interrupted Work

Check for interrupted work using `state --json --query`:

```bash
$GP state --json --query '[.. | .["interrupted.md"]? | select(. != null)]'
```

Also check the `status --json` response for any entities with interrupted/paused status.

If any interrupted work is found, surface it clearly in the status report.

## Step 7b — Load Expertise Summary

Check if `${CLAUDE_PLUGIN_DATA}/expertise.md` exists and has content. Before reading, run the plugin data guard from expertise-tracking.md (auto-included above):

```bash
if [ -z "${CLAUDE_PLUGIN_DATA}" ] || [ "${CLAUDE_PLUGIN_DATA}" = '${CLAUDE_PLUGIN_DATA}' ]; then
  echo 'CLAUDE_PLUGIN_DATA not resolved — skipping expertise loading'
else
  cat "${CLAUDE_PLUGIN_DATA}/expertise.md" 2>/dev/null
fi
```

If the guard fails or the file does not exist, skip the expertise line in the status report. If the file exists, extract a brief summary (domain names and levels) for inclusion in the status report.

## Step 8 — Present Status Summary

Use the appropriate format based on the active scope:

### Format A — Active Slice or Quest in Progress

Use this when there is an active slice or side quest being worked on:

```
## Project Status

**Scope**: <path> (active slice | active side quest)
**Phase**: <phase description>

**Recent activity**:
- <Mon DD HH:MM> · <phase> · <scope-short> · <status>
- <Mon DD HH:MM> · <phase> · <scope-short> · <status>
- ...

**Work stack**:
- <entry>

**Expertise**: <brief summary from expertise.md, e.g. "TypeScript: expert, React: proficient, PostgreSQL: intermediate">

**Tasks**: <N open>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit the **Expertise** line if `${CLAUDE_PLUGIN_DATA}/expertise.md` does not exist or the plugin data guard fails. Omit the **Work stack** block entirely when empty. Omit the **Tasks** line if `openTasks` is 0 in the `status --json` response. Omit the **Decisions** line if no decisions exist. If any decisions have `revisiting` status, always show the revisiting count. Show the last 3-5 activity-log entries in Recent activity, most recent first.

### Format B — Between Work Items

Use this when no slice or quest is currently in progress (e.g., just completed a slice, or at the very start of the project).

To determine slice sequencing order, use the CLI to resolve the actual epic directory path (epic directories may use an `__active__` prefix — do not construct paths manually). Use `$EPIC_NAME` from Step 6's pattern (`EPIC_NAME=$($GP status --json | jq -r '.activeEpic.name')`):

```bash
$GP state --json --query ".epics[\"$EPIC_NAME\"].slices[\"sequencing.md\"]" --inline
```

If the query returns `null`, slices haven't been sequenced yet — skip the **Up next** section. For non-epic projects, read `.goodplan/slices/sequencing.md` via the Read tool. Use `slice:list --json` to get statuses for each.

#### Format B with Active Epic

When an active epic exists, show epic-scoped reporting:

```
## Project Status

**Scope**: project level — no active slice

**Recent activity**:
- <Mon DD HH:MM> · <phase> · <scope-short> · <status>
- ...

## Active Epic: <name>
State: <state> | Next: `/<skill>`
Slices: <completed>/<total> complete

**Up next** (slices):
- `<NN-name>` — <state> → `/<skill> <args>`
- `<NN-name>` — <state>
- `<NN-name>` — <state>

## Other Epics
- `<name>` — <state> → `/<skill> <args>`

## Side Quests
- `<name>` — <state> → `/<skill> <args>`

## Completed: <count> epics

**Tasks**: <N open>

**Expertise**: <brief summary from expertise.md>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit **Other Epics** if none exist. Omit **Side Quests** if none exist. Omit **Completed** if count is 0. Omit **Tasks** if `openTasks` is 0. Omit **Expertise** if `${CLAUDE_PLUGIN_DATA}/expertise.md` does not exist or the plugin data guard fails. Omit **Decisions** if none exist.

#### Format B without Epics

When no `epics/` directory exists (legacy/pre-epic projects), use the original layout:

```
## Project Status

**Scope**: project level — no active slice

**Recent activity**:
- <Mon DD HH:MM> · <phase> · <scope-short> · <status>
- ...

**Up next** (slices):
- `<NN-name>` — <state> → `/<skill> <args>`
- `<NN-name>` — <state>
- `<NN-name>` — <state>

**Side quests**:
- `<name>` — <state> → `/<skill> <args>`

**Tasks**: <N open>

**Expertise**: <brief summary from expertise.md>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit the **Expertise** line if `${CLAUDE_PLUGIN_DATA}/expertise.md` does not exist or the plugin data guard fails. Omit the **Side quests** block entirely if no side quests exist. Omit the **Tasks** line if `openTasks` is 0. Omit the **Decisions** line if no decisions exist.

For each slice, quest, or epic shown, use the state-to-next-skill mapping (see Status Logic Reference below) to suggest the appropriate command. Complete items do not need a suggestion.

## Step 9 — Offer Detail

After presenting the status report, offer:

> Want me to show the full activity-log or all slice statuses?

Only expand if the user asks. For full activity-log, use `$GP state --json --query '.["activity-log.jsonl"]'`. For all slice statuses, use `$GP slice:list --json` if available, otherwise `$GP state --json --query` for slice directories. Format B already shows an overview when between work items — do not repeat it unprompted.

## Status Logic Reference

### Scope Resolution Order

Determine active scope from `$GP status --json` response fields.

1. **Active quest** — `activeQuest` field (highest priority)
2. **Active slice** — `activeSlice` field
3. **Active epic** — `activeEpic` field (when no active slice)
4. **Project level** (fallback — no active entities)

### File-Existence State Machine

This section documents state semantics for reference. For actual state detection, use the CLI's `status` field from `show --json` or `list --json` responses — do not perform manual file-existence checks.

#### Per Slice or Quest

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

Side quests (`quests/<name>/`) follow this same state machine.

#### Checking Implementation Progress

Use CLI commands (`state --json --query`, `show --json`) to evaluate conditions #5, #6, #7:

1. Query implementation phase directories via `state --json --query` — each `phase-N-*/` key is a phase
2. For each phase, check if `review.md` exists in the state tree or read it via the Read tool (LLM-owned markdown)
3. A review is **passing** if it contains "READY FOR IMPLEMENTATION" (case-insensitive)
4. **All phases passing** = every phase directory has a passing `review.md`
5. If no phase directories exist under `implementation/`, implementation has not started (state #7)

#### Per Epic

Epic-level state machine is defined in epic-conventions.md (auto-included above). Uses the same first-match-wins pattern.

**First vs subsequent epic**: The first epic is named `initial` and created as `__active__initial/` (auto-active, no approval gate, writes directly to `architecture/`). Subsequent epics start without `__active__` prefix, use `architecture-proposal/` instead, and require `/gp:start-epic` approval.

#### Project Level

| Condition | State |
|---|---|
| `idea.md` exists, no `architecture/` | Explore or define architecture |
| `explore-complete.md` or `explore-skipped.md` at `.goodplan/` root | Project-level explore done |
| `architecture/_overview.md` exists, no `slices/sequencing.md` | Needs slice planning |
| `slices/sequencing.md` exists | Check individual slice statuses |

### State-to-Next-Skill Mapping

#### Epic States

| State | Next Skill |
|---|---|
| Epic: ready for exploration | `/gp:explore epics/<name>` |
| Epic: exploring | `/gp:explore epics/<name>` |
| Epic: needs architecture (first) | `/gp:create-epic <name>` |
| Epic: needs architecture proposal (subsequent) | `/gp:create-epic <name>` |
| Epic: proposal pending review | `/gp:start-epic <name>` |
| Epic: needs slice planning | `/gp:create-epic <name>` |
| Epic: executing slices | (check individual slice states) |
| Epic: needs completion | `/gp:complete-epic` |
| Epic: completed | (no action) |
| Epic: abandoned | (no action) |
| No active epic, non-completed epics exist | Suggest next skill for the most advanced epic |
| No active epic, all epics completed/abandoned | `/gp:create-epic` |

#### Slice / Quest States

| State | Next Skill |
|---|---|
| Needs plan | `/gp:plan-slice <slice-name>` |
| Needs refinement | `/gp:plan-slice <slice-name>` |
| Plan refinement in progress | `/gp:plan-slice <slice-name>` (resume) |
| Needs implementation | `/gp:implement <slice-name>` |
| Implementation in progress | `/gp:implement <slice-name>` (resume) |
| Needs QA & polish | (conversational — no skill) |
| Needs completion | built into `/gp:implement` |
| Explore in progress | `/gp:explore <scope-path>` (resume) |
| Explore or plan writing | `/gp:explore <scope-path>` or `/gp:plan-slice <slice-name>` |
| Interrupted work | Resume work stack top entry first |

#### Project States

| State | Next Skill |
|---|---|
| No `.goodplan/` directory | `/gp:create-epic` |
| `idea.md`, no architecture | `/gp:explore` or `/gp:create-epic` |
| Architecture done, no sequencing | `/gp:create-epic` |
