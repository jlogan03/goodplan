# Iteration Loop — Shared Reference

Shared orchestration skeleton for iterative review-and-edit skills (refine-plan, refine-architecture, etc.). Each skill's SKILL.md defines a **Loop Parameters** section that fills in the skill-specific slots listed below.

## Skill-Specific Parameters

Each consuming skill must define these in its own SKILL.md:

| Parameter | Description |
|---|---|
| **Reviewer list** | Which reviewers run always vs conditionally |
| **Exit criteria** | Score thresholds for full pass |
| **Early exit** | Score thresholds + minimum iteration count for early exit |
| **Max iterations** | Upper bound on loop iterations |
| **Editor prompt path** | Path to the editor sub-agent prompt (in skill's `references/`) |
| **Score thresholds** | Numeric thresholds for full pass and early exit |
| **Scope constraints** | What files/directories the skill operates on |
| **Working directory** | Where edits happen (in-place or working copy) |
| **Run directory** | Where review artifacts are stored |
| **Backup directory** | Where the pre-refinement backup lives (if applicable) |
| **review_context** | Value injected into reviewer prompts (e.g., "an implementation plan", "project architecture files") |

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

1. **Select reviewers**: Read the skill's `references/reviewer-registry.md`. Always-on reviewers run every iteration. Specialists are selected based on the orchestrator's understanding of the content.

2. **Parallel spawn**: Launch all selected reviewers in a single message using multiple Agent tool calls so they run concurrently in the **foreground** (do NOT use `run_in_background`). The Agent tool returns results when all foreground agents in the same message complete — no polling or sleep needed. Include `model: "opus"` for full reasoning capability.

3. **Bootstrap each reviewer**: Use the reviewer bootstrap prompt template (from the skill's `references/sub-agent-prompts.md` or inherited from refine-plan). Pass:
   - Shared preamble path
   - Prompt file path and section heading (from reviewer-registry.md)
   - Placeholder values: file paths, confirmed goal, iteration number, run directory, review_context, team defaults, research file paths

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

After synthesizing feedback, display the iteration results to the user using the **Iteration Summary Template** from `../_shared/references/output-templates.md`. Read that file for the exact template, substitution rules, and display rules. This must be shown every iteration.

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
   - Editor prompt from the skill's `references/sub-agent-prompts.md`

2. **Editor reads feedback** and applies edits in priority order:
   - CRITICAL (must address)
   - IMPORTANT (should address)
   - DIRECTLY_ACTIONABLE MINOR (if straightforward)
   - USER_INPUT Resolved (treat as DIRECTLY_ACTIONABLE)
   - Skip: unresolved USER_INPUT and RESEARCH_NEEDED

3. **Editor reports**: Changes applied, skipped items, and whether files were modified (YES/NO).

4. **Model downgrade**: For iterations with only MINOR DIRECTLY_ACTIONABLE items, consider `model: "sonnet"`.

## Exit Criteria Evaluation

The orchestrator (not reviewers, not the synthesis agent) decides when to exit.

### Full Pass

Exit when ALL of:
- Every reviewer score meets the full-pass threshold (skill-specific, typically 9+)
- No CRITICAL or IMPORTANT issues flagged

### Early Exit

Exit when ALL of:
- Minimum iteration count reached (skill-specific, typically 4-5)
- Every reviewer score meets the early-exit threshold (skill-specific, typically 8+)
- No CRITICAL or IMPORTANT issues remain

On early exit: warn the user which reviewers scored below the full-pass threshold, their reasons, and whether restructuring may help.

### Final Cleanup Pass

Before exiting (either path): if the synthesis summary reports DIRECTLY_ACTIONABLE items, spawn one final editor sub-agent to apply fixes. No re-review needed.

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
