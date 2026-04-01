# Risk/Dependency Analysis Review — Round 2

## Issues

**[MINOR]** `sequencing-refining.md`: Slice 06 dependency chain masks a direct dependency on slice 04
Slice 06 depends on `02-plan-slice-poc, 05-implement-pipeline`. The `create-side-quest` skill built in slice 06 spawns `explore-phase` agent (built in slice 04) and `plan-phase` agent (built in slice 02). The dependency on 04 is covered transitively (06→05→04), so this is technically correct. However, the sequencing rationale and slice 06 goal don't mention that `explore-phase` agent availability is a prerequisite. If the dependency chain were ever reordered (e.g., slices 04 and 05 became independent), this implicit requirement would break silently. A comment noting the transitive dependency on 04's `explore-phase` agent would improve clarity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [06-remaining-skills]`: Sub-ordering mitigates mega-slice risk but doesn't define rollback
The sub-ordering (build → verify → cleanup → final verify) is a significant improvement from round 1 and addresses the blast radius concern well. However, the "do NOT delete old skills until new skills are fully verified" instruction is a process instruction to the implementer — there's no verification gate that enforces this ordering. If the implementer accidentally runs cleanup before verify completes, there's no rollback strategy described. This is minor because the sub-ordering itself is a strong mitigation and the "do NOT" instruction is clear.
Resolution: DIRECTLY_ACTIONABLE

## Verification of Round 1 Fixes

All three IMPORTANT issues from round 1 have been addressed:

1. **Undeclared dependency 04→03**: Fixed. Slice 04 now explicitly depends on `03-data-model` in the sequencing table. The sequencing rationale includes the note about slices 04-06 targeting the post-slice-03 CLI API surface. Slice 04's behavior and verification sections reference `reconsiderWhen`/`validUntil` with awareness of the 03 dependency.

2. **Mega-slice 06**: Addressed via sub-ordering (build → verify → cleanup → final verify) with explicit "do NOT delete old skills until verified" instruction. Not split into two slices, but the intermediate verification gates substantially reduce blast radius.

3. **Inaccurate slice 05 rationale**: Fixed. Sequencing table rationale now reads "Pattern validation — 04 proves multi-phase spawning works; introduces `review_context: 'code-implementation'`". Slice 05 goal includes a dependency note clarifying the 04 dependency is for pattern validation, not shared agents.

All three MINOR issues from round 1 were also addressed: slice 02 verification expanded, slice 07 dependency clarified as "01-06 (all prior)", and slice 04 now depends on 03 (resolving the `reconsiderWhen`/`validUntil` availability gap).

## Additional Observations (No Issues)

- **Unknown front-loading**: The highest-risk unknown (orchestrator pattern with agent spawning, @ reference injection, refinement loops) is correctly front-loaded in slice 02. Slice 03's data model changes are additive and independently verifiable, avoiding compounding risk.
- **Circular dependencies**: None found. The dependency graph is a clean DAG: 01 is the root, 02 and 03 depend on 01, 04 depends on 02+03, 05 on 02+04, 06 on 02+05, 07 on all, 08 on 07.
- **Ordering robustness**: Slices 02 and 03 are independent of each other (both depend only on 01), which provides parallelism opportunity. If slice 03 fails, slices 04-06 would need to defer (they depend on 03's CLI API changes), but slice 02 would be unaffected. If slice 02 fails (orchestrator pattern doesn't work), the entire pipeline approach needs rethinking — but this is the correct risk to front-load.
- **File count estimates**: Slice 03 claims ~30 files affected. Codebase grep confirms 28 occurrences of `quests/overview` or `tasks/overview` across 8 source files, plus schema definitions, data layer, migration code, and tests. The estimate is reasonable.

## Score: 9/10

All round 1 issues have been addressed effectively. The dependency graph is now explicit and accurate. Unknown front-loading is correct (orchestrator pattern in slice 02). The mega-slice 06 risk is mitigated with sub-ordering gates. The two remaining minor issues are about clarity rather than structural risk — adding a note about transitive dependency on 04's agents and the sub-ordering enforcement are small improvements.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
