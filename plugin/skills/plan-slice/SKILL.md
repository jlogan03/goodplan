---
name: plan-slice
description: This skill should be used when the user wants to create an implementation plan for a slice. Runs interactive Q&A then autonomously drafts, reviews, and refines the plan until quality thresholds are met. Common triggers: 'plan slice', 'plan this slice', 'create a plan', 'plan and refine', 'write a plan for this slice'.
user-invocable: true
requires: gp >= 1.0.0
---

# Plan-Slice Pipeline

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

## Phase Table

| Phase | Type | CLI Status Mapping | What Happens |
|---|---|---|---|
| 1. Plan Q&A | Interactive | `created` → `planning` | Ask user about approach, phasing, expected behavior |
| 2. Plan draft + refinement | Autonomous | `planning` → `plan-created` → `refining` → `plan-refined` | Spawn agents: plan-phase → refinement loop |

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Scope Resolution

Accept a slice name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SLICE_NAME`.
2. **No argument**: query `$GP status --json`. Check `.activeSlice` — if present, use `.activeSlice.name`. Otherwise, query `$GP slice:list --json` and find the first slice in `created` status. If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable slice found, stop: "No slice in `created` status found. Create a slice first."

## Step 2 — Re-Entry Detection

Query current slice status:

```bash
$GP slice:show --slice $SLICE_NAME --json
```

Map the `status` field:

| Status | Action |
|---|---|
| `created` | Proceed to Phase 1 (Q&A) |
| `planning` | Resume Phase 1 — create temp dir, check if `$TMPDIR/qa/plan-qa.md` exists from prior session (if so, offer to continue or start Q&A fresh), continue Q&A |
| `plan-created` | Skip to plan-pipeline Phase B5 (begin refinement), skipping B1-B4 (plan already exists) |
| `refining` | Resume refinement loop — jump to plan-pipeline Phase B6. Plan path from `slice:show --json` artifacts. Check for existing round directories in `$TMPDIR/plan-refining/` for resume detection. |
| `plan-refined` | Plan already complete. Use AskUserQuestion: "Plan is already refined. Show plan path / Proceed to /gp:implement". If user wants to see the plan, show the path from `slice:show --json` (do not Read the plan content — orchestrator discipline). |
| Other | Stop: "Slice is in `{status}` status — not ready for planning." |

## Step 2b — Temp Directory Setup

Create (or re-use) a deterministic temp working directory. This runs for **every entry point** — both fresh starts and re-entries:

```bash
TMPDIR="/tmp/gp-plan-slice-${SLICE_NAME}"
mkdir -p "$TMPDIR/qa" "$TMPDIR/draft"
```

Log to stderr: `[plan-slice] Working directory: $TMPDIR`

## Step 3 — Phase 1: Interactive Q&A

### 3a. Plan Q&A

Follow **Phase A** (Interactive Plan Q&A) from plan-pipeline.md (auto-included below in Step 4) with:
- `{ENTITY_TYPE}` = `slice`
- `{ENTITY_NAME}` = `$SLICE_NAME`
- `{ENTITY_CLI_FLAG}` = `--slice`

## Step 4 — Phase 2: Autonomous Draft & Refinement

@${CLAUDE_PLUGIN_ROOT}/skills/_references/plan-pipeline.md

Follow **Phase B** (Autonomous Draft & Refinement) from plan-pipeline.md (auto-included above) with:
- `{ENTITY_TYPE}` = `slice`
- `{ENTITY_NAME}` = `$SLICE_NAME`
- `{ENTITY_CLI_FLAG}` = `--slice`

### 4a. Cleanup

On successful completion (no errors), delete the temp directory: `rm -rf $TMPDIR`. On any error, preserve it for debugging and log:
```
[plan-slice] Artifacts preserved at: $TMPDIR
```

## Step 5 — Done Summary

Display the **Completion Summary Template** from output-templates.md (transitively included via plan-pipeline.md → iteration-loop.md → output-templates.md) with:
- `{completion_heading}`: `Refinement Complete`
- `{skill_specific_header_fields}`: `**Path**: {path to plan-refined file}`
- Score Progression table from `reviewerScores` history
- Per-iteration issues-resolved tables

Then display the **Done Summary Template (Variant A)** (from output-templates.md, transitively included) with:
- `{done_heading}`: `Plan Created`
- `{next_step}`: `/gp:implement {SLICE_NAME}`

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included via plan-pipeline.md in Step 4).

| Parameter | Value |
|---|---|
| **max_iterations** | 10 (override via `$GP_PLAN_SLICE_MAX_ITERATIONS` env var for test harness cost control) |
| **run_dir_mode** | `temp` |
| **submit_command** | `echo '{"scores":{REVIEWER_SCORES_JSON}}' \| $GP submit-refinement --slice $SLICE_NAME --json` |
| **override_flag** | `--override` — appended on stagnation, reduction, or cap exits to force CLI advancement (the CLI requires all scores >= 9 OR `--override` to advance from `refining` → `plan-refined`) |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"implementation-plan"` |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md
