# Merged Feedback — Round 4: Learnings Directory Pattern

## Overall Assessment

All four round 3 IMPORTANT issues have been resolved. The plan is thorough, well-structured, and ready for implementation. Remaining items are precision notes for implementers rather than correctness gaps. No domains require re-review.

---

## Issues

### [IMPORTANT] RPC insertion points for `.md` file operations are underspecified

**Source:** Software Architecture

The plan describes *what* the RPC layer must do (write `.md` files after reduce for `complete()`, copy `.md` files during `ROLLUP_LEARNINGS` in `begin()`) but not *where* in the existing code these operations are inserted. Both `complete()` in `src/core/rpc/complete.ts` and `begin()` in `src/core/rpc/begin.ts` follow a tight pipeline with no current post-reduce hooks.

**Fix options:**
- For `complete()`: add a block between `reduce()` and `commitState()` that calls `writeMarkdownFiles()`.
- For `ROLLUP_LEARNINGS`: either add a conditional in `begin()` checking `phase === "rollup"` and calling `copyMarkdownFiles()`, or (cleaner) extract a dedicated `rollupLearnings()` RPC function that includes the copy step. The plan already hints at a "standalone ROLLUP_LEARNINGS handler" — clarify that this means a new RPC function.

**Resolution:** DIRECTLY_ACTIONABLE

---

### [MINOR] `CompleteInput` boundary type should be explicitly preserved as `LearningInput[]`

**Sources:** Software Architecture (partial), TypeScript

`CompleteInput` in `src/core/rpc/types.ts` (lines 181, 187) uses `LearningInput[]` as the input boundary type. After `StateEvent` changes to `LearningEventEntry[]`, the mapping from `LearningInput` → `LearningEventEntry` must happen in the RPC layer before `buildCompleteEvent()` is called. The plan's Phase 1 RPC task describes this correctly, but doesn't explicitly confirm that `CompleteInput` intentionally retains `LearningInput[]`. A one-liner clarification would prevent implementer confusion about which types change and which don't.

**Resolution:** DIRECTLY_ACTIONABLE

---

### [MINOR] `buildCompleteEvent` mapping location should be specified

**Source:** TypeScript

The plan's Phase 1 RPC task describes the `LearningInput[]` → `LearningEventEntry[]` mapping but doesn't specify where it sits relative to `buildCompleteEvent`. Two clean options:
1. Map in `complete()` before calling `buildCompleteEvent`, passing already-mapped entries (preferred — keeps `buildCompleteEvent` a pure type-mapping function, slug derivation stays in orchestration layer).
2. Map inside `buildCompleteEvent` itself.

Option 1 is cleaner: `buildCompleteEvent` should accept `LearningEventEntry[]` for its learnings field, and `complete()` performs the mapping first. The plan should note this explicitly.

**Resolution:** DIRECTLY_ACTIONABLE

---

### [MINOR] Shared learnings helper signature needs parameterization spec

**Source:** Software Architecture

The plan tasks "Extract shared helper for learnings processing" noting that `slice-complete.ts` (lines 73-117) and `quest-complete.ts` (lines 47-81) share similar logic. However, they differ: slices roll up to both `epic` and `project`; quests skip `epic` and only roll up to `project`. A shared helper is reasonable but needs a specified signature to avoid an over-generic abstraction.

**Suggested signature:**
```typescript
processLearnings(
  tree: ProjectTree,
  learnings: LearningEventEntry[],
  source: string,
  availableTargets: Set<string>
): ProjectState
```
Where `availableTargets = new Set(["project"])` for quests (making the skip-epic case explicit).

**Resolution:** DIRECTLY_ACTIONABLE

---

### [MINOR] `exactOptionalPropertyTypes` note for consumers of `ContextBundle.learnings`

**Source:** Software Architecture

Phase 2 correctly handles `exactOptionalPropertyTypes` in `collectLearnings` via conditional spread for the new `file?: string` field on `LearningSummary`. However, `LearningSummary` is also exposed through `ContextBundle.learnings`. Any future caller iterating that array and spreading or assigning `file` will hit the same constraint. The plan should note that callers should use `"file" in learning` checks rather than `learning.file !== undefined`.

This is a forward-looking note — `collectLearnings` is the only current producer and is handled correctly.

**Resolution:** DIRECTLY_ACTIONABLE

---

## Resolved / No Issues

- **Holistic:** All four round 3 issues fully resolved (ROLLUP_LEARNINGS file-copy scoping, `LearningSummary` type update with correct exactOptionalPropertyTypes pattern, `assembleState` verification uses concrete runnable check, `audit-architecture` line distinction clarified). Score: 9/10.
- **Agent Skill:** All three round 3 issues fully resolved (cli-interaction.md payload examples, broader grep pattern gap, epic-conventions.md directory diagram clarification). Score: 10/10.
- **TUI and CLI (round 3, not re-run):** Scored 9 with no IMPORTANT issues in round 3.
- **4-layer compliance:** State machine stays pure (INV-003). Slug derivation in RPC layer. Data Layer helpers are additive.
- **INV-001 compliance:** All state mutations go through `reduce()`. `.md` file writes are supplementary artifacts.
- **INV-005 compliance:** `z.union([new, legacy])` union schema handles transition correctly. Phase 4 tightening is correctly deferred.
- **Schema transition strategy:** Non-breaking union approach is sound.
- **Phase ordering:** Correct dependency chain — schema/state/RPC first, then CLI/data layer, then skills, then migration+tightening.
- **Maturity awareness:** All touched subsystems are Developing; no fitness function conflicts.
