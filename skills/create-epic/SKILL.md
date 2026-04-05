---
name: create-epic
description: >
  Create a new epic through a 6-phase pipeline: goal capture, exploration,
  architecture Q&A, architecture draft + refinement, slices Q&A, slices draft
  + refinement. Orchestrates interactive and autonomous phases with sub-agents.
  Common triggers: 'create epic', 'new epic', 'start project', 'new project',
  'I have a new idea', 'add epic', 'start fresh'.
user-invocable: true
requires: gp >= 1.0.0
---

# Create-Epic Pipeline

Lightweight orchestrator that creates and refines an epic through 6 phases. Spawns sub-agents for all content work — the orchestrator handles only CLI status, agent coordination, and user interaction.

## Context Discipline

**You are an orchestrator.** You MUST NOT use the Read tool on architecture files, research files, goal content, plan drafts, source code, or agent definitions. Your context consists of:
- CLI command output (`gp status --json`, `gp epic:show --json`, etc.)
- Sub-agent return values (structured JSON)
- User Q&A responses (from AskUserQuestion)
- Orchestrator-generated files (Q&A summaries, re-entry summaries, error details from failed sub-agents)
- Temp directory file paths (passed to agents, never read by you)

If you need content-level information, spawn a sub-agent to read and summarize it.

For file copying (e.g., agent-produced files to CLI-managed paths), use shell `cp` via Bash tool — not Read+Write, which would pull artifact content into orchestrator context.

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

```bash
GP="gp"
"$GP" --version --json
```

If the command fails, stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Store `$GP` as the CLI binary path for all subsequent commands.

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
| `exploring` | Resume Phase 2 — re-spawn explore-phase with continuation. |
| `explored` | Skip to Phase 3 (architecture Q&A). |
| `defining-architecture` | Resume Phase 3 — continue architecture Q&A. |
| `architecture-defined` | Skip to Phase 4 refinement — begin refinement loop. |
| `refining-architecture` | Resume Phase 4 — continue refinement loop. |
| `architecture-refined` | Skip to Phase 5 (slices Q&A). |
| `defining-slices` | Resume Phase 5 — continue slices Q&A. |
| `slices-defined` | Skip to Phase 6 refinement — begin refinement loop. |
| `refining-slices` | Resume Phase 6 — continue refinement loop. |
| `slices-refined` | Pipeline already complete. Use AskUserQuestion: "Epic is fully defined. View status / Activate with /gp:start-epic" |
| `activated` | Epic already active. Inform user. |
| Other | Stop: "Epic is in `{status}` status — not in the create-epic pipeline flow." |

Present re-entry context to the user: "Epic **{EPIC_NAME}** is in progress. Completed: {completed phases}. Next: {next phase}. Continue / Go back to a previous phase?"

If the user says "go back", re-enter an earlier phase with existing artifacts preserved. The CLI state may need manual override for backward movement — use the earliest valid status for the target phase.

## Step 3 — Phase 1: Interactive Goal Capture

### 3a. Setup

Create a temp working directory:

```bash
TMPDIR="/tmp/gp-create-epic-${EPIC_NAME}-$(date +%s)"
mkdir -p "$TMPDIR"
```

Log to stderr: `[create-epic] Working directory: $TMPDIR`

### 3b. Goal Capture

If the epic doesn't exist yet:

Use AskUserQuestion to ask the user about the epic goal:
- "What is this epic about? What do you want to achieve?"
- Follow up on answers that raise new questions. Cover goal, motivation, and rough scope.
- Continue until the user signals readiness.

Write the goal summary to `$TMPDIR/goal.md` using the Write tool.

Create the epic via CLI:

```bash
echo '{"name":"EPIC_NAME","goal":"<goal-summary>"}' | $GP epic:create --json
```

Verify the response includes `entity` and `status: "created"`.

If the epic already exists (re-entry), load the existing goal from the CLI response (`gp epic:show` output) — do not re-ask.

### 3c. Expertise Calibration

Use the guard pattern and format from expertise-tracking.md (auto-included above).

Load existing expertise data (if any) to calibrate communication depth for the rest of this epic. If the user's expertise profile doesn't exist yet, observe their responses during goal capture to build an initial profile. Update the expertise file following the guard and format from the reference.

## Step 4 — Phase 2: Autonomous Explore

### 4a. Status Transition

If epic status is `created`, transition to `exploring`:

```bash
$GP epic:explore --epic $EPIC_NAME --json
```

Verify successful transition. If it fails, stop with the error message.

### 4b. Load Context

```bash
$GP start-explore --epic $EPIC_NAME --json
```

This returns a `ContextBundle` with `inline`, `references`, `decisions`, and `learnings`.

### 4c. Load Active Conditions

```bash
$GP decision:list --json
$GP learning:list --json
```

Filter for entries with non-empty `reconsiderWhen` (decisions) or `validUntil` (learnings). Filter client-side by `entityPath` prefix `epics/EPIC_NAME`. If the fields are absent (forward compat), skip condition evaluation entirely.

### 4d. Spawn Explore-Phase Agent

```
Agent: explore-phase
Task prompt: |
  Epic: {EPIC_NAME}
  Goal: {goal text from epic:show or goal capture}
  Temp directory: {TMPDIR}

  Inline context:
  {each key-value pair from ContextBundle.inline}

  Reference paths (read as needed):
  {each path from ContextBundle.references}

  Decisions:
  {ContextBundle.decisions summary}

  Learnings:
  {ContextBundle.learnings summary}

  Active conditions to evaluate:
  {filtered decisions with reconsiderWhen}
  {filtered learnings with validUntil}
  If any condition is triggered by the current context, include it in your
  return JSON under "triggeredConditions".

  Write research and brainstorm findings to: {TMPDIR}/

allowedTools: ["Read", "Grep", "Glob", "Write", "Bash", "WebSearch"]
disallowedTools: ["Agent"]
```

### 4e. Handle Explore-Phase Return

Parse the return JSON. Check `status`:

- **PARTIAL**: The explore-phase agent returns PARTIAL after each research cycle. Present the `summary` field to the user via AskUserQuestion: "Here's what was found so far: {summary}. Continue exploring? / That's enough research."
  - If continue: re-spawn the explore-phase agent with `continuationFile` path and instruction to continue.
  - If done: re-spawn the explore-phase agent with `continuationFile` path and instruction to "finalize" — agent writes explore-complete summary and returns SUCCESS.
- **SUCCESS**: Proceed to submit.
- **FAILED**: Stop with error message. Preserve temp directory.

If `triggeredConditions` is non-empty, surface each to the user: "Decision **{title}** should be reconsidered — condition triggered: {condition}." Use AskUserQuestion to confirm whether to proceed or stop.

### 4f. Submit Explore

```bash
$GP submit-explore --epic $EPIC_NAME --json
```

This transitions `exploring` -> `explored`. No stdin payload required.

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

Derive architecture output path from convention: `.goodplan/epics/EPIC_NAME/architecture/`

```
Agent: architecture-phase
Task prompt: |
  Epic: {EPIC_NAME}
  Q&A summary: {TMPDIR}/architecture-qa.md
  Architecture output directory: .goodplan/epics/{EPIC_NAME}/architecture/
  Goal: {goal text}

  Inline context (from start-architecture):
  {each key-value pair from ContextBundle.inline}

  Reference paths (read as needed):
  {each path from ContextBundle.references}

  Decisions:
  {ContextBundle.decisions summary}

  Learnings:
  {ContextBundle.learnings summary}

  Active conditions to evaluate:
  {filtered conditions from Step 4c}

  Write architecture files directly to the output directory.

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

Parse return JSON. Check `status`:
- **SUCCESS**: Extract `filesWritten`. Proceed to submit.
- **PARTIAL**: Present `questions` to user via AskUserQuestion. Re-spawn with `continuationFile` + answers.
- **FAILED**: Stop with error message.

If `triggeredConditions` is non-empty, surface to user.

### 6b. Submit Architecture

```bash
$GP submit-architecture --epic $EPIC_NAME --json
```

Transitions `defining-architecture` -> `architecture-defined`. No stdin payload required.

### 6c. Begin Refinement

```bash
$GP epic:refine-architecture --epic $EPIC_NAME --json
```

Transitions `architecture-defined` -> `refining-architecture`.

### 6d. Architecture Refinement Loop

Initialize tracking state:
- `reviewerScores = {}` — map of reviewer name -> score history array
- `iteration = 0`
- `stagnationCount = 0`
- `reductionCount = 0`
- `maxIterations = parseInt($GP_CREATE_EPIC_MAX_ITERATIONS) || 3`

Available reviewers: see `@${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md` (auto-included via iteration-loop.md) for the full set of 20 reviewers. Select always-on reviewers plus relevant specialists based on the artifact content.

**Loop** (max `maxIterations` iterations):

#### 6d-i. Load Context Bundle

```bash
$GP start-refine-architecture --epic $EPIC_NAME --json
```

Returns `ContextBundle` with architecture paths, prior review output, decisions, learnings.

#### 6d-ii. Spawn Refinement Coordinator

```
Agent: refinement-coordinator
Task prompt: |
  Review context: architecture-proposal
  Reviewer registry: @${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md
  {if iteration > 0: "Previous round synthesis: {TMPDIR}/reviews/architecture-synthesis.md"}

  Inline context:
  {ContextBundle.inline key-value pairs}

  Reference paths:
  {ContextBundle.references}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Parse return JSON. Extract `reviewers` array. If `status` is `FAILED`, stop with error.

#### 6d-iii. Spawn Reviewer Agents (Parallel)

For each reviewer name from the coordinator's return, spawn in parallel:

```
Agent: {reviewer-name}
Task prompt: |
  Review context: architecture-proposal
  Epic: {EPIC_NAME}

  Inline context:
  {ContextBundle.inline key-value pairs}

  Reference paths:
  {ContextBundle.references}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Each reviewer returns JSON with `score`, issues, and `review` text inline.

#### 6d-iv. Write Reviewer Output

Write each reviewer's `review` text to `$TMPDIR/reviews/{reviewer-name}.md` using the Write tool.

#### 6d-v. Spawn Synthesis Agent

```
Agent: synthesis
Task prompt: |
  Reviewer output paths: {list of "$TMPDIR/reviews/{reviewer-name}.md" paths}
  Synthesis output path: {TMPDIR}/reviews/architecture-synthesis.md

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

Parse return JSON.

#### 6d-vi. Pre-Submit Gate

Check the synthesis output summary for CRITICAL or IMPORTANT issues. If present, spawn editor agent to revise architecture artifacts before submitting:

```
Agent: editor
Task prompt: |
  Review context: architecture-proposal
  Synthesis output path: {TMPDIR}/reviews/architecture-synthesis.md
  Architecture directory: .goodplan/epics/{EPIC_NAME}/architecture/
  Round number: {iteration + 1}

allowedTools: ["Read", "Grep", "Glob", "Write", "Edit"]
disallowedTools: ["Agent"]
```

#### 6d-vii. Evaluate Exit Conditions

Extract per-reviewer scores from each reviewer's return JSON. Update `reviewerScores` — append each reviewer's score to its history array. Compute `netScore` as the minimum of all reviewer scores for this round.

Log to stderr:
```
[create-epic] Architecture round {iteration+1}: netScore={netScore}, reviewerScores={reviewerScores}
```

#### 6d-viii. Submit Round

```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refine-architecture --epic $EPIC_NAME --json
```

Where `REVIEWER_SCORES_JSON` maps each reviewer name to its score for this round.

Check `response.advanced` (boolean):
- **true**: Refinement complete. Exit loop.
- **false**: Continue.

#### 6d-ix. Check Loop Exit

1. **Pass**: `netScore >= 9` -> exit loop.
2. **Stagnation**: if not first round and `netScore === previous netScore` -> increment `stagnationCount`. If `stagnationCount >= 2` -> exit loop with `--override`. If `stagnationCount === 1`, log warning, continue.
3. **Reduction**: if `netScore < previous netScore` -> reset `stagnationCount`, increment `reductionCount`. If `reductionCount >= 2` -> exit loop with `--override`.
4. **Improvement**: if `netScore > previous netScore` -> reset `stagnationCount`. Continue.
5. **Hard cap**: if `iteration >= maxIterations - 1` -> exit loop with `--override`.

If using `--override`:
```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refine-architecture --epic $EPIC_NAME --override --json
```

If none triggered: increment `iteration`, loop back to 6d-i.

Log exit reason to stderr:
```
[create-epic] Architecture refinement complete. Rounds: {iteration+1}, Scores: {reviewerScores}, Reason: {pass|stagnation|reduction|cap}
```

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

```
Agent: slices-phase
Task prompt: |
  Epic: {EPIC_NAME}
  Q&A summary: {TMPDIR}/slices-qa.md
  Temp directory: {TMPDIR}/slices-draft
  Goal: {goal text}

  Inline context (from start-slices):
  {each key-value pair from ContextBundle.inline}

  Reference paths:
  {each path from ContextBundle.references}

  Write sequencing.md and per-slice goal.md files to the temp directory.

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

Parse return JSON. Check `status`:
- **SUCCESS**: Extract `filesWritten` and `slices` array (`{name, goal}` pairs).
- **PARTIAL**: Present `questions` to user via AskUserQuestion. Re-spawn with `continuationFile` + answers.
- **FAILED**: Stop with error message.

### 8b. Create Slices via CLI

For each slice in the agent's `slices` array, create via CLI:

```bash
echo '{"name":"<slice-name>","goal":"<slice-goal>"}' | $GP slice:create --epic $EPIC_NAME --json
```

Use the structured `{name, goal}` metadata from the agent return — do not parse goal.md file contents.

If any `slice:create` call fails, stop immediately and surface the error. Partial slice creation is acceptable — re-entry will detect existing slices on the next run.

### 8c. Copy Artifacts

Copy sequencing.md and goal.md files from temp dir to locations indicated by CLI response paths using shell `cp` via Bash tool (not Read+Write).

### 8d. Submit Slices

```bash
$GP submit-slices --epic $EPIC_NAME --json
```

Transitions `defining-slices` -> `slices-defined`.

### 8e. Begin Refinement

```bash
$GP epic:refine-slices --epic $EPIC_NAME --json
```

Transitions `slices-defined` -> `refining-slices`.

### 8f. Slices Refinement Loop

Same pattern as architecture refinement (Step 6d), with these differences:
- `review_context: "slice-definitions"`
- Context bundle: `$GP start-refine-slices --epic $EPIC_NAME --json`
- Submit: `echo '{"scores":{...}}' | $GP submit-refine-slices --epic $EPIC_NAME --json`
- Override: `$GP submit-refine-slices --epic $EPIC_NAME --override --json`
- Synthesis output: `$TMPDIR/reviews/slices-synthesis.md`
- Editor operates on slice artifacts (sequencing.md, goal.md files) rather than architecture files
- Uses same `maxIterations` and exit conditions as architecture refinement

Initialize fresh tracking state for slices refinement:
- `reviewerScores = {}`
- `iteration = 0`
- `stagnationCount = 0`
- `reductionCount = 0`

**Loop** (max `maxIterations` iterations):

#### 8f-i. Load Context Bundle

```bash
$GP start-refine-slices --epic $EPIC_NAME --json
```

#### 8f-ii. Spawn Refinement Coordinator

```
Agent: refinement-coordinator
Task prompt: |
  Review context: slice-definitions
  Reviewer registry: @${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md
  {if iteration > 0: "Previous round synthesis: {TMPDIR}/reviews/slices-synthesis.md"}

  Inline context:
  {ContextBundle.inline key-value pairs}

  Reference paths:
  {ContextBundle.references}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

#### 8f-iii. Spawn Reviewer Agents (Parallel)

Same pattern as 6d-iii, with `review_context: "slice-definitions"`.

#### 8f-iv. Write Reviewer Output

Write each reviewer's `review` text to `$TMPDIR/reviews/slices-{reviewer-name}.md`.

#### 8f-v. Spawn Synthesis Agent

```
Agent: synthesis
Task prompt: |
  Reviewer output paths: {list of "$TMPDIR/reviews/slices-{reviewer-name}.md" paths}
  Synthesis output path: {TMPDIR}/reviews/slices-synthesis.md

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

#### 8f-vi. Pre-Submit Gate

If synthesis indicates CRITICAL/IMPORTANT issues, spawn editor to revise slice artifacts:

```
Agent: editor
Task prompt: |
  Review context: slice-definitions
  Synthesis output path: {TMPDIR}/reviews/slices-synthesis.md
  Epic: {EPIC_NAME}
  Round number: {iteration + 1}

  Slice artifacts are at paths from ContextBundle.references.

allowedTools: ["Read", "Grep", "Glob", "Write", "Edit"]
disallowedTools: ["Agent"]
```

#### 8f-vii. Evaluate Exit Conditions

Same logic as 6d-vii through 6d-ix. Submit via:

```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refine-slices --epic $EPIC_NAME --json
```

Check `response.advanced`. Use `--override` for stagnation/reduction/cap exits.

Log exit reason to stderr:
```
[create-epic] Slices refinement complete. Rounds: {iteration+1}, Scores: {reviewerScores}, Reason: {pass|stagnation|reduction|cap}
```

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

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| explore-phase | Read, Grep, Glob, Write, Bash, WebSearch | Research, brainstorm, write findings |
| architecture-phase | Read, Grep, Glob, Write | Reads context, writes architecture files |
| slices-phase | Read, Grep, Glob, Write | Reads context, writes slice drafts |
| refinement-coordinator | Read, Grep, Glob | Read-only analysis, returns spawn plan |
| reviewer-* | Read, Grep, Glob | Read-only, returns JSON inline |
| synthesis | Read, Grep, Glob, Write | Reads reviews, writes merged output |
| editor | Read, Grep, Glob, Write, Edit | Reads feedback, modifies artifacts |

All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy.

## Error Handling

- **CLI command failure**: Log the error, stop, and surface the error message to the user.
- **Sub-agent FAILED status**: Log the agent name and error summary, stop, and tell the user what happened. Preserve temp directory.
- **Sub-agent PARTIAL status**: Present `questions` to user via AskUserQuestion. If `researchTopics` present, log them. Re-spawn agent with `continuationFile` + resolved answers.
- **Unexpected return format**: If a sub-agent return cannot be parsed as JSON, log the raw return text to stderr and treat as FAILED.
- **slice:create failure**: Stop immediately, surface error. Partial creation is OK — re-entry handles it.
