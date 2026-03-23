---
name: project-status
description: >
  Read .project/ state — including epic detection, slice progress, and side quests —
  and report the current phase, recent activity, and what to do next.
  Use at the start of any session, after context compaction, or whenever you need to
  re-orient in a project using the goodplan structured development workflow.
---

# Project Status

Read `.project/` state and present a concise status report with the current phase, recent activity, and recommended next action.

## Step 1 — Check for `.project/` Directory

Run:

```bash
ls .project/ 2>/dev/null
```

If the directory does not exist, tell the user:

> No `.project/` directory found — run `/create-epic` to set up structured project planning.

**Stop here** — do not continue with subsequent steps.

## Step 2 — Load Status Logic and Decisions Format

Use the Read tool to load `references/status-logic.md` (relative to this skill's directory). Use the rules loaded here for all phase inference in subsequent steps — the file-existence state machine, scope resolution order, and state-to-next-skill mapping.

Also load `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol.

If `.project/epics/` exists, also load `~/.claude/skills/_shared/references/epic-conventions.md` — needed for epic state machine resolution, first-vs-subsequent epic disambiguation, and directory structure conventions. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Count active decisions and note any with `revisiting` status for the status report.

## Step 3 — Read state.md (If Present)

Use the Read tool to try reading `.project/state.md`.

**If it exists**, extract:
- Current Phase
- Active Slice
- Work Stack entries
- Next Step hint

**If it does not exist**, note its absence and rely entirely on the file-existence state machine from Step 2.

## Step 4 — Read Recent Activity-Log Entries

Run:

```bash
tail -5 .project/activity-log.jsonl 2>/dev/null
```

Parse each JSON line and extract: `phase`, `scope`, `status`, and `ts` (timestamp). Format timestamps as human-readable short form (e.g., "Mar 15 16:45"). Arrange entries most recent first for the status report.

## Step 5 — Determine Active Scope

Using the scope resolution order from `references/status-logic.md`:

1. Check the Work Stack (from Step 3) for any entries — the top entry is highest priority
2. Check for an active epic's active slice — detect via `ls -d .project/epics/__active__*/ 2>/dev/null`. If an `__active__` epic exists, scan its `slices/` using the per-slice state machine to find an in-progress slice
3. Check the active epic itself — if `__active__` epic exists but no slice is in progress within it, the epic is the active scope
4. Check the Active Slice field from state.md (if not "none") — fallback only when no `__active__` epic was found in steps 2-3. If the path no longer exists on disk, treat it as stale and skip
5. Fall back to project level

The result is the **active scope** used in the next step.

## Step 6 — Apply File-Existence State Machine

For the active scope, run `ls` commands on the relevant directory to inspect which files exist. Apply the state machine rules from `references/status-logic.md`:

- **Check `abandoned.md` first** — it takes precedence over all other states
- The state machine is **authoritative** — `state.md` is an optimization hint, not the truth

### Epic Directory Scanning

Epic scanning always runs when `.project/epics/` exists — it is needed for Format B reporting regardless of what the active scope resolved to. Scan to build the epic picture:

```bash
ls -d .project/epics/*/ 2>/dev/null
```

For each directory found:
- **`~~archived~~` prefix**: count as archived, skip further checks
- **`__active__` prefix**: this is the active epic — apply the epic state machine from `~/.claude/skills/_shared/references/epic-conventions.md`, then also scan its `slices/` using the per-slice state machine
- **Other directories**: non-active epics — apply the epic state machine to determine their state (exploring, proposal pending, etc.)

### Slice / Quest State Checking

If the active scope is a slice or quest that needs implementation progress checking (states #5 or #6 from the reference), inspect `implementation/` subdirectories:

```bash
ls <scope-path>/implementation/ 2>/dev/null
```

For each phase directory found, check if `review.md` exists and search for "READY FOR IMPLEMENTATION" (case-insensitive):

```bash
grep -il "READY FOR IMPLEMENTATION" <scope-path>/implementation/*/review.md 2>/dev/null
```

A phase is passing only if its `review.md` contains that string.

## Step 7 — Check for Interrupted Work

Check for interrupted work from two sources:

1. Work Stack entries from state.md (Step 3)
2. Any `interrupted.md` files in slice or quest directories:

```bash
ls .project/slices/*/interrupted.md 2>/dev/null
ls .project/side-quests/*/interrupted.md 2>/dev/null
ls .project/epics/__active__*/slices/*/interrupted.md 2>/dev/null
```

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

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit the **Expertise** line if no `## Expertise` section exists in `~/.claude/CLAUDE.md`. Omit the **Work stack** block entirely when empty. Omit the **Decisions** line if no decisions exist. If any decisions have `revisiting` status, always show the revisiting count. Show the last 3-5 activity-log entries in Recent activity, most recent first.

### Format B — Between Work Items

Use this when the work stack is empty AND no slice is currently in progress (e.g., just completed a slice, or at the very start of the project).

To determine slice sequencing order, read the relevant `sequencing.md`. When an active epic exists, slices are under `epics/__active__<name>/slices/`. Otherwise check `.project/slices/`. List slice directories and apply the state machine to each.

#### Format B with Active Epic

When an `__active__` epic exists, show epic-scoped reporting:

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

**Expertise**: <brief summary from CLAUDE.md ## Expertise>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit **Other Epics** if none exist. Omit **Side Quests** if none exist. Omit **Archived** if count is 0. Omit **Expertise** if no `## Expertise` section in `~/.claude/CLAUDE.md`. Omit **Decisions** if none exist.

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

**Expertise**: <brief summary from CLAUDE.md ## Expertise>

**Decisions**: <N active> [, <M revisiting>]

**Next**: `/<skill> <args>`
```

Omit the **Expertise** line if no `## Expertise` section exists in `~/.claude/CLAUDE.md`. Omit the **Side quests** block entirely if no side quests exist. Omit the **Decisions** line if no decisions exist.

For each slice, quest, or epic shown, use the state-to-next-skill mapping from `references/status-logic.md` to suggest the appropriate command. Complete items do not need a suggestion.

## Step 9 — Write Back State

Generate a UTC timestamp:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

Update `.project/state.md` using the Write tool with the 4-section format from `references/status-logic.md`:

```markdown
# State

## Current Phase
<phase> <status> — <brief context>

## Active Slice
<slice path | "none (working at project level)">

## Work Stack
<LIFO entries or "(empty)">

## Next Step
<Actionable one-sentence instruction>
```

All four sections are required. Even if unchanged from what was read in Step 3, rewrite the file to refresh it for the next session.

Append one entry to `.project/activity-log.jsonl`:

```bash
echo '{"ts":"<timestamp>","phase":"project-status","scope":"project","status":"complete","summary":"Ran /project-status: <one-sentence summary of current state>"}' >> .project/activity-log.jsonl
```

Replace `<timestamp>` with the generated UTC value and `<one-sentence summary>` with a brief description of what was found (e.g., "slice 02-project-status needs implementation, no interrupted work").

## Step 10 — Offer Detail

After presenting the status report, offer:

> Want me to show the full activity-log or all slice statuses?

Only expand if the user asks. Format B already shows an overview when between work items — do not repeat it unprompted.
