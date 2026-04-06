---
name: implement
description: This skill should be used when the user wants to implement a refined plan. Executes plan phases autonomously with code review loops, then completes the slice. Common triggers: 'implement', 'execute plan', 'build slice', 'complete slice', 'implement plan', 'run implementation', 'start implementing'.
user-invocable: true
requires: gp >= 1.0.0
---

# Implement Pipeline

**This is a fully autonomous pipeline. There are no interactive phases.** All phases run without user input unless an exceptional condition is surfaced (unexpected RED-check pass, agent failure).

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

**Exception**: The orchestrator MAY read the plan overview to extract phase names and paths (structural metadata only, not content reading).

## Phase Table

| Phase | Type | CLI Status Mapping | What Happens |
|---|---|---|---|
| 1. Implementation | Autonomous | `implementing` | Per-phase: spawn implement-phase → review loop → commit |
| 2. Slice completion | Autonomous | `implementing` → `implementation-complete` → `completed` | Spawn completion-slice → surface recommendations → CLI submit |

## Step 0 — Setup

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

Temp directory path formula (evaluated after Step 1 resolves SLICE_NAME; created in Step 4d, referenced in Step 2 for cleanup):
```
TMPDIR="/tmp/gp-implement-${SLICE_NAME}"
```

## Step 1 — Scope Resolution

Accept a slice name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SLICE_NAME`.
2. **No argument**: query `$GP status --json`.
   - Check `.activeSlice` — if present, use `.activeSlice.name`.
   - Otherwise, query `$GP slice:list --json` and find the first slice in `plan-refined` or `implementing` status.
   - If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable slice found, stop: "No slice in `plan-refined` or `implementing` status found. Create and refine a plan first."

For quests: accept a quest name argument or check `.activeQuest` from `$GP status --json`. Quest handling follows the same pattern with these CLI command substitutions:

| Slice Command | Quest Equivalent |
|---|---|
| `slice:show --slice NAME` | `quest:show --quest NAME` |
| `slice:implement --slice NAME` | `quest:implement --quest NAME` |
| `submit-implementation --slice NAME --phase N` | `submit-implementation --quest NAME` (no `--phase` — per-phase tracking is slice-only) |
| `submit-implementation --slice NAME` (final) | `submit-implementation --quest NAME` |
| `slice:complete --slice NAME` | `quest:complete --quest NAME` |

Skip per-phase tracking in Step 5.8 for quests (the CLI rejects `--phase` with `--quest`).

## Step 2 — State Transition and Re-Entry

Query current slice status:

```bash
$GP slice:show --slice $SLICE_NAME --json
```

Map the `status` field:

| Status | Action |
|---|---|
| `plan-refined` | Fresh start — clean TMPDIR if it exists (`rm -rf $TMPDIR && mkdir -p $TMPDIR`), then transition to `implementing` (Step 2a) |
| `implementing` | Resume from current phase (Step 2b) |
| `implementation-complete` | Run Step 3 (plan loading — needed for PLAN_SLUG and totalPhases), Steps 4b and 4c (PRE_IMPL_COMMIT — derive from git log by finding the commit before the first `[${PLAN_SLUG}]` commit), then skip to Step 6. `verificationPassed` is always `true` (see Step 6.3 note). |
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

Extract plan path from `$GP slice:show --slice $SLICE_NAME --json`. The plan may be a single file (`plan.md`/`plan-refined.md`) or a directory with per-phase files.

- **Single-file**: read and extract `## Phase N:` headings → build `phases` array with `{ index, name, path }`.
- **Directory**: `ls <plan-directory>/` → build `phases` from file listing (e.g., `01-phase-name.md`).

Derive `PLAN_SLUG` from slice name (kebab-case). Store `totalPhases = phases.length`.

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

### 4c. Record Pre-Implementation Commit

```bash
PRE_IMPL_COMMIT=$(git rev-parse HEAD)
```

Store this for Step 6.2 — used to compute the full set of changed files across all phases.

### 4d. Create Temp Directory

Ephemeral scratch space for agent working files (Q&A summaries, continuation files). Review artifacts live in `RUN_DIR` (persistent, git-committed) — not here.

```bash
mkdir -p "$TMPDIR"
```

Log to stderr: `[implement] Working directory: $TMPDIR`

## Step 5 — Implementation Loop

Iterate over each plan phase, starting from the resume index determined in Step 2.

For each phase `i` in `phases` (starting from `resumeIndex`):

Set the run directory for review artifacts (persistent, per iteration-loop.md), scoped per phase to avoid round collisions:
```
RUN_DIR=<slice-path>/implementation/phase-${phases[i].index}/
```

Where `<slice-path>` is the CLI-managed slice directory (from `slice:show --json`). This directory is git-committed with the implementation.

Initialize per-phase tracking state:
- `iteration = 0`
- `reviewerScores = {}` — map of reviewer name → score history array
- `stagnationCount = 0`
- `reductionCount = 0`

### 5.1. Spawn Implement-Phase Agent

Spawn `implement-phase` (model: opus) with: slice name, phase index/name/path, iteration count, plan slug, scope directory, architecture overview path, temp directory, merged feedback path (if iteration > 0). Tools: Read, Grep, Glob, Write, Bash, WebSearch. No Agent tool. The agent runs RED checks (should fail before implementation), implements, then runs GREEN checks (should pass after).

Expected return JSON: `{ status, summary, filesWritten, redGreenResults: { passed, details } }`

### 5.2. Parse Agent Return

Parse the return JSON. Check `status`:

- **SUCCESS**: Proceed to RED check (5.3), then review loop (5.4).
- **PARTIAL**: Log the `summary` and surface to user via AskUserQuestion: "Phase {i} partially completed: {summary}. Continue / Retry / Stop?"
  - Continue: proceed to RED check and review with partial work.
  - Retry: re-spawn the agent (loop back to 5.1).
  - Stop: preserve temp directory, stop pipeline.
- **FAILED**: Stop with error message. Preserve temp directory.

### 5.3. Check for Unexpected RED Passes

Called immediately after each implement-phase return. If `redGreenResults.hasUnexpectedPass` is `true`, surface to user via AskUserQuestion:

"RED checks reported unexpected behavior:
{redGreenResults.details}

This may indicate the checks are not testing what you expect. Continue anyway / Stop to investigate?"

If the user chooses to stop, preserve temp directory and halt. Otherwise proceed to the review loop.

### 5.4. Review Loop

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). The orchestrator-specific parameters are listed in the **Loop Parameters** section at the end of this file.

Each round: write changed files to `${RUN_DIR}/round-{N}/changed-files.txt` via `git diff --name-only`, then follow iteration-loop.md's Reviewer Spawn Pattern → Synthesis → Exit Criteria Evaluation. Pass the changed-files path as the artifact with review context `code-implementation`. Write reviewer output to `${RUN_DIR}/round-{N}/reviews/{reviewer-name}.md`, synthesis to `${RUN_DIR}/round-{N}/merged.md`.

If exit conditions not triggered → spawn `implement-phase` again with merged feedback path, increment iteration, loop back to 5.1.

### 5.5. Post-Phase Checks

After the review loop passes, auto-format changed files and run lint/build/test checks. The orchestrator runs these directly — do not rely on the agent to have done it.

```bash
# 1. Auto-format changed files (detect formatter from project config)
# Check for biome.json → npx biome check --write <changed-files>
# Or check package.json for "format" script → bun run format
# Or check for .prettierrc → npx prettier --write <changed-files>
# Also format package.json if it was modified

# 2. Run project-specific checks — adapt commands to the project
bun run lint 2>&1 | tail -20
bun run build 2>&1 | tail -20
bun test 2>&1 | tail -40
```

If lint fails after auto-format, re-run the formatter with broader scope (`.` instead of individual files). If it still fails, the remaining issues are code-level (not formatting) — feed them back into the review loop.

If build or test fails, log the failure and surface to user via AskUserQuestion: "Post-phase checks failed: {summary}. Re-enter at Step 5.1 (spawn implement-phase with failures as feedback) / Continue anyway / Stop?"

### 5.6. Orchestrator Commits

The orchestrator — not the agent — commits the phase work:

```bash
git add <each file from filesWritten>
git commit -m "[${PLAN_SLUG}] Phase ${phases[i].index}: ${phases[i].name}"
```

If `filesWritten` is empty but agent reported SUCCESS, run `git diff --name-only` to detect changes the agent didn't report, and add those instead.

### 5.7. Verify Commit

```bash
git log --oneline -1
```

Confirm the commit message matches the expected format. If the commit failed (e.g., nothing to commit), log a warning but continue — the phase may have been a documentation-only or verification-only phase.

### 5.8. Update Phase Tracking

```bash
stdin: "" | $GP submit-implementation --slice $SLICE_NAME --phase ${phases[i].index} --json
```

This records the completed phase index in the slice state, enabling re-entry.

### 5.9. Advance

Log to stderr:
```
[implement] Phase {phases[i].index}/{totalPhases} complete: {phases[i].name} (rounds: {iteration+1})
```

Continue to the next phase.

## Step 5b — Exit Criteria

All exit criteria evaluation is defined in iteration-loop.md (auto-included in Step 5.4). The Loop Parameters section at the end of this file provides the skill-specific thresholds. On stagnation, score reduction, or hard cap: warn the user which reviewers scored below 9, their reasons, and whether restructuring may help.

## Step 6 — Slice Completion

After all plan phases complete (Step 5 loop exits), run slice completion.

### 6.1. Setup

```bash
mkdir -p <slice-path>/completion/
CHANGED_FILES=$(git diff --name-only $PRE_IMPL_COMMIT..HEAD)
```

### 6.2. Gather Forward-Compat Conditions

Load active conditions per cli-interaction.md Conditions Loading section, filtering by the current slice/quest scope prefix.

### 6.3. Spawn Completion-Slice Agent

Spawn `completion-slice` (model: opus, tools: Read/Grep/Glob/Write, no Agent) with: slice path, plan path, changed files list, architecture overview path, epic architecture path (if applicable), decisions/learnings with conditions (if any). Agent synthesizes learnings, reviews architecture delta, proposes side quests. Writes `completion/learnings.md`, `completion/architecture-delta.md`, `completion/side-quest-proposals.md`, and `completion/health-update.md`.

Expected return JSON: `{ status, summary, filesWritten, learnings: [{ category, summary, detail, tags, rollupTo }], architectureDelta: [{ subsystem, type, description }], recommendations: [{ type, description }], triggeredConditions: [{ type, id, condition, reason }] }`

Note: The agent does NOT return `verificationPassed`. The orchestrator always sets `verificationPassed = true` when reaching Step 7 — the CLI rejects `false` with `STATE_VERIFICATION_FAILED`. If any phase exited via stagnation/reduction/cap, capture this in `learnings` (e.g., `{ "category": "do-differently", "summary": "Phase N exited via stagnation — scores plateaued" }`) rather than failing completion.

### 6.4. Surface Recommendations and Conditions

Parse `recommendations` array. Use AskUserQuestion for each:
- `architecture-update`: "Update top-level architecture? / Flag as tech debt / Skip"
- `debt`: "Fix now / Propose side quest / Acknowledge (record in learnings) / Skip"
- `side-quest`: "Create side quest? / Defer / Skip"

Track choices — approved updates go to `architectureDelta`. For deferred items (slice only): ask the user which slice to target (`targetSlice` is required by the CLI schema). Acknowledged debt goes to `learnings` (not `deferred`).

If `triggeredConditions` is non-empty, present each: "Condition triggered on {type} `{id}`: {condition} — {reason}. Review now / Defer / Skip"

## Step 7 — CLI Submit

1. Transition (skip if entering from `implementation-complete` — already transitioned): `stdin: "" | $GP submit-implementation --slice $SLICE_NAME --json` (`implementing` → `implementation-complete`)
2. Complete: pipe `{ verificationPassed, learnings, architectureDelta, deferred }` to `$GP slice:complete --slice $SLICE_NAME --json`
   - `verificationPassed`: orchestrator-determined (see Step 6.3 note)
   - `learnings`: from the completion-slice agent's `learnings` return field (structured JSON, no file reading needed)
   - `architectureDelta`: merge the agent's `architectureDelta` return field with approved updates from Step 6.4
   - `deferred`: deferred items from Step 6.4 (**slice only** — omit for quests, per cli-interaction.md §9)
3. Check epic readiness: `$GP slice:list --json` — if all slices `completed` or `abandoned`, present: "All slices complete. Run `/gp:complete-epic` when ready."

## Step 8 — Done Summary

After successful completion, display using the **Completion Summary Template** from output-templates.md (auto-included above) with implement-specific fields:
- `{completion_heading}`: `Implementation Complete`
- `{skill_specific_header_fields}`: `**Plan**: {PLAN_SLUG}`, `**Phases completed**: {totalPhases}`, `**Total iterations**: {sum across all phases}`
- `### Phase Summary` table: `Phase | Name | Iterations | Final Score | Commit`
- `### Verification Evidence`: summary of RED/GREEN check results across phases
- `### Key Decisions`: decisions made during implementation (from Step 6.4 user choices)
- `### Follow-up Recommendations`: from the completion-slice agent's recommendations

Then show the next step: `{next unimplemented slice name}`, or "All slices complete — run `/gp:complete-epic`".

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included in Step 5.4 above):

| Parameter | Value |
|---|---|
| **max_iterations** | 12 (override via `$GP_IMPLEMENT_MAX_ITERATIONS` env var for test harness cost control) |
| **early_exit_threshold** | `{ min_iterations: 5, score: 8 }` — exit early if iteration >= 5 AND all scores >= 8 AND no CRITICAL/IMPORTANT |
| **run_dir_mode** | `persistent` — git-committed `<epic>/slices/<slice>/implementation/phase-{N}/` (per-phase subdirectories) |
| **submit_command** | `echo '' \| $GP submit-implementation --slice $SLICE_NAME --json` |
| **resume_detection** | Yes — check for incomplete run directories and offer resume (see Step 2b) |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **review_context** | `"code-implementation"` |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
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
