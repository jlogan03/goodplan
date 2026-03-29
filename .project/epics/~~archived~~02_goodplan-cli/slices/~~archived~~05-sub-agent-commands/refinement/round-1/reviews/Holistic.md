# Holistic Review: Sub-Agent Commands & Quest Lifecycle

## Issues

**[IMPORTANT]** CompleteInput quest variant missing learnings/architectureDelta fields
Phase 1 says to extend the `CompleteInput` quest variant with `learnings?` and `architectureDelta?` fields. The current definition in `src/core/rpc/types.ts` (line 131) is `{ type: "quest"; verificationPassed: boolean }` — matching the plan. However, the plan's Phase 1 task for this extension does not mention updating the `StateEvent` union's `COMPLETE_QUEST` event type to carry these fields. The `COMPLETE_QUEST` event itself doesn't exist yet (it's added in Phase 1), and Phase 2 describes the handler reading `event.learnings` and `event.architectureDelta`. The plan should explicitly state in Phase 1 that the new `COMPLETE_QUEST` event type in the `StateEvent` union must include `learnings: LearningInput[]` and `architectureDelta: ArchitectureDeltaInput[]` as required fields (coerced from optional at the RPC boundary, matching the `COMPLETE_SLICE` pattern on line 67-74 of state-events.ts). Currently, the Phase 1 task bullet for extending `StateEvent` only mentions `quest, ts, verificationPassed, learnings, architectureDelta` parenthetically — it should be made explicit that `learnings` and `architectureDelta` are required on the event (not optional), since the RPC layer coerces `undefined` to `[]`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 `startContext` signature uses `SubmitPhase` but architecture uses `SubmitPhase` too — `complete` phase is missing
The architecture's rpc-layer-api.md defines `startContext(phase: SubmitPhase, target, options)`, and the per-phase priority tables in the transition tables include a `complete` phase. However, `SubmitPhase` in `src/core/rpc/types.ts` does NOT include `'complete'` — it only has `plan | refinement | implementation | explore | architecture | slices | refine-architecture | refine-slices`. The plan's Phase 4 priority tables list `plan`, `refinement`, `implementation`, `explore`, `architecture`, `slices`, `refine-architecture`, `refine-slices` — all matching `SubmitPhase`. But the architecture's context priority table also lists a `complete` phase (transition-tables.md lines 90 and 124 show "Quest Context Returns" with a `complete` row). The plan omits the `complete` context phase entirely. Either: (a) the `complete` phase context is out of scope for this slice and should be noted as such, or (b) `SubmitPhase` needs extending and Phase 4 needs the `complete` priority table. Clarify in the overview.
Resolution: USER_INPUT

**[IMPORTANT]** Phase 2 quest-plan.ts sets `project.json` activeQuest but no task for reading/modifying project.json
Phase 2 describes BEGIN_QUEST_PLAN setting `project.json activeQuest` and COMPLETE_QUEST / ABANDON_QUEST clearing it. The slice-plan.ts handler for `BEGIN_PLAN` (which sets `activeSlice`) uses `getProject` + `setEntry` on `project.json`. The plan should explicitly state that quest handlers need to import `getProject` from helpers.ts and follow the same `project.json` mutation pattern. Additionally, CREATE_QUEST in Phase 2 does NOT set `activeQuest` (only BEGIN_QUEST_PLAN does) — this matches the slice pattern where `CREATE_SLICE` doesn't set `activeSlice`. Good. But the task description for `quest-plan.ts` should reference the established `getProject` + `setEntry` pattern from `slice-plan.ts` to avoid the implementer guessing at the approach.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 quest-create.ts missing `quests/overview.json` update detail
The task says "Updates `quests/overview.json` (adds item — no `epic` field since quests are project-scoped)." The existing `init.ts` (line 52) creates `quests/overview.json` with `{ items: [] }` during INIT_PROJECT, matching the pattern. However, the task should specify the overview item shape explicitly: `{ name: string, status: QuestStatus }` (matching the slice overview pattern minus `epic`). The codebase research confirms quests have no `epic` field, but the `Overview` type in `src/schemas/entities/overview.ts` may have an `epic` field as part of the item schema. The implementer needs guidance on whether to reuse the same `Overview` type (with `epic` as optional) or create a quest-specific overview type.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 3 quest:create reads stdin but plan says "No `--epic` flag" without clarifying that `goal` is required via stdin
Phase 3's task for `quest:create` says "reads stdin JSON `{name, goal}`, calls `begin('create', ...)`. No `--epic` flag." But the corresponding `buildCreateEvent` in `begin.ts` for the quest case will need `goal` validation (matching the epic pattern on line 117-120 of begin.ts). The plan's Phase 3 task for extending `begin.ts` does say "Runtime validation for quest creation: `goal` required" — good. But the `quest:create` command task should explicitly note that `goal` is required in the stdin payload (not optional), consistent with the Zod schema `createQuestInput` defined later in the same phase.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 budget default inconsistency: plan says 20480 (20KB), architecture says ~20-30KB
Phase 4's budget.ts task says "Default budget: 20480 (20KB)." The architecture's rpc-layer-api.md says "default (~20-30KB)." These are compatible (20KB is within the ~20-30KB range), but the plan should pick a specific value and note it. Currently the plan does pick 20480 — that's fine. Phase 5's `start-plan.ts` task also says `"true" -> default budget (20480)`. Consistent. This is just a note that the architecture's range is intentionally vague and the plan correctly pins it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 E2E verification references `goodplan` binary but earlier steps use `bun run src/index.ts`
The e2e walkthrough in Phase 5 switches between `bun run src/index.ts` (Phase 3's expected behavior) and `goodplan` (Phase 5's steps 2-13). The binary only exists after `bun run build` (step 13 of Phase 5). The walkthrough should clarify: steps 1-12 use `bun run src/index.ts` (or a shell alias), step 13 (binary regression) uses the compiled binary. Currently steps 2-12 say `goodplan` which implies the binary is already built.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update task for architecture docs
The plan updates `.project/conventions.md` (Phase 5) but does not include a task to update `architecture/rpc-layer-api.md` or `architecture/commands-api.md` to reflect the newly implemented quest and context features (removing "not yet implemented" annotations, if any). The architecture docs were the source of truth for the design — they likely don't need updating since they already describe the full target state. But if any "deferred to slice 05" notes exist in the architecture, a cleanup task should be added.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured, follows established codebase patterns closely, and has thorough e2e verification. Phase ordering is correct (types first, state machine, RPC+CLI, novel module, integration). The two IMPORTANT issues (missing event field specification and unclear `complete` context phase scope) could cause implementation confusion. Fixing these and the minor clarifications would bring it to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
