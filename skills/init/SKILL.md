---
name: init
description: >
  Initialize a goodplan project — auto-detects whether to onboard an existing
  codebase or set up a fresh empty project. Replaces onboard-repo for existing
  repos; subsumes "Mode A" (new project) from create-epic. Common triggers:
  'init', 'initialize', 'onboard', 'new repo', 'set up project', 'new project',
  'onboard this repo', 'scan this codebase', 'start a project'.
user-invocable: true
requires: gp >= 1.0.0
---

# Init

Lightweight orchestrator that initializes a goodplan project. Auto-detects mode based on the presence of source files in the repo — onboards an existing codebase (via onboard-phase agent) or sets up an empty new project (inline).

**When this skill triggers:** User says "init", "initialize", "onboard", "new repo", "set up project", "new project", "onboard this repo", "scan this codebase", or invokes `/gp:init`.

## Context Discipline

**You are an orchestrator.** You MUST NOT use the Read tool on source code files, architecture files, conventions files, or agent definitions. Your context consists of:
- CLI command output (`gp status --json`, `gp init --json`)
- Sub-agent return values (structured JSON)
- User Q&A responses (from AskUserQuestion)
- Directory listing output (ls, find — for auto-detection only)

If you need content-level information, spawn a sub-agent to read and summarize it.

## Step 0 — Version Check

```bash
GP="gp"
"$GP" --version --json
```

If the command fails (not found, non-zero exit), stop: "The `gp` CLI is required (>= 1.0.0) but was not found or is incompatible. Ensure the goodplan plugin is installed and enabled — run `/plugin` to check."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Store `$GP` as the CLI binary path for all subsequent commands.

Read `../_shared/references/cli-interaction.md` — needed throughout for CLI error handling patterns (section 10: Error Handling). Key points: exit code 1 = internal/unexpected error (present to user and stop), exit code 2 = validation/usage error (fix invocation — likely a skill bug), exit code 3 = state machine error (parse error code from JSON, apply recovery pattern).

## Step 1 — Re-Entry Check

Check if `.goodplan/` already exists:

```bash
$GP status --json
```

If the command succeeds and returns project state:

- **Fully initialized** (status shows project with epics, slices, or architecture files): Report current state to the user: "This project is already initialized. Current status: {summary from status output}." Use AskUserQuestion: "Re-run onboarding from scratch / View current status and exit". If they choose to re-run, continue to Step 2. If they choose to exit, stop with the status summary.

- **Bare/partial** (just project.json, no markdown artifacts): Inform the user: "Found a partial `.goodplan/` from a previous incomplete run. Continuing initialization." Continue to Step 2.

If `.goodplan/` does not exist (command fails or returns uninitialized state), continue to Step 2.

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

Present the detected mode to the user: "Detected mode: **{MODE}** ({reason}). Proceed?"

If `MODE=new`, go to Step 3. If `MODE=onboard`, go to Step 4.

## Step 3 — New Project Path (Inline)

This path runs entirely within the orchestrator — no sub-agent needed.

### 3a. Gather project info

Use AskUserQuestion to ask the user:
- "What is this project called?" (suggest repo directory name as default)
- "Briefly describe what the project will do."

### 3b. Initialize project

Sanitize the project name to kebab-case: lowercase, replace spaces and underscores with hyphens, truncate to 50 characters.

```bash
$GP init --name <sanitized-name> --json
```

If the command fails, report the error and stop. Do not leave partial state.

### 3c. Write idea.md

Write `.goodplan/idea.md` using the Write tool with the user's description:

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

Infer the project name from available signals:
1. Check for `package.json` — use `name` field if present
2. Check for README — use first `#` heading if present
3. Fall back to repo directory name (basename of cwd)

Sanitize to kebab-case. Present to user for confirmation: "Using project name: **{name}**. OK?"

### 4b. Initialize project

```bash
$GP init --name <sanitized-name> --json
```

If the command fails, report the error and stop.

### 4c. Spawn onboard-phase agent

```
Agent: onboard-phase
Task prompt: |
  Project: {project-name}
  Repo root: {cwd}

  Scan this repository and scaffold a complete goodplan project. Extract
  conventions, architecture, subsystem structure, tech debt, expertise, and
  hot spots from repo artifacts.

  The .goodplan/ directory has already been initialized via `gp init`.
  Write your findings directly to:
  - .goodplan/idea.md
  - .goodplan/conventions.md
  - .goodplan/architecture/_overview.md

  Return a structured JSON summary of what was detected and written.

allowedTools: ["Read", "Grep", "Glob", "Write", "Bash", "WebSearch"]
disallowedTools: ["Agent"]
```

### 4d. Handle agent return

Parse the return JSON. Check `status`:

- **SUCCESS**: Present the agent's summary to the user. Proceed to Step 5.
- **PARTIAL**: Present `questions` to user via AskUserQuestion. Re-spawn with `continuationFile` + answers.
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

- **Architecture interview** (interactive validation of subsystem boundaries) — deferred to `/gp:create-architecture`
- **Side quest creation** for detected migrations/debt — deferred to `/gp:audit`
- **Expertise profiling** — deferred to `/gp:audit`
- **Optional epic creation** — deferred to user running `/gp:create-epic`

Init gets the project scaffolded with conventions, architecture overview, and idea.md. Deeper workflow steps are handled by the skills above.

## Error Handling

- **CLI command failure**: Log the error, stop, and surface the error message to the user.
- **Sub-agent FAILED status**: Log the agent name and error summary, stop, and tell the user what happened.
- **Sub-agent PARTIAL status**: Present `questions` to user via AskUserQuestion. Re-spawn agent with `continuationFile` + resolved answers.
- **Unexpected return format**: If a sub-agent return cannot be parsed as JSON, log the raw return text and treat as FAILED.

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| onboard-phase | Read, Grep, Glob, Write, Bash, WebSearch | Full repo scanning, convention detection, architecture extraction |

All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy.
