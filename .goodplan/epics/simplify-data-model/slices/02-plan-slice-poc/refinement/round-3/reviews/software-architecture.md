# Software Architecture Review — Plan-Slice PoC (Round 3)

## Issues

**[IMPORTANT]** Phase 3 CLI transition sequence has a redundant and potentially confusing `slice:refine-plan` call

Phase 3 specifies this transition sequence: `gp slice:plan` (created -> planning) -> `gp submit-plan` (planning -> plan-created) -> `gp slice:refine-plan` (plan-created -> refining via BEGIN_REFINEMENT) -> `gp submit-refinement` per round (refining -> refining or plan-refined).

However, the transition table shows a skip path: `plan-created` + `COMPLETE_REFINEMENT_ROUND` -> `plan-refined` when scores meet threshold on first round. This means `submit-refinement` can be called directly from `plan-created` status without an explicit `slice:refine-plan` call. If the orchestrator always calls `slice:refine-plan` first, this skip path is never exercised -- the slice always enters `refining` before the first `submit-refinement`.

This is not incorrect (the explicit BEGIN_REFINEMENT -> submit-refinement path works fine), but it adds an unnecessary CLI call and means the orchestrator's behavior diverges from the state machine's optimized path. The plan should either: (a) acknowledge this is intentional (explicit is better than implicit for a PoC) and note the skip path exists for future optimization, or (b) drop the `slice:refine-plan` call and let `submit-refinement` handle both paths (skip on pass, state machine transitions to `refining` on fail per row 71 of the transition table -- wait, no: the skip path on row 74 only goes from `plan-created` -> `plan-refined` on pass; on fail from `plan-created`, there is no transition row). 

Actually, re-reading the transition table carefully: row 74 shows `plan-created` + `COMPLETE_REFINEMENT_ROUND` -> `plan-refined` only when "scores meet threshold (first round)". There is NO row for `plan-created` + `COMPLETE_REFINEMENT_ROUND` when scores FAIL. This means calling `submit-refinement` from `plan-created` with failing scores would be an invalid transition (STATE_INVALID_TRANSITION). The explicit `slice:refine-plan` call is therefore REQUIRED to enter `refining` before submitting scores that might fail. The plan is correct. However, the plan should document WHY the `slice:refine-plan` call is necessary -- without it, a failing score on `submit-refinement` from `plan-created` would trigger STATE_INVALID_TRANSITION. This rationale is currently missing and implementers may try to "simplify" by removing it.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `verifyNoArtifactReads` naming inconsistency and scope drift from existing `checkViolation`

Phase 4 proposes a new `verifyNoArtifactReads()` function that checks Read calls against artifact paths. However, `utils.ts` already has `checkViolation()` (line 180) which detects Read/Write/Edit on `.goodplan/` structured state files. The plan creates a parallel detection mechanism with overlapping but different scope:

- Existing `checkViolation`: catches Read on `.goodplan/*.json` and `.goodplan/*.jsonl` -- protects CLI state integrity
- Proposed `verifyNoArtifactReads`: catches Read on architecture files, plan files, source code under `src/`, `skills/`, `agents/` -- enforces orchestrator context discipline

These serve different purposes (state integrity vs context discipline), but the naming and placement should make the relationship clear. The plan should: (a) rename to `verifyOrchestratorDiscipline()` (which was the name in round 2 codebase research and aligns better with the concept), and (b) note that it complements `checkViolation()` rather than replacing it. The existing `runSkillSession` already integrates `checkViolation` via `checkViolations: boolean` -- the new function should follow the same integration pattern.

Note: The plan currently uses `verifyNoArtifactReads` in Phase 4 tasks/expected behavior but the codebase research doc (line 43) references `verifyOrchestratorDiscipline`. This inconsistency should be resolved to one name.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Sub-agent return format maintained "in sync" across two representations lacks a concrete sync mechanism

Phase 3 says: "Define sub-agent return format in two representations maintained in sync: (a) markdown reference at `skills/_shared/references/sub-agent-return-format.md` for `@` injection into agent definitions, and (b) TypeScript schema (e.g., in `tools/dogfood/schemas/` or `utils.ts`) for test harness validation." This correctly addresses the round 2 issue about dual representation. However, "maintained in sync" is aspirational without a mechanism. At Experimental maturity this is acceptable, but the plan should note that a future slice could add a build-time check (e.g., extract the JSON shape from the markdown and compare against the TypeScript type) to prevent drift. For now, co-location in the same commit and a code comment linking the two is sufficient.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 task to update epic architecture `_overview.md` line references may be stale

Phase 1 includes: "Update epic architecture `_overview.md`: remove stale `skills:` frontmatter references at two locations (~line 69 ... and ~line 135 ...)." The epic architecture file was read during this review (it is 225 lines). Line 69 currently describes the `@` reference mechanism correctly: "Content loaded by Claude Code at spawn time. Shared content is composed into agents via `@${CLAUDE_PLUGIN_ROOT}/path` references in the agent's markdown body." Line 135 says: "Agent definitions solve the plugin file permission issue: shared references are injected via `skills:` frontmatter, not Read tool calls." Line 135 contradicts the `@` reference decision (issue #25834) and needs updating. Line 69 appears already correct. The plan should verify line 135 is the actual target (it is) and remove the line 69 reference from the task (it's already correct). Incorrect task targeting wastes implementation time.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `@` reference validation task does not specify extraction regex

Phase 2 adds `@` reference path validation and the plan now correctly says "strip the `${CLAUDE_PLUGIN_ROOT}/` prefix, resolve relative to `dist/gp-plugin/`." But the task doesn't specify the regex for extracting `@` references from agent markdown bodies. The pattern `@${CLAUDE_PLUGIN_ROOT}/` is literal text in markdown (not a shell variable expansion in the build script context). The extraction regex should match `@\$\{CLAUDE_PLUGIN_ROOT\}/[^ )\n]+` or similar. This is an implementation detail, but specifying it in the plan prevents build-time bugs from incorrect pattern matching.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 3 addressed all round 2 issues effectively. The critical re-entry issue was resolved cleanly by deferring re-refinement to a later slice. The coordinator reviewer discovery is now explicit (orchestrator passes available names in task prompt). The sub-agent return format dual representation (markdown + TypeScript) is specified. The plan-phase agent description is now consistent between Phase 1 and Phase 3. The remaining issues are mostly about making implicit rationale explicit (why `slice:refine-plan` is required, naming consistency for the discipline checker) and minor precision improvements. To reach 9+: add the `slice:refine-plan` rationale comment explaining the STATE_INVALID_TRANSITION risk, resolve the `verifyNoArtifactReads` vs `verifyOrchestratorDiscipline` naming inconsistency, and fix the stale line 69 reference in the architecture update task.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
