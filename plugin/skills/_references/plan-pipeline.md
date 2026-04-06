# Plan Pipeline — Shared Reference

Shared pattern for interactive plan Q&A followed by autonomous draft and refinement. Used by plan-slice and create-side-quest. Each consuming skill defines `{ENTITY_TYPE}` (slice or quest), `{ENTITY_NAME}`, and `{ENTITY_CLI_FLAG}` (`--slice` or `--quest`).

## Phase A: Interactive Plan Q&A

### A1. Status Transition

If {ENTITY_TYPE} status requires transition to `planning`:

```bash
stdin: "" | $GP {ENTITY_TYPE}:plan {ENTITY_CLI_FLAG} {ENTITY_NAME} --json
```

Verify successful transition. If it fails, stop with the error message.

### A2. Load Goal

```bash
$GP {ENTITY_TYPE}:show {ENTITY_CLI_FLAG} {ENTITY_NAME} --json
```

Extract the `goal` field from the response. This is what you present to the user.

### A3. Interactive Q&A

Present the goal to the user and conduct planning Q&A. Ask about:

1. **Approach**: How should this be implemented? Any specific patterns, libraries, or constraints?
2. **Phasing**: What's the natural breakdown into sequential phases? What depends on what?
3. **Expected behavior**: For each phase, what should be observable when it's done? How would you verify it?
4. **Risks and unknowns**: Anything uncertain that might change the approach?

Use AskUserQuestion for each round. Follow up on answers that raise new questions. Continue until the user signals readiness (e.g., "that covers it", "ready to draft").

### A4. Write Q&A Output

Write the structured Q&A to the temp directory. Use the Write tool to create `$TMPDIR/qa/plan-qa.md`:

```markdown
# Plan Q&A — {ENTITY_NAME}

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

## Phase B: Autonomous Draft & Refinement

### B1. Context Assembly

Call `start-plan` to assemble the context bundle:

```bash
$GP start-plan {ENTITY_CLI_FLAG} {ENTITY_NAME} --json
```

This returns a `ContextBundle` with `inline`, `references`, `decisions`, and `learnings`.

### B2. Load Active Conditions

Load active conditions per cli-interaction.md Conditions Loading section, filtering by the current entity's scope prefix.

### B3. Spawn Plan-Phase Agent

Spawn `plan-phase` with: {ENTITY_TYPE} name, Q&A output path (`$TMPDIR/qa/plan-qa.md`), temp directory (`$TMPDIR/draft`), goal, ContextBundle (inline, references, decisions, learnings), active conditions to evaluate. Instruct the agent to use single-file format (`$TMPDIR/draft/plan.md`).

Parse return. If `triggeredConditions` is non-empty, surface them to the user via AskUserQuestion BEFORE proceeding. Then check `status`:
- **SUCCESS** → resolve `planPath` from the agent's `filesWritten[0]` (do not hardcode). Resolve the CLI-managed plan path: on fresh run use `paths.plan` from A1 response; on re-entry where A1 was skipped (STATE_INVALID_TRANSITION), derive from `{ENTITY_TYPE}:show` response entity directory + `plan.md`. Copy the plan: `cp <planPath> <CLI-managed-plan-path>`. The CLI checks for `plan.md` at the managed path during submit — it will reject with `STATE_CONTENT_MISSING` if the file is not there. Then proceed to submit.
- **PARTIAL** → log questions, stop.
- **FAILED** → stop with error.

### B4. Submit Plan Draft

The `stdin: ""` prefix is Claude Code shell syntax — it pipes an empty string to stdin. This is required because the CLI's submit commands read stdin for optional payloads and will hang waiting for input if stdin is not provided.

```bash
stdin: "" | $GP submit-plan {ENTITY_CLI_FLAG} {ENTITY_NAME} --json
```

This transitions `planning` -> `plan-created`. Precondition: `plan.md` must exist at the CLI-managed path (copied in B3).

### B5. Begin Refinement

```bash
stdin: "" | $GP {ENTITY_TYPE}:refine-plan {ENTITY_CLI_FLAG} {ENTITY_NAME} --json
```

This transitions `plan-created` -> `refining`.

### B6. Refinement Loop

@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md

Follow the shared iteration loop pattern defined in iteration-loop.md (auto-included above). Use the **Loop Parameters** defined in the consuming skill's SKILL.md.

Resolve the plan path for the editor: always use the CLI-managed path. If entering from B3 in the same session, use the CLI-managed plan path resolved in B3. On re-entry (status already `refining` or `plan-created`), call `$GP start-refinement {ENTITY_CLI_FLAG} {ENTITY_NAME} --json` for the ContextBundle (context, not paths), then resolve the plan path from `{ENTITY_TYPE}:show {ENTITY_CLI_FLAG} {ENTITY_NAME} --json` — the entity directory + `plan.md`. The `start-refinement` command returns a ContextBundle (no `paths` field). The editor edits the CLI-managed copy, not the tmpdir draft.

Use `$TMPDIR/plan-refining/` as the run directory (following iteration-loop.md's round-based structure: `round-{N}/reviews/`, `round-{N}/merged.md`).

Each round: follow iteration-loop.md's Reviewer Spawn Pattern -> Synthesis -> Editor -> Exit Criteria Evaluation. Pass the plan path as the artifact with review context from the consuming skill's Loop Parameters and ContextBundle inline context and reference paths. Write each reviewer's `review` field to `$TMPDIR/plan-refining/round-{N}/reviews/{reviewer-name}.md`. Spawn synthesis agent with output path `$TMPDIR/plan-refining/round-{N}/merged.md`.

### B7. Submit Refinement

After exiting the loop, copy the refined plan to the CLI-managed path for downstream guards: `cp <planPath> <paths.planRefined from B5 response>`. On re-entry where B5 was skipped, derive the path from `{ENTITY_TYPE}:show` response entity directory + `plan-refined.md`. The CLI checks for `plan-refined.md` at the managed path when `{ENTITY_TYPE}:implement` is called — it will reject with `STATE_CONTENT_MISSING` if missing.

Then submit the refinement result per the consuming skill's Loop Parameters `submit_command`. If `override_flag` is defined and exiting via stagnation, reduction, or cap, append it.

Log exit reason to stderr:
```
[{skill-name}] Refinement complete. Rounds: {iteration+1}, Scores: {reviewerScores}, Reason: {pass|stagnation|reduction|cap}
```
