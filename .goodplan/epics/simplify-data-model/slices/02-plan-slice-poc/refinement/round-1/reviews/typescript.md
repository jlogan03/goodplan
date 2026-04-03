# TypeScript and JavaScript Review — Plan-Slice PoC

## Issues

**[IMPORTANT]** Severity levels in review-preamble.md diverge from the established reviewer system
Phase 1 task for `review-preamble.md` specifies severity levels "CRITICAL, IMPORTANT, SUGGESTION, NITPICK" but the installed v1.0.3 reviewer preamble (the source content to extract from) uses "CRITICAL, IMPORTANT, MINOR" with no SUGGESTION or NITPICK levels. The plan-slice orchestrator's synthesis agent would need to understand both sets if the new preamble diverges from the existing one. This creates inconsistency between the new agent-based reviewers and the existing skill-based reviewers that will coexist during migration.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `verifyEntityStatus()` call signature mismatch in Phase 4
The plan specifies `verifyEntityStatus(gpBin, "slice", sliceName, "plan-refined")` but the actual function signature in `tools/dogfood/utils.ts` is `verifyEntityStatus(type, name, expected, opts?)` where `gpBin` is passed via the optional `opts` object as `opts.gpBin`. The plan's 4-argument positional call would pass `gpBin` as the entity type, causing a silent type mismatch (both are strings). The correct call is `verifyEntityStatus("slice", sliceName, "plan-refined", { gpBin })`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Agent frontmatter specifies `model: opus` but build validation only checks `name:` and `description:`
Phase 1 states each agent should have `model: opus` in frontmatter (consistent with the architecture conventions doc). Phase 2's build validation only checks `name:` and `description:` fields. If `model:` is part of the agent contract (it determines which LLM runs the agent), the build should validate it too — otherwise a missing or typo'd `model:` field silently degrades to a default model. Either add `model:` validation to Phase 2, or document that `model:` is optional with a known default.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan references `@` injection pattern but architecture warns against `skills:` frontmatter — no verification that `@` references actually resolve at runtime
The plan correctly uses `@${CLAUDE_PLUGIN_ROOT}/path` per the architecture decision (issue #25834 makes `skills:` silently fail), but the only verification in Phase 4 is checking the test log for injected content. There is no build-time validation that `@` reference paths in agent bodies actually correspond to files that exist in the dist. A typo in a reference path would silently produce an agent with missing review criteria. Phase 2's build validation should include a step that extracts `@${CLAUDE_PLUGIN_ROOT}/...` references from agent bodies and verifies the referenced files exist in the dist.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `verifyOrchestratorDiscipline()` needs to handle the `agents/` directory edge case
Phase 4 describes filtering Read calls targeting "architecture files, plan files, source code under `src/`, `skills/`" — but the orchestrator also should not be reading agent `.md` files directly (they're injected by Claude Code at spawn time). The violation detector should include `agents/` paths in its check list to catch orchestrators that mistakenly Read agent definitions instead of spawning them.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `createMinimalFixture()` extension lacks `sliceGoal` typing consideration
Phase 4 proposes extending `createMinimalFixture()` with `sliceGoal`, `numSlices`, `architectureFiles` params. The current fixture creates slices via `gp slice:create --epic <name> --json` with stdin `{ name, goal }`. A `sliceGoal` parameter is straightforward, but `architectureFiles` (pre-existing architecture files in the fixture) would require writing files to the fixture directory AND potentially running `gp epic:define-architecture` or a similar command to register them in CLI state. The plan should clarify whether `architectureFiles` just writes markdown files to disk (informational only for sub-agents to Read) or also registers them via CLI commands.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No type definition for sub-agent return format
Phase 3 specifies sub-agents return `{ status, summary, filesWritten, score?, reviewers?, continuationFile? }` but this is described only in prose. For a TypeScript project with `strict` and `exactOptionalPropertyTypes`, this should be a Zod schema or at minimum a TypeScript interface. Since the orchestrator is a SKILL.md (markdown, not TypeScript), this is less critical — but the test harness code in Phase 4 that parses session logs for scores will need to understand this shape. Consider defining the return schema in a shared reference file that both agent definitions and test harness code can reference.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test harness model default inconsistency
Phase 4 says `--model claude-haiku-4-5` is the default for `test-plan-slice.ts`, matching the "structural" tier. But Phase 3's orchestrator spawns agents that should use `model: opus` (per agent frontmatter). The test harness `--model` flag likely controls the outer session model, not the sub-agent models — but this isn't clarified. If the `--model` flag overrides sub-agent models too, running with haiku would produce structurally valid but low-quality reviews that might not exercise the refinement loop meaningfully.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured and demonstrates solid understanding of the TypeScript ecosystem (Bun, Biome, strict tsconfig). It correctly handles the `@` reference injection constraint and aligns with existing codebase patterns. However, there are several concrete issues: the `verifyEntityStatus` call signature is wrong and would cause runtime bugs, the severity level taxonomy diverges from the established system without justification, and build-time validation gaps could let broken agent definitions through silently. To reach 9+: fix the function signature mismatch, align severity levels with the existing system (or explicitly document the divergence and add mapping logic to the synthesis agent), and add `@` reference path validation to the build pipeline.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
