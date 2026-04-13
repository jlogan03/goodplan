# Iteration Loop — Shared Reference

@${CLAUDE_PLUGIN_ROOT}/skills/_references/output-templates.md

Shared orchestration skeleton for iterative review-and-edit skills (plan-slice refinement, create-epic architecture/slice refinement, etc.). Each skill's SKILL.md defines a **Loop Parameters** section that fills in the skill-specific parameter slots defined in the Loop Parameters Schema below.

## Refinement Event Protocol (`refine:*` Commands)

When the consuming skill provides an `artifact_type` parameter (e.g., `architecture`, `slices`, `implementation-plan`) and the scope is an epic, the iteration loop calls `refine:*` CLI commands at each stage to create an auditable event trail. These commands are **conditional on epic scope** — for non-epic refinement (e.g., plan-slice for standalone slices), the iteration loop works without them.

| Loop Stage | CLI Command | When to Call |
|---|---|---|
| Start of refinement loop | `$GP refine:start --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json` | Once at loop entry (before round 1) |
| After each reviewer returns | `echo '{"dimensions":[...],"findings":[...]}' \| $GP refine:score --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --reviewer $REVIEWER_ID --json` | Per reviewer per round |
| After synthesis completes | `$GP refine:synthesize --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json` (stdin: synthesis payload) | Once per round |
| After editor applies fixes | `$GP refine:revise --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json` | Once per round |
| Exit evaluation (read-only) | `$GP refine:evaluate --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json` | Once per round (checks convergence) |
| Pass (all scores >= 9, no critical/important) | `$GP refine:converge --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json` | On successful exit |
| Circuit breaker (stagnation/reduction/cap) | `$GP refine:stuck --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json` | On non-pass exit |
| Force advance | `$GP refine:override --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --reason="reason" --json` | On user-forced exit |

The `--artifact-type` value is skill-specific and must be defined in the consuming skill's Loop Parameters (e.g., `architecture`, `slices`, `implementation-plan`).

## Round Flow

Each round follows this sequence:

1. **Reviewer spawn** -> parallel review
2. **Record reviewer scores** via `refine:score` (if epic scope with `artifact_type` parameter)
3. **Write reviewer output** to round directory
4. **Synthesis** -> merged.md + structured return
5. **Record synthesis** via `refine:synthesize` (if epic scope with `artifact_type` parameter)
6. **Display** iteration summary to user
7. **USER_INPUT handling** (if `hasUserInput`)
8. **RESEARCH_NEEDED handling** (if `hasResearchNeeded`)
9. **Exit evaluation** — check pass/stagnation/reduction/cap; call `refine:evaluate` (if epic scope)
   - **If continuing**: increment iteration, update scores -> spawn full editor -> call `refine:revise` (if epic scope) -> next round
   - **If exiting (pass)**: final cleanup pass (DIRECTLY_ACTIONABLE only) -> call `refine:converge` (if epic scope) -> submit
   - **If exiting (stagnation/reduction/cap)**: final cleanup pass -> call `refine:stuck` (if epic scope) -> submit with override
   - **If exiting (user override)**: call `refine:override` (if epic scope) -> submit with override

## Run Directory Structure

All review artifacts live in a run directory, separate from the files being refined.

```
<run-dir>/
  goal.md                    # Confirmed goal for this refinement
  round-1/
    reviews/
      <reviewer-name>.md     # Individual reviewer output
    merged.md                # Synthesized feedback
  round-2/
    reviews/
    merged.md
  ...
```

**Naming convention**: The run directory is named `<thing>-refining/` — e.g., `plan-refining/`, `architecture-refining/`. It is co-located with the files being refined.

**Resume detection** (only when `resume_detection` is enabled in the consuming skill's Loop Parameters): If the run directory already exists, check for completed round directories (`round-N/merged.md`). If rounds exist but the refinement isn't complete, this is a resume. Present the iteration history to the user and ask whether to resume or start fresh. If `resume_detection` is not enabled, skip this check and start from round 1.

## Reviewer Spawn Pattern

1. **Select reviewers**: Use `@${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md` (auto-included below). Always-on reviewers run every iteration. Specialists are selected based on the orchestrator's understanding of the artifact content — the `Agent` column in the registry identifies each reviewer's agent definition file (`agents/reviewer-*.md`).

@${CLAUDE_PLUGIN_ROOT}/skills/_references/reviewer-registry.md

2. **Parallel spawn**: Launch all selected reviewers in a single message using multiple Agent tool calls so they run concurrently in the **foreground** (do NOT use `run_in_background`). The Agent tool returns results when all foreground agents in the same message complete — no polling or sleep needed. Include `model: "opus"` for full reasoning capability. Each agent is spawned by name (e.g., `reviewer-holistic`, `reviewer-software-architecture`) — the agent definition includes `@` references to the shared preamble and domain-specific criteria.

3. **Bootstrap each reviewer**: Pass the reviewer agent name as the Agent tool's agent parameter. Include in the task prompt:
   - Artifact path(s) to review
   - Review context (e.g., `architecture-proposal`, `implementation-plan`, `code-implementation`)
   - Inline context and reference paths from the context bundle
   - Do not pass full file contents — pass paths only. Reviewers load and explore the codebase themselves.

4. **Context passing**: Reviewers load decisions and codebase context themselves via exploration. Do not pass full file contents in bootstrap — pass paths only.

5. **Write reviewer output to files**: Create the round directory if needed (`mkdir -p <run-dir>/round-{iteration}/reviews/`), then write each reviewer's `review` field to `<run-dir>/round-{iteration}/reviews/{reviewer-name}.md`. The synthesis agent reads these files — it does not receive review content inline.

6. **Record reviewer scores**: After writing reviewer output, if epic scope with `artifact_type` parameter, call `refine:score` for each reviewer:
   ```bash
   echo '{"dimensions":[{"name":"<dim>","score":<n>}],"findings":[...]}' | $GP refine:score --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --reviewer $REVIEWER_ID --json
   ```

7. **Handle reviewer failures**: If a reviewer returns FAILED or an unparseable response, log the failure and exclude it from this round. Continue with remaining reviewers. If the holistic reviewer fails, stop the skill — synthesis cannot produce a meaningful assessment without holistic review.

8. **Model downgrade**: For subsequent iterations where all previous scores were 8+ and only MINOR issues remain, consider `model: "sonnet"` to reduce cost.

## Synthesis Prompt Skeleton

After all foreground reviewer agents return (they were launched in a single message, so this happens automatically — no polling or sleeping):

1. **Collect summaries**: Capture each reviewer's `summary` field from their return JSON. Concatenate into a newline-separated list.

2. **Spawn synthesis sub-agent** (`model: "opus"`): Pass:
   - Review directory path: `<run-dir>/round-{iteration}/reviews/`
   - Concatenated reviewer summaries
   - Output path: `<run-dir>/round-{iteration}/merged.md`

3. **Merged feedback format**: The synthesis agent produces sections in priority order:
   - `### CRITICAL Issues`
   - `### IMPORTANT Issues`
   - `### MINOR Issues`
   - `### DIRECTLY_ACTIONABLE (for loop exit)`
   - `### RESEARCH_NEEDED`
   - `### Contradictions Resolved`
   - `### Unresolved (USER_INPUT required)`

4. **Use the structured return, not the file**: The synthesis agent returns structured fields (`criticalCount`, `importantCount`, `hasUserInput`, `hasResearchNeeded`, `hasDirectlyActionable`, `userInputQuestions`, `researchTopics`). Use these for loop decisions and downstream handling. Do NOT read `merged.md` for decision-making — pass its path to the editor sub-agent. The one exception: you MAY read merged.md to populate the Iteration Summary Template's per-issue table (the synthesis return provides counts but not per-issue detail).

5. **Record synthesis**: After synthesis completes, if epic scope with `artifact_type` parameter:
   ```bash
   echo '{"criticalCount":<n>,"importantCount":<n>,"minorCount":<n>}' | $GP refine:synthesize --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json
   ```

### Display Iteration Summary

After synthesizing feedback, display the iteration results to the user using the **Iteration Summary Template** from output-templates.md (auto-included above). Use the synthesis return's severity counts for the summary line. This must be shown every iteration.

### Handling USER_INPUT

When `hasUserInput` is true in the synthesis return:
1. Present all `userInputQuestions` from the synthesis return in a single batch via AskUserQuestion
2. Append a `### USER_INPUT Resolved` section to merged.md with each question and answer (for the editor to consume)

### Handling RESEARCH_NEEDED

When `hasResearchNeeded` is true in the synthesis return:
1. Use the `researchTopics` from the synthesis return
2. For each topic, spawn a research sub-agent in parallel (`model: "opus"`) using a generic Agent tool call (no dedicated research agent definition). Include in the task prompt: the topic, what to search for, and the output file path. The agent returns a free-form summary — no structured JSON required.
3. For CODEBASE_EXPLORATION topics, spawn the research sub-agent with Read/Grep/Glob tools to explore the codebase (do not explore yourself — delegate to the sub-agent to maintain orchestrator discipline)
4. Each agent writes results to a research directory (skill-specific location)
5. Append a `### Available Research` section to merged.md listing result file paths

## Editor Sub-Agent Pattern

After feedback is synthesized (and USER_INPUT resolved, research complete):

1. **Spawn editor** (`model: "opus"`): Pass:
   - Merged feedback file path
   - File paths being refined
   - Confirmed goal
   - Editor prompt (skill-specific instructions for how to apply feedback)

2. **Editor reads feedback** and applies edits in priority order:
   - CRITICAL (must address)
   - IMPORTANT (should address)
   - DIRECTLY_ACTIONABLE MINOR (if straightforward)
   - USER_INPUT Resolved (treat as DIRECTLY_ACTIONABLE)
   - Skip: unresolved USER_INPUT and RESEARCH_NEEDED

3. **Editor reports**: Changes applied, skipped items, and whether files were modified (YES/NO).

4. **Record revision**: After editor completes, if epic scope with `artifact_type` parameter:
   ```bash
   $GP refine:revise --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json
   ```

5. **Model downgrade**: For iterations with only MINOR DIRECTLY_ACTIONABLE items, consider `model: "sonnet"`.

## Exit Criteria Evaluation

The orchestrator (not reviewers, not the synthesis agent) decides when to exit. Each consuming skill defines a **Loop Parameters** section in its SKILL.md that fills the parameter slots below.

**Evaluate convergence**: If epic scope with `artifact_type` parameter, call `refine:evaluate` to check convergence state:
```bash
$GP refine:evaluate --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json
```
This is read-only and returns the current convergence state. Use it alongside the local exit evaluation below.

### Loop Parameters Schema

| Parameter | Description | Default |
|---|---|---|
| `max_iterations` | Upper bound on loop iterations | Skill-specific (plan-slice/create-side-quest: 10, create-epic: 3, implement: 12) |
| `early_exit_threshold` | Optional score threshold for early exit before max_iterations | Optional (implement only: iteration >= 5 AND all scores >= 8) |
| `override_flag` | Optional `--override` CLI flag appended to submit on stagnation/reduction/cap exits | Optional (create-epic and create-side-quest only) |
| `run_dir_mode` | `temp` (ephemeral working directory) or `persistent` (git-committed run directory) | `temp` |
| `submit_command` | Skill-specific CLI command to submit refinement results. `{REVIEWER_SCORES_JSON}` is a `Record<string, number>` mapping reviewer names to their integer scores from this round (e.g., `{"holistic":8,"software-architecture":9}`). Used by non-epic scopes (plan-slice, implement, create-side-quest). | Skill-specific |
| `artifact_type` | Artifact type for `refine:*` commands (e.g., `architecture`, `slices`, `implementation-plan`). Required for epic-scope refinement where `refine:*` commands replace `submit_command`. Omit for non-epic scopes. | Optional |
| `rubric_path` | Path to rubric YAML for convergence evaluation. Passed to `refine:converge`/`refine:evaluate` via `--rubric-path`. Optional — omit for non-epic scopes that don't use rubric-based convergence. | Optional |
| `resume_detection` | Whether to check for incomplete run directories and offer resume. Enable when the run directory persists across sessions (deterministic temp paths, persistent mode). | Optional |
| `stagnation_window` | Consecutive rounds with unchanged net score that triggers exit. With default value 2: exits after 2 consecutive unchanged rounds (i.e., 3 total rounds with the same score — original + 2 unchanged). | 2 |
| `reduction_exit_threshold` | Total rounds (any position, not necessarily consecutive) with net score decrease before exiting — counter never resets on improvement | 2 |
| `review_context` | Value injected into reviewer prompts (e.g., `"implementation-plan"`, `"architecture-proposal"`, `"code-implementation"`) | Skill-specific |

### Tracking State

Initialize at the start of each refinement loop:

- `reviewerScores = {}` — map of reviewer name to score history array
- `iteration = 0`
- `stagnationCount = 0` — consecutive rounds with no score change (resets on any score change)
- `reductionCount = 0` — total rounds with net score decrease (never resets)

If epic scope with `artifact_type` parameter, also call `refine:start` once at loop entry:
```bash
$GP refine:start --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --json
```

### Exit Condition Evaluation Order

After each round, compute `netScore` as the minimum of all individual reviewer `score` fields from their return JSON for this round (NOT the synthesis agent's aggregate score — that is for documentation only). Then evaluate in order:

1. **Pass**: `netScore >= 9` AND `criticalCount == 0 && importantCount == 0` (from synthesis return) -> exit loop. If epic scope, call `refine:converge`. Submit results.
2. **Early exit** (if `early_exit_threshold` is defined): `iteration >= early_exit_threshold.min_iterations` AND all scores >= `early_exit_threshold.score` AND `criticalCount == 0 && importantCount == 0` -> exit with warning listing reviewers below full-pass threshold.
3. **Stagnation**: if not the first round and `netScore === previous netScore` (exactly equal) -> increment `stagnationCount`. If `stagnationCount >= stagnation_window` -> exit loop. If epic scope, call `refine:stuck`. If `stagnationCount < stagnation_window`, log warning, continue.
4. **Reduction**: if not the first round and `netScore < previous netScore` -> reset `stagnationCount` to 0, increment `reductionCount`. If `reductionCount >= reduction_exit_threshold` -> exit loop. If epic scope, call `refine:stuck`.
5. **Improvement**: if `netScore > previous netScore` -> reset `stagnationCount` to 0. Continue.
6. **Hard cap**: if `iteration >= max_iterations - 1` -> exit loop. If epic scope, call `refine:stuck`. Present remaining issues.

On exit via stagnation, reduction, or hard cap: if `override_flag` is defined, append it to the submit command. Present remaining issues to the user.

**If continuing**: after exit evaluation, increment `iteration`, append each reviewer's score to `reviewerScores[reviewerName]`, then proceed to the editor (full editing pass) and start the next round.

### Final Cleanup Pass

Before exiting (any path — pass, early exit, stagnation, reduction, or hard cap): if the synthesis return's `hasDirectlyActionable` is true, spawn one final editor sub-agent to apply fixes. No re-review needed.

### Completion Summary

On loop completion, the consuming skill's SKILL.md is responsible for displaying the **Completion Summary Template** from output-templates.md. The accumulated `reviewerScores` history provides the Score Progression table data. Do not display it here — the skill provides the skill-specific template fields.

### Max Iterations

If the max is reached, present remaining issues to the user. Produce the output anyway (the files are likely much improved even if not perfect).

## Graceful Stop

State must be recoverable at any interruption point.

### No Changes Made

If stopped before any edits: clean up the run directory (and backup if applicable). Do not update project state files. Tell the user nothing was changed.

### Mid-Iteration

If stopped after at least one iteration:
1. Keep the backup (if the skill uses one) — inform the user of its path and how to restore
2. Keep the run directory with completed rounds
3. The files being refined contain partial improvements — they are usable but not fully reviewed
4. The CLI records activity automatically on state transitions — do not write to activity-log directly

### Resume Protocol

On next invocation, if an incomplete run is detected:
1. Present iteration history from the run directory
2. Ask: resume from last completed iteration, or start fresh?
3. If resuming: re-read current file state, reconstruct tracking state from prior rounds (read reviewer scores from round directories to rebuild `reviewerScores`, compute `stagnationCount`/`reductionCount` from score history, set `iteration` to last completed round), continue from next iteration
4. If starting fresh: delete run directory (and backup if applicable), begin from scratch
