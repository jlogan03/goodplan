# Software Architecture Review

## Issues

**[IMPORTANT] ROLLUP_LEARNINGS handler reads/writes wrong path for manual cross-scope rollup**
Phase 1 describes the ROLLUP_LEARNINGS handler as: `getJsonl` source `learnings.jsonl`, filter entries whose `rollupTo` array includes the target scope. But this conflates two different concerns: (1) the `rollupTo` field on `LearningEntry` is about *automatic* rollup during COMPLETE_SLICE/COMPLETE_QUEST, and (2) ROLLUP_LEARNINGS is a *manual* operation that moves all learnings from one scope to another (e.g., from `slices/01-auth/learnings.jsonl` to the project-level `learnings.jsonl`). The handler description says it filters by `rollupTo` matching the target, but the event payload is `{from, to}` which are path-based scopes. The handler should read ALL entries from `from/learnings.jsonl` and append them to `to/learnings.jsonl` -- filtering by `rollupTo` would incorrectly exclude learnings that weren't tagged for rollup to that specific scope. Alternatively, if filtering by `rollupTo` is intentional, the plan should explicitly state this design decision and explain why only tagged entries should be rolled up manually (vs all entries).
Resolution: USER_INPUT

**[IMPORTANT] `decision:create` routes through `begin('create', {type:'decision'})` but CREATE_DECISION payload shape doesn't match the existing `BeginPayloadMap["create"]`**
Phase 2 says `decision:create` calls `begin('create', {type:'decision'}, payload)`. The existing `BeginPayloadMap["create"]` is `{ name: string; goal?: string; epic?: string }`, but CREATE_DECISION needs `{ id, domain, title, summary }` -- completely different fields. The plan doesn't address this type mismatch. Either: (a) add a new phase `"create-decision"` to `BeginPhase` and `BeginPayloadMap` with the correct payload type, or (b) change `buildCreateEvent`'s `case "decision"` to extract decision-specific fields from a differently-typed payload, which would require widening `BeginPayloadMap["create"]` or adding a discriminated union. Option (a) is cleaner and follows the pattern of `"update-decision"` having its own phase.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `buildBeginResult` doesn't handle `target.type === "decision"` -- plan Phase 2 doesn't address this**
The codebase context research file correctly identifies this gap (issue #2), but neither Phase 1 nor Phase 2 includes a task to add a decision branch in `buildBeginResult`. Decisions don't have a JSON file with a `status` field like entities do -- they live in `decisions.jsonl`. The result builder needs a new branch that reads the decision entry from `decisions.jsonl` by id to extract `previousStatus` and `newStatus`. Without this, `decision:create` and `decision:update` will return `previousStatus: "none"` and `newStatus: "unknown"`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `learning:show` command design is ambiguous -- overlaps with `learning:list --scope`**
Phase 2 defines `learning:show --scope` as returning "scope-level `learnings.jsonl` entries" which is functionally identical to `learning:list --scope`. The architecture's `commands-api.md` defines `learning:show --id <id>` (show a single learning by id), but the plan describes `--scope` instead of `--id`. This is either a deviation from the architecture spec or a misunderstanding. If learnings don't have individual IDs (they're JSONL entries without an `id` field), then `learning:show` as specced in `commands-api.md` isn't implementable. The plan should either: (a) match the architecture spec and implement `learning:show --id <id>` with an id field, (b) note that this is a deviation and explain why `--scope` is used instead, or (c) drop `learning:show` and enhance `learning:list` with the scope filtering.
Resolution: USER_INPUT

**[IMPORTANT] Phase 4 plan references `z.toJsonSchema()` but research file documents the correct name as `z.toJSONSchema()`**
Phase 4 task for the schema command says "derive JSON Schema from the actual Zod schema objects using `z.toJsonSchema()` (Zod v4 built-in)". The research file explicitly warns: "The function name is `toJSONSchema` (all-caps JSON), NOT `toJsonSchema` (camelCase). There is no `toJsonSchema` alias -- using that name will fail at runtime." The plan should use the correct API name `z.toJSONSchema()`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 O(n^2) fix task only mentions `slice-complete.ts` lines ~93-100, misses epic-level rollup in the same file**
The codebase context identifies that `slice-complete.ts` has the O(n^2) pattern for BOTH `rollupTo: ["epic"]` and `rollupTo: ["project"]` (lines 89-106). Phase 1's task says "collect all project-rollup `LearningEntry` items into an array first" and "Same for epic-rollup entries" but the task description only references "lines ~93-100" and then says "Remove the per-entry `getJsonl` + `setEntry` loop." The fix description should be explicit that both the epic rollup loop AND the project rollup loop in the nested `for (const target of entry.rollupTo)` need to be replaced with batch operations. The current wording could lead to fixing only the project rollup path.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 status command `assembleState` vs `loadState` inconsistency**
Phase 3 says "load state via `assembleState`" but the existing status command uses `assembleState` while `epic:list` (and other read-only commands) use `loadState`. Looking at the codebase, the status stub already uses `assembleState` which handles uninitialized projects, while `loadState` does not. The plan should explicitly note that `assembleState` is the correct choice here (it handles zero-state for fresh projects) to avoid implementers switching to `loadState` for consistency with other read-only commands.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `decision:list` bypasses RPC but Phase 1 `decisions.jsonl` is only written through state machine transitions**
This is architecturally correct (read-only commands bypass RPC per architecture), but worth noting: `decision:list` reads `decisions.jsonl` from the state tree via `assembleState()`, while `decision:create`/`decision:update` write through the state machine. The plan should clarify whether `decision:list` reads from the assembled state tree (like `epic:list` reads `overview.json`) or directly from the filesystem. The existing `epic:list` pattern uses `loadState` + `getJson` from the tree, so `decision:list` should follow the same pattern with `getJsonl` from the state tree.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] StateErrorCode may need expansion for decision-specific guards**
Phase 1 introduces guards for "duplicate decision id" and "can't update superseded decision (terminal state)." The plan doesn't specify which `StateErrorCode` to use. The existing `STATE_INVALID_TRANSITION` could cover "can't update superseded," but "duplicate decision id" is a different class of error (data conflict, not transition violation). Consider whether `STATE_DUPLICATE_ID` or similar should be added to `StateErrorCode`, or document that `STATE_INVALID_TRANSITION` covers both cases.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan correctly follows the established bottom-up layering (state machine -> RPC -> CLI) and aligns with documented architecture patterns. However, it has several important issues: a type system mismatch for decision creation payloads that will cause compile errors, a missing `buildBeginResult` branch that will produce wrong output, ambiguity in the ROLLUP_LEARNINGS semantics, and a `learning:show` design that deviates from architecture spec without explanation. The incorrect Zod API name would cause a runtime failure. To reach 9+: resolve the ROLLUP_LEARNINGS semantics, fix the `BeginPayloadMap` type mismatch for decision creation, add the missing `buildBeginResult` decision branch, clarify `learning:show` design, and correct the Zod API name.

## Summary
- Critical: 0
- Important: 6
- Minor: 3
