---
name: land-side-quest
description: >-
  Lands a completed side quest: captures learnings and finalizes.
  Common triggers: 'land side quest', 'land this quest', 'finish side quest',
  'complete side quest'.
user-invocable: true
requires: gp >= 1.0.0
---

# Land Side Quest

Standalone side-quest landing skill. Spawns the `completion-slice` agent (with adapted task prompt) for learnings capture, then surfaces recommendations for user decisions before calling `side-quest:land`.

**Key differences from land-slice:**
- **No spine promotion** -- side-quests don't update `architecture-current.md`
- **No findings triage** -- `finding:list` only supports `--epic` scope, not `--side-quest`. This is a known limitation deferred to a future slice or side-quest.
- **Learnings via `learning:capture`** -- `side-quest:land` does not accept stdin, so learnings are captured individually before landing

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

## Phase Table

| Phase | Type | What Happens |
|---|---|---|
| 1. Learnings capture | Autonomous | Spawn completion-slice agent (adapted prompt) for learnings |
| 2. Land | Autonomous + Collaborative | Surface recommendations, call `side-quest:land`, suggest next steps |

## Step 0 -- Setup

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

Temp directory path formula (evaluated after Step 1 resolves SQ_NAME):
```
TMPDIR="/tmp/gp-land-side-quest-${SQ_NAME}"
```

## Step 1 -- Scope Resolution

Accept a side-quest name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SQ_NAME`.
2. **No argument**: query `$GP status --json`.
   - Check `.activeQuest` -- if present, use `.activeQuest.name`.
   - Otherwise, query `$GP side-quest:list --json` and find the first side-quest in S2 (implementing) phase.
   - If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable side-quest found, stop: "No side quest ready for landing. Side quest must be in S2 (implementing) phase."

Derive `PLAN_SLUG` from side-quest name (kebab-case).

Create the temp directory:

```bash
mkdir -p "$TMPDIR"
```

## Step 2 -- Re-Entry Detection

Query current side-quest status:

```bash
$GP side-quest:show --side-quest $SQ_NAME --json
```

Map the phase:

| Phase | Action |
|---|---|
| S2 (implementing) | Ready for landing -- check for `$TMPDIR/agent-return.cache` (if exists, skip agent spawn in Step 3). Proceed to Step 3. |
| S3 (landed) | Already done. Inform user: "Side quest is already landed." Stop. |
| S1 or S0 | Not ready: "Side quest is not yet implemented. Run `/gp:implement-side-quest` first." Stop. |

## Step 3 -- Learnings Capture

### 3a. Derive PRE_IMPL_COMMIT

Land-side-quest runs in a separate session from implement-side-quest, so `PRE_IMPL_COMMIT` is not available from a prior step. Derive it from git history:

```bash
FIRST_IMPL_COMMIT=$(git log --oneline --fixed-strings --grep="[${PLAN_SLUG}]" --reverse | head -1 | awk '{print $1}')
PRE_IMPL_COMMIT=$(git rev-parse ${FIRST_IMPL_COMMIT}^)
```

Use `--fixed-strings` to avoid regex interpretation of `PLAN_SLUG` characters.

If no commits match `[${PLAN_SLUG}]`, stop: "No implementation commits found for this side quest. Verify the side quest was implemented."

### 3b. Compute Changed Files

```bash
CHANGED_FILES=$(git diff --name-only $PRE_IMPL_COMMIT..HEAD)
```

### 3c. Gather Architecture Path

```bash
$GP status --json
```

Extract the architecture `_overview.md` path for reference (not for promotion). Construct: `.goodplan/architecture/_overview.md`.

### 3d. Spawn Completion-Slice Agent (or Load Cache)

**Re-entry check:** If `$TMPDIR/agent-return.cache` exists, load it and skip the agent spawn. Otherwise, spawn the agent.

Extract the side-quest path and plan path from `$GP side-quest:show --side-quest $SQ_NAME --json`.

Pre-create the completion directory:

```bash
mkdir -p <side-quest-path>/completion/
```

```
Agent: completion-slice
Task prompt: |
  Side-quest path: <side-quest-path from side-quest:show>
  Plan path: <plan path from side-quest:show>
  Changed files:
  {CHANGED_FILES}

  Architecture _overview.md path: .goodplan/architecture/_overview.md
  (For reference only — do NOT propose architecture updates.)

  **IMPORTANT: Skip architecture delta analysis.** Side-quests do not update spine
  artifacts (architecture-current.md). Set architectureDelta to an empty array.

  Focus on **learnings only**:
  - What worked well during this side-quest implementation
  - What didn't work or caused friction
  - Domain insights discovered
  - Patterns worth reusing or avoiding

  Write to:
  - <side-quest-path>/completion/learnings.md

  Return JSON: {
    "status": "SUCCESS" | "PARTIAL" | "FAILED",
    "summary": "...",
    "filesWritten": [...],
    "learnings": [
      { "category": "worked|didnt-work|domain|do-differently", "summary": "...", "detail": "...", "tags": ["..."], "rollupTo": ["project"] }
    ],
    "architectureDelta": [],
    "recommendations": [
      { "type": "side-quest|debt", "description": "...", "priority": "high|medium|low" }
    ],
    "triggeredConditions": []
  }

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

### 3e. Parse Agent Return

Check `status`:

- **SUCCESS**: Cache the full return to `$TMPDIR/agent-return.cache` (JSON via Write tool). Proceed to Step 4.
- **PARTIAL**: Surface to user via AskUserQuestion: "Completion partially completed: {summary}. Continue with partial results / Retry / Stop?"
  - Continue: cache what we have, proceed to Step 4 with partial data.
  - Retry: re-spawn the agent.
  - Stop: preserve temp directory, stop.
- **FAILED**: Stop with error message. Preserve temp directory.

### 3f. Extract Learnings

**On re-entry** (agent-return.cache loaded in Step 3d): Use the cached `learnings` array.

**On fresh run** (from Step 3e): Use the `learnings` array from the completion-slice agent's return.

## Step 4 -- Surface Recommendations + Land

### 4a. Surface Recommendations

From the completion-slice agent return (or cache), present each `recommendation` to the user via AskUserQuestion:

For `type: "side-quest"`:
"**Proposed side quest:** {description} (priority: {priority})
- **Create side quest** -- follow-up work
- **Defer**
- **Skip**"

For `type: "debt"`:
"**Technical debt identified:** {description} (priority: {priority})
- **Fix now** -- create side quest
- **Acknowledge** -- record in learnings
- **Skip**"

For acknowledged debt, add to learnings array: `{ "category": "do-differently", "summary": "<description>", "detail": "Technical debt acknowledged during landing: <description>", "tags": ["debt", "side-quest"], "rollupTo": ["project"] }`.

### 4b. Persist Learnings

Persist each learning via `learning:capture` (project-scoped). For each learning from the agent return (and any user-acknowledged debt from 4a):

```bash
echo '{"summary":"[<category>] <summary> — <detail>","scope":"project","tags":["<category>","side-quest"]}' | $GP learning:capture --json
```

Note: `side-quest:land` does NOT accept stdin (unlike `slice:land` which takes learnings/deferred/architectureDelta). Learnings must be captured individually via `learning:capture` before calling land.

### 4c. Land the Side Quest

```bash
$GP side-quest:land --side-quest $SQ_NAME --json
```

If the CLI command fails, stop with the error message.

### 4d. Done Summary

```
**Side Quest Landed**
- **Side Quest**: {SQ_NAME}
- **Learnings captured**: {count}
- **Next**: {suggest next unfinished side-quest from side-quest:list, or /gp:status}
```

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **Missing git history for PLAN_SLUG**: If no commits match `[${PLAN_SLUG}]`, stop: "No implementation commits found for this side quest. Verify the side quest was implemented."
- **Agent-return cache corruption**: If `$TMPDIR/agent-return.cache` cannot be parsed as JSON, delete it and re-spawn the agent.
- **`side-quest:land` failure**: Surface the error message. Common cause: side-quest not in S2 phase.

## Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[land-side-quest] Artifacts preserved at: $TMPDIR
```
