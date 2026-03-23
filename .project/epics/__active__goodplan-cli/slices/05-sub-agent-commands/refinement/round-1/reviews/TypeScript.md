## Issues

**[IMPORTANT]** Phase 1: CompleteInput quest variant missing learnings/architectureDelta fields
The plan correctly identifies that the quest variant of `CompleteInput` in `src/core/rpc/types.ts` (line 131) needs `learnings?` and `architectureDelta?` fields added. However, the plan says to add `learnings?: LearningInput[]` and `architectureDelta?: ArchitectureDeltaInput[]` — which is correct. The issue is that the plan's Phase 1 task description references these as `LearningInput[]` and `ArchitectureDeltaInput[]` but the codebase's `rpc-layer-api.md` spec uses `Learning[]` and `ArchitectureDelta[]` as the type names in the `CompleteInput` definition. The actual code already uses `LearningInput` and `ArchitectureDeltaInput` for the slice variant (line 129-130 of types.ts), so the plan's types are correct for consistency with existing code. However, the plan should explicitly note that these are the `*Input` variants (without `ts` on ArchitectureDeltaInput, without `source`/`rollup` on LearningInput) and that the RPC layer coerces undefined to `[]` before building the event — matching the slice pattern at `complete.ts` lines 83-85.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1: COMPLETE_QUEST event type needs `learnings` and `architectureDelta` as non-optional arrays
The plan specifies `COMPLETE_QUEST` event with `learnings` and `architectureDelta` fields. Looking at the existing `COMPLETE_SLICE` event (state-events.ts line 67-74), these are non-optional arrays: `learnings: LearningInput[]`, `architectureDelta: ArchitectureDeltaInput[]`. The plan's description says "learnings, architectureDelta" but doesn't explicitly state whether they are optional on the event. They must be required (non-optional) on the StateEvent, matching `COMPLETE_SLICE`. The RPC layer coerces `undefined` to `[]` before building the event. The plan should be explicit about this to avoid an implementer making them optional on the event type (which would break the coercion pattern and the state machine's expectation of always having arrays).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2: Quest overview sync requires `quests/overview.json` management
The plan references `updateQuestOverviewStatus` in Phase 1 (as part of helper consolidation) and Phase 2 (CREATE_QUEST creates overview entry, COMPLETE_QUEST/ABANDON_QUEST call it). However, there is no existing `quests/overview.json` in the codebase — CREATE_QUEST must create it (or append to it if it exists). The research file notes (section 13): "Quests will need similar overview sync if listed (the plan should clarify whether `quests/overview.json` is needed)." The plan assumes overview sync throughout but never explicitly tasks creating the initial `quests/overview.json` on first quest creation. The `CREATE_QUEST` handler task mentions "Updates `quests/overview.json`" but should specify: create it if absent, append item. This matches how `CREATE_SLICE` and `CREATE_EPIC` handle their overviews.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2: BEGIN_QUEST_PLAN sets activeQuest without guarding for existing activeQuest
The transition-tables.md shows `BEGIN_QUEST_PLAN` transitions from `created` to `planning` and sets `project.json activeQuest`. However, unlike `ACTIVATE_EPIC` which guards `project.activeEpic == null`, the plan does not specify a guard for `project.activeQuest == null`. The plan says "No sequential enforcement guard (quests are independent)" but setting `activeQuest` while another quest is already active would overwrite the pointer. This needs explicit clarification: either (a) guard that no other quest is active (add guard), or (b) document that overwriting is intentional (multiple quests can be worked concurrently but only one is "active" pointer). The transition table doesn't show a guard, so (b) seems intended, but the plan should state this explicitly to avoid confusion during implementation.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3: `quest:create` input schema has `quest` field name collision
Phase 3 specifies `completeQuestInput` schema with a `quest: z.string().min(1)` field. But looking at the `quest:complete` command, the `--quest` flag provides the quest name (via command args, not stdin). The stdin input for `quest:complete` should be `{ verificationPassed, learnings?, architectureDelta? }` — the `quest` name comes from the `--quest` flag, not from stdin. Including `quest` in the stdin schema would duplicate what the flag provides. Compare with `slice:complete` which takes `--slice` flag for the name and reads verification/learnings from stdin. The `completeQuestInput` schema should match this pattern: `{ verificationPassed: z.boolean(), learnings: z.array(...).optional(), architectureDelta: z.array(...).optional() }` without a `quest` field.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4: `startContext` signature differs between plan and architecture spec
The plan's Phase 4 specifies `startContext(state, phase, target, options)` taking a `ProjectState` as first arg. But the RPC layer API spec (`rpc-layer-api.md` line 16) declares `startContext(phase, target, options)` — no state parameter. The spec says `startContext` is an RPC-layer function that loads state internally like `begin`/`complete`/`submit`. The plan's design (caller provides state) is arguably better for testability, but it deviates from the documented API. Either (a) the plan should match the spec signature (load state internally), or (b) the plan should explicitly note this as an intentional deviation and include updating rpc-layer-api.md. Currently `start-*` commands in Phase 5 would need to call `loadState()` themselves and pass the result — which works but breaks the pattern of all RPC functions owning their own state loading.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4: Budget uses byte length but no encoding specification
The plan specifies budget in bytes (UTF-8 encoded) and uses `applyBudget(entries, budget)` with byte size comparison. In JavaScript/TypeScript, `string.length` returns UTF-16 code units, not UTF-8 bytes. The plan should specify using `Buffer.byteLength(content, 'utf8')` (Node.js) or `new TextEncoder().encode(content).byteLength` (cross-platform) for accurate byte counting. Since this is a Bun project, `Buffer.byteLength` is available. Without this specification, an implementer might use `string.length` which would be inaccurate for non-ASCII content.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1: Plan mentions `handleNotImplemented` but no such function exists
The plan says to add placeholder entries for 6 new quest event types pointing to `handleNotImplemented`. This function doesn't exist in the codebase. The implementer will need to create it (a one-liner returning a StateError with code `STATE_INVALID_TRANSITION` and a "not yet implemented" message). This is trivial but should be specified — or the plan could use inline arrow functions instead, which avoids creating a throwaway function that gets replaced in Phase 2.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2: quest-implement.ts handles BEGIN_QUEST_REFINEMENT but file name suggests only implementation
The plan creates `quest-implement.ts` to hold both `BEGIN_QUEST_REFINEMENT` and `BEGIN_QUEST_IMPLEMENTATION` handlers. The existing slice pattern splits this: `slice-implement.ts` holds both `BEGIN_REFINEMENT` and `BEGIN_IMPLEMENTATION`. So the naming is actually consistent. No action needed — noting for clarity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: Non-null assertion `input.quest!` pattern in submit-plan.ts
The existing `submit-plan.ts` (line 42) uses `input.quest!` which is a non-null assertion. The plan's Phase 1 correctly identifies removing `quest!` assertions from `slice-submit.ts` when upgrading `guardQuestStatus`. The new `quest:*` commands should use proper narrowing instead of `!` assertions. The plan doesn't explicitly call this out for new commands, but the existing pattern in `submit-plan.ts` (line 42) should also be addressed — the `submitPlanInputSchema` validation guarantees one of `slice`/`quest` is present, so the `!` is safe at runtime but violates the project's anti-pattern rules (`as any`, `@ts-ignore` — and by extension, `!` when narrowing is possible).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: `start-*` commands registered under `src/commands/subagent/` but plan says top-level
The plan Phase 5 says "Register all 8 start commands in `src/commands/main.ts` as top-level commands (same pattern as submit-*)". The existing submit commands live in `src/commands/subagent/`. The plan also says to create files like `src/commands/subagent/start-plan.ts`. This is consistent — both are registered as top-level commands in main.ts but live in the `subagent/` directory. No issue, just confirming consistency.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: `complete` phase in priority table not handled by `start-*` commands
The priority table in Phase 4 includes a `complete` phase row, but `SubmitPhase` does not include `complete` and there is no `start-complete` command. The `complete` phase context would be needed for `quest:complete` and `slice:complete` which use `complete()` RPC, not `startContext()`. The plan should clarify whether the `complete` priority entry is dead code or intended for future `--inline` support on `complete()` operations via `WorkflowOptions.inlineContext`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured and demonstrates strong understanding of existing codebase patterns. The quest lifecycle phases (1-3) closely mirror proven slice patterns, reducing risk. However, several type-level details need tightening: the `COMPLETE_QUEST` event field optionality, the `startContext` signature mismatch with the spec, byte-vs-codeunit budget measurement, and the `completeQuestInput` schema including a redundant `quest` field. These are all fixable without restructuring. To reach 9+: resolve the signature mismatch with `rpc-layer-api.md`, make event field optionality explicit, specify byte measurement API, and fix the quest input schema.

## Summary
- Critical: 0
- Important: 7
- Minor: 5
