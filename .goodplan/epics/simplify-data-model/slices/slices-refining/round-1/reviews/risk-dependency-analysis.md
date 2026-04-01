# Risk/Dependency Analysis Review

## Issues

**[IMPORTANT]** `goal-refining.md [03-data-model]`: Overview consolidation scope is underestimated and creates a hidden dependency for slice 06
The overview consolidation touches ~16 files across transitions, commands, data layer, and migration code (confirmed via codebase search: `quests/overview` and `tasks/overview` appear in schema-registry, 6 transition files, 4 list commands, status, context/priorities, migrate, complete). The slice goal says "~10-15 test files" but the source file count alone is ~16. More critically, the consolidated overview changes the filesystem layout that all subsequent slices implicitly depend on. Slices 04-06 build skills that invoke CLI commands like `gp quest:list`, `gp task:list`, `gp quest:create` -- if those commands change path expectations in slice 03, the skills built in later slices must target the post-consolidation API. This dependency is not stated in the sequencing table. The sequencing table shows slice 03 depending only on `01-test-harness`, but slices 04-06 implicitly depend on 03's schema changes being stable.
Resolution: DIRECTLY_ACTIONABLE
Add an explicit dependency note in the sequencing rationale: slices 04-06 build against the post-slice-03 CLI API surface. Update slice 03's scope boundary to note that its changes define the CLI API contract that later skill slices will target. Consider whether the overview consolidation could be deferred to a separate slice if it risks destabilizing the CLI commands that skill slices depend on.

**[IMPORTANT]** `goal-refining.md [05-implement-pipeline]`: Slice 05 has an unstated dependency on slice 04's agent definitions
Slice 05 says it depends on `02-plan-slice-poc` and `04-create-epic-pipeline`. However, the implementation skill's review loops reuse the refinement infrastructure (coordinator, reviewers, synthesis, editor) built in slice 02, and the `completion-phase` agent is new to slice 05. The actual risk is that slice 05's `implement-phase` agent needs to run review loops with `review_context: "code-implementation"` -- a context type that no prior slice has exercised. If the reviewer agents built in slices 02 and 04 don't handle this context type well, slice 05 discovers the problem late. The dependency on slice 04 is listed but the rationale says "Shares completion-phase agent with complete-epic" -- this is wrong, both are built in slice 05. The real dependency on 04 is that 04 produces explore-phase, architecture-phase, and slices-phase agents, establishing the pattern that implement-phase follows.
Resolution: DIRECTLY_ACTIONABLE
Clarify the dependency rationale for slice 05: the dependency on 04 is pattern validation (04 proves multi-phase agent spawning works), not shared agents. Add a note that `review_context: "code-implementation"` is a new context type first exercised here, and the reviewer agents need to handle it.

**[IMPORTANT]** `goal-refining.md [06-remaining-skills]`: Slice 06 is a mega-slice with 9+ deliverables and high blast radius
Slice 06 builds 7 skills (create-side-quest, explore, audit, init, task, upgrade, status), deletes 15 old skill directories, updates build-plugin.sh, updates install-skills.sh, and adds reviewer agents. This is by far the largest slice -- if any one of these deliverables has problems, the entire slice blocks. The old skill deletion is particularly high-risk: if done before the new skills are fully validated, there's no fallback. The sequencing says 06 depends on 02 and 05, but it really depends on the pattern being rock-solid because it applies the pattern to 4 new pipeline/standalone skills simultaneously.
Resolution: DIRECTLY_ACTIONABLE
Consider splitting slice 06 into two slices: (a) build the remaining skills (create-side-quest, explore, audit, init, task, upgrade, status) and verify they work, (b) delete old skills and update build/install scripts. This makes old skill deletion a separate, independently revertible step. At minimum, add a verification step that runs `bun run build:plugin` and `test-plugin-skills.ts` BEFORE deleting old skills.

**[MINOR]** `goal-refining.md [02-plan-slice-poc]`: @ reference injection is noted as "verified via prototype" in the architecture but the verification step in slice 02 says "Verify @ references in agent definitions resolve correctly" -- this is redundant confidence
The architecture overview already notes "Verified via prototype: @ references in agent `.md` files work correctly in plugin context." But the architecture also notes a known broken feature: "`skills:` frontmatter injection from plugin agents -> plugin skills is broken (issue #25834)." Slice 02's verification should explicitly test that the workaround (`@` references instead of `skills:` frontmatter) handles all the injection cases the old `skills:` frontmatter would have covered.
Resolution: DIRECTLY_ACTIONABLE
Add a verification item to slice 02 that specifically tests shared reference injection for reviewer preamble, output format, and domain criteria files via `@` references -- confirming these produce the same result as the broken `skills:` frontmatter path would have.

**[MINOR]** `sequencing-refining.md`: Slice 07 (quality validation) depends on "01-06" but the table doesn't list this explicitly
The dependency column says "01-06" as a range, which is informal. All other slices list specific slice numbers. For consistency and to prevent ambiguity, list all dependencies or use "all prior slices."
Resolution: DIRECTLY_ACTIONABLE
Change the dependency to "01-06 (all prior)" or list them explicitly.

**[MINOR]** `goal-refining.md [04-create-epic-pipeline]`: `reconsiderWhen` and `validUntil` evaluation mentioned but these fields don't exist yet
Slice 04's behavior item 7 says "Phase agents evaluate `reconsiderWhen` and `validUntil` conditions when provided in task prompt." But these fields are added in slice 03 (data-model). Slice 04 depends on slice 02, not slice 03. If slice 03 hasn't been completed when 04 starts, the fields won't exist. The sequencing table shows 04 depending only on 02.
Resolution: DIRECTLY_ACTIONABLE
Either add slice 03 as a dependency for slice 04, or move the `reconsiderWhen`/`validUntil` evaluation behavior to a later slice that explicitly depends on 03. Since 04 is the most complex pipeline and already has significant scope, deferring this to slice 05 or 06 would reduce risk.

## Score: 7/10

The sequencing is fundamentally sound -- test harness first, proof-of-concept second, then expanding from there is the right approach. The orchestrator pattern is correctly identified as the highest-risk bet and is front-loaded via slice 02. However, there are three important issues: (1) slice 03's data model changes create an implicit dependency for all later skill slices that isn't acknowledged, (2) slice 05's dependency rationale is inaccurate, and (3) slice 06 is a mega-slice with too many deliverables to be independently verifiable as claimed. Additionally, slice 04 references behavior that depends on slice 03 without declaring the dependency.

To reach 9+: Split slice 06 into two (build skills, then delete old ones). Add slice 03 as a dependency for slices 04-06. Fix the slice 05 dependency rationale. These changes would make the dependency graph accurate and reduce the blast radius of the riskiest slice.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
