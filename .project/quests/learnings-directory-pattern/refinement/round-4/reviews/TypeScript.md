# TypeScript Review -- Round 4: Learnings Directory Pattern

## Issues

**[MINOR]** `CompleteInput` in `src/core/rpc/types.ts` still uses `LearningInput[]` -- needs clarification on whether it stays or changes

The plan correctly adds a task to update `src/schemas/state-events.ts` to change `learnings: LearningInput[]` to `learnings: LearningEventEntry[]` on both `COMPLETE_SLICE` and `COMPLETE_QUEST` event variants. However, `CompleteInput` in `src/core/rpc/types.ts` (lines 181, 187) also references `LearningInput[]` as the input boundary type. The plan's design says skills still pass `detail` in the payload and the RPC layer maps `LearningInput` to `LearningEventEntry` -- so `CompleteInput` should intentionally keep `LearningInput[]` (it's the pre-mapping input type). But the plan doesn't explicitly confirm this. Since `buildCompleteEvent()` in `complete.ts` currently passes `input.learnings` straight through to the event, after the `StateEvent` type changes to `LearningEventEntry[]`, the RPC layer must perform the mapping *before* calling `buildCompleteEvent()` (or inside it). The plan's RPC layer task in Phase 1 describes this mapping correctly, but adding a one-liner to the `state-events.ts` task clarifying that `CompleteInput` retains `LearningInput[]` (the input boundary) would prevent confusion during implementation about which types change and which don't.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `buildCompleteEvent` signature needs updating for the mapping step

Currently `buildCompleteEvent(target, input, ts)` constructs events directly from `CompleteInput`. After this change, the RPC layer must map `LearningInput[]` to `LearningEventEntry[]` before (or during) event construction. The plan's Phase 1 RPC task describes this but doesn't specify *where* the mapping happens relative to `buildCompleteEvent`. Two clean options: (1) map in `complete()` before calling `buildCompleteEvent`, passing the already-mapped entries, or (2) map inside `buildCompleteEvent` itself. Option 1 is cleaner because `buildCompleteEvent` stays a pure type-mapping function and the slug derivation + file writing stays in the orchestration layer. The plan should note that `buildCompleteEvent` will need to accept `LearningEventEntry[]` (not `LearningInput[]`) for the learnings field, or that the `complete()` function does the mapping and passes a modified input. This is minor because the intent is clear from the Phase 1 RPC task, but the implementation path isn't specified.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All four issues from round 3 have been cleanly addressed in the current plan: (1) the `state-events.ts` update task is now explicit in Phase 1, (2) transition handlers annotate local arrays as `LearningEventEntry[]`, (3) `deriveSlug` has a fallback for empty normalization results, and (4) `LearningSummary` uses conditional spread for `exactOptionalPropertyTypes` compliance. The type system design is now complete -- `LearningInput` at the input boundary, `LearningEventEntry` in events and state machine, `LearningEntry` union in JSONL during transition, tightened to new-format-only after migration. The two remaining minors are about implementation precision (where the mapping step sits relative to `buildCompleteEvent`) rather than correctness gaps.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
