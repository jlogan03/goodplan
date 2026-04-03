# TypeScript and JavaScript Review — Plan-Slice PoC (Round 2)

## Round 1 Issue Status

All 4 IMPORTANT issues from Round 1 have been addressed:

1. **Severity levels** — Plan now uses CRITICAL/IMPORTANT/MINOR consistently (no SUGGESTION/NITPICK). Verified: no occurrences of SUGGESTION or NITPICK in the plan.
2. **`verifyEntityStatus()` call signature** — Fixed to `verifyEntityStatus("slice", sliceName, "plan-refined", { gpBin })` (line 186). Matches actual function signature.
3. **Agent `model:` validation** — Plan now includes a note about model validation at line 35. Acceptable: the plan clarifies `model:` is functional and overridable via test harness `--model` flag. Build validation of `model:` is not added, but this is a reasonable scope cut since `model:` has a default fallback in Claude Code.
4. **`@` reference path validation** — Added as explicit task in Phase 2 (line 85): "extract `@${CLAUDE_PLUGIN_ROOT}/...` references from agent `.md` bodies, verify each referenced file exists in `dist/`".

Minor issues were also addressed: `agents/` added to violation detection paths (line 170), `architectureFiles` clarified as "writes markdown files to disk, does not register via CLI" (line 180), sub-agent return format now has explicit task to define as Zod schema or TypeScript interface (line 143), `--model` flag clarified with `--max-iterations` cost control (line 191).

## Issues

**[IMPORTANT]** Missing `slice:refine-plan` transition before refinement loop

The plan (line 112) specifies status transitions as: `gp slice:plan` (created -> planning), `gp submit-plan` (planning -> plan-created), then `gp submit-refinement` per round (-> eventually plan-refined). However, the state machine transition table shows that `COMPLETE_REFINEMENT_ROUND` from `plan-created` only succeeds when scores meet the threshold on the first round (skip path, transition-tables.md line 74). If the first refinement round's scores are below threshold, there is no matching transition row from `plan-created` — the state machine will error with `STATE_INVALID_TRANSITION`.

The fix: after `submit-plan` produces `plan-created`, the orchestrator must call `gp slice:refine-plan --slice <name>` (which emits `BEGIN_REFINEMENT`: plan-created -> refining) before calling `submit-refinement`. This ensures the slice is in `refining` status, which handles both pass and fail cases for `COMPLETE_REFINEMENT_ROUND`. Update Phase 3 line 141-142 to insert this transition step.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Re-entry re-refinement claims unsupported state transition

Line 113 states: "Re-refine runs the refinement loop on the existing plan. Status transitions `plan-refined` -> `planning` before re-refinement, back to `plan-refined` on completion." The state machine has no transition from `plan-refined` back to `planning` or `refining`. The only valid transition from `plan-refined` is `BEGIN_IMPLEMENTATION` -> `implementing` (transition-tables.md line 75). Attempting `gp slice:plan` or any BEGIN event from `plan-refined` will fail.

Options: (a) Remove re-refinement from this PoC slice and defer to a later slice that adds the necessary state machine events, (b) Run the refinement loop without state transitions (just re-write the plan file and re-run reviewers, skipping CLI status updates), or (c) Add a new state machine event (scope creep for this PoC). Option (a) is cleanest for a PoC.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `submit-refinement` stdin format not specified in orchestrator tasks

Phase 3 tasks reference `gp submit-refinement --slice <name> --json` but don't specify the required stdin format. The command requires `{ scores: { "<criterion>": <number> } }` via stdin (from `submitRefinementInputSchema` in `src/schemas/commands/submit.ts`). The orchestrator needs to construct this from the synthesis agent's return value and pipe it via stdin. Add a task note clarifying the stdin shape and how scores are extracted from the synthesis return.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `start-plan` context command not used

The CLI provides `gp start-plan --slice <name> --json` which assembles a context bundle (architecture files, conventions, slice goal, etc.) specifically for the planning phase. The plan's Phase 2 (line 129) manually constructs these paths from `gp status --json` output. Using `start-plan` would be more robust — it handles inline content assembly, path resolution, and stays in sync with future CLI changes. Consider using `start-plan` output to populate the plan-phase agent's task prompt instead of manual path assembly.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has improved substantially from Round 1. All 4 IMPORTANT issues were correctly addressed, and the TypeScript-specific patterns (Zod schema for return format, strict mode compliance, module structure) are sound. Two new IMPORTANT issues emerged from deeper state machine analysis: the missing `slice:refine-plan` transition (would cause runtime failures on non-trivial refinement loops) and the unsupported `plan-refined` -> `planning` re-entry transition (would cause state machine errors). To reach 9+: fix the missing `slice:refine-plan` call in the refinement loop sequence, and either remove or restructure the re-refinement re-entry claim to match what the state machine actually supports.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
