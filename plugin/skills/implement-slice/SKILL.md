---
name: implement-slice
description: >-
  Implements a slice plan using v2 chunk-based TDD. Orchestrates P10 (implementation with
  chunk lifecycle events) and P11 (code refinement). Common triggers: 'implement slice',
  'implement this slice', 'start implementation', 'build this slice'.
user-invocable: true
requires: gp >= 1.0.0
---

# Implement Slice Pipeline

**This is a fully autonomous pipeline. There are no interactive phases.** All phases run without user input unless an exceptional condition is surfaced (unexpected RED-check pass, agent failure, unverifiable chunk).

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

**Exception**: The orchestrator MAY read the plan overview to extract chunk IDs, descriptions, dependencies, and verification types (structural metadata only, not content reading).

## Phase Table

| Phase | Type | v2 Phase | What Happens |
|---|---|---|---|
| 1. Implementation | Autonomous | P10 | Per-chunk TDD: implement-phase agent -> chunk lifecycle events -> review loop |
| 2. Code refinement | Autonomous | P11 | Code review loop via `refine:*` -> `code-refine-commit` |

## Step 0 -- Setup

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

Temp directory path formula (evaluated after Step 1 resolves SLICE_NAME; created in Step 4e, referenced in Step 2 for cleanup):
```
TMPDIR="/tmp/gp-implement-slice-${SLICE_NAME}"
```

## Step 1 -- Scope Resolution

Accept a slice name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SLICE_NAME`.
2. **No argument**: query `$GP status --json`.
   - Check `.activeSlice` -- if present, use `.activeSlice.name`.
   - Otherwise, query `$GP slice:list --json` and find the first slice in `plan-committed` (P9), `implementing` (P10), or `code-refining` (P11) status.
   - If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable slice found, stop: "No slice in `plan-committed`, `implementing`, or `code-refining` status found. Create and refine a plan first."

Resolve the epic name: extract from `$GP status --json` -> `.activeEpic.name`. Store as `EPIC_NAME`. If no active epic, stop: "No active epic found."

## Step 2 -- State Transition and Re-Entry

Query current slice status:

```bash
$GP slice:show --epic $EPIC_NAME --slice $SLICE_NAME --json
```

Map the `status` field:

| Phase | Action |
|---|---|
| P9 (plan-committed) | Fresh start -- clean TMPDIR if it exists (`rm -rf $TMPDIR && mkdir -p $TMPDIR`), then transition to implementing (Step 2a) |
| P10 (implementing) | Resume -- check chunk states, find first non-terminal chunk, resume (Step 2b) |
| P11 (code-refining) | Resume code refinement loop -- skip to Step 6 |
| P12 (landed) | Already done. Inform user: "Slice is already landed." |
| Other | Stop: "Slice is in `{status}` status -- not ready for implementation." |

### 2a. Transition to Implementing

```bash
$GP slice:implement-start --epic $EPIC_NAME --slice $SLICE_NAME --json
```

Verify the JSON response indicates a successful transition (no error field). If the transition fails, stop with the error message.

### 2b. Resume from Current Chunk

Read the chunk states from the slice JSON returned by `slice:show`. Each chunk has a lifecycle state based on the last emitted event. Find the first chunk that is not in a terminal state (`chunk-verify`, `chunk-decide`).

Present re-entry summary:
```
Resuming implementation of **{SLICE_NAME}**.
Completed chunks: {completedCount} of {totalChunks}.
Resuming from chunk **{nextChunk.id}** at lifecycle step: {lastEvent}.
```

## Step 3 -- Plan Loading + Chunk Extraction

Load the plan to extract chunk definitions. This is a **structural parse only** -- extracting chunk IDs, descriptions, expected behavior, verification types, and dependencies. Not reading implementation details.

Extract plan path from `$GP slice:show --epic $EPIC_NAME --slice $SLICE_NAME --json`.

Parse chunk definitions from the plan:
- Extract chunks: `{ id, description, expectation, redTest, verificationType, dependencies }`
- Build `chunks` array from all chunk definitions in the plan
- Derive `PLAN_SLUG` from slice name (kebab-case)
- Store `totalChunks = chunks.length`

Resolve chunk execution order from dependency graph (topological sort). If cyclic dependencies detected, stop: "Cyclic dependency detected in chunk graph: {cycle description}. Fix the plan before implementing."

## Step 4 -- Pre-Implementation

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

Extract the active epic name, then construct the path: `.goodplan/epics/{EPIC_NAME}/architecture/_overview.md`. This path is passed to the implement-phase agent for maturity extraction -- the orchestrator does NOT read it.

If no active epic, fall back to `.goodplan/architecture/_overview.md`.

### 4c. Record Pre-Implementation Commit

```bash
PRE_IMPL_COMMIT=$(git rev-parse HEAD)
```

Store this for Step 7 -- used to compute the full set of changed files across all chunks.

### 4d. R1 Pre-Flight

Commit to pause triggers before entering autonomy. Log to stderr:

```
[implement-slice] Pre-flight: will pause on blocking-finding, assumption-invalidated, stuck (2+ rounds without progress), unverifiable-chunk, non-convergence
```

### 4e. Create Temp Directory

Ephemeral scratch space for agent working files (Q&A summaries, continuation files). Review artifacts live in `RUN_DIR` (persistent, git-committed) -- not here.

```bash
mkdir -p "$TMPDIR"
```

Log to stderr: `[implement-slice] Working directory: $TMPDIR`

## Step 5 -- Chunk Implementation Loop (P10)

Iterate over each chunk in dependency order, starting from the resume point determined in Step 2.

For each chunk `c` in `chunks` (starting from `resumeIndex`):

Set the run directory for review artifacts (persistent, per iteration-loop.md), scoped per chunk to avoid round collisions:
```
RUN_DIR=<slice-path>/implementation/chunk-${c.id}/
```

Where `<slice-path>` is the CLI-managed slice directory (from `slice:show --json`). This directory is git-committed with the implementation.

Initialize per-chunk tracking state:
- `iteration = 0`
- `reviewerScores = {}` -- map of reviewer name -> score history array
- `stagnationCount = 0`
- `reductionCount = 0`

### 5.1. Start Chunk

```bash
echo '{"description":"<chunk description>"}' | $GP slice:chunk-start --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

### 5.2. Spawn Implement-Phase Agent

Spawn `implement-phase` (model: opus) with: chunk ID, chunk description, expected behavior (before/after checks), plan path, architecture overview path, temp directory, merged feedback path (if iteration > 0). Tools: Read, Grep, Glob, Write, Edit, Bash, WebSearch. No Agent tool. The agent runs RED checks (should fail before implementation), implements, then runs GREEN checks (should pass after).

Expected return JSON:
```json
{
  "status": "SUCCESS | PARTIAL | FAILED",
  "summary": "...",
  "filesWritten": [...],
  "lifecycle": {
    "redWritten": true,
    "redFailed": true,
    "redFailureEvidence": "...",
    "greenPassed": true,
    "greenEvidence": "...",
    "hasUnexpectedPass": false,
    "details": "..."
  }
}
```

### 5.3. Record RED Test

If `lifecycle.redWritten` is true:

```bash
$GP slice:chunk-red-written --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

### 5.4. Verify RED Fails

If `lifecycle.redFailed` is true:

```bash
echo '{"evidence":"<redFailureEvidence>"}' | $GP slice:chunk-red-failed --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

If RED check unexpectedly passed (`lifecycle.hasUnexpectedPass` is true), surface to user via AskUserQuestion:

"RED check passed unexpectedly for chunk {CHUNK_ID}: {lifecycle.details}. This suggests the test doesn't test what you expect. Continue / Stop to investigate?"

If the user chooses to stop, preserve temp directory and halt. Otherwise proceed.

### 5.5. Record GREEN

If `lifecycle.greenPassed` is true:

```bash
echo '{"evidence":"<greenEvidence>"}' | $GP slice:chunk-green --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

### 5.6. Verify Chunk

Spawn `verifier` agent (model: opus, tools: Read, Grep, Glob, Bash) with: chunk ID, expected behavior (after-checks), slice path, implementation files from `filesWritten`.

Expected return:
```json
{
  "status": "SUCCESS | PARTIAL | FAILED",
  "summary": "...",
  "filesWritten": [],
  "verificationEvidence": {
    "chunkId": "<chunk-id>",
    "checksRun": [{ "check": "...", "passed": true, "output": "..." }],
    "overallPassed": true
  }
}
```

**If verification passes** (`verificationEvidence.overallPassed` is true):

```bash
echo '{"evidence":"<verification evidence summary>"}' | $GP slice:chunk-verify --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

**If verification fails or is impossible** (agent returns PARTIAL/FAILED or `overallPassed` is false):

```bash
$GP slice:chunk-unverifiable --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

Then surface to user via AskUserQuestion: "Chunk {CHUNK_ID} verification failed: {verifier summary}. Accept (proceed with unverified chunk) / Revert (undo chunk changes) / Defer (mark as tech debt)?"

Record the user's decision:

```bash
echo '{"decision":"accept|revert|defer","reason":"<user reason>"}' | $GP slice:chunk-decide --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

If the user chose "revert", undo the chunk's changes (`git checkout -- <filesWritten>`) and skip to the next chunk.

### 5.7. Partial Completion Handling

If the implement-phase agent returns `PARTIAL` or `FAILED`, emit only the lifecycle events the agent completed. For example, if `redWritten: true` but `redFailed: false` (RED unexpectedly passed), emit `chunk-red-written` but not `chunk-red-failed`.

- **PARTIAL**: Log the `summary` and surface to user via AskUserQuestion: "Chunk {CHUNK_ID} partially completed: {summary}. Continue with partial work / Retry / Stop?"
  - Continue: proceed to whatever lifecycle events are available.
  - Retry: re-spawn the agent (loop back to 5.2).
  - Stop: preserve temp directory, stop pipeline.
- **FAILED**: Stop with error message. Preserve temp directory.

### 5.8. Review Loop (Per-Chunk)

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). The orchestrator-specific parameters are listed in the **Loop Parameters** section at the end of this file.

Each round: write changed files to `${RUN_DIR}/round-{N}/changed-files.txt` via `git diff --name-only`, then follow iteration-loop.md's Reviewer Spawn Pattern -> Synthesis -> Exit Criteria Evaluation. Pass the changed-files path as the artifact with review context `code-implementation`. Write reviewer output to `${RUN_DIR}/round-{N}/reviews/{reviewer-name}.md`, synthesis to `${RUN_DIR}/round-{N}/merged.md`.

If exit conditions not triggered -> spawn `implement-phase` again with merged feedback path, increment iteration, loop back to 5.2.

**Note on event logging:** Per-chunk review rounds are ephemeral -- they do NOT use `refine:*` commands and are not recorded in the event log. This is intentional: chunk-level review is local quality assurance, not trust-layer auditable refinement. The trust boundary for implementation is the `chunk-verify` event (Step 5.6), which carries concrete verification evidence. The P11 code refinement phase (Step 6) uses `refine:*` commands for trust-auditable whole-slice review.

**Debugging artifacts:** Although not event-logged, chunk review artifacts ARE persisted in the run directory (`<slice-path>/implementation/chunk-${CHUNK_ID}/round-{N}/reviews/`, `round-{N}/merged.md`) per `run_dir_mode: persistent`. These files serve as debugging artifacts for investigating chunk-level review failures and are git-committed with the implementation. They are not cleaned up until the slice lands.

### 5.9. Orchestrator Commits

The orchestrator -- not the agent -- commits the chunk work:

```bash
git add <each file from filesWritten>
git commit -m "[${PLAN_SLUG}] Chunk ${CHUNK_ID}: ${chunk.description}"
```

If `filesWritten` is empty but agent reported SUCCESS, run `git diff --name-only` to detect changes the agent didn't report, and add those instead.

### 5.10. Verify Commit

```bash
git log --oneline -1
```

Confirm the commit message matches the expected format. If the commit failed (e.g., nothing to commit), log a warning but continue -- the chunk may have been a documentation-only or verification-only chunk.

### 5.11. Advance

Log to stderr:
```
[implement-slice] Chunk {c.id}/{totalChunks} complete: {c.description} (rounds: {iteration+1})
```

Continue to the next chunk.

## Step 5b -- Exit Criteria

All exit criteria evaluation is defined in iteration-loop.md (auto-included in Step 5.8). The Loop Parameters section at the end of this file provides the skill-specific thresholds. On stagnation, score reduction, or hard cap: warn the user which reviewers scored below 9, their reasons, and whether restructuring may help.

## Step 6 -- Code Refinement (P11)

After all chunks complete (Step 5 loop exits), run code refinement.

### 6.1. Start Code Refinement

```bash
$GP slice:code-refine-start --epic $EPIC_NAME --slice $SLICE_NAME --json
```

This emits `slice-code-refinement-started` and returns a context bundle for P11.

### 6.2. Refinement Loop

Run the refinement loop using `refine:*` commands with `--artifact-type code-implementation`:

1. `$GP refine:start --epic $EPIC_NAME --artifact-type code-implementation --json` -- once at loop entry
2. Per round:
   - Spawn reviewers (per iteration-loop.md Reviewer Spawn Pattern)
   - `refine:score` per reviewer
   - Synthesis -> `refine:synthesize`
   - Display Iteration Summary
   - Editor -> `refine:revise`
   - Exit evaluation -> `refine:evaluate`
3. On pass: `$GP refine:converge --epic $EPIC_NAME --artifact-type code-implementation --json`
4. On stagnation/reduction/cap: `$GP refine:stuck --epic $EPIC_NAME --artifact-type code-implementation --json`
5. On user override: `$GP refine:override --epic $EPIC_NAME --artifact-type code-implementation --reason="<reason>" --json`

The review artifact path for the refinement loop:
```
RUN_DIR=<slice-path>/code-refinement/
```

### 6.3. Commit Code Refinement

After the refinement loop exits:

```bash
$GP slice:code-refine-commit --epic $EPIC_NAME --slice $SLICE_NAME --json
```

This emits code refinement converged.

## Step 7 -- Post-Implementation Checks

After code refinement converges, run final checks. The orchestrator runs these directly -- do not rely on agents.

```bash
# 1. Compute changed files across all chunks
CHANGED_FILES=$(git diff --name-only $PRE_IMPL_COMMIT..HEAD)

# 2. Auto-format changed files (detect formatter from project config)
# Check for biome.json -> npx biome check --write <changed-files>
# Or check package.json for "format" script -> bun run format
# Or check for .prettierrc -> npx prettier --write <changed-files>

# 3. Run project-specific checks
bun run lint 2>&1 | tail -20
bun run build 2>&1 | tail -20
bun test 2>&1 | tail -40
```

If lint fails after auto-format, re-run the formatter with broader scope (`.` instead of individual files). If it still fails, the remaining issues are code-level (not formatting) -- feed them back into the code refinement loop (re-enter Step 6).

If build or test fails, log the failure and surface to user via AskUserQuestion: "Post-implementation checks failed: {summary}. Re-enter code refinement (Step 6) with failures as feedback / Continue anyway / Stop?"

## Step 8 -- Done Summary

After successful completion, display using the **Completion Summary Template** from output-templates.md (auto-included above) with implement-slice-specific fields:
- `{completion_heading}`: `Implementation Complete`
- `{skill_specific_header_fields}`: `**Plan**: {PLAN_SLUG}`, `**Chunks completed**: {totalChunks}`, `**Total iterations**: {sum across all chunks}`
- `### Chunk Summary` table: `Chunk | Description | Iterations | Final Score | Commit`
- `### Verification Evidence`: summary of RED/GREEN check results and verifier outcomes across chunks
- `### Key Decisions`: decisions made during implementation (chunk-decide outcomes, user choices)
- `### Follow-up Recommendations`: any unresolved issues or improvement suggestions

Then show the next step: `/gp:land-slice {SLICE_NAME}`

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included in Step 5.8 above):

| Parameter | Value |
|---|---|
| **max_iterations** | 12 (override via `$GP_IMPLEMENT_SLICE_MAX_ITERATIONS` env var for test harness cost control) |
| **early_exit_threshold** | `{ min_iterations: 3, score: 8 }` -- exit early if iteration >= 3 AND all scores >= 8 AND no CRITICAL/IMPORTANT |
| **run_dir_mode** | `persistent` -- git-committed `<slice-path>/implementation/chunk-{ID}/` (per-chunk subdirectories) |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **scope_flag** | `--epic $EPIC_NAME` |
| **review_context** | `"code-implementation"` |
| **rubric** | `code-quality` |
| **resume_detection** | Yes -- check for incomplete run directories and offer resume (see Step 2b) |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **Git commit failure**: Log warning, continue to next chunk (chunk may have been verification-only).
- **Chunk verification failure**: Always surface to user via AskUserQuestion (Step 5.6). Never silently skip.
- **R1 pause triggers**: On `blocking-finding`, `assumption-invalidated`, `stuck` (2+ rounds without progress), `unverifiable-chunk`, or `non-convergence` -- pause and surface to user before continuing.

## Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[implement-slice] Artifacts preserved at: $TMPDIR
```
