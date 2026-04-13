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

@${CLAUDE_PLUGIN_ROOT}/skills/_references/expertise-tracking.md

## Phase Table

| Phase | Type | v2 Phase | What Happens |
|---|---|---|---|
| 1. Plan Q&A | Interactive | — | Ask user about approach, phasing, expected behavior |
| 2. Plan draft | Autonomous | P7 | Spawn plan-phase agent, `slice:plan-draft` |
| 3. Plan shape | Collaborative/Autonomous | P8 | `plan-shape-start` → approve/auto based on steering |
| 4. Plan refinement + commit | Autonomous | P8→P9 | Refinement loop via `refine:*`, then `slice:plan-commit` |

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Scope Resolution

Accept a slice name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SLICE_NAME`.
2. **No argument**: query `$GP status --json`. Check `.activeSlice` — if present, use `.activeSlice.name`. Otherwise, query `$GP slice:list --json` and find the first slice in `created` status. If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable slice found, stop: "No slice in `created` status found. Create a slice first."

Also resolve the epic name: `$GP status --json` — extract `.activeEpic.name` as `EPIC_NAME`. This is required for v2 commands (`slice:plan-draft`, `refine:*`, `slice:plan-commit` all require `--epic`).

## Step 2 — Re-Entry Detection

Query current slice state:

```bash
$GP slice:show --epic $EPIC_NAME --slice $SLICE_NAME --json
```

Map the `phase` field from the response to resume the pipeline:

| Phase | Action |
|---|---|
| (no slice or pre-P7) | Proceed to Phase 1 (Q&A) |
| `P7` (plan drafted, not shaped) | Skip to Phase 3 (shape checkpoint) |
| `P8` (shape approved, not committed) | Skip to Phase 4 (refinement) |
| `P9` (plan committed) | Plan complete. Use AskUserQuestion: "Plan is already committed. Show plan path / Proceed to /gp:implement-slice {SLICE_NAME}". If user wants to see the plan, show the path from `slice:show --json` (do not Read the plan content — orchestrator discipline). |
| `P10`+ | Slice is past planning. Stop: "Slice is in phase {phase} — not ready for planning." |

Present re-entry context to the user when resuming mid-pipeline: "Slice **{SLICE_NAME}** plan is in progress. Completed: {completed phases}. Next: {next phase}."

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
- `{EPIC_NAME}` = `$EPIC_NAME`

### 3b. Expertise Calibration

Use the guard pattern and format from expertise-tracking.md (auto-included above). Observe the user's responses during Q&A to calibrate communication depth for the rest of the pipeline.

## Step 4 — Phase 2: Plan Draft

@${CLAUDE_PLUGIN_ROOT}/skills/_references/plan-pipeline.md

Follow **Phase B** (Autonomous Draft & Refinement) from plan-pipeline.md (auto-included above) with:
- `{ENTITY_TYPE}` = `slice`
- `{ENTITY_NAME}` = `$SLICE_NAME`
- `{ENTITY_CLI_FLAG}` = `--slice`
- `{EPIC_NAME}` = `$EPIC_NAME`

For slice scope, Phase B uses v2 commands (see plan-pipeline.md entity-type conditional tables). The draft step pipes plan content to `slice:plan-draft`:

**Orchestrator-discipline exception:** The orchestrator reads the plan-phase agent's output file to pipe its content to the CLI command. This is necessary because `slice:plan-draft` accepts stdin `{content}` — there is no file-path-based alternative. The orchestrator does not interpret the plan content; it passes it through opaquely.

```bash
cat $TMPDIR/draft/plan.md | jq -Rs '{content: .}' | $GP slice:plan-draft --epic $EPIC_NAME --slice $SLICE_NAME --json
```

Parse the response — extract `contextBundle` for downstream use.

## Step 5 — Phase 3: Plan Shape Checkpoint

After `slice:plan-draft` succeeds (P7):

1. `$GP slice:plan-shape-start --epic $EPIC_NAME --slice $SLICE_NAME --json` — emits `plan-shape-checkpoint-reached`

2. Check steering preference via `$GP epic:show --epic $EPIC_NAME --json` — read the `steeringPreference` field. Expected values: `always-consult` (collaborative), `best-guess-and-flag` (autonomous with flagging), `ask-in-the-moment` (default — treat as collaborative for shape checkpoints). If field is absent, default to collaborative (present to user).

3. **Autonomous steering** (`best-guess-and-flag`): `$GP slice:plan-shape-auto --epic $EPIC_NAME --slice $SLICE_NAME --json`

4. **Collaborative steering** (`always-consult`, `ask-in-the-moment`, or absent): Present plan summary to user via AskUserQuestion ("Plan drafted for {SLICE_NAME}. Review the plan shape before refinement begins. Approve / Request revisions?").
   - If approved: `$GP slice:plan-shape-approve --epic $EPIC_NAME --slice $SLICE_NAME --json`
   - If revisions requested: spawn editor with user feedback, then `$GP slice:plan-shape-revise --epic $EPIC_NAME --slice $SLICE_NAME --json`, loop back to present revised plan.

## Step 6 — Phase 4: Refinement + Commit

### 6a. Refinement Loop

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). Use the **Loop Parameters** defined below.

For slice scope, the refinement uses `refine:*` commands with `--epic $EPIC_NAME --artifact-type implementation-plan`:

1. `$GP refine:start --epic $EPIC_NAME --artifact-type implementation-plan --json` — begins refinement
2. Per reviewer: `echo '{"dimensions":[...],"findings":[...]}' | $GP refine:score --epic $EPIC_NAME --artifact-type implementation-plan --reviewer $REVIEWER_ID --json`
3. After synthesis: `echo '<synthesis payload>' | $GP refine:synthesize --epic $EPIC_NAME --artifact-type implementation-plan --json`
4. After editor: `$GP refine:revise --epic $EPIC_NAME --artifact-type implementation-plan --json`
5. Read-only check: `$GP refine:evaluate --epic $EPIC_NAME --artifact-type implementation-plan --json`
6. Exit:
   - Pass: `$GP refine:converge --epic $EPIC_NAME --artifact-type implementation-plan --rubric-path ${CLAUDE_PLUGIN_ROOT}/rubrics/implementation-plan.yaml --json`
   - Stagnation/reduction/cap: `$GP refine:stuck --epic $EPIC_NAME --artifact-type implementation-plan --json`
   - Force: `$GP refine:override --epic $EPIC_NAME --artifact-type implementation-plan --reason="<reason>" --json`

Resolve the plan path for the editor: use the CLI-managed path from `slice:show --epic $EPIC_NAME --slice $SLICE_NAME --json` — the entity directory + `plan.md`. The editor edits the CLI-managed copy, not the tmpdir draft.

Use `$TMPDIR/plan-refining/` as the run directory (following iteration-loop.md's round-based structure: `round-{N}/reviews/`, `round-{N}/merged.md`).

### 6b. Commit Plan

After refinement loop exits:

```bash
$GP slice:plan-commit --epic $EPIC_NAME --slice $SLICE_NAME --json
```

This transitions the slice to P9 (plan committed).

### 6c. Cleanup

On successful completion (no errors), delete the temp directory: `rm -rf $TMPDIR`. On any error, preserve it for debugging and log:
```
[plan-slice] Artifacts preserved at: $TMPDIR
```

## Step 7 — Done Summary

Display the **Completion Summary Template** from output-templates.md (transitively included via plan-pipeline.md → iteration-loop.md → output-templates.md) with:
- `{completion_heading}`: `Refinement Complete`
- `{skill_specific_header_fields}`: `**Path**: {path to plan file}`
- Score Progression table from `reviewerScores` history
- Per-iteration issues-resolved tables

Then display the **Done Summary Template (Variant A)** (from output-templates.md, transitively included) with:
- `{done_heading}`: `Plan Created`
- `{next_step}`: `/gp:implement-slice {SLICE_NAME}`

## Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included via plan-pipeline.md in Step 4, and directly in Step 6a).

| Parameter | Value |
|---|---|
| **max_iterations** | 10 (override via `$GP_PLAN_SLICE_MAX_ITERATIONS` env var for test harness cost control) |
| **run_dir_mode** | `temp` |
| **artifact_type** | `implementation-plan` — passed to all `refine:*` commands as `--artifact-type implementation-plan` |
| **rubric_path** | `${CLAUDE_PLUGIN_ROOT}/rubrics/implementation-plan.yaml` — passed to `refine:converge`/`refine:evaluate` via `--rubric-path` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"implementation-plan"` |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md
