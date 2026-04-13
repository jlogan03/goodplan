---
name: implement-side-quest
description: >-
  Implements a side-quest plan using simplified chunk verification. No TDD red/green
  cycle — chunks go directly from start to verify. Common triggers: 'implement side quest',
  'implement this quest', 'build side quest'.
user-invocable: true
requires: gp >= 1.0.0
---

# Implement Side Quest Pipeline

**This is a fully autonomous pipeline. There are no interactive phases.** All phases run without user input unless an exceptional condition is surfaced (agent failure, unverifiable chunk).

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

**Exception**: The orchestrator MAY read the plan overview to extract chunk IDs, descriptions, and verification types (structural metadata only, not content reading).

## Phase Table

| Phase | Type | What Happens |
|---|---|---|
| 1. Implementation | Autonomous | Per-chunk: implement-phase agent -> simplified verify -> review loop |

## Step 0 -- Setup

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

Temp directory path formula (evaluated after Step 1 resolves SQ_NAME; created in Step 4d, referenced in Step 2 for cleanup):
```
TMPDIR="/tmp/gp-implement-side-quest-${SQ_NAME}"
```

## Step 1 -- Scope Resolution

Accept a side-quest name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SQ_NAME`.
2. **No argument**: query `$GP status --json`.
   - Check `.activeQuest` -- if present, use `.activeQuest.name`.
   - Otherwise, query `$GP side-quest:list --json` and find the first side-quest in S1 (with plan) or S2 (implementing) phase.
   - If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable side-quest found, stop: "No side quest in S1 (with plan) or S2 (implementing) phase found. Create a plan first with `/gp:create-side-quest`."

## Step 2 -- State Transition and Re-Entry

Query current side-quest status:

```bash
$GP side-quest:show --side-quest $SQ_NAME --json
```

Map the phase:

| Phase | Action |
|---|---|
| S1 (goal or plan committed) | **Check plan exists** via `side-quest:show --json` -- look for `plan` field or plan artifact path. If plan exists: fresh start -- clean TMPDIR if it exists (`rm -rf $TMPDIR && mkdir -p $TMPDIR`), then transition to implementing (Step 2a). If no plan: not ready -- "Side quest has a goal but no plan. Run `/gp:create-side-quest` to create a plan first." |
| S2 (implementing) | Resume -- check chunk states, find first non-terminal chunk (Step 2b) |
| S3 (landed) | Already done. Inform user: "Side quest is already landed." |
| S0 | Not ready -- "Side quest has no goal or plan yet. Run `/gp:create-side-quest` first." |

**Important:** S1 is set by BOTH `side-quest-goal-committed` and `side-quest-plan-committed`. Phase alone does not guarantee a plan exists. Always verify plan artifact presence before calling `implement-start`.

### 2a. Transition to Implementing

```bash
$GP side-quest:implement-start --side-quest $SQ_NAME --json
```

Verify the JSON response indicates a successful transition (no error field). If the transition fails, stop with the error message.

### 2b. Resume from Current Chunk

Read the chunk states from the side-quest JSON returned by `side-quest:show`. Each chunk has a lifecycle state based on the last emitted event. Find the first chunk that is not in a terminal state (`chunk-verify`).

Present re-entry summary:
```
Resuming implementation of **{SQ_NAME}**.
Completed chunks: {completedCount} of {totalChunks}.
Resuming from chunk **{nextChunk.id}** at lifecycle step: {lastEvent}.
```

## Step 3 -- Plan Loading + Chunk Extraction

Load the plan to extract chunk definitions. This is a **structural parse only** -- extracting chunk IDs, descriptions, expected behavior, and verification types. Not reading implementation details.

Extract plan path from `$GP side-quest:show --side-quest $SQ_NAME --json`.

Parse chunk definitions from the plan:
- Extract chunks: `{ id, description, expectation, verificationType }`
- Build `chunks` array from all chunk definitions in the plan
- No chunk dependencies for side-quests (execute sequentially)
- Derive `PLAN_SLUG` from side-quest name (kebab-case)
- Store `totalChunks = chunks.length`

## Step 4 -- Pre-Implementation

### 4a. Clean Git State

```bash
git status --porcelain
```

If there are uncommitted changes, stop: "Working directory has uncommitted changes. Please commit or stash them before running implementation."

### 4b. Resolve Architecture Path

Determine the architecture `_overview.md` path:

```bash
$GP status --json
```

Extract the active epic name if present, then construct the path: `.goodplan/epics/{EPIC_NAME}/architecture/_overview.md`. If no active epic, fall back to `.goodplan/architecture/_overview.md`. This path is passed to the implement-phase agent -- the orchestrator does NOT read it.

### 4c. Record Pre-Implementation Commit

```bash
PRE_IMPL_COMMIT=$(git rev-parse HEAD)
```

Store this for Step 7 -- used to compute the full set of changed files across all chunks.

### 4d. Create Temp Directory

Ephemeral scratch space for agent working files.

```bash
mkdir -p "$TMPDIR"
```

Log to stderr: `[implement-side-quest] Working directory: $TMPDIR`

## Step 5 -- Chunk Implementation Loop

Iterate over each chunk sequentially (no dependency graph -- side-quest chunks are sequential), starting from the resume point determined in Step 2.

For each chunk `c` in `chunks` (starting from `resumeIndex`):

Set the run directory for review artifacts (persistent, per-chunk):
```
RUN_DIR=<side-quest-path>/implementation/chunk-${c.id}/
```

Where `<side-quest-path>` is the CLI-managed side-quest directory (from `side-quest:show --json`).

Initialize per-chunk tracking state:
- `iteration = 0`
- `reviewerScores = {}` -- map of reviewer name -> score history array
- `stagnationCount = 0`
- `reductionCount = 0`

### 5.1. Start Chunk

```bash
echo '{"description":"<chunk description>"}' | $GP side-quest:chunk-start --side-quest $SQ_NAME --chunk $CHUNK_ID --json
```

### 5.2. Spawn Implement-Phase Agent

Spawn `implement-phase` (model: opus) with: chunk ID, chunk description, expected behavior (before/after checks), plan path, architecture overview path, temp directory, merged feedback path (if iteration > 0). Tools: Read, Grep, Glob, Write, Edit, Bash, WebSearch. No Agent tool.

The agent implements the chunk directly (no RED test phase -- side-quest chunks use simplified lifecycle).

Expected return JSON:
```json
{
  "status": "SUCCESS | PARTIAL | FAILED",
  "summary": "...",
  "filesWritten": [...],
  "lifecycle": {
    "redWritten": false,
    "redFailed": false,
    "redFailureEvidence": "",
    "greenPassed": true,
    "greenEvidence": "...",
    "hasUnexpectedPass": false,
    "details": "..."
  }
}
```

Note: `redWritten` and `redFailed` will always be `false` for side-quest chunks (no TDD). The orchestrator only checks `greenPassed` for the verify step.

### 5.3. Verify Chunk

Spawn `verifier-phase` agent (model: opus, tools: Read, Grep, Glob, Bash) with: chunk ID, expected behavior (after-checks), side-quest path, implementation files from `filesWritten`.

@${CLAUDE_PLUGIN_ROOT}/agents/verifier-phase.md

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
echo '{"evidence":"<verification evidence summary>"}' | $GP side-quest:chunk-verify --side-quest $SQ_NAME --chunk $CHUNK_ID --json
```

**If verification fails** (agent returns PARTIAL/FAILED or `overallPassed` is false):

Surface to user via AskUserQuestion: "Chunk {CHUNK_ID} verification failed: {verifier summary}. Accept (proceed to next chunk) / Retry (re-spawn verifier) / Stop (halt implementation)?"

- **Accept**: Note the unverified chunk for learnings during landing. Proceed to next chunk.
- **Retry**: Re-spawn the verifier agent (loop back to 5.3).
- **Stop**: Preserve temp directory, stop pipeline.

No CLI event is recorded for unverifiable side-quest chunks -- side-quests don't have the full `chunk-unverifiable` -> `chunk-decide` flow.

### 5.4. Per-Chunk Review Loop

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). The orchestrator-specific parameters are listed in the **Loop Parameters** section at the end of this file.

Each round: write changed files to `${RUN_DIR}/round-{N}/changed-files.txt` via `git diff --name-only`, then follow iteration-loop.md's Reviewer Spawn Pattern -> Synthesis -> Exit Criteria Evaluation. Pass the changed-files path as the artifact with review context `code-implementation`. Write reviewer output to `${RUN_DIR}/round-{N}/reviews/{reviewer-name}.md`, synthesis to `${RUN_DIR}/round-{N}/merged.md`.

If exit conditions not triggered -> spawn `implement-phase` again with merged feedback path, increment iteration, loop back to 5.2.

**Note on event logging:** Per-chunk review rounds are ephemeral -- they do NOT use `refine:*` commands and are not recorded in the event log. This is intentional: chunk-level review is local quality assurance, not trust-layer auditable refinement. The trust boundary for implementation is the `chunk-verify` event (Step 5.3), which carries concrete verification evidence.

**Debugging artifacts:** Although not event-logged, chunk review artifacts ARE persisted in the run directory (`<side-quest-path>/implementation/chunk-${CHUNK_ID}/round-{N}/reviews/`, `round-{N}/merged.md`) per `run_dir_mode: persistent`. These files serve as debugging artifacts for investigating chunk-level review failures.

### 5.5. Partial Completion Handling

If the implement-phase agent returns `PARTIAL` or `FAILED`:

- **PARTIAL**: Log the `summary` and surface to user via AskUserQuestion: "Chunk {CHUNK_ID} partially completed: {summary}. Continue with partial work / Retry / Stop?"
  - Continue: proceed to verification (Step 5.3).
  - Retry: re-spawn the agent (loop back to 5.2).
  - Stop: preserve temp directory, stop pipeline.
- **FAILED**: Stop with error message. Preserve temp directory.

### 5.6. Orchestrator Commits

The orchestrator -- not the agent -- commits the chunk work:

```bash
git add <each file from filesWritten>
git commit -m "[${PLAN_SLUG}] Chunk ${CHUNK_ID}: ${chunk.description}"
```

If `filesWritten` is empty but agent reported SUCCESS, run `git diff --name-only` to detect changes the agent didn't report, and add those instead.

### 5.7. Verify Commit

```bash
git log --oneline -1
```

Confirm the commit message matches the expected format. If the commit failed (e.g., nothing to commit), log a warning but continue -- the chunk may have been a documentation-only or verification-only chunk.

### 5.8. Advance

Log to stderr:
```
[implement-side-quest] Chunk {c.id}/{totalChunks} complete: {c.description} (rounds: {iteration+1})
```

Continue to the next chunk.

## Step 5b -- Exit Criteria

All exit criteria evaluation is defined in iteration-loop.md (auto-included in Step 5.4). The Loop Parameters section at the end of this file provides the skill-specific thresholds. On stagnation, score reduction, or hard cap: warn the user which reviewers scored below 9, their reasons, and whether restructuring may help.

## Step 6 -- Post-Implementation Checks

After all chunks complete (Step 5 loop exits), run final checks. The orchestrator runs these directly -- do not rely on agents.

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

If lint fails after auto-format, re-run the formatter with broader scope (`.` instead of individual files). If it still fails, the remaining issues are code-level -- feed them back via AskUserQuestion: "Post-implementation checks failed: {summary}. Retry last chunk with failures as feedback / Continue anyway / Stop?"

If build or test fails, surface to user via AskUserQuestion: "Post-implementation checks failed: {summary}. Retry last chunk with failures as feedback / Continue anyway / Stop?"

## Step 7 -- Done Summary

After successful completion, display:

```
**Implementation Complete**
- **Side Quest**: {SQ_NAME}
- **Plan**: {PLAN_SLUG}
- **Chunks completed**: {totalChunks}
- **Total iterations**: {sum across all chunks}
```

### Chunk Summary

| Chunk | Description | Iterations | Verified | Commit |
|---|---|---|---|---|
| {id} | {description} | {rounds} | {yes/no} | {short SHA} |

### Verification Evidence

Summary of verifier outcomes across chunks.

### Follow-up Recommendations

Any unresolved issues or improvement suggestions.

Then show the next step: `/gp:land-side-quest ${SQ_NAME}`

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included in Step 5.4 above). These are for the per-chunk review loop only -- implement-side-quest has NO formal `refine:*` refinement loop (no `artifact_type` or `scope_flag`).

| Parameter | Value | Notes |
|---|---|---|
| **max_iterations** | 8 (override via `$GP_IMPLEMENT_SIDE_QUEST_MAX_ITERATIONS` env var for test harness cost control) | Per-chunk review rounds cap |
| **early_exit_threshold** | `{ min_iterations: 2, score: 8 }` | Exit per-chunk review early if quality sufficient |
| **run_dir_mode** | `persistent` -- `<side-quest-path>/implementation/chunk-{ID}/` | Debugging artifacts, not trust-auditable |
| **stagnation_window** | 2 |  |
| **reduction_exit_threshold** | 2 |  |
| **review_context** | `"code-implementation"` | Reviewer focus |
| **rubric** | `code-quality` |  |
| **resume_detection** | Yes -- check for incomplete run directories and offer resume (see Step 2b) |  |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **Git commit failure**: Log warning, continue to next chunk (chunk may have been verification-only).
- **Chunk verification failure**: Always surface to user via AskUserQuestion (Step 5.3). Never silently skip.

## Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[implement-side-quest] Artifacts preserved at: $TMPDIR
```
