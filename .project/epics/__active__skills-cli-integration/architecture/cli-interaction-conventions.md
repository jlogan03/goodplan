# CLI Interaction Conventions

Shared reference for all goodplan workflow skills. Defines how skills detect, invoke, and parse the `goodplan` CLI binary. Skills MUST follow these conventions — direct `.project/` file access for structured state is prohibited.

## Binary Detection and Version Compatibility

At the start of any skill that interacts with `.project/` state, verify the CLI is available and compatible:

```bash
goodplan --version --json
# Returns: { "version": "1.2.0" }
```

**If the command fails** (not found, non-zero exit):

> The `goodplan` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH.

**Do not fall back to direct file access.** Stop the skill.

**If the version doesn't satisfy the skill's `requires` constraint** (declared in SKILL.md frontmatter):

> This skill requires goodplan >= X.Y.Z but found A.B.C. Upgrade the CLI.

Stop the skill. Do not attempt to run with an incompatible CLI — commands, flags, or output shapes may differ.

### SKILL.md Frontmatter

Every skill that uses the CLI declares its minimum version:

```yaml
---
name: create-epic
description: ...
requires: goodplan >= 1.0.0
---
```

The `requires` field uses semver range syntax. The skill checks this against the CLI's reported version at startup. See `cli-changes.md` § Semantic Versioning for full compatibility rules.

## Data Ownership

Two categories of files in `.project/` (from `architecture/conventions.md` § Data Ownership):

| Category | Owned by | Skills may |
|----------|----------|------------|
| **JSON/JSONL** (entity state, activity log, decisions, learnings, overviews) | CLI | Read via `--json` commands only. Never read or write directly. |
| **Free-form markdown** (architecture, research, brainstorm, plans, goals) | LLM | Write into directories provided by CLI command responses. Read directly with the Read tool. |

### What Skills Must NOT Do

- Read `.project/*.json`, `.project/*.jsonl`, or any entity JSON files directly
- Write or edit any JSON/JSONL file
- Append to `activity-log.jsonl` (CLI handles on mutations)
- Maintain or read `state.md` (eliminated)
- Use `ls` or file-existence checks to infer entity status
- Use `mkdir` to create `.project/` subdirectories (CLI creates them via mutations)

### What Skills MAY Still Do Directly

- Read reference files outside `.project/` (source code, config files, etc.) via the Read tool — unchanged
- Read LLM-owned markdown files within `.project/` via the Read tool (architecture docs, research, plans) — these are LLM-managed content
- Write LLM-owned markdown files into paths returned by CLI command responses

## Invocation Patterns

### Always use `--json`

All CLI queries from skills must use `--json` for structured, parseable output. Note: `--quiet` is for human operators and scripting, not for skill consumption — skills should always use `--json`.

```bash
goodplan status --json
goodplan slice:show --slice my-slice --json
goodplan epic:list --json
```

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

**IMPORTANT:** Always pipe empty stdin even when no input is needed — the compiled binary reads stdin and will block if nothing is piped. For commands with no payload:
```bash
stdin: "" | goodplan slice:plan --slice my-slice --json
```

> **Syntax note:** `stdin: ""` is Claude Code's Bash tool API syntax (a named parameter), not valid shell. Skills invoke commands through Claude Code's Bash tool where `stdin` is a tool parameter. In a regular shell, the equivalent would be `echo '' | goodplan ...`.

## Interaction Patterns by Skill Role

### Orchestrator Skills

Skills that coordinate workflow phases: `/create-epic`, `/explore`, `/create-architecture`, `/create-slices`, `/project-status`, `/complete`, `/audit-architecture`.

**Read state:**
```bash
goodplan status --json           # project overview, active entities, recommendations
goodplan epic:show --epic X --json     # entity details + artifact existence
goodplan slice:list --json       # all slices with statuses
goodplan state --json --query '.["activity-log.jsonl"] | .[-5:]'  # recent activity
```

**Initialize project (if needed):**
```bash
goodplan init --name my-project --json
```

**Mutate state:**
```bash
echo '{"name":"my-epic","goal":"..."}' | goodplan epic:create --json
goodplan slice:plan --slice my-slice --json
echo '{"verificationPassed":true,...}' | goodplan slice:complete --slice my-slice --json
```

**Use response paths:**
Mutation responses include `paths` — a `Record<string, string>` mapping logical names to absolute filesystem paths. Write markdown content into these paths:
```json
{
  "entity": "my-slice",
  "newStatus": "planning",
  "paths": {
    "plan": "/abs/path/to/.project/slices/my-slice/",
    "research": "/abs/path/to/.project/slices/my-slice/research/"
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
# This is a pure state-transition trigger.
stdin: "" | goodplan submit-plan --slice my-slice --json

# submit-refinement: requires scores payload for the circuit breaker.
# Use --slice or --quest to disambiguate (submit commands work for both entity types).
echo '{"scores":{"correctness":9,"completeness":8}}' | goodplan submit-refinement --slice my-slice --json

# submit-implementation: no content payload.
stdin: "" | goodplan submit-implementation --slice my-slice --json
```

### Interactive Orchestrator Skills

Skills that do interactive user work between state transitions: `/create-epic`, `/create-plan`, `/create-architecture`, `/complete`. These need both deep context AND state mutations in a single session.

**Pattern:**
1. Call `begin` (or `start-*`) to initiate the phase and get context
2. Use `state --query` or `show --json` for additional context as needed
3. Do interactive work (user Q&A, content generation, review)
4. Call `submit-*` or entity mutation commands to persist results

```bash
# 1. Begin the phase
stdin: "" | goodplan epic:explore --epic my-epic --json
# Returns: { entity, phase, previousStatus, newStatus }

# 2. Get deep context for the sub-agent
goodplan start-explore --epic my-epic --inline --json
# Returns: { context: { inline: {...}, references: [...], decisions: [...] }, paths: {...} }

# 3. Interactive work happens here (user research, brainstorming, etc.)
# LLM writes content to paths from start-explore response

# 4. Submit to advance state
stdin: "" | goodplan submit-explore --epic my-epic --json
```

Interactive orchestrators differ from pure orchestrators in that they touch content directly rather than delegating to sub-agents. They differ from sub-agents in that they manage multiple state transitions across a session.

**Worked example: `complete` orchestrator pattern**

The `/complete` skill is an interactive orchestrator that requires stdin with verification results. Here is the full CLI interaction:

```bash
# 1. Check current state — is the entity ready for completion?
goodplan slice:show --slice my-slice --json
# Verify status is "implementation-complete"

# 2. Get deep context for verification review
goodplan start-complete --slice my-slice --inline --json
# Returns: { context: { inline: {...}, references: [...] }, paths: {...} }

# 3. Interactive verification work happens here
# The orchestrator reviews implementation against verification criteria,
# then constructs the completion payload.

# 4. Submit completion with stdin payload (note: stdin is a Claude Code Bash tool parameter)
stdin: '{"verificationPassed":true,"learnings":[{"category":"worked","summary":"...","detail":"...","tags":["zod"],"rollupTo":["epic"]}],"architectureDelta":[{"subsystem":"data-layer","type":"modify","description":"Added atomic writes"}]}' | goodplan slice:complete --slice my-slice --json
# Returns: { entity, previousStatus, newStatus, deferredRouted, architecturePaths, learningsRolledUp }
```

### Read-Only Skills

Skills that only query state: `/project-status`, `/audit-architecture` (read phase).

Use `status --json`, `show --json`, `list --json` commands. These bypass the RPC layer and go directly to the Data Layer — they're fast and side-effect-free.

## Deriving Workflow Phase

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

## State Orientation

When a skill starts and needs to understand the current project state:

```bash
goodplan status --json
```

Returns active entities, their statuses, artifact counts with file listings, recommendations (suggested next actions), and warnings (stale entities). This replaces reading `state.md`.

## Error Handling in Skills

When a CLI command fails:

1. **Exit 2 (validation)**: The skill passed bad arguments. Fix the invocation — this is a skill bug. Retry after correcting flags/stdin. If persistent, use `goodplan schema --command <cmd> --json` to verify expected input shape.
2. **Exit 3 (state machine)**: The requested transition is invalid. Parse the error code to determine recovery:
3. **Exit 1 (internal)**: Unexpected error in the CLI. Present the full error to the user and stop.

### Error Recovery Patterns

**`STATE_INVALID_TRANSITION` on re-entry (exit 3):**
The entity is already past the requested phase. This is success — the work was already done (e.g., prior run completed the transition). Check current status with `show --json` and continue to the next step.

```bash
# Skill tries to begin planning, but slice is already in 'planning' or later
stdin: "" | goodplan slice:plan --slice my-slice --json
# Exit 3: STATE_INVALID_TRANSITION — slice is in 'plan-created'
# Recovery: the plan phase already completed. Proceed to refinement.
```

**`STATE_QUEST_ALREADY_ACTIVE` (exit 3):**
Another quest is active. Present the conflict to the user and ask whether to abandon the existing quest or wait.

```bash
stdin: "" | goodplan quest:plan --quest fix-logging --json
# Exit 3: STATE_QUEST_ALREADY_ACTIVE — "fix-perf" is active
# Recovery: ask user whether to abandon fix-perf first
```

**`VALIDATION_INVALID_INPUT` (exit 2):**
The stdin payload or flags don't match the command's schema. Use `goodplan schema --command <cmd> --json` to check the expected shape and retry with corrected input.

```bash
# Example: discover expected input for slice:complete
goodplan schema --command slice:complete --json
# Returns: { "command": "slice:complete", "flags": {...}, "stdinSchema": {...}, "outputSchema": {...} }
# Use the stdinSchema to construct the correct payload.
```

**Idempotent re-entry principle:** Skills should be safe to re-run. On `STATE_INVALID_TRANSITION`, check `show --json` to determine current status and resume from the appropriate step rather than failing.

## Graceful Stop Handling

Graceful stops produce no state record. The atomic state machine transitions are the only state updates — there are no intermediate "partially completed" states. When a skill is interrupted:

1. **Exit cleanly** — no partial state writes needed
2. **On re-run:** use `goodplan status --json` and `show --json` to detect current entity state
3. **Resume from last completed transition** — the idempotent re-entry principle applies (see Error Recovery Patterns above)

Skills should not attempt to record partial progress. The CLI's `status --json` shows the last committed state, which is always consistent. The user re-runs the skill to resume from where the last successful state transition left off.

## Deep Dives — Full State Access

When a skill needs access to any data in `.project/` beyond what `status`/`show`/`list` provide:

```bash
goodplan state --json --query '<jq expression>'
```

This dumps the full `assembleState()` tree — every JSON file parsed, every JSONL array, every markdown file as a string, every directory as a nested object. The `--query` flag applies a jq expression server-side, so only the selected data is returned.

Examples:
```bash
# All activity log entries for signal tracking
goodplan state --json --query '.["activity-log.jsonl"]'

# Page through a large list (entries 20-39)
goodplan state --json --query '.["activity-log.jsonl"]' --offset 20 --limit 20

# A specific slice's learnings (JSONL entries)
goodplan state --json --query '.slices["my-slice"]["learnings.jsonl"]'

# All architecture file names
goodplan state --json --query '.architecture | keys'

# Read a specific architecture doc (raw markdown)
goodplan state --json --query '.architecture["invariants.md"]'

# Project-level learnings filtered by source
goodplan state --json --query '[.["learnings.jsonl"][] | select(.source == "04-slice-lifecycle")]'

# Check if a file exists in a scope
goodplan state --json --query '.slices["my-slice"] | has("plan-refined.md")'
```

Use this for deep dives, trend analysis, cross-scope queries, and any access pattern not covered by the ergonomic shortcut commands.

## Migration Example: create-epic State Writes

**Before (direct file access):**
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

**After (CLI commands):**
```bash
# Create the epic — one command handles all state writes
echo '{"name":"my-epic","goal":"Build the feature..."}' | goodplan epic:create --json
# Returns: { "entity": "my-epic", "phase": "create", "previousStatus": "none", "newStatus": "created" }

# Begin exploration — single command advances state
stdin: "" | goodplan epic:explore --epic my-epic --json
# Returns: { "entity": "my-epic", "phase": "explore", "previousStatus": "created", "newStatus": "exploring" }
```

Key differences:
- No manual directory creation, JSON writes, or overview updates
- State machine validates transitions (e.g., rejects duplicate epic names)
- Activity log appended automatically on every mutation
- Mutation response confirms the state change — no need to re-read state

## Replacing state.md Reads

Skills previously read `state.md` for several purposes. CLI equivalents:

| Previous `state.md` usage | CLI equivalent |
|---|---|
| **Active slice detection** (for fast resume) | `goodplan status --json` → `.activeSlice` |
| **Current phase detection** | `goodplan slice:show --slice X --json` → `.status` |
| **Concurrent work warnings** (is another slice active?) | `goodplan status --json` → `.activeSlice` (non-null = something is active) |
| **Next step hints** | `goodplan status --json` → `.recommendations[]` |
| **Active quest detection** | `goodplan status --json` → `.activeQuest` |

## Concurrent Invocations

Read-only commands (`status`, `show`, `list`, `state`, `start-*`) are always safe to run concurrently. Mutation commands are serialized by file locking in the Data Layer. If a concurrent modification is detected, the CLI returns `DATA_CONCURRENT_MODIFICATION` (exit 1) — retry once.

## Self-Discovery

If a skill needs to discover available commands or verify flag names at runtime:

```bash
goodplan schema --json
```

Returns the full command tree with input/output schemas. Use as a fallback when the convention doc doesn't cover an edge case.
