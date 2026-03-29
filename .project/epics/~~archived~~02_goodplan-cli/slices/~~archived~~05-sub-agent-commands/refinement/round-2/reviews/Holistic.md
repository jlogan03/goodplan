# Holistic Review — Round 2: Sub-Agent Commands & Quest Lifecycle

## Issues

**[IMPORTANT]** Phase 2 quest-plan.ts adds `activeQuest` guard but transition-tables.md has no such guard
Phase 2's quest-plan.ts task now says: "Guard: `activeQuest == null` — reject with `STATE_QUEST_ALREADY_ACTIVE` if another quest is already active." This was added in round 1 to match the `activeSlice`/`activeEpic` pattern. However, the transition tables (the source of truth for the state machine) do not document this guard. The transition-tables.md row for `BEGIN_QUEST_PLAN` (line 101) shows Guard: `—` (none). This is a discrepancy: the plan introduces a guard that the transition tables don't specify. Either (a) the transition tables need updating as a task in Phase 2 (or Phase 5's cleanup), or (b) the guard should be removed from the plan if it was intentionally left out of the tables. Given that `BEGIN_PLAN` for slices has sequential enforcement (a different guard), and no explicit `activeQuest` guard is documented, this needs resolution to avoid the plan contradicting the source of truth.
Resolution: USER_INPUT

**[MINOR]** Phase 4 context module layering inconsistency between overview and architecture
The overview states: "context bundling is a peer module (`src/core/context/`) alongside the RPC layer." Phase 4's layering note says: "`src/core/context/` is a peer module to the RPC layer (not within it)." However, the architecture overview (`_overview.md`) describes context bundling as "an internal module within the RPC layer (`src/core/context/`) — a distinct concern from state orchestration." And `rpc-layer-api.md` section "Context Bundling as Internal Module" says: "Context bundling... is a distinct concern within the RPC layer, located at `src/core/context/`." The plan and architecture disagree on whether `src/core/context/` is *within* the RPC layer or a *peer to* it. The round 1 fix clarified the plan's position (peer), but the architecture docs still say "within." Phase 5 includes a task to update `rpc-layer-api.md` for the `startContext` signature change — that task should also reconcile this layering description, or the plan should note the intended architecture doc update.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 quest-implement.ts sets `activeQuest` but quest-plan.ts already sets it
Phase 2's quest-implement.ts task says "Both append activity-log and set activeQuest." However, `activeQuest` is set by `BEGIN_QUEST_PLAN` (the first phase transition), and `BEGIN_QUEST_REFINEMENT` / `BEGIN_QUEST_IMPLEMENTATION` happen while the quest is already active. Setting `activeQuest` again in these handlers is harmless (idempotent) but misleading — it implies the quest might not be active at that point, which contradicts the lifecycle (quest must already be active to reach `plan-created` or `plan-refined` status). Consider clarifying whether this is intentional idempotent safety or an error. The slice pattern does NOT re-set `activeSlice` on `BEGIN_IMPLEMENTATION` — it only sets it on `BEGIN_PLAN`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 human-readable output format for quest:create not fully specified
Phase 3's quest:create task says "Human-readable: `{questName}: none -> created`." This is good, but other quest commands (plan, refine-plan, implement, complete, abandon) don't specify their human-readable format. Phase 3 tasks for these commands only describe the RPC call and flags. The slice command equivalents presumably have established formats — the plan should either reference the slice format pattern or specify each explicitly to avoid implementer guessing.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 `start-*` commands always output JSON — no `--quiet` or human-readable mode documented
Phase 5 says "Start commands always output JSON (sub-agent commands — human-readable mode is not meaningful)." This is a design decision worth noting, but the commands presumably still accept `--json`, `--quiet`, `--query` as global flags (per commands-api.md). The plan should clarify: do `start-*` commands ignore `--json` (since they always output JSON), or do they respect it for consistency even though it's the default? Same for `--quiet` — is it suppressed entirely, or does it output nothing? The existing `submit-*` commands likely set a precedent; reference that pattern.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 1 issues were addressed well. The COMPLETE_QUEST event fields are now explicitly required. The `startContext` signature deviation is documented with an architecture update task. The `complete` phase is added to priority tables. The `completeQuestInput` correctly omits the redundant `quest` field. The `parseInlineBudget` utility is extracted. The `getProject` + `setEntry` pattern is referenced. The `quests/overview.json` first-creation case is specified. The E2E walkthrough now uses `bun run src/index.ts` for steps 1-13 and binary for step 14. The one IMPORTANT issue is the `activeQuest` guard contradicting the transition tables — this needs user input to resolve since it affects the source-of-truth document. The remaining MINOR issues are clarification-level.

## Summary
- Critical: 0
- Important: 1
- Minor: 4
