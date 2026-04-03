---
name: status
requires: gp >= 1.0.0
description: >
  Query project state via the goodplan CLI — including epic detection, slice progress, and side quests —
  and report the current phase, recent activity, and what to do next.
  Use at the start of any session, after context compaction, after completing a slice or epic,
  or whenever you need to re-orient in a project using the goodplan structured development workflow.
  Common triggers: 'status', 'where am I', 'what's next', 'project state', 'orient', 're-orient'.
user-invocable: true
---

# Status

Query project state via the `gp` CLI and present a concise status report with the current phase, recent activity, and recommended next action. This is a **read-only skill** — it never mutates state.

## Step 1 — Detect gp CLI and Project

Two-stage detection:

**Stage A — Binary exists:**

```bash
"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" --version --json
```

If the command fails (not found, non-zero exit), tell the user:

> The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled — run `/plugin` to check.

**Stop here** — do not fall back to direct file access.

If the version does not satisfy `>= 1.0.0`, tell the user:

> This skill requires gp >= 1.0.0 but found <version>. Upgrade the CLI.

**Stop here.**

**Stage B — Project exists:**

```bash
gp status --json
```

If this returns a `DATA_NO_PROJECT` error (exit code 1), tell the user:

> No `.goodplan/` directory found — run `/create-epic` to set up structured project planning.

**Stop here** — do not continue with subsequent steps.

If successful, save the `status --json` response for use in subsequent steps.

## Step 2 — Load References

Use the Read tool to load:

1. `references/status-logic.md` (relative to this skill's directory) — display formatting rules, state-to-next-skill mapping, scope resolution, and archive conventions
2. `../_shared/references/cli-interaction.md` — CLI interaction conventions (how to invoke commands, parse responses, handle errors)
3. `../_shared/references/decisions-format.md` — decisions format and Loading Protocol

If the `status --json` response indicates an active epic exists, also load `../_shared/references/epic-conventions.md` — needed for epic state machine resolution, first-vs-subsequent epic disambiguation, and directory structure conventions.

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
gp state --json --query '.["activity-log.jsonl"] | .[-5:]'
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
gp slice:list --json
gp quest:list --json
gp epic:list --json
```

Note: `epic:list --json` has no `--status` filter — filtering is client-side.

For interrupted work detection, use:

```bash
gp state --json --query '.epics | .. | .["interrupted.md"]? // empty'
```

> Note: recursive `..` queries traverse all values (strings, arrays, objects) and may need optimization for larger state trees. A more targeted alternative: `.epics[][].slices[][] | select(has("interrupted.md")) | .["interrupted.md"]`

For sequencing order, read the relevant `sequencing.md` via the Read tool (this is LLM-owned markdown, direct read is permitted).

## Step 6 — Derive Entity State and Details

Use `status --json` for phase derivation and entity status. For entity details, use `show --json`:

```bash
gp slice:show --slice <name> --json
gp epic:show --epic <name> --json
gp quest:show --quest <name> --json
```

Skills can rely on `status`, `name`, `goal` fields from entity JSON. The `artifacts` field is not yet available (deferred to slice 02).

For deeper lookups where `show --json` is insufficient, use `state --json --query`. First get the active epic name from `gp status --json` (`.activeEpic.name`), then use it to construct the query path:

```bash
# Get the active epic name dynamically
EPIC_NAME=$(gp status --json | jq -r '.activeEpic.name')
gp state --json --query ".epics[\"$EPIC_NAME\"].slices | keys"
```

### Slice / Quest State

Use the `status` field from `show --json` or `list --json` responses. The state-to-next-skill mapping from `references/status-logic.md` translates these statuses to recommended skills.

For implementation progress checking (when the status indicates implementation is in progress), use `state --json --query` to check implementation phase directories:

```bash
EPIC_NAME=$(gp status --json | jq -r '.activeEpic.name')
gp state --json --query ".epics[\"$EPIC_NAME\"].slices[\"<slice>\"].implementation | keys"
```

Then check for passing reviews via the Read tool on `review.md` files (these are LLM-owned markdown).

### Epic Directory Scanning

Epic scanning always runs when epics exist — needed for Format B reporting. Use `epic:list --json` to get all epics with their statuses:

```bash
gp epic:list --json
```

For each epic, categorize by CLI status:
- **Completed** (`status === "completed"`): count as completed, skip further checks
- **Active** (matches `activeEpic.name` from `status --json`): this is the active epic — also get its slices via `slice:list --json`
- **Other**: non-active epics — use their status for reporting

## Step 7 — Check for Interrupted Work

Check for interrupted work using `state --json --query`:

```bash
gp state --json --query '[.. | .["interrupted.md"]? | select(. != null)]'
```

Also check the `status --json` response for any entities with interrupted/paused status.

If any interrupted work is found, surface it clearly in the status report.

## Step 7b — Load Expertise Summary

Check if `~/.claude/CLAUDE.md` has a `## Expertise` section. If it does, extract a brief summary (domain names and levels) for inclusion in the status report. If not, skip.

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

**Expertise**: <brief summary from CLAUDE.md ## Expertise, e.g. "TypeScript: expert, React: proficient, PostgreSQL: intermediate">

**Tasks**: <N open>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit the **Expertise** line if no `## Expertise` section exists in `~/.claude/CLAUDE.md`. Omit the **Work stack** block entirely when empty. Omit the **Tasks** line if `openTasks` is 0 in the `status --json` response. Omit the **Decisions** line if no decisions exist. If any decisions have `revisiting` status, always show the revisiting count. Show the last 3-5 activity-log entries in Recent activity, most recent first.

### Format B — Between Work Items

Use this when no slice or quest is currently in progress (e.g., just completed a slice, or at the very start of the project).

To determine slice sequencing order, read the relevant `sequencing.md` via the Read tool. When an active epic exists, get the epic name from `gp status --json` (`.activeEpic.name`) and read slices under `epics/<activeEpic.name>/slices/`. Otherwise check `.goodplan/slices/`. Use `slice:list --json` to get statuses for each.

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

## Archived: <count> epics

**Tasks**: <N open>

**Expertise**: <brief summary from CLAUDE.md ## Expertise>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit **Other Epics** if none exist. Omit **Side Quests** if none exist. Omit **Archived** if count is 0. Omit **Tasks** if `openTasks` is 0. Omit **Expertise** if no `## Expertise` section in `~/.claude/CLAUDE.md`. Omit **Decisions** if none exist.

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

**Expertise**: <brief summary from CLAUDE.md ## Expertise>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit the **Expertise** line if no `## Expertise` section exists in `~/.claude/CLAUDE.md`. Omit the **Side quests** block entirely if no side quests exist. Omit the **Tasks** line if `openTasks` is 0. Omit the **Decisions** line if no decisions exist.

For each slice, quest, or epic shown, use the state-to-next-skill mapping from `references/status-logic.md` to suggest the appropriate command. Complete items do not need a suggestion.

## Step 9 — Offer Detail

After presenting the status report, offer:

> Want me to show the full activity-log or all slice statuses?

Only expand if the user asks. For full activity-log, use `gp state --json --query '.["activity-log.jsonl"]'`. For all slice statuses, use `gp slice:list --json` if available, otherwise `gp state --json --query` for slice directories. Format B already shows an overview when between work items — do not repeat it unprompted.
