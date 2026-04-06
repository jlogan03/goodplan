---
name: create-epic
description: This skill should be used when the user wants to create a new epic or start a new project. Guides through goal capture, exploration, architecture design, and slice definition. Common triggers: 'create epic', 'new epic', 'start project', 'new project', 'I have a new idea', 'add epic', 'start fresh'.
user-invocable: true
requires: gp >= 1.0.0
---

# Create-Epic Pipeline

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

## Phase Table

| Phase | Type | CLI Status Transition | What Happens |
|---|---|---|---|
| 1. Goal capture | Interactive | `created` | Ask user about epic goal, `gp epic:create` |
| 2. Explore | Autonomous | `created` -> `exploring` -> `explored` | Spawn explore-phase agent, user-controlled exit |
| 3. Architecture Q&A | Interactive | `explored` -> `defining-architecture` | Broad + deep design Q&A via AskUserQuestion |
| 4. Architecture draft + refinement | Autonomous | `defining-architecture` -> `architecture-defined` -> `refining-architecture` -> `architecture-refined` | Spawn architecture-phase, then refinement loop |
| 5. Slices Q&A | Interactive | `architecture-refined` -> `defining-slices` | Scope/ordering discussion via AskUserQuestion |
| 6. Slices draft + refinement | Autonomous | `defining-slices` -> `slices-defined` -> `refining-slices` -> `slices-refined` | Spawn slices-phase, then refinement loop |

@${CLAUDE_PLUGIN_ROOT}/skills/_references/expertise-tracking.md

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Scope Resolution

Accept an epic name as argument, or auto-detect:

1. **Argument provided**: use it directly as `EPIC_NAME`.
2. **No argument**: query `$GP status --json`. Check `.activeEpic` — if present, use `.activeEpic.name`. Otherwise, use AskUserQuestion to ask the user for the epic name.
3. If the user wants to create a new epic (no existing epic), proceed to Phase 1 goal capture.

## Step 2 — Re-Entry Detection

Query current epic status (if the epic exists):

```bash
$GP epic:show --epic $EPIC_NAME --json
```

If the epic doesn't exist yet (command fails with entity-not-found), proceed to Phase 1 (goal capture) to create it.

Map the `status` field to resume the pipeline:

| Status | Action |
|---|---|
| `created` | Proceed to Phase 2 (explore). Goal already captured. |
| `exploring` | Resume Phase 2 — check if `$TMPDIR/continuation.md` exists; if so, re-spawn explore-phase with it. If not (e.g., /tmp cleaned), re-spawn without continuation (agent starts fresh exploration). |
| `explored` | Skip to Phase 3 (architecture Q&A). |
| `defining-architecture` | Resume Phase 3 — continue architecture Q&A. |
| `architecture-defined` | Skip to Phase 4 refinement — begin refinement loop. Context from `start-refine-architecture` includes the architecture files (no temp Q&A needed). |
| `refining-architecture` | Resume Phase 4 — continue refinement loop. |
| `architecture-refined` | Skip to Phase 5 (slices Q&A). |
| `defining-slices` | Resume Phase 5 — continue slices Q&A. |
| `slices-defined` | Skip to Phase 6 refinement — begin refinement loop. |
| `refining-slices` | Resume Phase 6 — continue refinement loop. |
| `slices-refined` | Pipeline already complete. Use AskUserQuestion: "Epic is fully defined. View status / Activate with /gp:start-epic" |
| `activated` | Epic already active. Inform user. |
| Other | Stop: "Epic is in `{status}` status — not in the create-epic pipeline flow." |

Present re-entry context to the user: "Epic **{EPIC_NAME}** is in progress. Completed: {completed phases}. Next: {next phase}. Continue / Go back to a previous phase?"

If the user says "go back", re-enter an earlier phase with existing artifacts preserved. **Backward movement is not supported by the CLI state machine.** Tell the user: "The CLI state machine does not support backward transitions. Options: (1) Continue from the current phase — prior artifacts are preserved. (2) Abandon this epic and create a new one with revised inputs."

## Step 2b — Temp Directory Setup

Create (or re-use) a deterministic temp working directory. This runs for **every entry point** — both fresh starts and re-entries:

```bash
TMPDIR="/tmp/gp-create-epic-${EPIC_NAME}"
mkdir -p "$TMPDIR"
```

Log to stderr: `[create-epic] Working directory: $TMPDIR`

## Step 3 — Phase 1: Interactive Goal Capture

### 3a. Goal Capture

If the epic doesn't exist yet:

Use AskUserQuestion to ask the user about the epic goal:
- "What is this epic about? What do you want to achieve?"
- Follow up on answers that raise new questions. Cover goal, motivation, and rough scope.
- Continue until the user signals readiness.

Write the goal summary to `$TMPDIR/goal.md` using the Write tool.

Create the epic via CLI:

```bash
echo "{\"name\":\"$EPIC_NAME\",\"goal\":\"<goal-summary>\"}" | $GP epic:create --json
```

Verify the response includes `entity` and `newStatus: "created"`.

If the epic already exists (re-entry), load the existing goal from the CLI response (`gp epic:show` output) — do not re-ask.

### 3b. Expertise Calibration

Use the guard pattern and format from expertise-tracking.md (auto-included above).

Load existing expertise data (if any) to calibrate communication depth for the rest of this epic. If the user's expertise profile doesn't exist yet, observe their responses during goal capture to build an initial profile. Update the expertise file following the guard and format from the reference.

## Step 4 — Phase 2: Autonomous Explore

@${CLAUDE_PLUGIN_ROOT}/skills/_references/explore-phase-pattern.md

Follow the shared explore phase pattern defined in explore-phase-pattern.md (auto-included above) with these values:

| Placeholder | Value |
|---|---|
| `{ENTITY_TYPE}` | `epics` |
| `{ENTITY_TYPE-singular}` | `epic` |
| `{ENTITY_NAME}` | `$EPIC_NAME` |
| `{ENTITY_CLI_FLAG}` | `--epic` |
| `{START_EXPLORE_EXTRA_FLAGS}` | _(none)_ |

## Step 5 — Phase 3: Interactive Architecture Q&A

### 5a. Status Transition

```bash
$GP epic:define-architecture --epic $EPIC_NAME --json
```

Transitions `explored` -> `defining-architecture`. Verify success.

### 5b. Load Context

```bash
$GP start-architecture --epic $EPIC_NAME --json
```

Returns a `ContextBundle` with explore output, goal, conventions.

### 5c. Design Tree Q&A

Run a structured design Q&A using AskUserQuestion. Two passes:

**Broad pass** (3-5 questions):
- What are the major subsystems or components?
- What are their responsibilities and boundaries?
- How do they communicate (APIs, events, shared state)?
- Present the subsystem map for confirmation. Move to deep pass when user confirms.

**Deep pass** (2-3 questions per subsystem, cap at 3 subsystems in detail; remaining get 1 question each; total Q&A under 15 questions):
- For each subsystem: API surfaces, data models, communication patterns.
- User can say "that's enough detail" to move on at any time.

### 5d. Write Q&A Summary

Write the structured Q&A to the temp directory using the Write tool:

```bash
# Write to $TMPDIR/architecture-qa.md
```

Format:

```markdown
# Architecture Q&A — {EPIC_NAME}

## Subsystem Map
{confirmed subsystems and their responsibilities}

## Subsystem Details
### {Subsystem 1}
{API surfaces, data models, patterns}

### {Subsystem 2}
{...}

## Cross-Cutting Concerns
{communication, shared state, conventions}

## Open Questions
{anything flagged during Q&A}
```

## Step 6 — Phase 4: Autonomous Architecture Draft + Refinement

### 6a. Spawn Architecture-Phase Agent

Spawn `architecture-phase` with: epic name, Q&A summary path (`$TMPDIR/architecture-qa.md`), output directory (from `epic:define-architecture` response `paths.architecture` in Step 5a), goal, ContextBundle (inline, references, decisions, learnings), active conditions. Tools: Read, Grep, Glob, Write, Bash. No Agent tool.

Parse return: SUCCESS → extract `filesWritten`, proceed. PARTIAL → present `questions` via AskUserQuestion, re-spawn with answers. FAILED → stop. Surface any `triggeredConditions` to user.

### 6b. Submit Architecture

```bash
stdin: "" | $GP submit-architecture --epic $EPIC_NAME --json
```

Transitions `defining-architecture` -> `architecture-defined`. No stdin payload required.

### 6c. Begin Refinement

```bash
stdin: "" | $GP epic:refine-architecture --epic $EPIC_NAME --json
```

Transitions `architecture-defined` -> `refining-architecture`.

### 6d. Architecture Refinement Loop

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). Use the **Architecture Loop Parameters** at the end of this file.

Set `maxIterations = parseInt($GP_CREATE_EPIC_MAX_ITERATIONS) || 3`.

Use `$TMPDIR/architecture-refining/` as the run directory (following iteration-loop.md's round-based structure: `round-{N}/reviews/`, `round-{N}/merged.md`).

Each round: load context via `$GP start-refine-architecture --epic $EPIC_NAME --json`, then follow iteration-loop.md's Reviewer Spawn Pattern → Synthesis → Editor → Exit Criteria Evaluation. Pass the ContextBundle inline context and reference paths to each agent. Write each reviewer's `review` field to `$TMPDIR/architecture-refining/round-{N}/reviews/{reviewer-name}.md`. Spawn synthesis agent with output path `$TMPDIR/architecture-refining/round-{N}/merged.md`.

Submit each round:
```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refine-architecture --epic $EPIC_NAME --json
```

**Exit flow**: The orchestrator evaluates exit criteria per iteration-loop.md. On normal pass (score >= 9), submit without `--override` — the CLI confirms via `response.advanced: true`. On stagnation/reduction/cap exits, append `--override` to force the CLI to advance. If `response.advanced` is `false` without `--override`, the CLI's circuit breaker disagrees — continue the loop.

Log: `[create-epic] Architecture refinement complete. Rounds: {N}, Scores: {scores}, Reason: {reason}`

## Step 7 — Phase 5: Interactive Slices Q&A

### 7a. Status Transition

```bash
$GP epic:define-slices --epic $EPIC_NAME --json
```

Transitions `architecture-refined` -> `defining-slices`. Verify success.

### 7b. Load Context

```bash
$GP start-slices --epic $EPIC_NAME --json
```

Returns `ContextBundle` with architecture, goal, conventions.

### 7c. Slices Q&A

Use AskUserQuestion to discuss slice scope and ordering:

- How should the work be broken down into sequential slices?
- What's the natural ordering and dependencies between slices?
- What's the right size for each slice? (Target: each slice completable in 1-3 sessions)
- Any slices that could be done in parallel?
- What are the verification criteria for each slice?

Continue until the user signals readiness.

### 7d. Write Q&A Summary

Write to `$TMPDIR/slices-qa.md`:

```markdown
# Slices Q&A — {EPIC_NAME}

## Slice Breakdown
{ordered list of slices with goals}

## Dependencies
{slice ordering rationale}

## Size Guidance
{per-slice scope and session estimates}

## Verification Criteria
{per-slice success criteria}

## Open Questions
{anything flagged during Q&A}
```

## Step 8 — Phase 6: Autonomous Slices Draft + Refinement

### 8a. Spawn Slices-Phase Agent

Spawn `slices-phase` with: epic name, Q&A summary path (`$TMPDIR/slices-qa.md`), temp directory (`$TMPDIR/slices-draft`), goal, ContextBundle (inline, references). Tools: Read, Grep, Glob, Write. No Agent tool.

Parse return: SUCCESS → extract `filesWritten` and `slices` array (`{name, goal}` pairs). PARTIAL → present `questions` via AskUserQuestion, re-spawn with answers. FAILED → stop.

### 8b. Create Slices via CLI

For each slice in the agent's `slices` array, create via CLI:

```bash
echo '{"name":"<slice-name>","goal":"<slice-goal>"}' | $GP slice:create --epic $EPIC_NAME --json
```

Use the structured `{name, goal}` metadata from the agent return — do not parse goal.md file contents.

If any `slice:create` call fails, stop immediately and surface the error. Partial slice creation is acceptable — re-entry will detect existing slices on the next run.

### 8c. Copy Artifacts

Copy per-slice goal.md files from temp dir to `<paths.slices>/<slice-name>/goal.md`, where `paths.slices` comes from the `epic:define-slices` response in Step 7a and `<slice-name>` from each entry in the slices array. Copy sequencing.md to `<paths.slices>/sequencing.md`. Note: `slice:create` returns empty `paths: {}` — use the `epic:define-slices` path instead. Use shell `cp` via Bash tool (not Read+Write).

### 8d. Submit Slices

```bash
stdin: "" | $GP submit-slices --epic $EPIC_NAME --json
```

Transitions `defining-slices` -> `slices-defined`.

### 8e. Begin Refinement

```bash
stdin: "" | $GP epic:refine-slices --epic $EPIC_NAME --json
```

Transitions `slices-defined` -> `refining-slices`.

### 8f. Slices Refinement Loop

Same pattern as architecture refinement (Step 6d), using the **Slices Loop Parameters** at the end of this file. Initialize fresh tracking state per iteration-loop.md.

Use `$TMPDIR/slices-refining/` as the run directory (separate from architecture refinement to avoid artifact collision).

Each round: load context via `$GP start-refine-slices --epic $EPIC_NAME --json`, then follow the same Reviewer → Synthesis → Editor → Exit pattern. Write each reviewer's `review` field to `$TMPDIR/slices-refining/round-{N}/reviews/{reviewer-name}.md`. Spawn synthesis agent with output path `$TMPDIR/slices-refining/round-{N}/merged.md`.

Submit each round:
```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refine-slices --epic $EPIC_NAME --json
```

Same exit flow as architecture refinement: submit without `--override` on normal pass, with `--override` on stagnation/reduction/cap exits.

Log: `[create-epic] Slices refinement complete. Rounds: {N}, Scores: {scores}, Reason: {reason}`

## Step 9 — Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[create-epic] Artifacts preserved at: $TMPDIR
```

## Step 10 — Done Summary

Present results to the user:

```
**Epic Created and Refined**
- **Epic**: {EPIC_NAME}
- **Architecture refinement rounds**: {count}
- **Architecture final score**: {score}/10
- **Slices refinement rounds**: {count}
- **Slices final score**: {score}/10
- **Slices created**: {count}
- **Next step**: /gp:start-epic {EPIC_NAME}
```

## Architecture Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included in Step 6d above):

| Parameter | Value |
|---|---|
| **max_iterations** | 3 (override via `$GP_CREATE_EPIC_MAX_ITERATIONS` env var for test harness cost control) |
| **override_flag** | `--override` — appended to submit command on stagnation/reduction/cap exits |
| **run_dir_mode** | `temp` |
| **submit_command** | `echo '{"scores":{REVIEWER_SCORES_JSON}}' \| $GP submit-refine-architecture --epic $EPIC_NAME --json` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"architecture-proposal"` |

## Slices Loop Parameters

Parameters for the iteration-loop.md shared reference (used in Step 8f above):

| Parameter | Value |
|---|---|
| **max_iterations** | 3 (override via `$GP_CREATE_EPIC_MAX_ITERATIONS` env var for test harness cost control) |
| **override_flag** | `--override` — appended to submit command on stagnation/reduction/cap exits |
| **run_dir_mode** | `temp` |
| **submit_command** | `echo '{"scores":{REVIEWER_SCORES_JSON}}' \| $GP submit-refine-slices --epic $EPIC_NAME --json` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"slice-definitions"` |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **slice:create failure**: Stop immediately, surface error. Partial creation is OK — re-entry handles it.
