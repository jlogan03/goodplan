# Software Architecture Review — Epic Lifecycle Plan (Round 3)

## Issues

**[IMPORTANT] Phase 1: epicSchema refinement field shape diverges from existing shared refinementSchema**
Phase 1 specifies adding a `refinement` field to `epicSchema` with shape `z.object({ round, maxRounds, scoreHistory: z.array(z.object({ round, scores, timestamp })) })`. However, `src/schemas/shared.ts` already defines `refinementSchema` with `scoreHistory: z.array(scoreEntrySchema)` where `scoreEntrySchema` is `{ round, scores }` — no `timestamp` field. Meanwhile, `sliceSchema` and `questSchema` already import and use this shared `refinementSchema`. The plan should either: (a) reuse `refinementSchema` from shared.ts for the epic entity too (consistent with slice/quest, but loses the `timestamp` field the plan wants), or (b) extend `scoreEntrySchema` in shared.ts to include an optional `timestamp` field (changes slice/quest schema shape too — acceptable if those schemas are experimental maturity). Option (a) is the simpler path since timestamp on individual score entries is not referenced anywhere in the transition logic. If `timestamp` per score entry is genuinely needed, the plan should amend shared.ts rather than defining a parallel schema in epicSchema.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/01-state-event-types.md`

**[IMPORTANT] Phase 3: slice-submit.ts COMPLETE_PLAN guard uses `hasChild(state, "slices/<name>", "plan.md")` but slice creation path is out of scope**
Phase 3 creates `slice-submit.ts` with handlers for COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, and COMPLETE_IMPLEMENTATION. The COMPLETE_PLAN guard checks `hasChild(state, "slices/<name>", "plan.md")` — this is correct per transition-tables.md. However, to test this handler, you need a state tree that has a slice entity in `planning` status with `plan.md` present. Slice creation (CREATE_SLICE, BEGIN_PLAN) is explicitly deferred to slices 04-05. The plan acknowledges this ("pulled forward from slices 04-05") but the testing task says "COMPLETE_PLAN with/without plan.md" — the test will need to manually construct a state tree with a slice in `planning` status. This is feasible (unit tests can build arbitrary state trees with `setEntry`) but the plan should note that the test fixtures must manually construct slice state rather than running through the slice creation workflow. Same for quest variants.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

**[MINOR] Phase 4: submit() SubmitInput phase field redundancy acknowledged but assertion direction unclear**
Phase 4 says "the `phase` parameter and `SubmitInput.phase` field are intentionally redundant... They must match; the implementation should assert this." This is good — the redundancy is documented and validated. However, the plan doesn't specify what happens when they don't match. Since this is an internal consistency issue (the CLI constructs both values), this should throw an `INTERNAL_ERROR` (not a user-facing validation error). Minor because the assertion behavior is an implementation detail, but worth noting so the implementer picks the right error code.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/04-rpc-layer.md`

**[MINOR] Phase 3: Transition table export decision resolved but the stated approach creates coupling between state machine and fitness functions**
Phase 3 now picks the export approach: `export const epicTransitions: { from, event, to }[]` arrays. This creates a public API on the state machine module that fitness functions (slice 08) will depend on. The plan notes this and says the reduce()-based alternative is acceptable if coupling is a concern. The explicit export is the better choice for this experimental-maturity subsystem — it makes the transition spec testable without constructing state trees. Just noting that if the state machine later moves to Maturing, this export surface should be evaluated for whether it leaks implementation details.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

**[MINOR] Phase 2: loadState incremental path entry type assignment unspecified**
Phase 2 says for each new file detected: "fully read and parse it, add to the cached tree as the appropriate entry type (MarkdownEntry for .md, JsonEntry for registered .json, etc.)." But the plan doesn't specify how the incremental path determines which Zod schema to use for a new JSON file. The answer is the schema registry (`findSchema()` from `src/core/data/schema-registry.ts`), which already maps path patterns to schemas. The plan should reference this explicitly so the implementer doesn't re-invent the logic.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/02-data-layer-upgrades.md`

## Score: 9/10

Round 3 resolves all the significant issues from round 2. The timestamp handling is now explicit with an architecture amendment task. The COMPLETE_EXPLORE transition correctly uses two from-status rows. The BeginPhase scope is bounded. The payload type safety uses a proper `BeginPayloadMap`. The loadState cache format is specified with mtime metadata and skip-rule parity. The staleness window is documented. The e2e walkthrough now shows the full begin/submit chain with realistic payloads. The epic-create timestamp fields are explicit. The submit-plan guard phrasing correctly attributes the guard to the state machine. Human-readable output patterns are specified.

The remaining issues are refinement-level: the epicSchema refinement field shape divergence from the existing shared schema is the most significant — it introduces a parallel type definition where one already exists. The slice-submit test fixture note is a clarity improvement. The other items are minor.

To reach 10: reconcile the refinement schema with shared.ts (reuse or extend, don't duplicate) and note that slice-submit tests require manually constructed state fixtures.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
