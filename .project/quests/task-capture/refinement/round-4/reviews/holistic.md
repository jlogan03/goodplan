# Holistic Review — Round 4

## Verification of Round 3 Fixes

**Fix 1: `buildCreateEvent()` removed from switch list.**
Confirmed correct. The plan now uses dedicated phases `"create-task"`, `"drop-task"`, `"convert-task"` wired directly into `buildBeginEvent()`'s top-level switch — `buildCreateEvent()` is not involved. The plan text at Phase 1 (BeginPhase additions, line ~71) says "Add cases to `buildBeginEvent()` in `src/core/rpc/begin.ts`" with no mention of `buildCreateEvent()`. Fix landed correctly.

**Fix 2: Goal concatenation guarded.**
Confirmed correct. Phase 1, step 5 now reads: `goal = task.title + (description ? "\n\n" + description : "")`. The conditional guard is present in both the quest and epic branches (same derivation for both, as stated). Fix landed correctly.

---

## Issues

**[MINOR]** Fitness function `transition-completeness.test.ts` needs updating for new event types

The test at `tests/fitness/transition-completeness.test.ts` contains a hardcoded `minimalEvents` record. The test iterates `handlerKeys` and asserts `minimalEvents[eventType]` is defined before exercising `reduce()`. When `CREATE_TASK`, `DROP_TASK`, and `CONVERT_TASK` are added to `handlerRecord`, those keys will be present in `handlerKeys` but absent from `minimalEvents`, causing the smoke-test assertions to fail (`expect(event).toBeDefined()` → fails).

The plan mentions writing unit tests (Phase 1) and CLI command tests (Phase 2), but does not mention updating `tests/fitness/transition-completeness.test.ts`. This fitness function is documented in the maturity table's Fitness Functions column for the State Machine subsystem, so it must be kept green.

Fix: Add a task in Phase 1 to update `tests/fitness/transition-completeness.test.ts` — add minimal event entries for `CREATE_TASK`, `DROP_TASK`, and `CONVERT_TASK` in `minimalEvents`. Example shapes:
```
CREATE_TASK: { type: "CREATE_TASK", name: "t1", title: "Test task", ts }
DROP_TASK: { type: "DROP_TASK", name: "t1", reason: "not needed", ts }
CONVERT_TASK: { type: "CONVERT_TASK", name: "t1", to: "quest", convertedName: "q1", ts }
```
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness function `stateless-commands.test.ts` will likely fail for `task:create` and `task:list`

The test at `tests/fitness/stateless-commands.test.ts` has hardcoded sets:
- `READ_ONLY_COMMANDS` — must include `"task:list"` and `"task:show"` (read-only, no entity flag needed)
- `STDIN_ENTITY_COMMANDS` — must include `"task:create"` (stdin has required `name` field)
- `ENTITY_ARGS` — currently `{ "epic", "slice", "quest", "id", "from", "to" }`. The new `task:drop`, `task:convert` commands use `--task` flag. `"task"` is not in `ENTITY_ARGS`, so these mutation commands will register as violations.

The plan does not include a task to update this fitness function. Fix: Add a task in Phase 2 to update `tests/fitness/stateless-commands.test.ts`:
- Add `"task:list"` and `"task:show"` to `READ_ONLY_COMMANDS`
- Add `"task:create"` to `STDIN_ENTITY_COMMANDS`
- Add `"task"` to `ENTITY_ARGS`

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 verification reads installed skill but not installed capture skill path consistency

Phase 3 verification says: "Read the installed skill at `~/.claude/skills/capture/SKILL.md`". This is correct for verifying the install. However, the verification does not include running `bun test` or `bun run check` after Phase 3 changes (adding the skill registration to `install-skills.sh` is a script change, not a source change). This is fine — Phase 3 changes are all markdown/script/docs with no TypeScript, so existing `bun run check` / `bun test` would be redundant. No issue here, noting it as expected.

---

No additional issues found. The two Round 3 fixes (buildCreateEvent removal, goal concatenation guard) both landed correctly. The remaining issues are both MINOR fitness function maintenance gaps that are easily addressed.

## Score: 9/10

The plan is well-structured, complete, and clearly actionable. All CRITICAL issues from earlier rounds are resolved. The two MINOR fitness function maintenance gaps (transition-completeness and stateless-commands) are the only remaining issues — both are straightforward mechanical updates. The plan covers all required layers (schema, state machine, RPC, CLI, skill, docs), has concrete verification steps at each phase, and correctly handles the trickiest parts (CONVERT_TASK inlining, exhaustive switches, exactOptionalPropertyTypes). A 10/10 requires those fitness function update tasks to be explicit in the plan.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
