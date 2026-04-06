---
name: create-side-quest
description: This skill should be used when the user wants to create a side quest for follow-up work, tech debt, or out-of-scope improvements. Guides through goal capture, exploration, and plan creation. Common triggers: 'side quest', 'new quest', 'quick task that needs a plan', 'create quest', 'start a quest'.
user-invocable: true
requires: gp >= 1.0.0
---

# Create-Side-Quest Pipeline

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

## Phase Table

| Phase | Type | CLI Status Mapping | What Happens |
|---|---|---|---|
| 1. Goal capture | Interactive | `created` | Orchestrator asks about quest goal, creates quest via `gp quest:create`, writes `goal.md` |
| 2. Explore | Autonomous | `created` -> `exploring` -> `explored` | Spawns `explore-phase` agent with quest-scoped paths. Quest goal is passed via context bundle from `gp start-explore --quest <name> --inline --json`. |
| 3. Plan Q&A | Interactive | `explored` -> `planning` | Orchestrator runs plan Q&A (approach, phasing, expected behavior) |
| 4. Plan draft + refinement | Autonomous | `planning` -> `plan-created` -> `refining` -> `plan-refined` | Spawns `plan-phase` agent, then reviewers -> synthesis -> editor loop per iteration-loop.md |

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Scope Resolution

Accept a quest name as argument, or auto-detect:

1. **Argument provided**: use it directly as `QUEST_NAME`.
2. **No argument**: use AskUserQuestion to ask the user for the quest name.
3. If the user wants to create a new quest (no existing quest), proceed to Phase 1 goal capture.

## Step 2 — Re-Entry Detection

Query current quest status (if the quest exists):

```bash
$GP quest:show --quest $QUEST_NAME --json
```

If the quest doesn't exist yet (command fails with entity-not-found), proceed to Phase 1 (goal capture) to create it.

Map the `status` field to resume the pipeline:

| Quest Status | Re-entry Phase | Behavior |
|---|---|---|
| (no quest) | Phase 1 | Start from goal capture |
| `created` | Phase 2 or Phase 3 | Goal already captured. Offer: "Continue with explore (Phase 2) / Skip explore and go to Plan Q&A (Phase 3)." No re-capture — the goal is immutable once the quest is created. |
| `exploring` | Phase 2 | Resume explore — check if `$TMPDIR/continuation.md` exists; if so, re-spawn explore-phase with it. If not (e.g., /tmp cleaned), re-spawn without continuation (agent starts fresh exploration). |
| `explored` | Phase 3 | Skip to plan Q&A |
| `planning` | Phase 3 | Resume plan Q&A. Check if `$TMPDIR/qa/plan-qa.md` exists from a prior session — if so, present it to the user and ask whether to continue from where it left off or start Q&A fresh. |
| `plan-created` | Phase 4 | Skip to plan refinement — jump directly to plan-pipeline Phase B5 (begin refinement), skipping B1-B4 (plan already exists). |
| `refining` | Phase 4 | Resume refinement loop — jump directly to plan-pipeline Phase B6 (iteration loop). The plan path is available from `quest:show --json` artifacts, not TMPDIR. Check for existing round directories in `$TMPDIR/plan-refining/` for resume detection. |
| `plan-refined` | Done | Report completion |
| Other | Stop: "Quest is in `{status}` status — not in the create-side-quest pipeline flow." |

Present re-entry context to the user: "Quest **{QUEST_NAME}** is in progress. Completed: {completed phases}. Next: {next phase}. Continue / Go back to a previous phase?"

## Step 2b — Temp Directory Setup

Create (or re-use) a deterministic temp working directory. This runs for **every entry point** — both fresh starts and re-entries:

```bash
TMPDIR="/tmp/gp-create-side-quest-${QUEST_NAME}"
mkdir -p "$TMPDIR" "$TMPDIR/qa" "$TMPDIR/draft"
```

Log to stderr: `[create-side-quest] Working directory: $TMPDIR`

## Step 3 — Phase 1: Interactive Goal Capture

### 3a. Goal Capture

If the quest doesn't exist yet:

Use AskUserQuestion to ask the user about the quest goal:
- "What is this quest about? What do you want to achieve?"
- Follow up on answers that raise new questions. Cover goal, motivation, and rough scope.
- Continue until the user signals readiness.

Write the goal summary to `$TMPDIR/goal.md` using the Write tool.

Create the quest via CLI:

```bash
echo "{\"name\":\"$QUEST_NAME\",\"goal\":\"<goal-summary>\"}" | $GP quest:create --json
```

Verify the response includes `entity` and `newStatus: "created"`.

If the quest already exists (re-entry), load the existing goal from the CLI response (`gp quest:show` output) — do not re-ask.

## Step 4 — Phase 2: Autonomous Explore

@${CLAUDE_PLUGIN_ROOT}/skills/_references/explore-phase-pattern.md

Follow the shared explore phase pattern defined in explore-phase-pattern.md (auto-included above) with these values:

| Placeholder | Value |
|---|---|
| `{ENTITY_TYPE}` | `quests` |
| `{ENTITY_TYPE-singular}` | `quest` |
| `{ENTITY_NAME}` | `$QUEST_NAME` |
| `{ENTITY_CLI_FLAG}` | `--quest` |
| `{START_EXPLORE_EXTRA_FLAGS}` | `--inline` |

## Step 5 — Phase 3: Interactive Plan Q&A

Follow **Phase A** (Interactive Plan Q&A) from plan-pipeline.md (auto-included below in Step 6) with:
- `{ENTITY_TYPE}` = `quest`
- `{ENTITY_NAME}` = `$QUEST_NAME`
- `{ENTITY_CLI_FLAG}` = `--quest`

Note: the transition status may be `explored` or `created` (if explore was skipped).

## Step 6 — Phase 4: Autonomous Draft & Refinement

@${CLAUDE_PLUGIN_ROOT}/skills/_references/plan-pipeline.md

Follow **Phase B** (Autonomous Draft & Refinement) from plan-pipeline.md (auto-included above) with:
- `{ENTITY_TYPE}` = `quest`
- `{ENTITY_NAME}` = `$QUEST_NAME`
- `{ENTITY_CLI_FLAG}` = `--quest`

**create-side-quest addition:** At the start of each iteration (before the Reviewer Spawn Pattern in iteration-loop.md), reload context via `$GP start-plan --quest $QUEST_NAME --inline --json` and pass the fresh ContextBundle to reviewers.

## Step 7 — Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[create-side-quest] Artifacts preserved at: $TMPDIR
```

## Step 8 — Done Summary

Present results to the user:

```
**Side Quest Plan Refined**
- **Quest**: {QUEST_NAME}
- **Refinement rounds**: {count}
- **Final score**: {score}/10
- **Exit reason**: {reason}
- **Next step**: /gp:implement {QUEST_NAME}
```

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included via plan-pipeline.md in Step 6):

| Parameter | Value |
|---|---|
| **max_iterations** | 10 (override via `$GP_CREATE_SIDE_QUEST_MAX_ITERATIONS` env var for test harness cost control). Higher than create-epic's 3 because quest plans are the sole planning artifact (no separate architecture/slices refinement). The stagnation_window=2 and reduction_exit_threshold=2 typically exit well before 10. |
| **override_flag** | `--override` — appended to submit command on stagnation/reduction/cap exits |
| **run_dir_mode** | `temp` |
| **submit_command** | `echo '{"scores":{REVIEWER_SCORES_JSON}}' \| $GP submit-refinement --quest $QUEST_NAME --json` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"implementation-plan"` |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md
