---
name: audit
description: >
  Lightweight orchestrator that dispatches to mode-specific audit agents.
  Supports architecture, docs, and tests modes. Each mode spawns a dedicated
  agent that reads the codebase and returns structured findings. The
  orchestrator presents findings as a formatted report and offers to create
  side quests for significant issues. Common triggers: 'audit architecture',
  'audit docs', 'audit tests', 'review codebase', 'check quality',
  'architecture audit', 'documentation audit', 'test audit',
  'check architecture alignment', 'are the docs up to date',
  'check test coverage'.
user-invocable: true
requires: gp >= 1.0.0
---

# Audit Skill

Lightweight orchestrator that dispatches to mode-specific audit agents. Replaces the separate `audit-architecture`, `audit-docs`, and `audit-tests` skills with a single entry point.

**You are an orchestrator.** You dispatch to agents for all content-level analysis. You do NOT read architecture files, source code, test files, or documentation yourself. Your job is:
1. Parse mode
2. Load project context via CLI
3. Spawn the appropriate agent
4. Receive structured findings
5. Present a formatted report
6. Offer to create side quests

## Step 0 -- Version Check

```bash
GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"
"$GP" --version --json
```

If the binary is not found, stop: "gp CLI not found -- ensure the goodplan plugin is installed."

If the command exits with code 1, stop: "gp reported a state error: <stderr>. Check `.goodplan/` integrity."

If the command exits with code 2, stop: "gp usage error: <stderr>. This may indicate a version mismatch."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Store `$GP` as the CLI binary path for all subsequent commands.

## Step 1 -- Parse Mode

The mode comes from the first positional argument after the skill name:
- `/gp:audit architecture` -> mode = `architecture`
- `/gp:audit docs` -> mode = `docs`
- `/gp:audit tests` -> mode = `tests`

If no argument is provided, use AskUserQuestion to select the mode:

> "Which audit mode do you want to run?"
> Options: architecture, docs, tests

Valid modes: `architecture`, `docs`, `tests`. Any other value is an error -- stop with: "Invalid audit mode: '<value>'. Valid modes are: architecture, docs, tests."

## Step 2 -- Load Project Context

```bash
$GP status --json
```

Parse the response to extract:
- `.activeEpic` -- if present, the active epic name and its architecture path
- `.project` -- project-level metadata

If the command fails:
- Exit code 1 -> stop: "gp reported a state error: <stderr>. Check `.goodplan/` integrity."
- Exit code 2 -> stop: "gp usage error: <stderr>. This may indicate a version mismatch."

## Step 3 -- Re-Entry Detection

Check for existing audit reports:

```bash
ls .goodplan/audits/<mode>-*.md 2>/dev/null | tail -1
```

If a prior completed report exists, note it in Step 4's task prompt so the agent can reference prior findings if useful. Audits are lightweight -- restarting is always acceptable, so no resume logic is needed.

## Step 4 -- Spawn Mode Agent

Map the mode to the agent name:

| Mode | Agent |
|---|---|
| `architecture` | `audit-architecture-phase` |
| `docs` | `audit-docs-phase` |
| `tests` | `audit-tests-phase` |

Build the task prompt with project context:

```
Agent: <agent-name>
Task prompt: |
  Mode: <mode>
  Project status: <gp status --json output summary>
  Active epic: <epic name or "none">
  Architecture path: <resolved path>
  Date: <YYYY-MM-DD>
  {if prior report exists: "Prior report: <path>"}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

## Step 5 -- Validate Agent Return

The agent returns structured JSON:

```json
{
  "status": "SUCCESS | FAILED",
  "summary": "one-line description",
  "findings": [
    {
      "severity": "CRITICAL | IMPORTANT | MINOR | INFO",
      "category": "<mode-specific category>",
      "description": "what's wrong",
      "location": "file path or area",
      "suggestion": "what to do about it"
    }
  ],
  "scores": {
    "<dimension>": <1-10 number>
  },
  "proposedSideQuests": [
    {
      "title": "descriptive-kebab-case-name",
      "description": "1-3 sentence goal"
    }
  ]
}
```

### Validation rules

1. If the agent's `status` is `FAILED`, surface the raw agent response with: "Audit agent failed: <summary>." Stop gracefully.

2. Validate the return shape:
   - `findings` must be an array (may be empty)
   - `scores` must be an object
   - `proposedSideQuests` must be an array (may be empty)
   - Each finding must have `severity`, `category`, `description`, `location`, `suggestion` as strings

3. If the shape is invalid (missing keys, wrong types), surface the raw response with: "Audit agent returned unexpected output format. Raw response:" followed by the JSON. Stop gracefully.

## Step 6 -- Present Findings Report

Format and present the findings to the user:

### Report Format

```
## <Mode> Audit -- <YYYY-MM-DD>

### Scores
<dimension>: <score>/10

### Findings Summary
| # | Severity | Category | Finding | Location |
|---|----------|----------|---------|----------|
| 1 | CRITICAL | <cat>    | <desc>  | <loc>    |

### CRITICAL Findings
<detailed findings with suggestions>

### IMPORTANT Findings
<detailed findings with suggestions>

### MINOR Findings
<detailed findings with suggestions>

### INFO
<observations>
```

Order findings by severity: CRITICAL first, then IMPORTANT, MINOR, INFO.

## Step 7 -- Side Quest Proposals

If the agent proposed side quests AND there are CRITICAL or IMPORTANT findings, present each proposal to the user via AskUserQuestion:

> "The audit found issues that could be addressed as side quests. Create these?"

For each approved side quest, create via CLI:

```bash
echo '{"name":"<title>","goal":"<description>"}' | $GP quest:create --json
```

Capture the output to confirm creation. If quest creation fails, log the error and continue with remaining proposals.

If no side quests are proposed or all findings are MINOR/INFO, skip this step.

## Step 8 -- Write Audit Report

The orchestrator writes the report file using the agent's structured JSON return. Agents are read-only and do not write files.

```bash
mkdir -p .goodplan/audits
```

Using the Write tool, write the formatted report (from Step 6) to `.goodplan/audits/<mode>-<YYYY-MM-DD>.md`.

Verify it exists:

```bash
ls .goodplan/audits/<mode>-<YYYY-MM-DD>.md
```

## Step 9 -- Done Summary

Present a summary:

```
**Audit Complete**
- **Mode**: <mode>
- **Findings**: <count by severity>
- **Side quests created**: <count>
- **Report**: .goodplan/audits/<mode>-<YYYY-MM-DD>.md
```

## Error Handling

- **CLI binary not found**: Stop with clear install message.
- **CLI exit code 1**: State error -- stop with error message and integrity suggestion.
- **CLI exit code 2**: Usage error -- stop with version mismatch suggestion.
- **Agent FAILED status**: Surface summary, stop gracefully.
- **Agent invalid return shape**: Surface raw response, stop gracefully.
- **Quest creation failure**: Log error, continue with remaining proposals.

All error paths stop gracefully -- no partial state is left behind.

## When to Ask the User

- Mode selection (Step 1) -- only if no argument provided
- Side quest creation (Step 7) -- only if significant findings exist

Do NOT ask for permission to continue between steps.
