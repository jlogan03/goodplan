# Software Architecture Review: Phase 4 — Context Bundling Module

Reviewer: SoftwareArchitecture
Iteration: 1

## Issues

**[IMPORTANT]** Type system bypass via `as unknown as` casts in priorities.ts

`getPriorityTable()` returns `PRIORITY_TABLES[phase] as unknown as ContentSource[]` and `resolveSourcePath()` casts `source as unknown as InternalSource`. This double-unknown chain erases the type difference between `InternalSource` (path functions take `ResolvedTarget`) and `ContentSource` (path functions take `Target`). The mismatch is papered over at runtime by passing `ResolvedTarget` where `Target` is declared, relying on structural compatibility. This is fragile — if `ResolvedTarget` ever changes shape, no compiler error surfaces. A cleaner approach: make `ContentSource.path` accept `ResolvedTarget` directly (since that is what is actually passed), or export `InternalSource` as the public type from the module.

File: src/core/context/priorities.ts:163
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Priority tables diverge from architecture spec for several phases

The rpc-layer-api.md and transition-tables.md specify content sources that the implementation omits:

1. **explore phase**: Spec says "completed epics, completed quests, pending quests" should be included. Implementation has only epic goal, research, brainstorm, conventions.
2. **plan/refinement phases**: Spec says "active decisions, recent learnings" are part of the inline priority list. The implementation handles decisions and learnings separately in `startContext()` (via `collectDecisions`/`collectLearnings`), which means they are never inlined under the `--inline` budget — they always appear as top-level `decisions`/`learnings` arrays. This may be intentional (decisions/learnings are structured data, not markdown), but the priority table spec lists them inline. If this is a deliberate deviation, document it.
3. **refine-architecture**: Spec says "active decisions" should be in priority list. Implementation omits decisions from the priority table (they come from `collectDecisions` instead).
4. **slices/refine-slices**: Spec says "learnings" in the priority list. Implementation omits learnings from priority tables.

The plan document (phase-04 refined) acknowledges these same sources. The pattern of handling decisions/learnings via separate collection rather than priority tables appears to be a deliberate architectural choice, but it is undocumented and creates a discrepancy between spec and implementation.

File: src/core/context/priorities.ts:71
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `explore` phase path functions assume `epicName(rt)` is always defined

In `exploreSources` and `architectureSources`, path functions like `(rt) => \`epics/${epicName(rt)}/epic.json\`` will produce `epics/undefined/epic.json` if `epicName` returns `undefined` (e.g., no active epic and a non-epic target). Other phases guard against this by returning `undefined` from the path function when `epicName` returns `undefined`. The explore/architecture phases should be epic-only, so this may never trigger in practice, but it is inconsistent with the defensive pattern used by plan/refinement/implementation phases.

File: src/core/context/priorities.ts:106
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Tests import from `src/core/data/tree.js` instead of `src/core/tree.js`

All six test files import types from `../../../src/core/data/tree.js`, which is a re-export barrel. The source code itself imports from `../tree.js` (the canonical location). While functionally equivalent, test imports should match the canonical module path for consistency and to avoid confusion about the module's true location.

File: tests/unit/context/collect.test.ts:8
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong implementation. Module boundaries are clean — the context module is pure (no I/O imports verified), depends only on tree types, and maintains correct dependency direction (context does not import from RPC orchestration). The internal decomposition (types, priorities, collect, budget, decisions, learnings, index) follows the narrow-interface/deep-implementation principle well. `applyBudget` and `collectMarkdownEntries` are genuinely deep modules. The deduplication logic in `startContext` is a good design choice. All 57 tests pass. To reach 9+: resolve the type safety issue in priorities.ts and document the intentional divergence between spec priority tables and the decisions/learnings handling approach.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
