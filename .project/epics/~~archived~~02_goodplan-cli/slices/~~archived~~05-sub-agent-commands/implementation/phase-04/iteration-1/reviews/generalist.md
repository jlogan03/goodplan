# Generalist Review: Phase 04 — Context Bundling Module

**Score: 8/10** | Critical: 0, Important: 3, Minor: 3

## Summary

Clean, well-structured module with good separation of concerns. The context bundling system is properly implemented as a peer module to the RPC layer with correct dependency direction. Types match the architecture spec, tests are thorough and cover the documented design contracts. The `startContext` signature deviation (taking state rather than loading it) is well-justified and documented.

## Important Issues

### I1. Priority tables partially diverge from architecture spec

The `rpc-layer-api.md` spec lists additional content sources for several phases that are not included in the priority tables:

- **plan**: spec says "active decisions, recent learnings" — but these are handled separately via `collectDecisions`/`collectLearnings` (not as content sources). This is arguably fine since they're returned in dedicated `decisions`/`learnings` fields, but the distinction should be documented in `priorities.ts` so future readers understand this was intentional, not an omission.
- **implementation**: spec says "relevant learnings" — same reasoning applies.
- **complete**: spec says "remaining slice overview, implementation results, learnings at all levels" — the implementation includes `slices-overview` (pointing to `slices/overview.json`) but omits "implementation results". The `complete` phase also doesn't include learnings as content sources (they come through `collectLearnings`). However, the spec says "learnings at all levels" which implies more comprehensive learnings collection than what `collectLearnings` currently does for scope-level only.
- **explore**: spec says "completed epics, completed quests, pending quests" — these are entirely absent from `exploreSources`. The implementation only has epic goal, research, brainstorm, and conventions.
- **slices**: spec says "learnings" — absent from `slicesSources`.
- **refine-architecture**: spec says "decisions, learnings" — absent from `refineArchitectureSources`.
- **refine-slices**: spec says "learnings" — absent from `refineSlicesSources`.

Some of these (decisions, learnings) are handled by the dedicated collectors, but `explore`'s "completed epics, completed quests, pending quests" have no corresponding code path at all.

**Files**: `src/core/context/priorities.ts` lines 104-142

### I2. Unsafe type casting in priorities.ts

The `InternalSource` type uses `(rt: ResolvedTarget) => string | undefined` for path functions, but `ContentSource` declares `path: string | ((target: Target) => string)`. The code bridges this with `as unknown as ContentSource[]` in `getPriorityTable` and `as unknown as InternalSource` in `resolveSourcePath`. This dual-type system with unsafe casts could break silently if either type changes. A cleaner approach would be to define `ContentSource.path` to accept `ResolvedTarget` directly (since `ResolvedTarget` is already exported from priorities.ts), or use a single type throughout.

**Files**: `src/core/context/priorities.ts` lines 163-177, `src/core/context/types.ts` line 44

### I3. `complete` phase in submit.ts throws but is not tested

The `buildSubmitEvent` function correctly throws for `phase === 'complete'` since complete uses a separate RPC function. However, there's no test validating this error path. While this is in the existing `submit.ts` (not new code), the `complete` addition to `SubmitPhase` was part of this phase's tasks.

**Files**: `src/core/rpc/submit.ts` lines 107-110

## Minor Issues

### M1. `resolveContentSource` handles JSON "goal" extraction with `as` cast

Line 104 of `collect.ts` uses `(content as { goal: string }).goal` after checking `"goal" in content`. The `in` operator doesn't narrow the type sufficiently for strict TypeScript. This works at runtime but relies on the `as` cast for type safety, which could mask issues if the `goal` field isn't actually a string.

**Files**: `src/core/context/collect.ts` lines 101-108

### M2. `DecisionSummary` includes `status` field with all three values including `superseded`

The type allows `superseded` status, but `collectDecisions` explicitly filters these out. The type should either omit `superseded` (since it's never returned) or the filtering logic should be documented on the type itself.

**Files**: `src/core/context/types.ts` line 22, `src/core/context/decisions.ts` lines 22-23

### M3. Test for dynamic path function uses inline function instead of InternalSource pattern

In `collect.test.ts` line 159, the test for dynamic path resolution uses `path: () => "epics/my-epic/research"` with `as unknown as ContentSource` — this doesn't exercise the actual `ResolvedTarget` parameter passing that the real priority tables use. A more realistic test would pass a function that uses `rt.activeEpic`.

**Files**: `tests/unit/context/collect.test.ts` lines 158-168

## Strengths

- **Clean module boundary**: The context module is properly isolated as a peer to RPC, with correct dependency direction (context imports from RPC types, not vice versa).
- **Budget design contract**: The "first entry always inlined" contract is well-documented in JSDoc and thoroughly tested, including the multi-byte character edge case.
- **Deduplication logic**: `startContext` deduplicates entries by key with first-occurrence-wins semantics, preserving priority order. This is a good defensive measure.
- **Comprehensive test coverage**: 57 tests across 6 test files covering all documented behaviors including edge cases (empty state, missing paths, budget boundaries).
- **Signature deviation is well-justified**: Taking `state` as a parameter rather than loading internally improves testability and keeps the module pure.
