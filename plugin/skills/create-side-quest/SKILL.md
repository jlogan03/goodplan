---
name: create-side-quest
description: >-
  Creates a side quest for follow-up work, tech debt, or out-of-scope improvements.
  Guides through goal capture and plan creation using v2 side-quest commands and
  refine:* refinement. Common triggers: 'side quest', 'new quest', 'quick task
  that needs a plan', 'create quest', 'start a quest'.
user-invocable: true
requires: gp >= 1.0.0
---

# Create-Side-Quest Pipeline

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

## Phase Table

| Phase | Type | v2 Phase | What Happens |
|---|---|---|---|
| 1. Goal capture | Interactive | S0->S1 | Design-tree goal interview, `side-quest:create` + `side-quest:goal-commit` (ContentRef) |
| 2. Plan Q&A | Interactive | -- | Plan approach interview |
| 3. Plan draft + refinement | Autonomous | S1->S2 | Spawn plan-phase, `side-quest:plan-draft` + `refine:*` + `side-quest:plan-commit` (ContentRef) |

## Step 0 -- Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 -- Scope Resolution

Accept a side-quest name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SQ_NAME`.
2. **No argument**: use AskUserQuestion to ask the user for the side-quest name.
3. If the user wants to create a new side-quest (no existing side-quest), proceed to Phase 1 goal capture.

## Step 2 -- Re-Entry Detection

Query current side-quest state (if the side-quest exists):

```bash
$GP side-quest:show --side-quest $SQ_NAME --json
```

If the side-quest doesn't exist yet (command fails with entity-not-found), proceed to Phase 1 (goal capture) to create it.

Map the `phase` field from the response to resume the pipeline:

| Phase | Action |
|---|---|
| S0 (created, no goal) | Proceed to Phase 1 (goal capture) |
| S1 (goal or plan committed) | **Check plan artifact** via `side-quest:show --json`: if plan exists (plan field or plan artifact path present) -> plan complete, inform user, suggest `/gp:implement-side-quest $SQ_NAME`. If no plan -> skip to Phase 2 (plan Q&A). |
| S2 (implementing) | Already implementing -- inform user, suggest `/gp:implement-side-quest $SQ_NAME` |
| S3 (landed) | Already done -- inform user |

Present re-entry context to the user when resuming: "Side quest **{SQ_NAME}** is in progress. Next: {next phase}."

## Step 2b -- Temp Directory Setup

Create (or re-use) a deterministic temp working directory. This runs for **every entry point** -- both fresh starts and re-entries:

```bash
TMPDIR="/tmp/gp-create-side-quest-${SQ_NAME}"
mkdir -p "$TMPDIR" "$TMPDIR/qa" "$TMPDIR/draft"
```

Log to stderr: `[create-side-quest] Working directory: $TMPDIR`

## Step 3 -- Phase 1: Interactive Goal Capture

### 3a. Goal Capture

If the side-quest doesn't exist yet:

1. Use AskUserQuestion to ask the user about the side-quest goal using **design-tree interviewing** (same pattern as create-epic P1):
   - "What is this side quest about? What do you want to achieve?"
   - Present 2-3 possible goal framings based on the user's description. Let the user choose or propose their own.
   - Follow up on answers that raise new questions. Cover goal, motivation, and rough scope.
   - Continue until the user signals readiness.

2. Create the side-quest via CLI:

```bash
$GP side-quest:create --name "$SQ_NAME" --goal "$GOAL_SUMMARY" --json
```

Note: `side-quest:create` uses CLI args (`--name`, `--goal`), not stdin JSON.

Verify the response includes the entity. This emits `side-quest-created` (S0).

3. Store goal content as git blob and pass as ContentRef:

```bash
# Write goal to temp file
echo "$GOAL_CONTENT" > $TMPDIR/goal.md
# Store as git blob and get SHA
GOAL_SHA=$(git hash-object -w $TMPDIR/goal.md)
GOAL_SIZE=$(wc -c < $TMPDIR/goal.md | tr -d ' ')
# Pass ContentRef to goal-commit
echo "{\"goal\":{\"sha\":\"$GOAL_SHA\",\"size\":$GOAL_SIZE,\"path\":\"$TMPDIR/goal.md\",\"mediaType\":\"text/markdown\"}}" | $GP side-quest:goal-commit --side-quest $SQ_NAME --json
```

Verify the response confirms the goal was committed. This emits `side-quest-goal-committed` (S1).

**ContentRef pattern:** Side-quest commands (`goal-commit`, `plan-draft`, `plan-commit`) expect `ContentRef` objects (`{sha, size, path, mediaType}` -- git blob SHA + metadata), NOT raw content strings. The skill must construct ContentRefs manually via `git hash-object -w`.

If the side-quest already exists (re-entry), load the existing goal from `side-quest:show` output -- do not re-ask.

## Step 4 -- Phase 2: Interactive Plan Q&A

Follow **Phase A** (Interactive Plan Q&A) from plan-pipeline.md (auto-included below in Step 5) with:
- `{ENTITY_TYPE}` = `side-quest`
- `{ENTITY_NAME}` = `$SQ_NAME`
- `{ENTITY_CLI_FLAG}` = `--side-quest`

Note: For Phase A, use `side-quest:show --side-quest $SQ_NAME --json` to load the goal (A2). Skip A1 status transition -- v2 side-quests have no explicit planning status transition.

## Step 5 -- Phase 3: Autonomous Draft & Refinement

@${CLAUDE_PLUGIN_ROOT}/skills/_references/plan-pipeline.md

Follow **Phase B** (Autonomous Draft & Refinement) from plan-pipeline.md (auto-included above) with:
- `{ENTITY_TYPE}` = `side-quest`
- `{ENTITY_NAME}` = `$SQ_NAME`
- `{ENTITY_CLI_FLAG}` = `--side-quest`

For side-quest scope, Phase B uses the **Side-Quest (v2)** command path from plan-pipeline.md's Entity-Type Command Reference. Key differences from Slice (v2):

**B1 (Context Assembly):** No separate context assembly -- context is assembled during plan-draft.

**B3 (Spawn Plan-Phase Agent + Submit Draft):**

Spawn `plan-phase` agent with: side-quest name, Q&A output path (`$TMPDIR/qa/plan-qa.md`), temp directory (`$TMPDIR/draft`), goal. Instruct the agent to use single-file format (`$TMPDIR/draft/plan.md`).

After agent returns SUCCESS, store plan as git blob and pass as ContentRef:

```bash
PLAN_SHA=$(git hash-object -w $TMPDIR/draft/plan.md)
PLAN_SIZE=$(wc -c < $TMPDIR/draft/plan.md | tr -d ' ')
echo "{\"plan\":{\"sha\":\"$PLAN_SHA\",\"size\":$PLAN_SIZE,\"path\":\"$TMPDIR/draft/plan.md\",\"mediaType\":\"text/markdown\"}}" | $GP side-quest:plan-draft --side-quest $SQ_NAME --json
```

This emits `side-quest-plan-drafted`.

**B4 (Shape Checkpoint):** Skip -- no `plan-shape-start` for side-quests.

**B5 (Begin Refinement):**

```bash
$GP refine:start --side-quest $SQ_NAME --artifact-type implementation-plan --json
```

**B6 (Refinement Loop):** Follow iteration-loop.md with the Loop Parameters defined below. The `refine:*` commands use `--side-quest $SQ_NAME --artifact-type implementation-plan` (per the `scope_flag` parameter).

Resolve the plan path for the editor: use the CLI-managed path from `side-quest:show --side-quest $SQ_NAME --json` -- the entity directory + `plan.md`.

Use `$TMPDIR/plan-refining/` as the run directory.

**B7 (Submit Refinement):** After the loop exits, store refined plan as ContentRef and commit:

```bash
REFINED_SHA=$(git hash-object -w $TMPDIR/draft/plan.md)
REFINED_SIZE=$(wc -c < $TMPDIR/draft/plan.md | tr -d ' ')
echo "{\"plan\":{\"sha\":\"$REFINED_SHA\",\"size\":$REFINED_SIZE,\"path\":\"$TMPDIR/draft/plan.md\",\"mediaType\":\"text/markdown\"}}" | $GP side-quest:plan-commit --side-quest $SQ_NAME --json
```

This emits `side-quest-plan-committed` (transitions to S2-ready).

## Step 6 -- Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[create-side-quest] Artifacts preserved at: $TMPDIR
```

## Step 7 -- Done Summary

Present results to the user:

```
**Side Quest Plan Refined**
- **Side Quest**: {SQ_NAME}
- **Refinement rounds**: {count}
- **Final score**: {score}/10
- **Exit reason**: {reason}
- **Next step**: /gp:implement-side-quest {SQ_NAME}
```

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included via plan-pipeline.md in Step 5):

| Parameter | Value |
|---|---|
| **max_iterations** | 10 (override via `$GP_CREATE_SIDE_QUEST_MAX_ITERATIONS` env var for test harness cost control). Higher than create-epic's 3 because side-quest plans are the sole planning artifact (no separate architecture/slices refinement). The stagnation_window=2 and reduction_exit_threshold=2 typically exit well before 10. |
| **run_dir_mode** | `temp` |
| **artifact_type** | `implementation-plan` |
| **scope_flag** | `--side-quest $SQ_NAME` |
| **rubric_path** | `${CLAUDE_PLUGIN_ROOT}/rubrics/implementation-plan.yaml` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes -- deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"implementation-plan"` |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md
