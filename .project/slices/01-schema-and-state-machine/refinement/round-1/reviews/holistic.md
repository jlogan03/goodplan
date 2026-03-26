# Holistic Review: Schema and State Machine

## Issues

**[CRITICAL]** Phase 1 `tsc --noEmit` success criterion is misleading when `Target` changes
The plan adds `epic: string` to the `Target` slice variant in Phase 1. While this compiles (adding a field to a union variant doesn't break discriminant switches), it silently breaks `resolveEntityJsonPath` in `src/core/rpc/types.ts` (line 232) which still returns `slices/${target.name}/slice.json` — the function compiles but produces wrong paths at runtime. The plan's Expected Behavior says `tsc --noEmit` passes, and adds a parenthetical "(exhaustive switches will error until Phase 2 updates handlers)" — but the real risk is NOT compile errors; it's silent runtime path bugs in code outside this slice's scope. The plan should either (a) defer the `Target` change to a later slice that updates the RPC layer simultaneously, or (b) explicitly document that `resolveEntityJsonPath` and `resolveEntityDir` in `src/core/rpc/paths.ts` will produce wrong paths until the RPC slice lands, and add a `// TODO(entity-restructuring): update path` comment on those functions as a tracking mechanism.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** DeferredItem location is incorrect in the plan
The plan says to add `targetEpic` to `DeferredItem` in `src/schemas/commands/submit.ts` ("or wherever `DeferredItem`/`deferredItemSchema` is defined"). `DeferredItem` is actually defined in `src/schemas/entities/slice.ts` (lines 18-22). The task must reference the correct file. Additionally, the architecture doc (`data-model-changes.md`) specifies `targetEpic` as optional (`z.string().min(1).optional()`), but the plan says "required" — the plan should match the architecture spec and make it optional (defaulting to the completing slice's epic).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 boundary is unclear — too many tasks bleed into handler territory
Phase 1 is titled "Schemas, Types & Registry" but includes tasks that modify transition handler code: `buildInitialEpicJson` in `helpers.ts`, `addEpicToOverview`, `addSliceToOverview` (new), `updateOverviewStatus`, and `init.ts`. These are state machine transition helpers, not schemas/types/registry. The phase boundary should be clarified: either rename Phase 1 to "Schemas, Types, Registry & Helper Signatures" or move the helper changes to Phase 2. Currently an implementer could be confused about whether to update helper bodies (which reference `slices/overview.json`) in Phase 1 or Phase 2, since Phase 2 also lists helper signature updates.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `updateOverviewStatus` type change risks INV-005 violation
The plan correctly identifies that `updateOverviewStatus` must use `EpicOverview` instead of `Overview`. However, it underspecifies the timing. If the `epicOverviewSchema` is registered in Phase 1 (changing `epics/overview.json` to validate against `epicOverviewSchema` which requires `slices` on each item), but `addEpicToOverview` and `updateOverviewStatus` are not updated simultaneously, then any epic creation or status update will write an object without `slices`, which will fail schema validation on the next `assembleState()` read (INV-005). The plan should explicitly state that the schema registry change and the `addEpicToOverview`/`updateOverviewStatus` type changes MUST happen atomically within the same task group — not as separate tasks that could be done in different order.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing `handleConvertTask` update for `buildInitialEpicJson`
The plan mentions updating `buildInitialEpicJson` to remove `sliceSequence`, but `buildInitialEpicJson` is called from two places: `epic-create.ts` and `handleConvertTask` in the task transition handler. The `CONVERT_TASK` path that creates an epic also uses `buildInitialEpicJson` (helpers.ts line 444). Since `buildInitialEpicJson` is shared, removing `sliceSequence` from it affects both callers. Phase 2 lists `task.test.ts` updates but doesn't explicitly list updating `handleConvertTask` source code. The plan should confirm whether `handleConvertTask` has any additional `sliceSequence` or `slices/overview.json` references beyond the shared helper call.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Missing `epic-complete.ts` handler update in Phase 2
The affected-apis doc identifies that `COMPLETE_EPIC` needs to read embedded slices from `epics/overview.json` instead of filtering `slices/overview.json` by epic field. Phase 2 lists `slice-*` handlers, `epic-create.ts`, and `rollup-learnings.ts`, but does NOT list `epic-complete.ts` (or wherever COMPLETE_EPIC is handled). If epic completion checks that all slices are complete/abandoned, it reads from the overview — this handler needs updating too.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Before-check grep patterns may not work as written
Phase 1 Expected Behavior: `grep "epic:" src/schemas/state-events.ts | grep -c ""` assumes piping through `grep -c ""` counts lines. This works but is fragile — `wc -l` is more conventional. More importantly, the "before" check says "only 1 match" for `CREATE_SLICE`, but `state-events.ts` also has `epic:` on many epic lifecycle events (lines 16-53 show `epic: string` on `BEGIN_EXPLORE`, `COMPLETE_EXPLORE`, etc.). The grep pattern is not specific enough to distinguish slice events from epic events. The check should use a more targeted pattern like `grep "epic:.*slice\|slice.*epic:"` or count only within the slice lifecycle section.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update tasks in this slice
The architecture overview lists a "Documentation Update Phase" with 6 docs to update. This plan has no doc update tasks. If doc updates are deferred to a later slice, that's fine, but the plan should explicitly state "Documentation updates deferred to slice N" to avoid the impression that docs were forgotten.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 test fixture task is vague about which fixtures need nested path migration
"Move slice entries from `slices/` to `epics/<epic>/slices/` in fixture state trees" — this should enumerate which fixture directories actually contain slice state tree entries. The affected-apis doc lists 4 fixture files for `sliceSequence` removal but doesn't enumerate fixtures with `slices/` directory entries in their state trees. An implementer would need to search `tests/fixtures/` to find them.
Resolution: CODEBASE_EXPLORATION

## Score: 6/10

The plan demonstrates strong alignment with the architecture docs and covers the right scope (schemas + state machine only). The two-phase structure is logical. However, there are two critical issues: the `DeferredItem` file location is wrong, and the `Target` change creates silent runtime bugs in out-of-scope code without any tracking mechanism. The Phase 1/Phase 2 boundary is blurred by helper changes appearing in both phases, and a missing `epic-complete.ts` handler update could leave the epic completion workflow broken. The INV-005 atomicity concern is a real implementation risk. To reach 9+: fix DeferredItem location, clarify Target change strategy, tighten Phase 1 boundary, add epic-complete handler, add atomicity note for schema registry + helpers, and sharpen the before/after verification checks.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
