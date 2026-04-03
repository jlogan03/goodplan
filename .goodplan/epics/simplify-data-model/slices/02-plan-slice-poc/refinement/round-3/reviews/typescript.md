# TypeScript and JavaScript Review — Plan-Slice PoC (Round 3)

## Round 2 Issue Status

All 4 issues from Round 2 have been addressed:

1. **Missing `slice:refine-plan` transition** (IMPORTANT) — Fixed at line 142. The plan now explicitly calls `gp slice:refine-plan --slice <name> --json` (`plan-created` -> `refining` via `BEGIN_REFINEMENT`) before `submit-refinement`. Correctly notes that without this, a failing score on `submit-refinement` from `plan-created` would trigger `STATE_INVALID_TRANSITION`. Verified against transition-tables.md.

2. **Re-entry re-refinement claims unsupported transition** (IMPORTANT) — Fixed at line 113. The plan now clearly states: "No re-refinement in this PoC — the `plan-refined` -> `planning` transition does not exist in the state machine." Offers view plan or proceed to `/gp:implement` as the only re-entry options. Defers re-refinement to a later slice that introduces a `BEGIN_RE_REFINEMENT` event. Clean solution.

3. **`submit-refinement` stdin format** (MINOR) — Fixed at line 143. Now specifies: `echo '{"scores":{"overall":<score>}}' | gp submit-refinement --slice <name> --json` with explicit `Record<string, number>` format reference. Matches `submitRefinementInputSchema` in `src/schemas/commands/submit.ts`.

4. **`start-plan` context command not used** (MINOR) — Fixed at line 129. Phase 2 now uses `gp start-plan --slice <name> --json` to assemble context, described as "more robust than manually constructing paths from `gp status --json`". Correctly matches the actual `startPlanCommand` signature which returns a `ContextBundle`.

## Issues

**[MINOR]** Model override mechanism for sub-agents not specified

The plan (line 195) says to "Verify that `--model` override takes precedence over agent frontmatter `model: opus` — agents should run with the harness-specified model, not the frontmatter default." However, the plan doesn't specify the mechanism for achieving this. The existing harness pattern at `tools/dogfood/harness.ts` line 216 uses `systemPrompt.append` (`Use ${model} for ALL Agent sub-agent calls.`) to communicate the model override to the orchestrator, which then passes it to `Agent` tool invocations. The test script (`test-plan-slice.ts`) should follow this same pattern. Not a blocker — the pattern is established and the implementation will naturally discover it — but adding a brief task note referencing the existing `systemPrompt.append` pattern would prevent unnecessary investigation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `verifyNoArtifactReads` naming inconsistency with plan text

The plan uses `verifyNoArtifactReads` at lines 171, 174, 191, 204 but the Phase 4 task description at line 179 describes creating it as checking "known artifact paths (architecture files, plan files, source code under `src/`, `skills/`, `agents/`)". The research file (line 43) references this as `verifyOrchestratorDiscipline()`. The plan should use a single consistent name. `verifyNoArtifactReads` is more descriptive and already used throughout the plan's Expected Behavior and Verification sections, so the research file reference is just stale context. No action needed — the plan itself is consistent.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has reached strong TypeScript soundness. All Round 2 issues are correctly resolved. The state machine transitions are now accurate (verified against transition-tables.md and `src/schemas/commands/submit.ts`). The `verifyEntityStatus` call signature matches the actual implementation in `utils.ts` (lines 164-176). The `start-plan` context command is now used correctly. The `submit-refinement` stdin format matches the Zod schema. The sub-agent return format has both a markdown reference and TypeScript schema representation (line 144), maintaining a single source of truth. Module patterns are clean — ESM throughout, `import type` used where applicable, Zod v4 for runtime validation. The two remaining MINOR issues are polish items that won't affect implementation correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
