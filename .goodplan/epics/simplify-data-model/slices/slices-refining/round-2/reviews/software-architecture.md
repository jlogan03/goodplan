# Software Architecture Review (Round 2)

## Round 1 Fix Verification

All 10 issues from round 1 (5 IMPORTANT, 5 MINOR) have been addressed:

1. Slice 03 now explicitly names the `schemaRegistry` entry replacements, the unified `overviewSchema`, and estimates ~30 total files affected (source + test). The overview consolidation scope is well-specified.
2. Slice 02 now has an explicit scope boundary: "Do NOT use `skills:` frontmatter for shared content injection -- use `@` references per verified prototype."
3. Slice 05 now documents the completion-phase agent's two explicit modes with different task prompt contracts (slice-level vs epic-level inputs/outputs).
4. Slice 06 now has a "Sub-Ordering" section with 4 intermediate verification gates (build, verify, cleanup, final verify) and an explicit "Do NOT delete old skills until new skills are fully verified" rule.
5. Slice 04 now has a `reconsiderWhen` test verification checkbox with a concrete fixture-based test case.
6. Slice 01 now specifies "installed `gp` binary, or configurable via `GP_CLI_PATH` env var" for `verifyEntityStatus()`.
7. Slice 07 now has a "Bug fix strategy" section specifying commit-to-same-branch with clear messages and learning capture.
8. Sequencing table now shows slice 04 depends on both 02-plan-slice-poc and 03-data-model.
9. Slice 08's stale reference grep now includes `capture`, `migrate`, and `onboard-repo`.
10. Slice 02 now addresses plugin.json auto-discovery in Behavior point 5, informed by the research file.

## Issues

**[MINOR]** goal-refining.md [03-data-model]: RPC Layer not listed in affected subsystems despite `assembleState`/`commitState` changes
The Maturity Note says "State Machine and Commands subsystems move to 'Developing (modified)' maturity during this slice." However, the Behavior section lists changes to `assembleState()` and `commitState()` (Data Layer), and the scope boundaries section says "~30 files across Data Layer, State Machine, Commands, RPC Layer." The RPC Layer is mentioned in scope but not in the Maturity Note. Since the current architecture overview lists the RPC Layer at "Developing" maturity and this slice modifies context bundling paths (overview file location changes affect `assembleState` which is consumed by RPC layer context operations), the maturity note should either include RPC Layer or clarify that RPC Layer changes are indirect (path changes flow through Data Layer, no direct RPC code changes needed).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** goal-refining.md [05-implement-pipeline]: `review_context: "code-implementation"` is a new enum value but no slice specifies adding it to the conventions table
The architecture conventions file (`.goodplan/epics/simplify-data-model/architecture/conventions.md` line 182) defines a closed set of `review_context` values. Slice 05 introduces `"code-implementation"` as a new review context type and correctly notes reviewer agents must handle it. However, no slice explicitly lists "add `code-implementation` to the `review_context` enum in conventions" as a behavior item. The conventions file already has the value (added during architecture refinement), but the slice's behavior section should reference it for implementer awareness -- the reviewer agents built in slices 02 and 04 need to be updated to handle this new context type in this slice.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round 1 issues have been resolved effectively. The slice decomposition is sound: test harness first, tracer bullet POC second, data model changes independently verifiable, complex pipelines build on proven patterns, cleanup has intermediate gates, quality validation before documentation. The dependency graph is correct with the 03->04 fix. The two remaining issues are minor clarification gaps that do not affect implementability.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
