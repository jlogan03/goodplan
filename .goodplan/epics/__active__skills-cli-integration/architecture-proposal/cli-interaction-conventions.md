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

## Invocation Patterns

### Always use `--json`

All CLI queries from skills must use `--json` for structured, parseable output:

```bash
goodplan status --json
goodplan slice:show --name my-slice --json
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

Always pipe `stdin: ""` even when no input is needed — the compiled binary blocks without it.

## Interaction Patterns by Skill Role

### Orchestrator Skills

Skills that coordinate workflow phases: `/create-epic`, `/explore`, `/create-architecture`, `/create-slices`, `/project-status`, `/complete`, `/audit-architecture`.

**Read state:**
```bash
goodplan status --json           # project overview, active entities, recommendations
goodplan epic:show --name X --json    # entity details + artifact existence
goodplan slice:list --json       # all slices with statuses
goodplan activity:list --limit 5 --json  # recent activity
```

**Mutate state:**
```bash
echo '{"name":"my-epic","goal":"..."}' | goodplan epic:create --json
goodplan slice:plan --slice my-slice --json
echo '{"verificationPassed":true,...}' | goodplan slice:complete --slice my-slice --archive --json
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

**Submit content:**
```bash
echo '{"plan":"..."}' | goodplan submit-plan --slice my-slice --json
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
    "completion": false,
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

1. **Exit 2 (validation)**: The skill passed bad arguments. Fix the invocation — this is a skill bug.
2. **Exit 3 (state machine)**: The requested transition is invalid. Parse the error code to understand why (e.g., `STATE_INVALID_TRANSITION`, `STATE_QUEST_ALREADY_ACTIVE`). Present the error to the user if it indicates a workflow issue.
3. **Exit 1 (internal)**: Unexpected error in the CLI. Present the full error to the user and stop.

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

## Self-Discovery

If a skill needs to discover available commands or verify flag names at runtime:

```bash
goodplan schema --json
```

Returns the full command tree with input/output schemas. Use as a fallback when the convention doc doesn't cover an edge case.
