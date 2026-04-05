---
name: plan-slice
description: >
  Orchestrate end-to-end plan creation and refinement for a slice. Runs interactive
  Q&A to capture approach decisions, then autonomously drafts, reviews, and refines
  the plan via sub-agents until quality thresholds are met.
  Common triggers: 'plan and refine a slice', 'end-to-end plan creation', 'orchestrated
  plan slice', 'plan slice end-to-end', 'pipeline plan slice'.
user-invocable: true
requires: gp >= 1.0.0
---

# Plan-Slice Pipeline

Lightweight orchestrator that creates and refines a slice plan in two phases. Spawns sub-agents for all content work — the orchestrator handles only CLI status, agent coordination, and user interaction.

## Context Discipline

**You are an orchestrator.** You MUST NOT use the Read tool on architecture files, plan drafts, source code, or agent definitions. Your context consists of:
- CLI command output (`gp status --json`, `gp slice:show --json`, etc.)
- Sub-agent return values (structured JSON)
- User Q&A responses (from AskUserQuestion)
- Orchestrator-generated files (Q&A output, re-entry summaries, error details from failed sub-agents)
- Temp directory file paths (passed to agents, never read by you)

If you need content-level information, spawn a sub-agent to read and summarize it.

## Phase Table

| Phase | Type | CLI Status Mapping | What Happens |
|---|---|---|---|
| 1. Plan Q&A | Interactive | `created` → `planning` | Ask user about approach, phasing, expected behavior |
| 2. Plan draft + refinement | Autonomous | `planning` → `plan-created` → `refining` → `plan-refined` | Spawn agents: plan-phase → refinement loop |

## Step 0 — Version Check

```bash
GP="gp"
"$GP" --version --json
```

If the command fails, stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Store `$GP` as the CLI binary path for all subsequent commands.

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
| `planning` | Resume Phase 1 — create temp dir, continue Q&A |
| `plan-created` | Skip to Phase 2 — begin refinement |
| `refining` | Resume Phase 2 — continue refinement loop |
| `plan-refined` | Plan already complete. Use AskUserQuestion: "Plan is already refined. View the existing plan / Proceed to /gp:implement" |
| Other | Stop: "Slice is in `{status}` status — not ready for planning." |

## Step 3 — Phase 1: Interactive Q&A

### 3a. Setup

Create a temp working directory:

```bash
TMPDIR="/tmp/gp-plan-slice-${SLICE_NAME}-$(date +%s)"
mkdir -p "$TMPDIR/qa" "$TMPDIR/draft" "$TMPDIR/reviews"
```

Log the temp directory path to stderr for debugging:
```
[plan-slice] Working directory: $TMPDIR
```

### 3b. Status Transition

If slice status is `created`, transition to `planning`:

```bash
$GP slice:plan --slice $SLICE_NAME --json
```

Verify the JSON response indicates a successful transition (no error field). If the transition fails, stop with the error message.

### 3c. Load Slice Goal

```bash
$GP slice:show --slice $SLICE_NAME --json
```

Extract the `goal` field from the response. This is what you present to the user.

### 3d. Interactive Q&A

Present the slice goal to the user and conduct planning Q&A. Ask about:

1. **Approach**: How should this be implemented? Any specific patterns, libraries, or constraints?
2. **Phasing**: What's the natural breakdown into sequential phases? What depends on what?
3. **Expected behavior**: For each phase, what should be observable when it's done? How would you verify it?
4. **Risks and unknowns**: Anything uncertain that might change the approach?

Use AskUserQuestion for each round. Follow up on answers that raise new questions. Continue until the user signals readiness (e.g., "that covers it", "ready to draft").

### 3e. Write Q&A Output

Write the structured Q&A to the temp directory. Use the Write tool to create `$TMPDIR/qa/plan-qa.md` with this format:

```markdown
# Plan Q&A — {SLICE_NAME}

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

## Step 4 — Phase 2: Autonomous Draft & Refinement

### 4a. Context Assembly

Call `start-plan` to assemble the context bundle:

```bash
$GP start-plan --slice $SLICE_NAME --json
```

This returns a `ContextBundle`:
```json
{
  "inline": { "key": "content", ... },
  "references": ["path1", "path2", ...],
  "decisions": [...],
  "learnings": [...]
}
```

The `inline` map contains key-value pairs of pre-read content (architecture, conventions). The `references` array lists paths that exceeded the inline budget.

> **Note (future hardening):** If `references` is very large, consider truncating or prioritizing by relevance. For PoC, pass all references.

### 4b. Load Active Conditions

> **Forward-looking feature:** `reconsiderWhen` (decisions) and `validUntil` (learnings) are planned fields — see `data-model-changes.md` (slice 03). Until the schema changes are implemented, the CLI returns entries without these fields. Gate the filtering: if entries lack these fields, skip condition evaluation in step 4c entirely.

Load decisions and learnings:

```bash
$GP decision:list --json
$GP learning:list --json
```

If entries contain `reconsiderWhen` (decisions) or `validUntil` (learnings) fields, filter for non-empty values. These will be passed to the plan-phase agent for evaluation. If the fields are absent (pre-slice-03), skip condition evaluation.

### 4c. Spawn Plan-Phase Agent

Spawn the `plan-phase` agent using the Agent tool:

```
Agent: plan-phase
Task prompt: |
  Slice: {SLICE_NAME}
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

  Active conditions to evaluate:
  {filtered decisions with reconsiderWhen}
  {filtered learnings with validUntil}
  If any condition is triggered by the current context, include it in your
  return JSON under "triggeredConditions".

  Write the plan to: {TMPDIR}/draft/plan.md

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

Parse the return JSON. Check `status`:
- `SUCCESS` → proceed to submit
- `PARTIAL` → for PoC, log the questions and stop with message to user
- `FAILED` → stop with error message

If `triggeredConditions` is non-empty, surface each to the user: "Decision [title] should be reconsidered — condition triggered: [condition]." Use AskUserQuestion to confirm whether to proceed or stop.

### 4d. Submit Plan Draft

```bash
$GP submit-plan --slice $SLICE_NAME --json
```

This transitions `planning` → `plan-created`.

### 4e. Begin Refinement

```bash
$GP slice:refine-plan --slice $SLICE_NAME --json
```

This transitions `plan-created` → `refining` (via `BEGIN_REFINEMENT`).

### 4f. Refinement Loop

Initialize tracking state:
- `reviewerScores = {}` — map of reviewer name → score history array
- `iteration = 0`
- `stagnationCount = 0` — consecutive rounds with no score change
- `reductionCount = 0` — total rounds with net score reduction
- `planPath = "$TMPDIR/draft/plan.md"`

**Loop** (max 10 iterations):

#### 4f-i. Spawn Refinement Coordinator

```
Agent: refinement-coordinator
Task prompt: |
  Artifact path: {planPath}
  Review context: implementation-plan
  Reviewer registry: skills/implement/references/reviewer-registry.md
  {if iteration > 0: "Previous round synthesis: {TMPDIR}/reviews/synthesis.md"}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Parse return JSON. Extract `reviewers` array. If `status` is `FAILED`, stop with error.

#### 4f-ii. Spawn Reviewer Agents (Parallel)

For each reviewer name from the coordinator's return, spawn in parallel:

```
Agent: {reviewer-name}
Task prompt: |
  Artifact path: {planPath}
  Review context: implementation-plan
  Domain: {domain from reviewer name}

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

Each reviewer returns JSON with `score`, issues, and review text inline.

#### 4f-iii. Write Reviewer Output

Write each reviewer's full return text to `$TMPDIR/reviews/{reviewer-name}.md` using the Write tool. Reviewers are read-only and cannot write files themselves — this step ensures their output is persisted for the synthesis agent.

#### 4f-iv. Spawn Synthesis Agent

Collect the reviewer output file paths from 4f-iii.

```
Agent: synthesis
Task prompt: |
  Reviewer output paths: {list of "$TMPDIR/reviews/{reviewer-name}.md" paths}
  Synthesis output path: {TMPDIR}/reviews/synthesis.md

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

Parse return JSON. Extract `score` (integer).

#### 4f-v. Evaluate Exit Conditions

Extract per-reviewer scores from each reviewer's return JSON. Update `reviewerScores` — append each reviewer's score to its history array. Compute `netScore` as the minimum of all reviewer scores for this round.

Log to stderr:
```
[plan-slice] Round {iteration+1}: netScore={netScore}, reviewerScores={reviewerScores}
```

Check exit conditions:

1. **Pass**: `netScore >= 9` → exit loop, submit plan.
2. **Stagnation**: if this is not the first round and `netScore === previous netScore` (exactly equal) → increment `stagnationCount`. If `stagnationCount >= 2` (two consecutive no-change rounds) → exit loop, submit best version. If `stagnationCount === 1`, log a warning but continue.
3. **Reduction**: if `netScore < previous netScore` → reset `stagnationCount` to 0 and increment `reductionCount`. If `reductionCount >= 2` (two total reduction rounds, any position) → exit loop, submit best version.
4. **Improvement**: if `netScore > previous netScore` → reset `stagnationCount` to 0. Continue.
5. **Hard cap**: if `iteration >= maxIterations - 1` → exit loop, submit best version. Default `maxIterations` is 10. If `$GP_PLAN_SLICE_MAX_ITERATIONS` env var is set, use that value instead (enables cost control in test harness).

If none triggered → proceed to editor.

#### 4f-vi. Spawn Editor Agent

```
Agent: editor
Task prompt: |
  Artifact path: {planPath}
  Synthesis output path: {TMPDIR}/reviews/synthesis.md
  Round number: {iteration + 1}

allowedTools: ["Read", "Grep", "Glob", "Write", "Edit"]
disallowedTools: ["Agent"]
```

Parse return. Increment `iteration`. Loop back to 4f-i.

### 4g. Submit Refinement

After exiting the loop, submit the refinement result with per-reviewer scores:

```bash
echo '{"scores":{REVIEWER_SCORES_JSON}}' | $GP submit-refinement --slice $SLICE_NAME --json
```

Where `REVIEWER_SCORES_JSON` is a JSON object mapping each reviewer name to its final score, e.g. `{"holistic":8,"software-architecture":7,"agent-skill":8}`. Use the last score from each reviewer's history in `reviewerScores`.

> **Transition note:** The existing `/gp:refine-plan` skill (v1.0.3) uses `{"scores":{"overall":<min_score>}}`. This skill uses per-reviewer scores, which is the target format. Both pass the `submitRefinementInputSchema` (`z.record(z.string(), z.number())`). Update the installed refine-plan to per-reviewer format in a later slice to maintain consistency.

Log exit reason to stderr:
```
[plan-slice] Refinement complete. Rounds: {iteration+1}, Scores: {reviewerScores}, Reason: {pass|stagnation|reduction|cap}
```

### 4h. Cleanup

On successful completion (no errors), delete the temp directory: `rm -rf $TMPDIR`. On any error, preserve it for debugging and log:
```
[plan-slice] Artifacts preserved at: $TMPDIR
```

## Step 5 — Done Summary

Present results to the user:

```
**Plan Refined**
- **Slice**: {SLICE_NAME}
- **Refinement rounds**: {count}
- **Final score**: {score}/10
- **Exit reason**: {reason}
- **Next step**: /gp:implement {SLICE_NAME}
```

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| plan-phase | Read, Grep, Glob, Write | Reads context, writes plan draft |
| refinement-coordinator | Read, Grep, Glob | Read-only analysis, returns spawn plan |
| reviewer-* | Read, Grep, Glob | Read-only, returns JSON inline |
| synthesis | Read, Grep, Glob, Write | Reads reviews, writes merged output |
| editor | Read, Grep, Glob, Write, Edit | Reads feedback, modifies plan |

All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy.

## Error Handling

- **CLI command failure**: Log the error, stop, and surface the error message to the user.
- **Sub-agent FAILED status**: Log the agent name and error summary, stop, and tell the user what happened.
- **Sub-agent PARTIAL status**: For this PoC, log the questions/research topics and stop with a message explaining that PARTIAL handling is not yet implemented. Preserve the temp directory.
- **Unexpected return format**: If a sub-agent return cannot be parsed as JSON, log the raw return text to stderr and treat as FAILED.
