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
| 1. Implementation | Autonomous | `implementing` | Per-phase: spawn implement-phase → review loop → commit |
| 2. Slice completion | Autonomous | `implementing` → `implementation-complete` → `completed` | Spawn completion-slice → surface recommendations → CLI submit |

## Step 0 — Setup

```bash
GP="gp"
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
| `implementation-complete` | Skip to Step 6 (slice completion) |
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

```bash
TMPDIR="/tmp/gp-implement-${SLICE_NAME}-$(date +%s)"
mkdir -p "$TMPDIR"
```

Log to stderr: `[implement] Working directory: $TMPDIR`

## Step 5 — Implementation Loop

Iterate over each plan phase, starting from the resume index determined in Step 2.

For each phase `i` in `phases` (starting from `resumeIndex`):

Initialize per-phase tracking state:
- `iteration = 0`
- `reviewerScores = {}` — map of reviewer name → score history array
- `stagnationCount = 0`
- `reductionCount = 0`

### 5.1. Spawn Implement-Phase Agent

```
Agent: implement-phase
Task prompt: |
  Slice: {SLICE_NAME}
  Phase: {phases[i].index} of {totalPhases} — "{phases[i].name}"
  Phase content path: {phases[i].path}
  Iteration: {iteration + 1}
  Plan slug: {PLAN_SLUG}
  Scope directory: {slice scope directory from slice:show}
  Architecture overview path: {architecture _overview.md path}
  Temp directory: {TMPDIR}
  {if iteration > 0: "Merged feedback path: {RUN_DIR}/round-{iteration}/merged.md"}

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

- **SUCCESS**: Proceed to review (5.3).
- **PARTIAL**: Log the `summary` and surface to user via AskUserQuestion: "Phase {i} partially completed: {summary}. Continue / Retry / Stop?"
  - Continue: proceed to review with partial work.
  - Retry: re-spawn the agent (loop back to 5.1).
  - Stop: preserve temp directory, stop pipeline.
- **FAILED**: Stop with error message. Preserve temp directory.

### 5.3. Review Loop

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). The orchestrator-specific parameters are listed in the **Loop Parameters** section below.

#### 5.3a. Write Changed Files Summary

```bash
git diff --name-only > "${RUN_DIR}/round-${iteration+1}/changed-files.txt"
```

This file is the "artifact" passed to the refinement-coordinator.

#### 5.3b. Spawn Refinement Coordinator

```
Agent: refinement-coordinator
Task prompt: |
  Artifact path: {RUN_DIR}/round-{iteration+1}/changed-files.txt
  Review context: code-implementation
  Available reviewers: see @${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md
  {if iteration > 0: "Previous round synthesis: {RUN_DIR}/round-{iteration}/merged.md"}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Parse return JSON. Extract `reviewers` array. If `status` is `FAILED`, stop with error.

#### 5.3c. Spawn Reviewer Agents (Parallel)

For each reviewer name from the coordinator's return, spawn in parallel:

```
Agent: {reviewer-name}
Task prompt: |
  Artifact path: {RUN_DIR}/round-{iteration+1}/changed-files.txt
  Review context: code-implementation
  Domain: {domain from reviewer name}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Each reviewer returns JSON with `score`, issues, and review text inline.

#### 5.3d. Write Reviewer Output

Write each reviewer's full return text to `${RUN_DIR}/round-{iteration+1}/reviews/{reviewer-name}.md`.

#### 5.3e. Spawn Synthesis Agent

```
Agent: synthesis
Task prompt: |
  Reviewer output paths: {list of review file paths from 5.3d}
  Synthesis output path: {RUN_DIR}/round-{iteration+1}/merged.md

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

Parse return JSON. Extract `score` (integer).

#### 5.3f. Evaluate Exit Conditions

Extract per-reviewer scores from each reviewer's return JSON. Update `reviewerScores`. Compute `netScore` as the minimum of all reviewer scores for this round.

Log to stderr:
```
[implement] Phase {phases[i].index} round {iteration+1}: netScore={netScore}, reviewerScores={reviewerScores}
```

Check exit conditions (see **Step 5b — Iteration Safeguards** below for full rules):

1. **Pass**: `netScore >= 9` AND no CRITICAL/IMPORTANT issues → exit review loop.
2. **Early exit**: `iteration >= 4` AND `netScore >= 8` AND no CRITICAL/IMPORTANT → exit with warning.
3. **Stagnation**: `iteration >= 2` AND no score improvement for 2 consecutive rounds → exit.
4. **Hard cap**: `iteration >= 11` → exit, submit best version.

If none triggered → spawn `implement-phase` again with merged feedback path, increment `iteration`, loop back to 5.1.

### 5.4. Check for Unexpected RED Passes

If `redGreenResults.redUnexpectedPasses` is non-empty (from any iteration's implement-phase return), surface to user via AskUserQuestion:

"The following Expected Behavior checks passed when they should have FAILED (before implementation). This may indicate the checks are not testing what you expect:
- {list each unexpected pass}

Continue anyway / Stop to investigate?"

If the user chooses to stop, preserve temp directory and halt.

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

If build or test fails, log the failure and surface to user via AskUserQuestion: "Post-phase checks failed: {summary}. Re-enter review loop / Continue anyway / Stop?"

### 5.6. Orchestrator Commits

The orchestrator — not the agent — commits the phase work:

```bash
git add <each file from filesChanged>
git commit -m "[${PLAN_SLUG}] Phase ${phases[i].index}: ${phases[i].name}"
```

If `filesChanged` is empty but agent reported SUCCESS, run `git diff --name-only` to detect changes the agent didn't report, and add those instead.

### 5.7. Verify Commit

```bash
git log --oneline -1
```

Confirm the commit message matches the expected format. If the commit failed (e.g., nothing to commit), log a warning but continue — the phase may have been a documentation-only or verification-only phase.

### 5.8. Update Phase Tracking

```bash
$GP submit-implementation --slice $SLICE_NAME --phase ${phases[i].index}
```

This records the completed phase index in the slice state, enabling re-entry.

### 5.9. Advance

Log to stderr:
```
[implement] Phase {phases[i].index}/{totalPhases} complete: {phases[i].name} (rounds: {iteration+1})
```

Continue to the next phase.

## Step 5b — Iteration Safeguards

These safeguards apply per-phase within the review loop (Step 5.3f).

| Condition | Threshold | Action |
|---|---|---|
| **Full pass** | All scores >= 9, no CRITICAL/IMPORTANT | Exit review loop |
| **Early exit** | iteration >= 5 AND all scores >= 8 AND no CRITICAL/IMPORTANT | Exit with warning — log which reviewers scored below 9 |
| **Stagnation** | iteration >= 3 AND no score improvement for 2 consecutive rounds | Exit — further iterations unlikely to help |
| **Score reduction** | 2 total rounds with net score decrease | Exit — edits may be introducing issues |
| **Hard cap** | 12 iterations | Exit — submit best version, present remaining issues |
| **RESEARCH_NEEDED** | synthesis flags research topics | Spawn research sub-agents per `iteration-loop.md` pattern, append results to merged.md, continue loop |

On early exit or hard cap: warn the user which reviewers scored below 9, their reasons, and whether restructuring may help.

## Step 6 — Slice Completion

After all plan phases complete (Step 5 loop exits), run slice completion.

### 6.1. Setup

```bash
mkdir -p <slice-path>/completion/
CHANGED_FILES=$(git diff --name-only $PRE_IMPL_COMMIT..HEAD)
```

### 6.2. Gather Forward-Compat Conditions

Run `$GP decision:list --json` and `$GP learning:list --json`. If entries have `reconsiderWhen` or `validUntil` fields, collect them. If entries lack these fields, skip condition passing entirely — do not error.

### 6.3. Spawn Completion-Slice Agent

```
Agent: completion-slice
Task prompt: |
  Slice path: {slice-path}
  Plan path: {plan-path from Step 3}
  Changed files: {CHANGED_FILES}
  Architecture overview path: {architecture _overview.md path from Step 4b}
  {if epic: "Epic architecture path: {EPIC_DIR}/architecture/"}
  {if conditions found: "Decisions with conditions: {JSON}", "Learnings with conditions: {JSON}"}
  Synthesize learnings, review architecture delta, propose side quests.
  Write completion/learnings.md and completion/architecture-updates.md.
  Return JSON: { status, summary, filesWritten, recommendations: [{ type: "architecture-update"|"debt"|"side-quest", description, ... }], triggeredConditions: [{ type, id, condition, reason }], verificationPassed }

allowedTools: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"]
disallowedTools: ["Agent"]
```

### 6.4. Surface Recommendations and Conditions

Parse `recommendations` array. Use AskUserQuestion for each:
- `architecture-update`: "Update top-level architecture? / Flag as tech debt / Skip"
- `debt`: "Fix now / Propose side quest / Acknowledge and defer / Skip"
- `side-quest`: "Create side quest? / Defer / Skip"

Track choices — approved updates go to `architectureDelta`, deferred items to `deferred` (both used in Step 7).

If `triggeredConditions` is non-empty, present each: "Condition triggered on {type} `{id}`: {condition} — {reason}. Review now / Defer / Skip"

## Step 7 — CLI Submit

1. Transition: `$GP submit-implementation --slice $SLICE_NAME` (`implementing` → `implementation-complete`)
2. Complete: pipe `{ verificationPassed, learnings, architectureDelta, deferred }` to `$GP slice:complete --slice $SLICE_NAME --json`
   - `verificationPassed`: from agent return
   - `learnings`: constructed from `completion/learnings.md`
   - `architectureDelta`: approved updates from Step 6.4
   - `deferred`: deferred items from Step 6.4
3. Check epic readiness: `$GP slice:list --json` — if all slices `completed` or `abandoned`, present: "All slices complete. Run `/gp:complete-epic` when ready."

## Step 8 — Done Summary

After successful completion, present:

```
**Implementation Complete**
- **Slice**: {SLICE_NAME}
- **Phases completed**: {totalPhases}
- **Commits**: {totalPhases} (one per phase)
- **Review rounds**: {total rounds across all phases}
- **Learnings**: {count from completion-slice agent}
- **Architecture updates**: {count approved} proposed, {count deferred} deferred
- **Status**: completed
- **Next step**: {next unimplemented slice name, or "All slices complete — run /gp:complete-epic"}
```

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included in Step 5.3 above):

| Parameter | Value |
|---|---|
| **Reviewer list** | Determined dynamically by `refinement-coordinator` per phase — reads `@${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md` and selects based on changed file types/paths |
| **Exit criteria** | All scores >= 9, no CRITICAL/IMPORTANT issues |
| **Early exit** | iteration >= 5 AND all scores >= 8 AND no CRITICAL/IMPORTANT |
| **Max iterations** | 12 (override via `$GP_IMPLEMENT_MAX_ITERATIONS` env var for test harness cost control) |
| **Editor prompt path** | `agents/implement-phase.md` — re-spawned directly with merged feedback, no separate editor agent |
| **Score thresholds** | `{ pass: 9, early_exit: 8 }` |
| **Scope constraints** | Slice scope directory (from `slice:show --json`) |
| **Working directory** | Repo root |
| **Run directory** | `<epic>/slices/<slice>/implementation/` |
| **Backup directory** | Not applicable — git provides history |
| **review_context** | `"code-implementation"` |

**Coordinator note:** The `refinement-coordinator` agent already handles `review_context: "code-implementation"` as a defined input value. The orchestrator writes changed file paths (from `git diff --name-only`) to a summary file and passes it as the artifact. The coordinator reads the file and selects reviewers by file extensions/paths. No structural coordinator changes are needed.

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| implement-phase | Read, Grep, Glob, Write, Edit, Bash | Full implementation: reads plan + code, writes code, runs checks |
| refinement-coordinator | Read, Grep, Glob | Read-only analysis, returns spawn plan |
| reviewer-* | Read, Grep, Glob | Read-only, returns JSON inline |
| synthesis | Read, Grep, Glob, Write | Reads reviews, writes merged output |
| completion-slice | Read, Grep, Glob, Write, Edit, Bash | Reads artifacts, writes completion files, runs analysis |

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
