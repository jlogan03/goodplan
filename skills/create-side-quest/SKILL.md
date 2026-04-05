---
name: create-side-quest
description: >
  Create a side quest through a 4-phase pipeline: goal capture, exploration,
  plan Q&A, plan draft + refinement. Orchestrates interactive and autonomous
  phases with sub-agents. Common triggers: 'side quest', 'new quest',
  'quick task that needs a plan', 'create quest', 'start a quest'.
user-invocable: true
requires: gp >= 1.0.0
---

# Create-Side-Quest Pipeline

Lightweight orchestrator that creates and refines a side quest through 4 phases. Spawns sub-agents for all content work — the orchestrator handles only CLI status, agent coordination, and user interaction.

## Context Discipline

**You are an orchestrator.** You MUST NOT use the Read tool on architecture files, research files, goal content, plan drafts, source code, or agent definitions. Your context consists of:
- CLI command output (`gp status --json`, `gp quest:show --json`, etc.)
- Sub-agent return values (structured JSON)
- User Q&A responses (from AskUserQuestion)
- Orchestrator-generated files (Q&A summaries, re-entry summaries, error details from failed sub-agents)
- Temp directory file paths (passed to agents, never read by you)

If you need content-level information, spawn a sub-agent to read and summarize it.

For file copying (e.g., agent-produced files to CLI-managed paths), use shell `cp` via Bash tool — not Read+Write, which would pull artifact content into orchestrator context.

## Phase Table

| Phase | Type | CLI Status Mapping | What Happens |
|---|---|---|---|
| 1. Goal capture | Interactive | `created` | Orchestrator asks about quest goal, creates quest via `gp quest:create`, writes `goal.md` |
| 2. Explore | Autonomous | `created` -> `exploring` -> `explored` | Spawns `explore-phase` agent with quest-scoped paths. Quest goal is passed via context bundle from `gp start-explore --quest <name> --inline --json`. |
| 3. Plan Q&A | Interactive | `explored` -> `planning` | Orchestrator runs plan Q&A (approach, phasing, expected behavior) |
| 4. Plan draft + refinement | Autonomous | `planning` -> `plan-created` -> `refining` -> `plan-refined` | Spawns `plan-phase` agent, then refinement-coordinator -> reviewers -> synthesis -> editor loop |

## Step 0 — Version Check

```bash
GP="gp"
"$GP" --version --json
```

If the command fails, stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Store `$GP` as the CLI binary path for all subsequent commands.

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
| `created` | Phase 1 or Phase 3 | Offer to continue with explore (Phase 2), skip to Plan Q&A (Phase 3) if explore is not needed, or re-capture goal |
| `exploring` | Phase 2 | Resume explore (agent idempotent) |
| `explored` | Phase 3 | Skip to plan Q&A |
| `planning` | Phase 3 | Resume plan Q&A |
| `plan-created` | Phase 4 | Skip to plan refinement |
| `refining` | Phase 4 | Resume refinement loop |
| `plan-refined` | Done | Report completion |
| Other | Stop: "Quest is in `{status}` status — not in the create-side-quest pipeline flow." |

Present re-entry context to the user: "Quest **{QUEST_NAME}** is in progress. Completed: {completed phases}. Next: {next phase}. Continue / Go back to a previous phase?"

## Step 3 — Phase 1: Interactive Goal Capture

### 3a. Setup

Create a temp working directory:

```bash
TMPDIR="/tmp/gp-create-side-quest-${QUEST_NAME}-$(date +%s)"
mkdir -p "$TMPDIR" "$TMPDIR/qa" "$TMPDIR/draft" "$TMPDIR/reviews"
```

Log to stderr: `[create-side-quest] Working directory: $TMPDIR`

### 3b. Goal Capture

If the quest doesn't exist yet:

Use AskUserQuestion to ask the user about the quest goal:
- "What is this quest about? What do you want to achieve?"
- Follow up on answers that raise new questions. Cover goal, motivation, and rough scope.
- Continue until the user signals readiness.

Write the goal summary to `$TMPDIR/goal.md` using the Write tool.

Create the quest via CLI:

```bash
echo '{"name":"QUEST_NAME","goal":"<goal-summary>"}' | $GP quest:create --json
```

Verify the response includes `entity` and `status: "created"`.

If the quest already exists (re-entry), load the existing goal from the CLI response (`gp quest:show` output) — do not re-ask.

## Step 4 — Phase 2: Autonomous Explore

### 4a. Status Transition

If quest status is `created`, transition to `exploring`:

```bash
$GP quest:explore --quest $QUEST_NAME --json
```

Verify successful transition. If it fails, stop with the error message.

### 4b. Load Context

```bash
$GP start-explore --quest $QUEST_NAME --inline --json
```

This returns a `ContextBundle` with `inline`, `references`, `decisions`, and `learnings`.

### 4c. Load Active Conditions

```bash
$GP decision:list --json
$GP learning:list --json
```

Filter for entries with non-empty `reconsiderWhen` (decisions) or `validUntil` (learnings). Filter client-side by `entityPath` prefix `quests/QUEST_NAME`. If the fields are absent (forward compat), skip condition evaluation entirely.

### 4d. Spawn Explore-Phase Agent

```
Agent: explore-phase
Task prompt: |
  Quest: {QUEST_NAME}
  Goal: {goal text from quest:show or goal capture}
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
$GP submit-explore --quest $QUEST_NAME --json
```

This transitions `exploring` -> `explored`. No stdin payload required.

## Step 5 — Phase 3: Interactive Plan Q&A

### 5a. Status Transition

If quest status is `explored` or `created` (skipping explore), transition to `planning`:

```bash
$GP quest:plan --quest $QUEST_NAME --json
```

Transitions to `planning`. Verify success.

### 5b. Load Quest Goal

```bash
$GP quest:show --quest $QUEST_NAME --json
```

Extract the `goal` field from the response. This is what you present to the user.

### 5c. Interactive Q&A

Present the quest goal to the user and conduct planning Q&A. Ask about:

1. **Approach**: How should this be implemented? Any specific patterns, libraries, or constraints?
2. **Phasing**: What's the natural breakdown into sequential phases? What depends on what?
3. **Expected behavior**: For each phase, what should be observable when it's done? How would you verify it?
4. **Risks and unknowns**: Anything uncertain that might change the approach?

Use AskUserQuestion for each round. Follow up on answers that raise new questions. Continue until the user signals readiness (e.g., "that covers it", "ready to draft").

### 5d. Write Q&A Output

Write the structured Q&A to the temp directory. Use the Write tool to create `$TMPDIR/qa/plan-qa.md` with this format:

```markdown
# Plan Q&A — {QUEST_NAME}

## Goal
{goal text from CLI}

## Approach
{user's approach decisions}

## Phasing
{user's phasing decisions}

## Expected Behavior
{per-phase expected behavior from user}

## Risks & Unknowns
{anything flagged during Q&A}

## Additional Context
{any follow-up answers that don't fit above}
```

## Step 6 — Phase 4: Autonomous Draft & Refinement

### 6a. Context Assembly

Call `start-plan` to assemble the context bundle:

```bash
$GP start-plan --quest $QUEST_NAME --inline --json
```

This returns a `ContextBundle`.

### 6b. Spawn Plan-Phase Agent

```
Agent: plan-phase
Task prompt: |
  Quest: {QUEST_NAME}
  Q&A output: {TMPDIR}/qa/plan-qa.md
  Temp directory: {TMPDIR}/draft
  Goal: {goal text}

  Inline context:
  {each key-value pair from ContextBundle.inline}

  Reference paths (read as needed):
  {each path from ContextBundle.references}

  Decisions:
  {ContextBundle.decisions summary}

  Learnings:
  {ContextBundle.learnings summary}

  Write the plan to: {TMPDIR}/draft/plan.md

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

Parse the return JSON. Check `status`:
- `SUCCESS` -> proceed to submit
- `PARTIAL` -> log the questions and stop with message to user
- `FAILED` -> stop with error message

### 6c. Submit Plan Draft

```bash
$GP submit-plan --quest $QUEST_NAME --json
```

This transitions `planning` -> `plan-created`.

### 6d. Begin Refinement

```bash
$GP quest:refine-plan --quest $QUEST_NAME --json
```

This transitions `plan-created` -> `refining` (via `BEGIN_QUEST_REFINEMENT`).

### 6e. Refinement Loop

Initialize tracking state:
- `reviewerScores = {}` — map of reviewer name -> score history array
- `iteration = 0`
- `stagnationCount = 0`
- `reductionCount = 0`
- `planPath = "$TMPDIR/draft/plan.md"`
- `maxIterations = parseInt($GP_CREATE_SIDE_QUEST_MAX_ITERATIONS) || 10`

**Loop** (max `maxIterations` iterations):

#### 6e-i. Load Context Bundle

```bash
$GP start-plan --quest $QUEST_NAME --inline --json
```

Returns `ContextBundle` with plan paths, prior review output, decisions, learnings. Reload this at the start of **every** iteration so reviewers and editors see the latest state.

#### 6e-ii. Spawn Refinement Coordinator

```
Agent: refinement-coordinator
Task prompt: |
  Artifact path: {planPath}
  Review context: implementation-plan
  Reviewer registry: @${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md
  {if iteration > 0: "Previous round synthesis: {TMPDIR}/reviews/synthesis.md"}

  Inline context:
  {ContextBundle.inline key-value pairs}

  Reference paths:
  {ContextBundle.references}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Parse return JSON. Extract `reviewers` array. If `status` is `FAILED`, stop with error.

#### 6e-iii. Spawn Reviewer Agents (Parallel)

For each reviewer name from the coordinator's return, spawn in parallel:

```
Agent: {reviewer-name}
Task prompt: |
  Artifact path: {planPath}
  Review context: implementation-plan
  Domain: {domain from reviewer name}

  Inline context:
  {ContextBundle.inline key-value pairs}

  Reference paths:
  {ContextBundle.references}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Each reviewer returns JSON with `score`, issues, and review text inline.

#### 6e-iv. Write Reviewer Output

Write each reviewer's full return text to `$TMPDIR/reviews/{reviewer-name}.md` using the Write tool.

#### 6e-v. Spawn Synthesis Agent

```
Agent: synthesis
Task prompt: |
  Reviewer output paths: {list of "$TMPDIR/reviews/{reviewer-name}.md" paths}
  Synthesis output path: {TMPDIR}/reviews/synthesis.md

  Inline context:
  {ContextBundle.inline key-value pairs}

  Reference paths:
  {ContextBundle.references}

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

#### 6e-vi. Evaluate Exit Conditions

Extract per-reviewer scores from each reviewer's return JSON. Update `reviewerScores`. Compute `netScore` as the minimum of all reviewer scores for this round.

Log to stderr:
```
[create-side-quest] Round {iteration+1}: netScore={netScore}, reviewerScores={reviewerScores}
```

Check exit conditions:
1. **Pass**: `netScore >= 9` -> exit loop.
2. **Stagnation**: if not first round and `netScore === previous netScore` -> increment `stagnationCount`. If `stagnationCount >= 2` -> exit with `--override`. If 1, warn, continue.
3. **Reduction**: if `netScore < previous netScore` -> reset `stagnationCount`, increment `reductionCount`. If `reductionCount >= 2` -> exit with `--override`.
4. **Improvement**: if `netScore > previous netScore` -> reset `stagnationCount`. Continue.
5. **Hard cap**: if `iteration >= maxIterations - 1` -> exit with `--override`.

If none triggered -> proceed to editor.

#### 6e-vii. Spawn Editor Agent

```
Agent: editor
Task prompt: |
  Artifact path: {planPath}
  Synthesis output path: {TMPDIR}/reviews/synthesis.md
  Round number: {iteration + 1}

allowedTools: ["Read", "Grep", "Glob", "Write", "Edit"]
disallowedTools: ["Agent"]
```

Parse return. Increment `iteration`. Loop back to 6e-i.

### 6f. Submit Refinement

After exiting the loop, submit the refinement result with per-reviewer scores:

```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refinement --quest $QUEST_NAME --json
```

If using `--override`:
```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refinement --quest $QUEST_NAME --override --json
```

Log exit reason to stderr:
```
[create-side-quest] Refinement complete. Rounds: {iteration+1}, Scores: {reviewerScores}, Reason: {pass|stagnation|reduction|cap}
```

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

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| explore-phase | Read, Grep, Glob, Write, Bash, WebSearch | Research, brainstorm, write findings |
| plan-phase | Read, Grep, Glob, Write | Reads context, writes plan draft |
| refinement-coordinator | Read, Grep, Glob | Read-only analysis, returns spawn plan |
| reviewer-* | Read, Grep, Glob | Read-only, returns JSON inline |
| synthesis | Read, Grep, Glob, Write | Reads reviews, writes merged output |
| editor | Read, Grep, Glob, Write, Edit | Reads feedback, modifies plan |

All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy.

## Error Handling

- **CLI command failure**: Log the error, stop, and surface the error message to the user.
- **Sub-agent FAILED status**: Log the agent name and error summary, stop, and tell the user what happened. Preserve temp directory.
- **Sub-agent PARTIAL status**: For plan-phase PARTIAL, log the questions and stop. For explore-phase PARTIAL, present summary and ask user (see Phase 2).
- **Unexpected return format**: If a sub-agent return cannot be parsed as JSON, log the raw return text to stderr and treat as FAILED.
- **Graceful stop**: If user requests early exit or the agent encounters an unrecoverable CLI error, save progress to current quest status and report what was completed. Do not leave quest in an intermediate state without a valid status.
