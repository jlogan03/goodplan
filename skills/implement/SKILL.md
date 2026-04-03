---
name: implement
description: >
  Implement a plan phase-by-phase with review loops, then complete the slice.
  Autonomous pipeline: implementation, code review, slice completion.
  Common triggers: 'implement', 'execute plan', 'build slice', 'complete slice',
  'implement plan', 'run implementation', 'start implementing'.
user-invocable: true
requires: gp >= 1.0.0
---

# Implement Pipeline

Lightweight orchestrator that implements a slice plan phase-by-phase, then completes the slice. Spawns sub-agents for all content work — the orchestrator handles only CLI status, agent coordination, and git commits.

**This is a fully autonomous pipeline. There are no interactive phases.** All phases run without user input unless an exceptional condition is surfaced (unexpected RED-check pass, agent failure).

## Context Discipline

**You are an orchestrator.** You MUST NOT use the Read tool on architecture files, plan content, source code, or agent definitions. Your context consists of:
- CLI command output (`gp status --json`, `gp slice:show --json`, etc.)
- Sub-agent return values (structured JSON)
- User Q&A responses (from AskUserQuestion — only for exceptional conditions)
- Orchestrator-generated files (re-entry summaries, error details from failed sub-agents)
- Temp directory file paths (passed to agents, never read by you)

**Exception — Step 3 (plan loading):** The orchestrator MAY read the plan overview to extract phase names and paths. This is structural metadata (a table of contents), not content reading.

If you need content-level information, spawn a sub-agent to read and summarize it.

For file copying (e.g., agent-produced files to CLI-managed paths), use shell `cp` via Bash tool — not Read+Write, which would pull artifact content into orchestrator context.

## Phase Table

| Phase | Type | CLI Status Mapping | What Happens |
|---|---|---|---|
| 1. Implementation | Autonomous | `implementing` | Per-phase: spawn implement-phase → commit |
| 2. Slice completion | Autonomous | `implementing` → `implementation-complete` → `completed` | Spawn completion-slice → surface recommendations → CLI submit |

Note: Phase 1 review loop added in Phase 3 of the build plan. Phase 2 completion integration added in Phase 4.

## Step 0 — Setup

```bash
GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"
"$GP" --version --json
```

If the command fails, stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Store `$GP` as the CLI binary path for all subsequent commands.

## Step 1 — Scope Resolution

Accept a slice name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SLICE_NAME`.
2. **No argument**: query `$GP status --json`.
   - Check `.activeSlice` — if present, use `.activeSlice.name`.
   - Otherwise, query `$GP slice:list --json` and find the first slice in `plan-refined` or `implementing` status.
   - If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable slice found, stop: "No slice in `plan-refined` or `implementing` status found. Create and refine a plan first."

For quests: accept a quest name argument or check `.activeQuest` from `$GP status --json`. Quest handling follows the same pattern — substitute `quest` for `slice` in all subsequent CLI commands.

## Step 2 — State Transition and Re-Entry

Query current slice status:

```bash
$GP slice:show --slice $SLICE_NAME --json
```

Map the `status` field:

| Status | Action |
|---|---|
| `plan-refined` | Transition to `implementing` (Step 2a) |
| `implementing` | Resume from current phase (Step 2b) |
| `implementation-complete` | Skip to completion (Phase 2 — added in Phase 4 of build plan) |
| `completed` | Already done. Inform user: "Slice is already completed." |
| Other | Stop: "Slice is in `{status}` status — not ready for implementation." |

### 2a. Transition to Implementing

```bash
$GP slice:implement --slice $SLICE_NAME --json
```

Verify the JSON response indicates a successful transition (no error field). If the transition fails, stop with the error message.

### 2b. Resume from Current Phase

Read the `implementationPhase` field from the slice JSON returned by `slice:show`. This is an integer indicating the last completed phase index.

- If `implementationPhase` is `0` or absent: start from the first plan phase.
- If `implementationPhase` is `N` (N > 0): resume from phase N+1 (the next uncompleted phase).

Present re-entry summary:
```
Resuming implementation of **{SLICE_NAME}**.
Completed phases: {implementationPhase} of {totalPhases}.
Starting from Phase {implementationPhase + 1}.
```

## Step 3 — Plan Loading

Load the plan to extract the phase list. This is a **structural parse only** — extracting phase names and content paths, not reading implementation details.

Query the slice to find the plan path:

```bash
$GP slice:show --slice $SLICE_NAME --json
```

Extract the plan path from the response. The plan may be:

### Single-file plan (e.g., `plan.md` or `plan-refined.md`)

The orchestrator reads the plan file and extracts phase headings. Look for `## Phase N:` headings. Build a phases list:

```
phases = [
  { index: 1, name: "Phase name from heading", path: "<plan-file-path>#phase-1" },
  { index: 2, name: "Phase name from heading", path: "<plan-file-path>#phase-2" },
  ...
]
```

### Directory plan (e.g., `plan/` with per-phase files)

List the phase files in the plan directory:

```bash
ls <plan-directory>/
```

Build a phases list from the file listing:

```
phases = [
  { index: 1, name: "Phase name from file", path: "<plan-directory>/01-phase-name.md" },
  { index: 2, name: "Phase name from file", path: "<plan-directory>/02-phase-name.md" },
  ...
]
```

Derive `PLAN_SLUG` from the slice name in kebab-case, for use in commit messages.

Store `totalPhases = phases.length`.

## Step 4 — Pre-Implementation

### 4a. Clean Git State

```bash
git status --porcelain
```

If there are uncommitted changes, stop: "Working directory has uncommitted changes. Please commit or stash them before running implementation."

### 4b. Resolve Architecture Path

Determine the architecture `_overview.md` path for the active epic:

```bash
$GP status --json
```

Extract the active epic name, then construct the path: `.goodplan/epics/{EPIC_NAME}/architecture/_overview.md`. This path is passed to the implement-phase agent for maturity extraction — the orchestrator does NOT read it.

If no active epic, fall back to `.goodplan/architecture/_overview.md`.

### 4c. Create Temp Directory

```bash
TMPDIR="/tmp/gp-implement-${SLICE_NAME}-$(date +%s)"
mkdir -p "$TMPDIR"
```

Log to stderr: `[implement] Working directory: $TMPDIR`

## Step 5 — Implementation Loop

Iterate over each plan phase, starting from the resume index determined in Step 2.

For each phase `i` in `phases` (starting from `resumeIndex`):

### 5.1. Spawn Implement-Phase Agent

```
Agent: implement-phase
Task prompt: |
  Slice: {SLICE_NAME}
  Phase: {phases[i].index} of {totalPhases} — "{phases[i].name}"
  Phase content path: {phases[i].path}
  Iteration: 1
  Plan slug: {PLAN_SLUG}
  Scope directory: {slice scope directory from slice:show}
  Architecture overview path: {architecture _overview.md path}
  Temp directory: {TMPDIR}

  Implement this plan phase. Run Expected Behavior RED checks first (they
  should fail before implementation), then implement, then run GREEN checks
  (they should pass after implementation).

  Return JSON:
  {
    "status": "SUCCESS" | "PARTIAL" | "FAILED",
    "summary": "<what was done>",
    "filesChanged": ["<list of files created or modified>"],
    "redGreenResults": {
      "passed": true | false,
      "redUnexpectedPasses": ["<checks that passed when they should have failed>"],
      "details": "<summary of check results>"
    }
  }

allowedTools: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"]
disallowedTools: ["Agent"]
```

### 5.2. Parse Agent Return

Parse the return JSON. Check `status`:

- **SUCCESS**: Proceed to commit (5.3).
- **PARTIAL**: Log the `summary` and surface to user via AskUserQuestion: "Phase {i} partially completed: {summary}. Continue / Retry / Stop?"
  - Continue: proceed to commit with partial work.
  - Retry: re-spawn the agent (loop back to 5.1).
  - Stop: preserve temp directory, stop pipeline.
- **FAILED**: Stop with error message. Preserve temp directory.

### 5.3. Check for Unexpected RED Passes

If `redGreenResults.redUnexpectedPasses` is non-empty, surface to user via AskUserQuestion:

"The following Expected Behavior checks passed when they should have FAILED (before implementation). This may indicate the checks are not testing what you expect:
- {list each unexpected pass}

Continue anyway / Stop to investigate?"

If the user chooses to stop, preserve temp directory and halt.

### 5.4. Orchestrator Commits

The orchestrator — not the agent — commits the phase work:

```bash
git add <each file from filesChanged>
git commit -m "[${PLAN_SLUG}] Phase ${phases[i].index}: ${phases[i].name}"
```

If `filesChanged` is empty but agent reported SUCCESS, run `git diff --name-only` to detect changes the agent didn't report, and add those instead.

### 5.5. Verify Commit

```bash
git log --oneline -1
```

Confirm the commit message matches the expected format. If the commit failed (e.g., nothing to commit), log a warning but continue — the phase may have been a documentation-only or verification-only phase.

### 5.6. Update Phase Tracking

```bash
$GP submit-implementation --slice $SLICE_NAME --phase ${phases[i].index}
```

This records the completed phase index in the slice state, enabling re-entry.

### 5.7. Advance

Log to stderr:
```
[implement] Phase {phases[i].index}/{totalPhases} complete: {phases[i].name}
```

Continue to the next phase.

Note: Review loop (coordinator → reviewers → synthesis → feedback → re-implementation) will be added in Phase 3 of the build plan between steps 5.2 and 5.3.

Note: Completion integration (steps 6-8) will be added in Phase 4 of the build plan.

## Step 6 — Done Summary (Skeleton)

After all phases complete, present:

```
**Implementation Complete (single-pass)**
- **Slice**: {SLICE_NAME}
- **Phases completed**: {totalPhases}
- **Commits**: {totalPhases} (one per phase)
- **Next step**: Review loop and completion will be added in subsequent phases.
```

Note: This summary will be replaced by the full completion flow in Phase 4.

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| implement-phase | Read, Grep, Glob, Write, Edit, Bash | Full implementation: reads plan + code, writes code, runs checks |

Note: Additional agents (refinement-coordinator, reviewer-*, synthesis, completion-slice) will be added in Phases 3 and 4.

All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy.

## Error Handling

- **CLI command failure**: Log the error, stop, and surface the error message to the user.
- **Sub-agent FAILED status**: Log the agent name and error summary, stop, and tell the user what happened. Preserve temp directory.
- **Sub-agent PARTIAL status**: Surface to user via AskUserQuestion with options to continue, retry, or stop.
- **Unexpected return format**: If a sub-agent return cannot be parsed as JSON, log the raw return text to stderr and treat as FAILED.
- **Git commit failure**: Log warning, continue to next phase (phase may have been verification-only).

## Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[implement] Artifacts preserved at: $TMPDIR
```
