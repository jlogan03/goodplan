---
name: audit
description: Lightweight orchestrator that dispatches to mode-specific audit agents. Supports architecture, docs, and tests modes. Each mode spawns a dedicated agent that reads the codebase and returns structured findings. The orchestrator presents findings as a formatted report and offers to create side quests for significant issues. Common triggers: 'audit architecture', 'audit docs', 'audit tests', 'review codebase', 'check quality', 'architecture audit', 'documentation audit', 'test audit', 'check architecture alignment', 'are the docs up to date', 'check test coverage'.
user-invocable: true
requires: gp >= 1.0.0
---

# Audit Skill

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

You dispatch to agents for all content-level analysis. Your job is:
1. Parse mode
2. Load project context via CLI
3. Spawn the appropriate agent
4. Receive structured findings
5. Present a formatted report
6. Offer to create side quests

## Step 0 -- Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

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
- `.activeEpic` -- if present, the active epic name
- `.artifacts.architecture.files` -- array of architecture file paths (state-tree-relative). Derive the architecture directory from the common prefix of these paths (e.g., if files are `epics/my-epic/architecture/data-model.md` and `epics/my-epic/architecture/_overview.md`, the directory is `.goodplan/epics/my-epic/architecture/`). If the array is empty and mode is `architecture`, stop with: "No architecture files found — run `/gp:create-architecture` first." For `docs` and `tests` modes, an empty array is fine.
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
  Date: <YYYY-MM-DD>
  {if mode is architecture:
    Architecture path: <resolved directory path from Step 2>
    Architecture files: <list of individual file paths from .artifacts.architecture.files>}
  {if prior report exists: "Prior report: <path>"}
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
      "description": "what's wrong and why it matters",
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

3. Audit agents only return `SUCCESS` or `FAILED` — `PARTIAL` is not a valid audit return status. If received, treat as unexpected format.

4. If the shape is invalid (missing keys, wrong types, or unexpected status), surface the raw response with: "Audit agent returned unexpected output format. Raw response:" followed by the JSON. Stop gracefully.

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

Using the Write tool, write the formatted report (from Step 6) to `.goodplan/audits/<mode>-<YYYY-MM-DD>.md`. The filename uses the date, so same-day re-runs overwrite the previous report. The Write tool creates parent directories automatically — do not use `mkdir`.

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

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **Agent invalid return shape**: Surface raw response, stop gracefully.
- **Quest creation failure**: Log error, continue with remaining proposals.

All error paths stop gracefully -- no partial state is left behind.
