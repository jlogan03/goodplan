# Iteration Loop — Shared Reference

@${CLAUDE_PLUGIN_ROOT}/skills/_references/output-templates.md

Shared orchestration skeleton for iterative review-and-edit skills (plan-slice refinement, create-epic architecture/slice refinement, etc.). Each skill's SKILL.md defines a **Loop Parameters** section that fills in the skill-specific parameter slots defined in the Loop Parameters Schema below.

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

**Resume detection**: If the run directory already exists, check for completed round directories (`round-N/merged.md`). If rounds exist but the refinement isn't complete, this is a resume. Present the iteration history to the user and ask whether to resume or start fresh.

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

5. **Model downgrade**: For subsequent iterations where all previous scores were 8+ and only MINOR issues remain, consider `model: "sonnet"` to reduce cost.

## Synthesis Prompt Skeleton

After all foreground reviewer agents return (they were launched in a single message, so this happens automatically — no polling or sleeping):

1. **Collect summaries**: Capture each reviewer's one-line return value. Concatenate into a newline-separated list.

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

4. **Use the summary, not the file**: The synthesis agent returns a compact summary. Use that for loop decisions (scores, severity counts, stall detection). Do NOT read `merged.md` yourself — pass its path to the editor sub-agent.

### Display Iteration Summary

After synthesizing feedback, display the iteration results to the user using the **Iteration Summary Template** from output-templates.md (auto-included above). This must be shown every iteration.

### Handling USER_INPUT

When the synthesis summary reports USER_INPUT items:
1. Read the `### Unresolved (USER_INPUT required)` section of merged.md
2. Present all questions in a single batch via AskUserQuestion
3. Append a `### USER_INPUT Resolved` section to merged.md with each question and answer

### Handling RESEARCH_NEEDED

When the synthesis summary reports RESEARCH_NEEDED items:
1. Read the `### RESEARCH_NEEDED` section of merged.md
2. Spawn one research sub-agent per topic in parallel (`model: "opus"`)
3. Each agent writes results to a research directory (skill-specific location)
4. Append a `### Available Research` section to merged.md listing result file paths
5. For CODEBASE_EXPLORATION items, use Grep/Glob/Read instead of external search

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

4. **Model downgrade**: For iterations with only MINOR DIRECTLY_ACTIONABLE items, consider `model: "sonnet"`.

## Exit Criteria Evaluation

The orchestrator (not reviewers, not the synthesis agent) decides when to exit. Each consuming skill defines a **Loop Parameters** section in its SKILL.md that fills the parameter slots below.

### Loop Parameters Schema

| Parameter | Description | Default |
|---|---|---|
| `max_iterations` | Upper bound on loop iterations | Skill-specific (plan-slice/create-side-quest: 10, create-epic: 3, implement: 12) |
| `early_exit_threshold` | Optional score threshold for early exit before max_iterations | Optional (implement only: iteration >= 5 AND all scores >= 8) |
| `override_flag` | Optional `--override` CLI flag appended to submit on stagnation/reduction/cap exits | Optional (create-epic and create-side-quest only) |
| `run_dir_mode` | `temp` (ephemeral working directory) or `persistent` (git-committed run directory) | `temp` |
| `submit_command` | Skill-specific CLI command to submit refinement results | Skill-specific |
| `resume_detection` | Whether to check for incomplete run directories and offer resume | Optional (implement only) |
| `stagnation_window` | Consecutive rounds with identical net score before exiting | 2 |
| `reduction_exit_threshold` | Total rounds (any position, not necessarily consecutive) with net score decrease before exiting — counter never resets on improvement | 2 |
| `review_context` | Value injected into reviewer prompts (e.g., `"implementation-plan"`, `"architecture-proposal"`, `"code-implementation"`) | Skill-specific |

### Tracking State

Initialize at the start of each refinement loop:

- `reviewerScores = {}` — map of reviewer name to score history array
- `iteration = 0`
- `stagnationCount = 0` — consecutive rounds with no score change (resets on any score change)
- `reductionCount = 0` — total rounds with net score decrease (never resets)

### Exit Condition Evaluation Order

After each round, compute `netScore` as the minimum of all reviewer scores for this round. Then evaluate in order:

1. **Pass**: `netScore >= 9` AND no CRITICAL/IMPORTANT issues → exit loop, submit results.
2. **Early exit** (if `early_exit_threshold` is defined): `iteration >= early_exit_threshold.min_iterations` AND all scores >= `early_exit_threshold.score` AND no CRITICAL/IMPORTANT → exit with warning listing reviewers below full-pass threshold.
3. **Stagnation**: if not the first round and `netScore === previous netScore` (exactly equal) → increment `stagnationCount`. If `stagnationCount >= stagnation_window` → exit loop. If `stagnationCount < stagnation_window`, log warning, continue.
4. **Reduction**: if `netScore < previous netScore` → reset `stagnationCount` to 0, increment `reductionCount`. If `reductionCount >= reduction_exit_threshold` → exit loop.
5. **Improvement**: if `netScore > previous netScore` → reset `stagnationCount` to 0. Continue.
6. **Hard cap**: if `iteration >= max_iterations - 1` → exit loop, present remaining issues.

On exit via stagnation, reduction, or hard cap: if `override_flag` is defined, append it to the `submit_command`. Present remaining issues to the user.

### Final Cleanup Pass

Before exiting (any path — pass, early exit, stagnation, reduction, or hard cap): if the synthesis summary reports DIRECTLY_ACTIONABLE items, spawn one final editor sub-agent to apply fixes. No re-review needed.

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
3. Write to activity-log with `"status":"abandoned"`
4. The files being refined contain partial improvements — they are usable but not fully reviewed

### Resume Protocol

On next invocation, if an incomplete run is detected:
1. Present iteration history from the run directory
2. Ask: resume from last completed iteration, or start fresh?
3. If resuming: re-read current file state, continue from next iteration
4. If starting fresh: delete run directory (and backup if applicable), begin from scratch
