---
name: init
description: Initialize a goodplan project — auto-detects whether to onboard an existing codebase or set up a fresh empty project. Replaces onboard-repo for existing repos; subsumes "Mode A" (new project) from create-epic. Common triggers: 'init', 'initialize', 'onboard', 'new repo', 'set up project', 'new project', 'onboard this repo', 'scan this codebase', 'start a project'.
user-invocable: true
requires: gp >= 1.0.0
---

# Init

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

**Exceptions**: The orchestrator MAY use directory listings (ls, find) for auto-detection of project mode. The orchestrator MAY read metadata files (package.json, README) for project name inference — these are not architecture/plan artifacts.

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

Key error handling points: exit code 1 = internal/unexpected error (present to user and stop), exit code 2 = validation/usage error (fix invocation — likely a skill bug), exit code 3 = state machine error (parse error code from JSON, apply recovery pattern).

## Step 1 — Re-Entry Check

Check if `.goodplan/` already exists:

```bash
$GP status --json
```

If the command succeeds and returns project state:

- **Fully initialized** (status shows project with epics, slices, or architecture files): Report current state to the user: "This project is already initialized. Current status: {summary from status output}." Use AskUserQuestion: "Re-run content generation from scratch / View current status and exit". If they choose to re-run, set `SKIP_INIT=true` and continue to Step 2. If they choose to exit, stop with the status summary.

- **Bare/partial** (just project.json, no markdown artifacts): Inform the user: "Found a partial `.goodplan/` from a previous incomplete run. Skipping initialization and re-running content generation." Set `SKIP_INIT=true` and continue to Step 2.

If `.goodplan/` does not exist (command fails with `DATA_NO_PROJECT` — exit code 1 in this specific case is expected, not fatal), set `SKIP_INIT=false` and continue to Step 2.

## Step 2 — Auto-Detection

Determine whether this is an existing repo with source code or an empty new project.

### 2a. Scan for source files

Check for source code files at root or one level deep. **Explicitly exclude `.goodplan/` from the scan** to avoid false positives on managed state files:

```bash
# Check for source directories
ls -d src/ lib/ app/ cmd/ internal/ packages/ 2>/dev/null

# Check for source files at root or one level deep
find . -maxdepth 2 -not -path './.goodplan/*' -not -path './.git/*' \( -name '*.ts' -o -name '*.py' -o -name '*.js' -o -name '*.go' -o -name '*.rs' -o -name '*.java' -o -name '*.rb' -o -name '*.swift' -o -name '*.kt' \) -print -quit 2>/dev/null
```

### 2b. Determine mode

- **Source found** → `MODE=onboard`
- **No source found** → `MODE=new`
- **Override**: If the user's invocation text includes `--mode new` → force `MODE=new`. If it includes `--mode onboard` → force `MODE=onboard`.

Present the detected mode: "Detected mode: **{MODE}** ({reason}). If this is wrong, say so — otherwise I'll continue."

If `MODE=new`, go to Step 3. If `MODE=onboard`, go to Step 4.

## Step 3 — New Project Path (Inline)

This path runs entirely within the orchestrator — no sub-agent needed.

### 3a. Gather project info

Use AskUserQuestion to ask the user:
- "What is this project called?" (suggest repo directory name as default)
- "Briefly describe what the project will do."

### 3b. Initialize project

Sanitize the project name to kebab-case: lowercase, replace spaces and underscores with hyphens, truncate to 50 characters.

If `SKIP_INIT=false`:

```bash
$GP init --name <sanitized-name> --json
```

If the command fails, report the error and stop. Do not leave partial state. Store `projectDir` from the response (this is the `.goodplan/` directory path).

If `SKIP_INIT=true`: the project is already initialized — skip `gp init`. Set `projectDir` to `${cwd}/.goodplan`.

### 3c. Write idea.md

Write `${projectDir}/idea.md` using the Write tool with the user's description:

```markdown
# <Project Name>

## Description

<user's description>

## Goals

<inferred from description, or ask user>

## Tech Stack

<to be determined>

## Constraints

<to be determined>
```

### 3d. Present summary

> **Project initialized.**
>
> - `.goodplan/idea.md` — project description
> - `.goodplan/project.json` — project metadata
>
> **Next step:** `/gp:create-epic` to define the first development direction.

Stop here for new projects.

## Step 4 — Onboard Path (Delegated)

### 4a. Infer project name

Infer the project name from available signals (use Bash for extraction to keep orchestrator context light):
1. `jq -r '.name // empty' package.json 2>/dev/null` — use if non-empty
2. `head -5 README* readme* 2>/dev/null | grep '^# '` — use first heading if present
3. Fall back to repo directory name (basename of cwd)

Sanitize to kebab-case. Present to user: "Using project name: **{name}**. If this is wrong, say so — otherwise I'll continue."

### 4b. Initialize project

If `SKIP_INIT=false`:

```bash
$GP init --name <sanitized-name> --json
```

If the command fails, report the error and stop. Store `projectDir` from the response (this is the `.goodplan/` directory path).

If `SKIP_INIT=true`: the project is already initialized — skip `gp init`. Set `projectDir` to `${cwd}/.goodplan`.

### 4c. Spawn onboard-phase agent

Spawn the `onboard-phase` agent with the following task prompt. The agent has its own instructions in its AGENT.md — you only need to provide the context:

```
Agent: onboard-phase
Task prompt: |
  Project: {project-name}
  Repo root: {cwd}
  Project dir: {projectDir}

  The .goodplan/ directory has already been initialized via `gp init`.
  Scan this repository and scaffold a complete goodplan project.

  You may use: Read, Grep, Glob, Write, Bash, WebSearch.
  Do not spawn sub-agents.
```

### 4d. Handle agent return

The agent returns structured JSON per the sub-agent-return-format reference. Check `status`:

- **SUCCESS**: Present the agent's summary to the user. Proceed to Step 5.
- **FAILED**: Report the error. Preserve any partial state — the re-entry check (Step 1) will detect it on the next run.

## Step 5 — Post-Onboard Summary

Present the onboarding summary:

> **Project onboarded.**
>
> **Artifacts written:**
> - `.goodplan/idea.md` — project description and goals
> - `.goodplan/conventions.md` — conventions detected
> - `.goodplan/architecture/_overview.md` — subsystems identified
>
> **Recommended next step:** `/gp:create-epic` to define the first development direction, or `/gp:explore` to investigate a specific area first.

## Scope & Intentional Omissions

The init/onboard path is a lighter-weight version of full project onboarding. The following capabilities are intentionally deferred to dedicated skills:

- **Architecture interview** (interactive validation of subsystem boundaries) — deferred to `/gp:create-epic`
- **Side quest creation** for detected migrations/debt — deferred to `/gp:audit`
- **Expertise profiling** — deferred to `/gp:audit`
- **Optional epic creation** — deferred to user running `/gp:create-epic`

Init gets the project scaffolded with conventions, architecture overview, and idea.md. Deeper workflow steps are handled by the skills above.

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

## Sub-Agent Tool Restrictions

| Agent | Allowed | Disallowed | Rationale |
|---|---|---|---|
| onboard-phase | Read, Grep, Glob, Write, Bash, WebSearch | Agent | Full repo scanning, convention detection, architecture extraction. No sub-agent spawning (flat hierarchy). |
