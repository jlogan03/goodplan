---
name: create-epic
description: This skill should be used when the user wants to create a new epic or start a new project. Guides through goal capture, exploration, architecture design, pressure-testing, and slice definition. Common triggers: 'create epic', 'new epic', 'start project', 'new project', 'I have a new idea', 'add epic', 'start fresh'.
user-invocable: true
requires: gp >= 1.0.0
---

# Create-Epic Pipeline

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

## Phase Table

| Phase | Type | What Happens |
|---|---|---|
| P1. Goal capture | Collaborative | Design-tree interviewing for goal, `epic:create` + `epic:goal-draft` + `epic:goal-commit` |
| P2. Explore | Collaborative | `epic:explore-start`, spawn explore-phase, user-controlled exit, `epic:explore-conclude` |
| P3. Architecture shape | Collaborative (Q&A) + Autonomous (draft/refine) | Architecture Q&A with design-tree interviewing, `epic:architecture-draft` + `epic:architecture-commit`, shape checkpoint |
| P4. Pressure-test | Autonomous | Spawn pressure-test-phase agent, `epic:pressure-test-draft` + `epic:pressure-test-commit`, finding dispositions |
| P5. Slice-set shape | Collaborative (Q&A) + Autonomous (draft/refine) | Slices Q&A, `epic:slices-draft` + `epic:slices-commit`, shape checkpoint |

### Collaborative vs Autonomous Phase Awareness

| Phase | Mode | Behavior |
|---|---|---|
| P1 Goal capture | Collaborative | Always uses AskUserQuestion, design-tree interviewing |
| P2 Explore | Collaborative | User-controlled exploration cycles |
| P3 Architecture | Mixed | Q&A is collaborative; draft+refine is autonomous (respects steering) |
| P4 Pressure-test | Autonomous | Agent runs independently; findings presented to user for disposition |
| P5 Slices | Mixed | Q&A is collaborative; draft+refine is autonomous (respects steering) |

Before autonomous phases (P4, autonomous parts of P3/P5), check steering preference via `epic:show --epic $EPIC_NAME --json` and read the `steering` field to determine behavior.

@${CLAUDE_PLUGIN_ROOT}/skills/_references/expertise-tracking.md

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Scope Resolution

Accept an epic name as argument, or auto-detect:

1. **Argument provided**: use it directly as `EPIC_NAME`.
2. **No argument**: query `$GP status --json`. Check `.activeEpic` — if present, use `.activeEpic.name`. Otherwise, use AskUserQuestion to ask the user for the epic name.
3. If the user wants to create a new epic (no existing epic), proceed to P1 goal capture.

## Step 2 — Re-Entry Detection

Query current epic state (if the epic exists):

```bash
$GP epic:show --epic $EPIC_NAME --json
```

If the epic doesn't exist yet (command fails with entity-not-found), proceed to P1 (goal capture) to create it.

Map the `phase` field from the response to resume the pipeline:

| Phase | Meaning | Action |
|---|---|---|
| `P0` | Created, no goal yet | Resume P1 — goal capture (draft + commit goal). |
| `P1` | Goal committed, ready for exploration | Proceed to P2 (explore). |
| `P2` | Exploration concluded, ready for architecture | Skip to P3 (architecture Q&A). |
| `P3` | Architecture committed | Check `architectureShapeApproved`: if false, resume shape checkpoint. If true, proceed to P4 (pressure-test). |
| `P4` | Pressure-test committed | Proceed to P5 (slices Q&A). |
| `P5` | Slices committed | Check `sliceSetShapeApproved`: if false, resume shape checkpoint. If true, pipeline complete. |
| `P6` | Activated (epic is live) | Epic already active. Inform user. |

Present re-entry context to the user: "Epic **{EPIC_NAME}** is in progress. Completed: {completed phases}. Next: {next phase}. Continue / Go back to a previous phase?"

If the user says "go back", re-enter an earlier phase with existing artifacts preserved. **Backward movement is not supported by the CLI state machine.** Tell the user: "The CLI state machine does not support backward transitions. Options: (1) Continue from the current phase — prior artifacts are preserved. (2) Abandon this epic and create a new one with revised inputs."

## Step 2b — Temp Directory Setup

Create (or re-use) a deterministic temp working directory. This runs for **every entry point** — both fresh starts and re-entries:

```bash
TMPDIR="/tmp/gp-create-epic-${EPIC_NAME}"
mkdir -p "$TMPDIR"
```

Log to stderr: `[create-epic] Working directory: $TMPDIR`

## Step 3 — P1: Interactive Goal Capture with Design-Tree Interviewing

### 3a. Goal Capture

If the epic doesn't exist yet, create it first:

```bash
$GP epic:create --name $EPIC_NAME --json
```

This creates the epic directory and emits the `epic-created` event only (no goal). Verify the response includes the epic entity.

Then use **design-tree interviewing** to capture the goal. Instead of open-ended questions, present structured alternatives at each branch:

1. **Goal**: "What is this epic about?" — present 2-3 possible goal framings based on the user's initial description. Let the user choose or propose their own.
2. **Motivation**: "What's driving this?" — present alternative motivations (e.g., user-facing value, tech debt reduction, scalability, compliance). User selects or refines.
3. **Scope**: "How broad should this be?" — present 2-3 scope alternatives (minimal, moderate, comprehensive). User picks the right boundary.
4. **Key constraints**: "What constraints matter most?" — present common constraint categories (time, compatibility, performance, team size). User identifies which apply.
5. Continue until the user signals readiness. At each branch, present alternatives and let the user choose or propose their own.

Write the goal summary to `$TMPDIR/goal.md` using the Write tool.

Draft and commit the goal via CLI:

```bash
echo '{"content":"<goal-summary-content>"}' | $GP epic:goal-draft --epic $EPIC_NAME --json
```

```bash
$GP epic:goal-commit --epic $EPIC_NAME --json
```

Verify the response confirms the goal was committed (phase advances to P1).

If the epic already exists at P0 (re-entry with no goal yet), skip `epic:create` and proceed directly to goal drafting.

If the epic already exists at P1 or later (re-entry with goal committed), load the existing goal from `epic:show` output — do not re-ask.

### 3b. Expertise Calibration

Use the guard pattern and format from expertise-tracking.md (auto-included above).

Load existing expertise data (if any) to calibrate communication depth for the rest of this epic. If the user's expertise profile doesn't exist yet, observe their responses during goal capture to build an initial profile. Update the expertise file following the guard and format from the reference.

## Step 4 — P2: Collaborative Explore

@${CLAUDE_PLUGIN_ROOT}/skills/_references/explore-phase-pattern.md

Follow the shared explore phase pattern defined in explore-phase-pattern.md (auto-included above). This is an **epic-scope** invocation, so use the epic command set from the pattern:

| Step | Command |
|---|---|
| Start exploration | `$GP epic:explore-start --epic $EPIC_NAME --json` |
| Capture research artifact | `$GP epic:research-capture --epic $EPIC_NAME --json` |
| Capture brainstorm artifact | `$GP epic:brainstorm-capture --epic $EPIC_NAME --json` |
| Conclude exploration | `$GP epic:explore-conclude --epic $EPIC_NAME --json` |

## Step 5 — P3: Architecture Shape (Mixed: Collaborative Q&A + Autonomous Draft/Refine)

### 5a. Design-Tree Architecture Q&A

Run a structured design Q&A using AskUserQuestion with **design-tree interviewing**. At each decision point, present 2-3 alternatives and let the user choose or propose their own.

**Broad pass** (3-5 questions):
- What are the major subsystems or components? Present 2-3 possible decompositions based on the goal and exploration output.
- What are their responsibilities and boundaries? Present alternative boundary definitions.
- How do they communicate (APIs, events, shared state)? Present communication pattern alternatives.
- Present the subsystem map for confirmation. Move to deep pass when user confirms.

**Deep pass** (2-3 questions per subsystem, cap at 3 subsystems in detail; remaining get 1 question each; total Q&A under 15 questions):
- For each subsystem: API surfaces, data models, communication patterns.
- At each decision point, present 2-3 alternatives rather than asking open-ended questions.
- User can say "that's enough detail" to move on at any time.

### 5b. Write Q&A Summary

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

### 5c. Spawn Architecture-Phase Agent

Check steering preference via `$GP epic:show --epic $EPIC_NAME --json` — read the `steering` field.

Spawn `architecture-phase` with: epic name, Q&A summary path (`$TMPDIR/architecture-qa.md`), output directory, goal, ContextBundle (inline, references, decisions, learnings), active conditions. Tools: Read, Grep, Glob, Write, Bash. No Agent tool.

Parse return: SUCCESS -> extract `filesWritten`, proceed. PARTIAL -> present `questions` via AskUserQuestion, re-spawn with answers. FAILED -> stop. Surface any `triggeredConditions` to user.

### 5d. Draft and Commit Architecture

```bash
$GP epic:architecture-draft --epic $EPIC_NAME --json
```

### 5e. Architecture Refinement Loop

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). Use the **Architecture Loop Parameters** at the end of this file.

Set `maxIterations = parseInt($GP_CREATE_EPIC_MAX_ITERATIONS) || 3`.

Use `$TMPDIR/architecture-refining/` as the run directory (following iteration-loop.md's round-based structure: `round-{N}/reviews/`, `round-{N}/merged.md`).

Each round follows the iteration-loop.md pattern: Reviewer Spawn -> Synthesis -> Editor -> Exit Criteria Evaluation. The `refine:*` commands are called at each stage per the iteration-loop.md protocol to create an auditable event trail.

### 5f. Commit Architecture

After refinement converges:

```bash
$GP epic:architecture-commit --epic $EPIC_NAME --json
```

Log: `[create-epic] Architecture refinement complete. Rounds: {N}, Scores: {scores}, Reason: {reason}`

### 5g. Architecture Shape Checkpoint

```bash
$GP epic:architecture-shape-start --epic $EPIC_NAME --json
```

Check steering preference via `$GP epic:show --epic $EPIC_NAME --json`:

- **Autonomous steering**: Call `$GP epic:architecture-shape-auto --epic $EPIC_NAME --json` to auto-approve.
- **Collaborative steering** (default): Present a summary of the architecture to the user. Use AskUserQuestion: "Architecture shape is ready for review. Here's a summary: {key subsystems, boundaries, communication patterns}. Approve this architecture shape? / Request changes?" On approval, call `$GP epic:architecture-shape-approve --epic $EPIC_NAME --json`.

## Step 6 — P4: Autonomous Pressure-Test

After architecture shape is approved:

### 6a. Spawn Pressure-Test-Phase Agent

Spawn `pressure-test-phase` with: architecture-target file paths (from `epic:show` response), subsystem context (from `subsystem:list --json`), epic goal path, conventions path, inline context and reference paths from context bundle. Tools: Read, Grep, Glob, Write. No Agent tool. No Bash.

The agent analyzes the architecture across five failure-mode classes:
- **Scalability risks** — components that won't scale with expected growth
- **Integration fragility** — coupling points, brittle interfaces, missing error handling
- **Assumption violations** — implicit assumptions that could be wrong
- **Missing capabilities** — gaps in the architecture for stated goals
- **Operational blind spots** — deployment, monitoring, debugging gaps

Parse return: SUCCESS -> extract `filesWritten` and `findings` array. PARTIAL -> log warning, proceed with available findings. FAILED -> stop with error.

### 6b. Draft and Commit Pressure-Test

```bash
$GP epic:pressure-test-draft --epic $EPIC_NAME --json
```

```bash
$GP epic:pressure-test-commit --epic $EPIC_NAME --json
```

### 6c. Finding Dispositions

For each finding in the pressure-test report, present to the user and record disposition:

1. Present the finding: class, severity, description, affected subsystem(s), recommendation.
2. Use AskUserQuestion: "How do you want to handle this finding? Accept risk / Mitigate now / Defer to implementation / Dismiss (with reason)"
3. Record the disposition:

```bash
echo '{"findingId":"<id>","disposition":"<accept|mitigate|defer|dismiss>","reason":"<user-reason>"}' | $GP epic:pressure-test-finding-disposition --epic $EPIC_NAME --json
```

All findings must be dispositioned before proceeding to P5.

## Step 7 — P5: Slice-Set Shape (Mixed: Collaborative Q&A + Autonomous Draft/Refine)

### 7a. Slices Q&A

Use AskUserQuestion to discuss slice scope and ordering:

- How should the work be broken down into sequential slices?
- What's the natural ordering and dependencies between slices?
- What's the right size for each slice? (Target: each slice completable in 1-3 sessions)
- Any slices that could be done in parallel?
- What are the verification criteria for each slice?

Continue until the user signals readiness.

### 7b. Write Q&A Summary

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

### 7c. Spawn Slices-Phase Agent

Check steering preference via `$GP epic:show --epic $EPIC_NAME --json`.

Spawn `slices-phase` with: epic name, Q&A summary path (`$TMPDIR/slices-qa.md`), temp directory (`$TMPDIR/slices-draft`), goal, ContextBundle (inline, references). Tools: Read, Grep, Glob, Write. No Agent tool.

Parse return: SUCCESS -> extract `filesWritten` and `slices` array (`{name, goal}` pairs). PARTIAL -> present `questions` via AskUserQuestion, re-spawn with answers. FAILED -> stop.

### 7d. Create Slices via CLI

For each slice in the agent's `slices` array, create via CLI:

```bash
echo '{"name":"<slice-name>","goal":"<slice-goal>"}' | $GP slice:create --epic $EPIC_NAME --json
```

Use the structured `{name, goal}` metadata from the agent return — do not parse goal.md file contents.

If any `slice:create` call fails, stop immediately and surface the error. Partial slice creation is acceptable — re-entry will detect existing slices on the next run.

### 7e. Draft and Commit Slices

```bash
$GP epic:slices-draft --epic $EPIC_NAME --json
```

### 7f. Slices Refinement Loop

Same pattern as architecture refinement (Step 5e), using the **Slices Loop Parameters** at the end of this file. Initialize fresh tracking state per iteration-loop.md.

Use `$TMPDIR/slices-refining/` as the run directory (separate from architecture refinement to avoid artifact collision).

Each round follows the iteration-loop.md pattern with `refine:*` commands for the `slices` artifact.

### 7g. Commit Slices

After refinement converges:

```bash
$GP epic:slices-commit --epic $EPIC_NAME --json
```

Log: `[create-epic] Slices refinement complete. Rounds: {N}, Scores: {scores}, Reason: {reason}`

### 7h. Slice-Set Shape Checkpoint

```bash
$GP epic:slice-set-shape-start --epic $EPIC_NAME --json
```

Check steering preference via `$GP epic:show --epic $EPIC_NAME --json`:

- **Autonomous steering**: Call `$GP epic:slice-set-shape-auto --epic $EPIC_NAME --json` to auto-approve.
- **Collaborative steering** (default): Present a summary of the slice set to the user. Use AskUserQuestion: "Slice-set shape is ready for review. Here's a summary: {slice count, ordering, key dependencies}. Approve this slice-set shape? / Request changes?" On approval, call `$GP epic:slice-set-shape-approve --epic $EPIC_NAME --json`.

## Step 8 — Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[create-epic] Artifacts preserved at: $TMPDIR
```

## Step 9 — Done Summary

Present results to the user:

```
**Epic Created and Refined**
- **Epic**: {EPIC_NAME}
- **Architecture refinement rounds**: {count}
- **Architecture final score**: {score}/10
- **Architecture shape**: {approved/auto-approved}
- **Pressure-test findings**: {total count} ({mitigated}/{accepted}/{deferred}/{dismissed})
- **Slices refinement rounds**: {count}
- **Slices final score**: {score}/10
- **Slice-set shape**: {approved/auto-approved}
- **Slices created**: {count}
- **Next step**: /gp:start-epic {EPIC_NAME}
```

## Architecture Loop Parameters

Parameters for the iteration-loop.md shared reference (auto-included in Step 5e above):

| Parameter | Value |
|---|---|
| **max_iterations** | 3 (override via `$GP_CREATE_EPIC_MAX_ITERATIONS` env var for test harness cost control) |
| **override_flag** | `--override` — appended to submit command on stagnation/reduction/cap exits |
| **run_dir_mode** | `temp` |
| **artifact** | `architecture` -- passed to all `refine:*` commands as `--artifact architecture` |
| **scope_flag** | `--epic $EPIC_NAME` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"architecture-proposal"` |

## Slices Loop Parameters

Parameters for the iteration-loop.md shared reference (used in Step 7f above):

| Parameter | Value |
|---|---|
| **max_iterations** | 3 (override via `$GP_CREATE_EPIC_MAX_ITERATIONS` env var for test harness cost control) |
| **override_flag** | `--override` — appended to submit command on stagnation/reduction/cap exits |
| **run_dir_mode** | `temp` |
| **artifact** | `slices` -- passed to all `refine:*` commands as `--artifact slices` |
| **scope_flag** | `--epic $EPIC_NAME` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir means prior rounds may exist on re-entry |
| **review_context** | `"slice-definitions"` |

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **slice:create failure**: Stop immediately, surface error. Partial creation is OK — re-entry handles it.
- **Shape checkpoint failure**: If `epic:architecture-shape-start` or `epic:slice-set-shape-start` fails, surface the error. The user may need to re-run `create-epic` to retry.
- **Pressure-test agent failure**: If the pressure-test agent fails, log the error and ask the user whether to skip pressure-testing and proceed to slices, or abort.
- **Finding disposition failure**: If `epic:pressure-test-finding-disposition` fails for a finding, surface the error and retry. All findings must be dispositioned before proceeding.
