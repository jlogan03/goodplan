# Software Architecture Review — Task Capture (Round 4)

Reviewer: software-architecture
Plan: /Users/iwhite/Repos/goodplan/.project/quests/task-capture/plan-refining.md
Iteration: 4 (verification round — Rounds 1–3 resolved all CRITICAL issues)

---

## Codebase Exploration Summary

Explored the following before evaluating:

- `src/core/state/transitions/` — all handler files, `helpers.ts`, `init.ts`
- `src/core/state/reduce.ts` — exhaustiveness-checked `handlerRecord`
- `src/core/rpc/types.ts` — `Target`, `BeginPhase`, `BeginPayloadMap`, exhaustive switches
- `src/core/rpc/begin.ts` — `buildBeginEvent`, `buildBeginResult`
- `src/core/rpc/paths.ts` — `resolvePathReferences`, `resolveEntityDir`, `mapToBeginPhase`, `resolveForBeginPhase`
- `src/schemas/entities/` — all entity schemas including `overview.ts`
- `tests/fitness/transition-completeness.test.ts` — fitness function that will catch missing handlers
- `tests/fitness/state-machine-purity.test.ts` — INV-003 fitness function
- `.project/architecture/invariants.md` — INV-001 through INV-007
- `.project/architecture/_overview.md` — subsystem maturity table (all Developing)

---

## Issues

**[MINOR]** `transition-completeness.test.ts` fitness function needs updating for new task events

The `minimalEvents` record in `tests/fitness/transition-completeness.test.ts` (lines 71–110) must include entries for `CREATE_TASK`, `DROP_TASK`, and `CONVERT_TASK`. The fitness function (line 114) iterates `handlerKeys` and asserts `event` is defined for each key — it will fail the "reduce() handles X without throwing" test for all three new event types if not updated.

The plan's test task in Phase 1 specifies writing `tests/unit/state/task.test.ts` but does not explicitly call out updating this fitness function. Since the fitness function's smoke-test loop is data-driven off `handlerRecord`, adding handlers without updating `minimalEvents` breaks an existing fitness function.

Minimal events to add:
- `CREATE_TASK`: `{ type: "CREATE_TASK", name: "t1", title: "Test", ts }`
- `DROP_TASK`: `{ type: "DROP_TASK", name: "t1", reason: "not needed", ts }`
- `CONVERT_TASK`: `{ type: "CONVERT_TASK", name: "t1", to: "quest", convertedName: "new-quest", ts }`

Resolution: DIRECTLY_ACTIONABLE — add a task to Phase 1 to update `tests/fitness/transition-completeness.test.ts` with the three minimal events.

---

**[MINOR]** `mapToBeginPhase` and `resolveForBeginPhase` exhaustive switches need task phases

`src/core/rpc/paths.ts` contains two functions with exhaustive `never` defaults:
1. `mapToBeginPhase` — maps `BeginPhase | SubmitPhase | "complete"` to `BeginPhase | "complete"`. Adding `"create-task"`, `"drop-task"`, `"convert-task"` to `BeginPhase` requires they be handled here (pass-through, returning themselves). The plan notes "new phases return `{}` for paths" but doesn't explicitly mention updating `mapToBeginPhase` — the exhaustive default will cause a build error, not a silent bug, so this will be caught. Nonetheless the plan task should mention both `mapToBeginPhase` and `resolveForBeginPhase` explicitly.

2. `resolveForBeginPhase` — handles `BeginPhase | "complete"`. New phases must be added to the lifecycle no-paths branch (`return {}`).

The plan does mention both in the Phase 1 task list (items 6 and 7 under BeginPhase), so this is mostly covered. This MINOR is a flag that the plan's phrasing "new phases return `{}` for paths, matching the existing pattern for `create`, `abandon`, etc." is correct and consistent with the codebase — confirmed valid.

Resolution: No action needed — plan already covers this correctly. Noting for completeness.

---

**[MINOR]** `hasChild` guard in CONVERT_TASK uses correct API but `"quests"` / `"epics"` are directory paths

The plan specifies checking for duplicate names in CONVERT_TASK:
```
if (to === "quest"): check hasChild(state, "quests", name)
if (to === "epic"): check hasChild(state, "epics", name)
```

Examining `hasChild(state, dirPath, childName)` in `tree.ts`: it checks if `childName` exists in the directory at `dirPath`. For quests, entries live at `quests/<name>/quest.json`, so the directory `quests` would contain subdirectories named by quest name — `hasChild(state, "quests", name)` checks if a directory named `name` exists inside `quests/`. This is the correct idiom. Confirmed valid against the codebase (`handleCreateEpic` uses `hasChild(state, "epics", event.name)` on line 20 of `epic-create.ts`).

Resolution: No action needed — plan uses the correct pattern.

---

## Confirmed Soundness

The following architectural concerns were verified clean in this round:

1. **INV-003 (State machine purity)**: `task-create.ts` and `task-lifecycle.ts` correctly use only `setEntry`, `getJson`, `hasChild` (from `tree.ts`) and `helpers.ts` — no I/O imports. The purity fitness function will catch any violations automatically.

2. **INV-001 (All mutations through state machine)**: All 5 commands route through `begin()` → `reduce()` → `commitState()` or read-only via `loadState()`. No direct filesystem writes proposed.

3. **CONVERT_TASK inline creation (no recursive reduce)**: Plan explicitly prohibits calling `reduce()` recursively (correct — would violate INV-003 purity model and the single-event-per-commit invariant). The inline approach using `setEntry` + helper functions is architecturally sound and consistent with how `handleCreateEpic` operates.

4. **Exhaustive switches**: Plan correctly enumerates all 7 exhaustive switch sites that need updating (resolveEntityName, resolveEntityJsonPath, resolveEntityDir, buildBeginResult, resolvePathReferences, mapToBeginPhase, resolveForBeginPhase). The `satisfies` constraint on `handlerRecord` will catch any missed handlers at build time.

5. **`addEpicToOverview` helper**: Plan correctly identifies this helper doesn't exist yet (only `addQuestToOverview` exists in `helpers.ts`) and specifies creating it. The proposed signature mirrors `addQuestToOverview` exactly. Valid.

6. **Overview schema extension**: Adding `title?: string` to `overviewItemSchema` is backward-compatible. Existing creation code omits `title` (valid with `.optional()`). The `exactOptionalPropertyTypes` concern is correctly addressed via conditional spread in the plan.

7. **`tasks/overview.json` lazy creation**: Plan handles both init path (add to `init.ts`) and existing-project path (create lazily in `task-create.ts` handler). This is the correct pattern — same approach would be needed for any project initialized before this feature ships.

8. **Layer separation preserved**: Commands stay thin (parse → begin → format). RPC layer owns orchestration. State machine remains pure. Data layer untouched architecturally.

9. **`BeginResult` for CONVERT_TASK**: Returning a standard `BeginResult` for the task transition (open → converted) is correct. The created quest/epic is a side effect visible via `quest:show`/`epic:show`. This avoids inventing a new result shape for a single command.

10. **Maturity**: All subsystems are `Developing` — deliberate changes are encouraged with no justification burden per the maturity policy. No maturing/foundational subsystems are touched.

---

## Score: 9/10

The plan is architecturally sound. It follows all established patterns precisely — the codebase exploration confirms the plan's claims about `hasChild`, `addQuestToOverview`, `setEntry`, exhaustive switches, and handler registration are all accurate. The three MINOR issues identified are: one genuine gap (fitness function update), one already-covered concern worth noting, and one confirmation that the plan is correct. The genuine gap (fitness function) is low-risk since the failing test will be immediately visible at `bun test` time, but adding it to the task list removes the ambiguity.

The CONVERT_TASK handler is the most complex piece and the plan handles it correctly: inline creation, correct guard sequence, correct `addEpicToOverview` helper specification, correct activity log entries (two entries: one for convert, one for entity creation).

## Summary
- Critical: 0
- Important: 0
- Minor: 3 (1 actionable, 2 confirmations)
