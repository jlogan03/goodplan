# Round 3 Merged Feedback — Sub-Agent Commands & Quest Lifecycle

## CRITICAL Issues

None.

## IMPORTANT Issues

**[IMPORTANT-1] Phase 2: quest overview item shape mismatches `overviewItemSchema`** *(Holistic)*
Phase 2's `quest-create.ts` specifies the quest overview item as `{ name: string, status: QuestStatus }`, omitting `created` and `completed`. The actual `overviewItemSchema` in `src/schemas/entities/overview.ts` requires `created: timestampSchema` and `completed: timestampSchema.nullable()`. Inserting items without these fields will fail Zod validation (INV-005) or produce a compile error. Fix: include `created: event.ts, completed: null` in the quest overview item, matching the slice pattern. Additionally, the plan says quest-create should "create `quests/overview.json` if absent" — but `init.ts` already creates it unconditionally, and `slice-create.ts` errors if `slices/overview.json` is missing. Follow the error-if-missing pattern instead of create-if-absent.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-2] Phase 2: `COMPLETE_QUEST` event `architectureDelta` prose contradicts the type** *(TypeScript)*
Phase 2's `quest-complete.ts` task says "deltas arrive with `ts` already injected by RPC layer." This is wrong. The existing `COMPLETE_SLICE` event (see `src/schemas/state-events.ts` line 71) uses `ArchitectureDeltaInput[]` (no `ts`). The RPC `complete.ts` (line 85) passes `architectureDelta` straight from `CompleteInput`, also typed as `ArchitectureDeltaInput[]`. `ts` injection happens inside the state machine handler — see `slice-complete.ts` lines 112–113: `const deltas: ArchitectureDelta[] = event.architectureDelta.map((d) => ({ ...d, ts: event.ts }))`. Phase 1 correctly types the field as `ArchitectureDeltaInput[]`; Phase 2 prose must match: the handler injects `ts` from `event.ts`, not the RPC layer.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-3] Phase 4: `complete` context priority table defined but never wired** *(SoftwareArchitecture)*
Phase 4 adds `'complete'` to `SubmitPhase` and defines the `complete` priority list in `priorities.ts`, with the comment "No `start-complete` command needed; context assembled inline during `quest:complete`/`slice:complete`." However, no task in any phase wires `complete()` to call `startContext()` when `--inline` is set. Phase 3's `quest:complete` command doesn't mention `--inline`. The existing `complete()` in `complete.ts` accepts `_options?: WorkflowOptions` but ignores it. The `complete` priority table is dead code within this slice. Fix: add a task in Phase 3 or Phase 5 to wire `--inline` through `complete()` to `startContext(state, 'complete', target, options)` and return `context` in `CompleteResult`; or explicitly remove `'complete'` from `SubmitPhase`/`priorities.ts` and defer with a TODO comment.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**[MINOR-1] Phase 2: `activeQuest == null` guard update covers both the Quest Lifecycle table and Cross-Cutting Guards** *(TypeScript — clarification of Holistic round-2 MINOR)*
The plan's Phase 2 task correctly says "set `BEGIN_QUEST_PLAN` guard to `activeQuest == null` (currently shows '---')". For completeness, confirm the implementation touches both the `Guard` column in the Quest Lifecycle table row for `BEGIN_QUEST_PLAN` **and** adds a 'one-active-quest' entry to the Cross-Cutting Guards table. Both updates are implied but naming them explicitly prevents a partial update. No further action needed beyond confirming this is on the implementer's radar.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-2] Phase 4: `applyBudget` empty-entries case undocumented and untested** *(Holistic + TypeScript — duplicate, merged)*
The JSDoc contract "first priority entry always inlined regardless of budget" is ambiguous when `entries` is empty. Add: (a) a one-line JSDoc note that `applyBudget([], anyBudget)` returns `{ inline: {}, references: [] }`, and (b) an explicit test case for the empty-entries input in `budget.test.ts`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-3] Phase 3: `buildCompleteEvent` conditional spread vs. `?? []` distinction** *(TypeScript)*
Phase 3's `quest:complete` CLI task says "Uses conditional spread for optional fields (exactOptionalPropertyTypes)." The conditional spread is correct at the **CLI handler** (building `CompleteInput` from CLI args, where the field may be absent). Inside `buildCompleteEvent`, the right pattern is `?? []` coercion (matching `slice-complete.ts` lines 83–85), not conditional spread — the event fields are required, not optional. The plan description could mislead an implementer into using conditional spread in the wrong place. Clarify which site uses which pattern.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-4] Phase 4: `SubmitPhase` name becomes semantically inaccurate once `'complete'` is added** *(SoftwareArchitecture)*
`SubmitPhase` originally meant "phases mapping to `submit-*` commands." Adding `'complete'` breaks that meaning — `complete` maps to `quest:complete`/`slice:complete`, not any `submit-*` command. A code comment on the type definition (e.g., "phases that have content priority orderings") would suffice, or rename to `ContextPhase`. Phase 5 already updates the architecture doc; include this clarification there.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

Count: 7 (IMPORTANT-1, IMPORTANT-2, IMPORTANT-3, MINOR-1, MINOR-2, MINOR-3, MINOR-4)

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **`activeQuest` guard task presence**: Holistic (MINOR) and TypeScript (MINOR) both flagged the transition-tables update — Holistic treats it as already resolved; TypeScript notes a cosmetic wording issue (`---` vs. `—`). Merged as MINOR-1 with a clarification note; no contradiction in substance.

2. **`applyBudget` empty-entries**: Raised independently by both Holistic and TypeScript with identical resolution. Merged into MINOR-2.

## Unresolved (USER_INPUT required)

None.
