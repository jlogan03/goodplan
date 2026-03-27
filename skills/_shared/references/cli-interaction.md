# CLI Interaction Conventions

Shared reference for all goodplan workflow skills. Defines how skills detect, invoke, and parse the `goodplan` CLI. Skills MUST follow these conventions — direct `.project/` file access for structured state is prohibited.

## Table of Contents

1. [Binary Detection & Version](#1-binary-detection--version)
2. [Data Ownership](#2-data-ownership)
3. [What Skills Must NOT Do](#3-what-skills-must-not-do)
4. [Invocation Patterns](#4-invocation-patterns)
5. [Interaction Patterns by Role](#5-interaction-patterns-by-role)
   - [Workflow Action Principle](#workflow-action-principle)
6. [State Orientation](#6-state-orientation)
7. [Deriving Workflow Phase](#7-deriving-workflow-phase)
8. [Deep Dives — Full State Access](#8-deep-dives--full-state-access)
9. [Completion Command Payloads](#9-completion-command-payloads)
10. [Error Handling](#10-error-handling)
11. [Self-Discovery](#11-self-discovery)
12. [Migration Example](#12-migration-example)

## 1. Binary Detection & Version

At the start of any skill that uses the CLI, verify it is available and compatible:

```bash
goodplan --version --json
# Returns: { "version": "1.0.0" }
```

**If the command fails** (not found, non-zero exit):

> The `goodplan` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH.

**Do not fall back to direct file access.** Stop the skill.

**If the version doesn't satisfy the skill's `requires` constraint** (declared in SKILL.md frontmatter):

> This skill requires goodplan >= X.Y.Z but found A.B.C. Upgrade the CLI.

Stop the skill.

### CLI Version Checking

The CLI automatically checks `project.json.version` against its own version on every command that reads `.project/`. Behavior:

| Condition | Behavior |
|-----------|----------|
| CLI major == data major, CLI minor >= data minor | Compatible. Proceed normally. |
| CLI major == data major, CLI minor < data minor | Warn on stderr: "Version mismatch..." Proceed with best effort. |
| CLI major > data major | Warn on stderr: "Version mismatch..." Proceed with best effort. |
| CLI major < data major | Error: exit code 2 (`VALIDATION_VERSION_MAJOR_MISMATCH`). |

Warnings are suppressed in `--json` and `--quiet` modes. The `init`, `--version`, and `--help` commands skip the check naturally (no `.project/` required).

On every RPC mutation (`begin`, `submit`, `complete`), the CLI stamps `project.json.version` with the CLI's current version if it is higher — ensuring the data version reflects the highest feature level used.

### SKILL.md Frontmatter

Every skill that uses the CLI declares its minimum version:

```yaml
---
name: project-status
description: Query project state via the goodplan CLI
requires: goodplan >= 1.0.0
---
```

The `requires` field is agent-behavioral — there is no runtime validation. The skill checks the version at startup and refuses to proceed if incompatible.

## 2. Data Ownership

Two categories of files in `.project/`:

| Category | Owned by | Skills may |
|----------|----------|------------|
| **JSON/JSONL** (entity state, activity log, decisions, learnings, overviews) | CLI | Read via `--json` commands only. Never read or write directly. |
| **Learnings `.md` files** (`learnings/*.md` at any scope) | CLI | Written by CLI during completion (derived from `detail` in payload). Skills pass `detail` in the payload; the CLI derives slugs, writes `.md` files, and creates JSONL entries. Skills never write to `learnings/` directly. |
| **Free-form markdown** (architecture, research, brainstorm, plans, goals) | LLM | Write into directories provided by CLI command responses. Read directly with the Read tool. |

## 3. What Skills Must NOT Do

- Read `.project/*.json`, `.project/*.jsonl`, or any entity JSON files directly
- Write or edit any JSON/JSONL file
- Append to `activity-log.jsonl` (CLI handles this on mutations)
- Maintain or read `state.md` (eliminated — see section 6)
- Use `ls` or file-existence checks to infer entity status
- Use `mkdir` to create `.project/` subdirectories (CLI creates them via mutations)

### What Skills MAY Still Do Directly

- Read reference files outside `.project/` (source code, config files, etc.) via the Read tool
- Read LLM-owned markdown files within `.project/` via the Read tool (architecture docs, research, plans)
- Write LLM-owned markdown files into paths returned by CLI command responses

## 4. Invocation Patterns

### Always use `--json`

All CLI queries from skills must use `--json` for structured, parseable output:

```bash
goodplan status --json
goodplan slice:show --slice my-slice --json
goodplan epic:list --json
```

**Exception:** `start-*` commands always return JSON — the `--json` flag is accepted but has no effect. You should still include `--json` for consistency, but output is JSON regardless.

**Exception:** `state` always returns JSON — it is an explicit exception to the "no `--json` = human-readable" convention. See section 8 for details.

### Parse stdout, check exit code

```
exit 0 → success, parse stdout as JSON
exit 1 → internal/unexpected error
exit 2 → validation/usage error (bad flags, missing input)
exit 3 → state machine error (invalid transition, guard failure)
```

On non-zero exit with `--json`, stdout contains structured error:

```json
{ "error": { "code": "STATE_INVALID_TRANSITION", "message": "...", "detail": "..." } }
```

### Stdin for input payloads

Commands that accept structured input read from stdin:

```bash
echo '{"name": "my-slice"}' | goodplan slice:create --epic my-epic --json
```

**IMPORTANT — always pipe stdin:** The compiled binary reads stdin and will block if nothing is piped. For commands with no payload, pipe empty stdin:

```bash
stdin: "" | goodplan slice:plan --slice my-slice --json
```

> **Syntax note:** `stdin: ""` is Claude Code's Bash tool API syntax — a named parameter, not valid shell. Skills invoke commands through Claude Code's Bash tool where `stdin` is a tool parameter that feeds data to the command's standard input. In a regular shell, the equivalent would be `echo '' | goodplan ...` or `echo -n '' | goodplan ...`.

### `start-*` always return JSON

The `start-*` sub-agent commands (including but not limited to `start-plan`, `start-refinement`, `start-implementation`, `start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`) always return JSON output. The `--json` flag is accepted but has no effect. Use `goodplan schema --json` for the authoritative list.

**Important:** `start-complete` does not exist as a command. Completion is handled by `slice:complete` and `quest:complete` which accept stdin payloads (see section 9).

### `submit-*` and mutation commands require `--json`

Unlike `start-*`, mutation commands (`submit-*`, `epic:create`, `slice:plan`, etc.) require `--json` for structured output. Without it, they produce human-readable text to stderr.

## 5. Interaction Patterns by Role

### Orchestrator Skills

Skills that coordinate workflow phases: `/create-epic`, `/explore`, `/create-architecture`, `/create-slices`, `/project-status`, `/complete`, `/audit-architecture`.

**Read state:**

```bash
goodplan status --json                    # project overview, active entities, recommendations
goodplan epic:show --epic X --json        # entity details
goodplan slice:list --json                # all slices with statuses
goodplan state --json --query '.["activity-log.jsonl"] | .[-5:]'  # recent activity
```

**Initialize project (if needed):**

```bash
goodplan init --name my-project --json
```

**Mutate state:**

```bash
echo '{"name":"my-epic","goal":"..."}' | goodplan epic:create --json
stdin: "" | goodplan slice:plan --slice my-slice --json
echo '{"verificationPassed":true,"learnings":[...]}' | goodplan slice:complete --slice my-slice --json
```

**Use response paths:** Mutation responses include `paths` — a `Record<string, string>` mapping logical names to absolute filesystem paths. Write markdown content into these paths:

```json
{
  "entity": "my-slice",
  "newStatus": "planning",
  "paths": {
    "plan": "/abs/path/to/.project/epics/my-epic/slices/my-slice/",
    "research": "/abs/path/to/.project/epics/my-epic/slices/my-slice/research/"
  }
}
```

### Sub-Agent Skills

Skills that produce content within a workflow phase: plan writers, implementation agents, review agents.

**Get context:**

```bash
goodplan start-plan --slice my-slice --inline --json
```

Response includes `context` bundle (inline content, file references, decisions, learnings) and `paths` for where to write.

**Submit results (advance state):**

```bash
# submit-plan: no content payload — sub-agent already wrote plan to filesystem.
stdin: "" | goodplan submit-plan --slice my-slice --json

# submit-refinement: requires scores payload for the circuit breaker.
echo '{"scores":{"correctness":9,"completeness":8}}' | goodplan submit-refinement --slice my-slice --json

# submit-implementation: no content payload.
stdin: "" | goodplan submit-implementation --slice my-slice --json
```

### Interactive Orchestrator Skills

Skills that do interactive user work between state transitions: `/create-epic`, `/create-plan`, `/create-architecture`, `/complete`. These need both deep context AND state mutations in a single session.

**Pattern:**

1. Call `start-*` to get context for the phase
2. Use `state --query` or `show --json` for additional context as needed
3. Do interactive work (user Q&A, content generation, review)
4. Call `submit-*` or entity mutation commands to persist results

```bash
# 1. Begin the phase
stdin: "" | goodplan epic:explore --epic my-epic --json
# Returns: { entity, phase, previousStatus, newStatus }

# 2. Get deep context
goodplan start-explore --epic my-epic --inline --json
# Returns: { context: { inline: {...}, references: [...], decisions: [...] }, paths: {...} }

# 3. Interactive work happens here (user research, brainstorming, etc.)
# LLM writes content to paths from start-explore response

# 4. Submit to advance state
stdin: "" | goodplan submit-explore --epic my-epic --json
```

### Read-Only Skills

Skills that only query state: `/project-status`, `/audit-architecture` (read phase).

Use `status --json`, `show --json`, `list --json`, `state --json` commands. These bypass the RPC layer and go directly to the Data Layer — they're fast and side-effect-free.

### Workflow Action Principle

Present what you're doing for visibility. Do not ask permission for actions the workflow defines (writing files, saving learnings, updating state). Only use AskUserQuestion for genuine decisions the user needs to make — approach choices, scope questions, architecture tradeoffs.

## 6. State Orientation

When a skill starts and needs to understand the current project state:

```bash
goodplan status --json
```

Returns active entities, their statuses, artifact counts with file listings, recommendations (suggested next actions), and warnings (stale entities). **This replaces reading `state.md`.**

### `status --json` Artifact Shape

Changed in 1.0.0: the `architecture`, `research`, `brainstorm`, and `prototypes` fields are now `{ count, files }` objects instead of plain numbers. Files arrays use state-tree-relative paths (relative to `.project/`), aggregating from both project-level and active epic directories. `decisions`, `learnings`, `completedSlices`, `totalSlices` remain plain numbers.

```json
{
  "artifacts": {
    "architecture": {
      "count": 3,
      "files": [
        "architecture/_overview.md",
        "epics/my-epic/architecture/data-model.md",
        "epics/my-epic/architecture/cli-changes.md"
      ]
    },
    "research": { "count": 1, "files": ["epics/my-epic/research/topic.md"] },
    "brainstorm": { "count": 0, "files": [] },
    "prototypes": { "count": 0, "files": [] },
    "decisions": 2,
    "learnings": 1,
    "completedSlices": 1,
    "totalSlices": 3
  }
}
```

### Migration Reference

Skills previously read `state.md` for several purposes. CLI equivalents:

| Previous `state.md` usage | CLI equivalent |
|---|---|
| **Active slice detection** (for fast resume) | `goodplan status --json` → `.activeSlice` |
| **Current phase detection** | `goodplan slice:show --slice X --json` → `.status` |
| **Concurrent work warnings** (is another slice active?) | `goodplan status --json` → `.activeSlice` (non-null = something is active) |
| **Next step hints** | `goodplan status --json` → `.recommendations[]` |
| **Active quest detection** | `goodplan status --json` → `.activeQuest` |

> **Deprecation:** The `state.md` format documented in `skills/_shared/references/state-and-activity-formats.md` is now obsolete. Skills should use the CLI commands above instead.

### Querying Learnings

To access accumulated learnings (across all completed slices and quests):

```bash
goodplan learning:list --json
```

Returns `{ "items": [...] }` where each item has `category`, `summary`, `tags`, `source`, `rollup`, `rollupTo`, and either `detail` (legacy) or `file` (new format, scope-relative path to `.md` file in `learnings/` directory). Skills should use this command instead of reading `.project/learnings.md` or `.project/learnings/` directly.

Filter by source scope:
```bash
goodplan learning:list --json --source <scope-path>
```

Human-readable output (no `--json`): displays `{category} {summary} ({source})` per entry — file paths are omitted from human output.

## 7. Deriving Workflow Phase

Instead of file-existence checks, use the enriched `show --json` response:

```json
{
  "name": "my-slice",
  "status": "plan-refined",
  "artifacts": {
    "goal": true,
    "exploreComplete": true,
    "plan": true,
    "planRefined": true,
    "implementation": false,
    "abandoned": false
  }
}
```

The `status` field gives the entity's current state. The `artifacts` object confirms which files exist. Together they replace the file-existence state machine that skills previously implemented manually.

## 8. Deep Dives — Full State Access

When a skill needs access to any data in `.project/` beyond what `status`/`show`/`list` provide:

```bash
goodplan state --json --query '<jq expression>'
```

This dumps the full `assembleState()` tree — every JSON file parsed, every JSONL array, every directory as a nested object. The `--query` flag applies a jq expression server-side, so only the selected data is returned.

**`state` always returns JSON.** This is an explicit exception to the "no `--json` = human-readable" convention. The `--json` flag is accepted but has no effect — output is always JSON. The `state` command is LLM-facing; there is no human-readable format. You should still include `--json` for consistency (same as `start-*` commands).

**`--quiet` behavior:** The `state` command also handles `--quiet` specially — it bypasses `output()` entirely, writing directly to stdout. This is for human operators piping state to other tools; skills should not use `--quiet`.

### Query Examples

```bash
# All activity log entries
goodplan state --json --query '.["activity-log.jsonl"]'

# Last 5 activity entries
goodplan state --json --query '.["activity-log.jsonl"] | .[-5:]'

# Page through entries (entries 20-39)
goodplan state --json --query '.["activity-log.jsonl"]' --offset 20 --limit 20

# A specific slice's learnings
goodplan state --json --query '.slices["my-slice"]["learnings.jsonl"]'

# All architecture file names
goodplan state --json --query '.architecture | keys'

# Check if a file exists in a scope
goodplan state --json --query '.slices["my-slice"] | has("plan-refined.md")'

# Project-level learnings filtered by source
goodplan state --json --query '[.["learnings.jsonl"][] | select(.source == "04-slice-lifecycle")]'

# Everything about the active epic
goodplan state --json --query '.epics[.["project.json"].activeEpic]'
```

### `--offset` / `--limit` Semantics

When `--query` returns an array, `--offset N --limit N` pages through it. These flags apply to any array-valued result regardless of origin — whether from a data-originated array (like JSONL entries) or from jq producing multiple outputs.

- `--offset` and `--limit` are silently ignored without `--query`
- If the query result is not an array, they are silently ignored
- `--offset` skips the first N entries; `--limit` returns at most N entries

```bash
# First 10 learnings
goodplan state --json --query '.["learnings.jsonl"]' --limit 10

# Next 10
goodplan state --json --query '.["learnings.jsonl"]' --offset 10 --limit 10
```

### `--inline` and Markdown Content

By default, the `state` command serializes markdown entries as `true` (a boolean marker indicating the file exists). The `--inline` flag changes this behavior: markdown entries are serialized as their full string content instead.

**This changes the output contract.** The same query path returns different types depending on `--inline`:

```bash
# Without --inline: returns true (boolean)
goodplan state --json --query '.architecture["_overview.md"]'
# Output: true

# With --inline: returns the full markdown content (string)
goodplan state --json --query '.architecture["_overview.md"]' --inline
# Output: "# Architecture Overview\n\nThe system is organized into..."
```

Skills must not cache or compare state tree outputs across calls with different `--inline` settings — the types differ.

`--inline` currently accepts bare form only. Budget support (`--inline=<bytes>`) is coming in a future slice.

## 9. Completion Command Payloads

Skills that complete entities need to construct stdin payloads. Use `goodplan schema --json --command <cmd>` to discover the exact shapes at runtime.

**Important:** There is no `start-complete` command. Completion is a single-step operation via `slice:complete` or `quest:complete`.

### `slice:complete`

```bash
echo '<payload>' | goodplan slice:complete --slice my-slice --json
```

Required fields:
- `verificationPassed` (boolean) — the orchestrator's assertion that verification criteria are met

Optional fields:
- `deferred` (array) — items deferred to other slices: `[{ "description": "...", "targetSlice": "..." }]`
- `learnings` (array) — `[{ "category": "worked"|"didnt-work"|"domain"|"do-differently", "summary": "...", "detail": "...", "tags": [...], "rollupTo": [...] }]`
- `architectureDelta` (array) — `[{ "subsystem": "...", "type": "add"|"modify"|"remove", "description": "..." }]`

**Learnings `detail` → `.md` file mapping**: Skills pass `detail` (full learning text) in the payload. The CLI derives a slug from `summary`, writes `learnings/<slug>.md` with the `detail` content, and stores a `file` field (not `detail`) in the JSONL entry. During rollup, the CLI copies `.md` files to target scopes automatically. Skills never write to `learnings/` directly.

Example:

```bash
echo '{"verificationPassed":true,"learnings":[{"category":"worked","summary":"Schema-first caught 3 bugs","detail":"Defining schemas before code forced explicit handling of optionals","tags":["zod"],"rollupTo":["epic"]}],"architectureDelta":[{"subsystem":"data-layer","type":"modify","description":"Added atomic writes"}]}' | goodplan slice:complete --slice my-slice --json
```

### `quest:complete`

Same shape as `slice:complete` but without `deferred` (quests don't route deferred work to slices):

```bash
echo '<payload>' | goodplan quest:complete --quest fix-logging --json
```

Required fields:
- `verificationPassed` (boolean)

Optional fields:
- `learnings` (array) — same shape as slice:complete (skills pass `detail`; CLI maps to `.md` files)
- `architectureDelta` (array) — same shape as slice:complete

### `verificationPassed` Semantics

The `verificationPassed` boolean is a human/orchestrator assertion. The orchestrator reviews implementation results, decides whether verification criteria are met, and asserts the result. The CLI trusts the caller's assertion and enforces it as a state machine guard.

## 10. Error Handling

### Exit Codes

| Exit code | Meaning | Skill action |
|-----------|---------|--------------|
| 0 | Success | Parse stdout as JSON |
| 1 | Internal/unexpected error | Present full error to user, stop |
| 2 | Validation/usage error | Fix the invocation (skill bug) |
| 3 | State machine error | Parse error code, apply recovery pattern |

### Error Codes Skills Should Handle

| Error code | Exit | Meaning | Recovery |
|------------|------|---------|----------|
| `DATA_NO_PROJECT` | 1 | No `.project/` directory found | Tell user to run `goodplan init` or navigate to a project directory |
| `VALIDATION_UNKNOWN_COMMAND` | 2 | Command not recognized | Check spelling; use `goodplan schema --json` to list available commands |
| `VALIDATION_INVALID_INPUT` | 2 | Bad flags or stdin payload | Use `goodplan schema --command <cmd> --json` to check expected input shape |
| `VALIDATION_INVALID_QUERY` | 2 | Invalid jq expression in `--query` | Fix the jq syntax |
| `VALIDATION_STDIN_TOO_LARGE` | 2 | Stdin exceeds 1 MB | Reduce payload size |
| `STATE_INVALID_TRANSITION` | 3 | Requested transition not valid from current state | Check `show --json` for current status; entity may already be past the requested phase |
| `STATE_QUEST_ALREADY_ACTIVE` | 3 | Another quest is active | Ask user whether to abandon the existing quest first |
| `STATE_ALREADY_INITIALIZED` | 3 | `.project/` already exists | Project is already initialized; proceed with other commands |
| `DATA_CONCURRENT_MODIFICATION` | 1 | File changed during write | Retry once |

### Error Recovery Patterns

**`STATE_INVALID_TRANSITION` on re-entry (exit 3):**

The entity is already past the requested phase. This is often success — the work was already done in a prior run. Check current status and continue to the next step.

```bash
# Skill tries to begin planning, but slice is already past that phase
stdin: "" | goodplan slice:plan --slice my-slice --json
# Exit 3: STATE_INVALID_TRANSITION — slice is in 'plan-created'

# Recovery: check current status
goodplan slice:show --slice my-slice --json
# → status: "plan-created" — plan phase already completed. Proceed to refinement.
```

**`STATE_QUEST_ALREADY_ACTIVE` (exit 3):**

```bash
stdin: "" | goodplan quest:plan --quest fix-logging --json
# Exit 3: STATE_QUEST_ALREADY_ACTIVE — "fix-perf" is active

# Recovery: ask user whether to abandon fix-perf first
```

**`VALIDATION_INVALID_INPUT` (exit 2):**

```bash
# Discover expected input shape
goodplan schema --command slice:complete --json
# Returns: { "name": "slice:complete", "stdinSchema": {...}, "args": {...} }
# Use stdinSchema to construct the correct payload and retry.
```

**Idempotent re-entry principle:** Skills should be safe to re-run. On `STATE_INVALID_TRANSITION`, check `show --json` to determine current status and resume from the appropriate step rather than failing.

## 11. Self-Discovery

If a skill needs to discover available commands or verify flag names at runtime:

```bash
goodplan schema --json
```

Returns the full command tree with input/output schemas. Use as a fallback when this convention doc doesn't cover an edge case.

To inspect a single command:

```bash
goodplan schema --command slice:complete --json
```

Returns that command's flags, stdin schema, and description.

Note: `--version --json` is handled pre-dispatch and does not appear in `goodplan schema --json` output. This is a known limitation.

## 12. Migration Example

### Before (direct file access)

```
# Read project state
Read .project/project.json → check activeEpic
Read .project/epics/overview.json → check for name collision

# Create the epic
mkdir .project/epics/my-epic/
mkdir .project/epics/my-epic/architecture/
mkdir .project/epics/my-epic/research/
mkdir .project/epics/my-epic/brainstorm/
Write .project/epics/my-epic/epic.json → { name, status: "created", goal, ... }
Read + write .project/epics/overview.json → append to items array
Append .project/activity-log.jsonl → { phase: "create", scope: "epics/my-epic", ... }
```

### After (CLI commands)

```bash
# Create the epic — one command handles all state writes
echo '{"name":"my-epic","goal":"Build the feature..."}' | goodplan epic:create --json
# Returns: { "entity": "my-epic", "phase": "create", "previousStatus": "none", "newStatus": "created" }

# Begin exploration — single command advances state
stdin: "" | goodplan epic:explore --epic my-epic --json
# Returns: { "entity": "my-epic", "phase": "explore", "previousStatus": "created", "newStatus": "exploring" }
```

### Key Differences

- No manual directory creation, JSON writes, or overview updates
- State machine validates transitions (e.g., rejects duplicate epic names)
- Activity log appended automatically on every mutation
- Mutation response confirms the state change — no need to re-read state

## 13. Migration Patterns

Patterns discovered migrating `create-epic` and `complete` skills to CLI-based state access. Apply these when migrating other skills.

### Simplification Rule

Skills should drop state machine awareness entirely. Do not replicate transition guards, status checks, or state machine logic in skill code. Instead:

- Use CLI commands for all state mutations — the CLI validates transitions and returns errors
- Let CLI errors guide recovery (see section 10: Error Handling)
- Use `show --json` to check current status when needed, rather than maintaining internal state tracking

### Filesystem-Backed Accumulation

For multi-step interactive flows (like `/complete`), write intermediate results to disk as each step completes, then read them back to construct the final CLI payload. This pattern:

- Survives graceful stops — partial progress is on disk, not in memory
- Enables re-entry detection — `stat` on known artifact paths reveals what was already done
- Keeps the final CLI call atomic — one `slice:complete` with a fully assembled payload

Example: the `/complete` skill writes `completion/learnings.md` and `completion/architecture-updates.md` during Steps 4-6, then reads both back in Step 10 to construct the `slice:complete` stdin payload.

### CLI Command Mapping

Common direct-access patterns and their CLI equivalents:

| Direct access pattern | CLI equivalent |
|---|---|
| Read `state.md` for active slice | `goodplan status --json` → `.activeSlice` |
| Read `state.md` for current phase | `goodplan slice:show --slice X --json` → `.status` |
| Read entity JSON for status/artifacts | `goodplan slice:show --slice X --json` → `.status`, `.artifacts` |
| Read `activity-log.jsonl` directly | `goodplan state --json --query '.["activity-log.jsonl"]'` |
| Read `decisions.jsonl` directly | `goodplan state --json --query '.["decisions.jsonl"]'` |
| Append to `activity-log.jsonl` | Not needed — CLI appends automatically on every mutation |
| Write `state.md` | Not needed — eliminated; CLI manages state |
| `mkdir -p .project/epics/<name>/...` | `echo '{"name":"..."}' \| goodplan epic:create --json` |
| Read `overview.json` for entity list | `goodplan epic:list --json` or `goodplan slice:list --json` |

### What Stays Direct

LLM-owned markdown files are still read and written directly by skills:

- **Plans**: `plan.md`, `plan-refined.md`, `plan-learnings-and-feedback.md`
- **Goals**: `goal.md` (epics, slices, quests)
- **Architecture**: `.project/architecture/*.md`, epic `architecture/`
- **Research and brainstorm**: `.project/research/`, `.project/brainstorm/`
- **Project health**: `.project/project-health.md`
- **CLAUDE.md**: project root `CLAUDE.md`
- **Idea**: `.project/idea.md`
- **Completion artifacts**: `completion/learnings.md`, `completion/architecture-updates.md`

These are content authored by the LLM. The CLI does not manage their contents — skills read and write them with the Read, Write, and Edit tools.

### Version Check Pattern

Every skill that uses the CLI declares its minimum version in SKILL.md frontmatter:

```yaml
requires: goodplan >= 1.0.0
```

At startup, the skill runs `goodplan --version --json`, compares the version against `requires`, and stops with a clear error if incompatible. This ensures skills fail fast rather than encountering mysterious failures from changed CLI behavior.
