## Issues

**[IMPORTANT]** Phase 2: `COMPLETE_QUEST` event `architectureDelta` should carry `ArchitectureDeltaInput[]` (no `ts`), not `ArchitectureDelta[]`
The plan's Phase 2 quest-complete.ts task says "Architecture deltas: write `event.architectureDelta` to `quests/<name>/architecture-deltas.jsonl`. Deltas arrive with `ts` already injected by RPC layer." However, examining the existing COMPLETE_SLICE event in `src/schemas/state-events.ts` (line 71), its `architectureDelta` field has type `ArchitectureDeltaInput[]` (no `ts` field). The RPC complete layer in `complete.ts` (line 85) passes `architectureDelta` straight from `CompleteInput` which also uses `ArchitectureDeltaInput[]`. The `ts` injection happens inside the state machine handler itself — see `slice-complete.ts` lines 112-113: `const deltas: ArchitectureDelta[] = event.architectureDelta.map((d) => ({ ...d, ts: event.ts }))`. The plan's Phase 1 COMPLETE_QUEST event type definition correctly specifies `architectureDelta: ArchitectureDeltaInput[]`, but Phase 2's prose description contradicts this by saying deltas "arrive with `ts` already injected by RPC layer." The handler must inject `ts` from `event.ts` (matching the COMPLETE_SLICE pattern in `slice-complete.ts`), not expect it pre-injected.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2: `quest-plan.ts` transition table docs say `activeQuest == null` guard but this is not in the current `transition-tables.md` Cross-Cutting Guards table
The plan adds a task to "update `transition-tables.md`: add a 'one-active-quest' entry to the Cross-Cutting Guards table." This is correct. However, the current `transition-tables.md` Quest Lifecycle table (line 101) shows `BEGIN_QUEST_PLAN` with Guard column as "---" (no guard). The plan should clarify that the transition table itself needs updating too (the `Guard` column in the Quest Lifecycle section should read `activeQuest == null`), not just the Cross-Cutting Guards table. The task description in Phase 2 does say "set `BEGIN_QUEST_PLAN` guard to `activeQuest == null` (currently shows '---')" which is correct, but the phrase "currently shows '---'" is slightly misleading — the actual table has a simple `—` em-dash, not `---`. This is cosmetic but worth noting for implementation clarity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: `quest:complete` command `architectureDelta` coercion in `buildCompleteEvent` needs the same conditional spread pattern as COMPLETE_SLICE
Phase 3 task for `complete.ts` says "coerce undefined arrays to `[]` for learnings and architectureDelta." The existing slice branch (complete.ts lines 83-85) uses direct `?? []` coercion: `learnings: input.learnings ?? []`. This works for `exactOptionalPropertyTypes` because the state event fields are required (not optional). The plan's Phase 1 correctly extends CompleteInput's quest variant with `learnings?: LearningInput[]` and `architectureDelta?: ArchitectureDeltaInput[]`. The `?? []` pattern is the correct approach for quest too. The plan's Phase 3 task description for `quest:complete` CLI command says "Uses conditional spread for optional fields (exactOptionalPropertyTypes)" — but the conditional spread is only needed at the CompleteInput construction site in the command handler (building the object from CLI args), not in `buildCompleteEvent` where `?? []` is the right pattern. This distinction could lead to confusion during implementation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: `applyBudget` should document behavior when entries array is empty
The `applyBudget` function's JSDoc documents the "first priority entry always inlined" contract but doesn't specify behavior for an empty entries array. With `entries = []`, the function should return `{ inline: {}, references: [] }`. This is the natural zero case but worth a one-line JSDoc note and a test case in `budget.test.ts` to prevent regressions.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 2 issues are all addressed in this revision: `STATE_QUEST_ALREADY_ACTIVE` added to `StateErrorCode` union (Phase 1 task), context types placed in `src/core/context/types.ts` (Phase 4 task), `collectMarkdownEntries` uses state-tree-relative paths (Phase 4 task), `parseInlineBudget` returns `boolean | number | undefined` with `DEFAULT_INLINE_BUDGET` constant resolved internally (Phase 5 task), priority source path functions take only `target` (Phase 4 task), quest `rollupTo: "epic"` silent skip is documented (Phase 2 task), and `buildBeginResult` Quest type import is noted (Phase 3 task). The one remaining IMPORTANT issue is a prose inconsistency in Phase 2 about `ts` injection on architecture deltas that could lead to a double-injection bug or a handler that expects pre-injected timestamps. The three MINOR items are clarification-level. To reach 10: fix the IMPORTANT item (one-sentence prose correction in Phase 2's architecture deltas task description).

## Summary
- Critical: 0
- Important: 1
- Minor: 3
