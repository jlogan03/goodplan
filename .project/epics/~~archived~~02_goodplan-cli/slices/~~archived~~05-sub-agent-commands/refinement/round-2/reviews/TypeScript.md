## Issues

**[IMPORTANT]** Phase 1: `STATE_QUEST_ALREADY_ACTIVE` missing from `StateErrorCode` union
Phase 2's `BEGIN_QUEST_PLAN` handler uses error code `STATE_QUEST_ALREADY_ACTIVE` (per round 1 user input resolution). However, `StateErrorCode` in `src/schemas/state-events.ts` (lines 88-96) does not include this variant. Without adding it, the handler would produce a `StateError` whose `code` field doesn't satisfy the `StateErrorCode` type — a compile-time error under strict mode. Phase 1 should add `STATE_QUEST_ALREADY_ACTIVE` to the `StateErrorCode` union alongside the other new event types.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4: `ContextBundle` types placed in `src/core/rpc/types.ts` but context module is a peer, not part of RPC
The plan says to add `ContextBundle`, `DecisionSummary`, `LearningSummary` types to `src/core/rpc/types.ts` (or create `src/core/context/types.ts` and re-export). Given that round 1 resolved IMP-4 — context module is a peer to RPC, not within it — these types should live in `src/core/context/types.ts` as the primary location. Having the canonical definitions in `rpc/types.ts` would create a dependency from a peer module back into the RPC layer, violating the clarified layering. The plan should specify `src/core/context/types.ts` as primary, with RPC importing from there (not vice versa).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4: `collectMarkdownEntries` return type needs path qualification
The plan specifies `collectMarkdownEntries(state, path)` returning entries with "relative paths." But relative to what? The budget module needs `{ key: string; content: string }` where `key` identifies the entry for the `ContextBundle.inline` record keys and `ContextBundle.references` paths. The plan should specify that keys are state-tree-relative paths (e.g., `epics/my-epic/architecture/_overview.md`), not relative to the input `path` argument. This matters because `references` entries are consumed by the Commands layer which resolves them to filesystem paths via `projectDir + "/.project/" + key`. If keys are relative to the input directory, the Commands layer would need to reconstruct the full path — unnecessary indirection. Tree-relative paths are already the convention used by `resolveEntityJsonPath()` in `src/core/rpc/types.ts`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2: `quest-complete.ts` learnings transform accesses `learning.rollupTo` but `LearningInput` might not have `rollupTo`
Phase 2 says `COMPLETE_QUEST` handler transforms `LearningInput` to `LearningEntry` with `rollup: learning.rollupTo.length > 0`. Looking at how `COMPLETE_SLICE` in `slice-complete.ts` (line 77) does this: `rollup: l.rollupTo.length > 0`. This works because `LearningInput` has `rollupTo: ('epic' | 'project')[]` as a required field. The plan's description is consistent with this existing pattern, but for quests, rollup targets should only include `"project"` (not `"epic"`, since quests are project-scoped). The plan's Phase 2 task description says "For `rollupTo` containing `"project"`, append to top-level `learnings.jsonl`. Note: no `"epic"` rollup for quests since they are project-scoped." This is correct in the handler logic, but doesn't mention whether the `LearningInput` schema should be constrained to only allow `"project"` for quest context. Currently the schema accepts `('epic' | 'project')[]` regardless of entity type. An `"epic"` entry in a quest's `rollupTo` would silently do nothing. Consider documenting this behavior explicitly (silent skip vs. validation error).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: `buildBeginResult` in `begin.ts` needs quest branch — currently falls through to defaults
The plan's Phase 3 correctly identifies that `buildBeginResult` needs extension for quest targets. Looking at the current code (begin.ts lines 222-251), the function has explicit branches for `project`, `epic`, and `slice` but no `quest` branch. The plan task says "Extend `buildBeginResult` in `begin.ts` for quest targets." This is correct but should note that without it, quest begin operations would return `previousStatus: "none"` and `newStatus: "unknown"` since the function falls through to the defaults at lines 231-232. The fix is straightforward (add a `target.type === "quest"` branch reading `Quest` from state), but the plan should also specify importing the `Quest` type from `schemas/entities/quest.js`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: `parseInlineBudget` return type needs refinement for `exactOptionalPropertyTypes`
The plan specifies `parseInlineBudget(value: string | undefined): number | undefined`. Under `exactOptionalPropertyTypes`, if this return value is used to construct an object with `inlineContext?: boolean | number` (the `WorkflowOptions` interface), returning `undefined` from a function is fine for assignment to an optional property. However, the `start-*` commands need to distinguish "no --inline" (omit `inlineContext` entirely) from "--inline" (set `inlineContext: true`) from "--inline=N" (set `inlineContext: N`). The plan's `parseInlineBudget` returns `undefined | 20480 | number` but the `WorkflowOptions.inlineContext` type is `boolean | number`. The function should return `boolean | number | undefined` — `true` for bare `--inline`, a number for `--inline=N`, and `undefined` for absent. Returning `20480` for bare `--inline` conflates "use default" with "use exactly 20480 bytes", which works today but is fragile if the default changes. Consider returning `true` for bare `--inline` and letting the context module resolve the default internally.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: Priority source `path` as function type `(state, target) => string` introduces unnecessary coupling
The plan's `priorities.ts` defines content sources with `path: string | ((state, target) => string)`. Using `ProjectState` in the function signature means the priority table module directly depends on the tree type. Since all dynamic path resolution is simple template string interpolation (e.g., `quests/${target.name}/goal.md`), the function should take only `target: Target` (not `state`), keeping the priority table as a pure data mapping: `path: string | ((target: Target) => string)`. The state is only needed by `collect.ts` when resolving the path to actual content.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues are well-addressed: COMPLETE_QUEST event fields are explicitly required arrays, completeQuestInput has no redundant quest field, Buffer.byteLength is specified, startContext signature deviation is documented with an architecture update task, context module layering is clarified as a peer module, and the activeQuest guard is resolved. The remaining issues are: a missing `StateErrorCode` variant that will cause a compile error (IMPORTANT), context type placement conflicting with the resolved layering (IMPORTANT), and path qualification ambiguity in the collection API (IMPORTANT). To reach 9+: fix the three IMPORTANT items — they are all straightforward single-line or single-paragraph clarifications.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
