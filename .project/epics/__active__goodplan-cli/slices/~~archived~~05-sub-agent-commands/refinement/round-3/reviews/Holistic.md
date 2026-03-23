# Holistic Review — Round 3: Sub-Agent Commands & Quest Lifecycle

## Issues

**[IMPORTANT]** Phase 2 quest overview item shape mismatches existing `overviewItemSchema`
Phase 2's `quest-create.ts` task specifies the quest overview item shape as `{ name: string, status: QuestStatus }` — omitting `created` and `completed`. However, the actual `overviewItemSchema` in `src/schemas/entities/overview.ts` (which is shared by epic and slice overviews) has `created: timestampSchema` (required, not optional) and `completed: timestampSchema.nullable()` (required). Since `quests/overview.json` uses the same schema (parsed via `getJson<Overview>`), inserting items without `created`/`completed` will either fail Zod validation at write time (INV-005) or cause a type error at compile time. The plan must either: (a) include `created: event.ts, completed: null` in the quest overview item (matching the slice pattern exactly), or (b) create a quest-specific overview schema with just `{ name, status }` and update `init.ts` accordingly. Option (a) is simpler and consistent with the established pattern. Also note: the plan says quest-create should "create `quests/overview.json` if absent (first quest case)" — but `init.ts` already creates it unconditionally, and `slice-create.ts` errors if `slices/overview.json` is missing rather than creating it. The plan should follow the same error-if-missing pattern instead of create-if-absent, to stay consistent and avoid masking uninitialized project states.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Round 2 IMPORTANT issue: `activeQuest` guard in transition-tables.md — confirm task is present
Round 2 flagged that `BEGIN_QUEST_PLAN` introduces a guard (`activeQuest == null`) not documented in `transition-tables.md`. The current plan (Phase 2) now includes a task: "Update `transition-tables.md`: set `BEGIN_QUEST_PLAN` guard to `activeQuest == null` (currently shows '—'), and add a 'one-active-quest' entry to the Cross-Cutting Guards table." This correctly resolves the round 2 IMPORTANT issue — the source-of-truth update is explicitly tasked. Noting as MINOR only to confirm it's resolved and visible to the implementer: the task is present, no further action needed.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 `applyBudget` JSDoc says first entry always inlined — but `entries` might be empty
The plan specifies a JSDoc contract: "the first priority entry is always inlined regardless of budget." This is a useful guarantee, but if `entries` is empty (e.g., the state tree has no markdown files for the target), calling `applyBudget([], budget)` should return `{ inline: {}, references: [] }` without violating the contract. The plan's unit tests include a "zero budget → all references" case but don't mention the "empty entries" case. Add an explicit test: `applyBudget([], anyBudget)` returns `{ inline: {}, references: [] }`. This prevents future implementers from being confused by the "first entry always inlined" contract when there is no first entry.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 2 issues are all addressed. The IMPORTANT issue on `activeQuest` guard now has a transition-tables update task. The context module layering reconciliation is in Phase 5. The `BEGIN_QUEST_REFINEMENT`/`BEGIN_QUEST_IMPLEMENTATION` `activeQuest` re-setting is corrected ("Do NOT set `activeQuest` here"). Human-readable formats are specified. Start commands' JSON-always behavior is documented with enforcement via `output(bundle, { ...args, json: true })`. One new IMPORTANT issue emerged from codebase exploration: the quest overview item shape conflicts with the existing `overviewItemSchema` (missing required `created`/`completed` fields) and uses a create-if-absent pattern that contradicts the established slice pattern. Fixing this brings the plan to 10/10.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
