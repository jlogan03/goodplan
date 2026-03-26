# TypeScript and JavaScript Review — Round 2

## Issues

**[IMPORTANT]** CONVERT_TASK handler references non-existent `addEpicToOverview` helper
Phase 1, task-lifecycle.ts step 6 says to "Add new entity to quests/epics overview" using `addQuestToOverview`/`addEpicToOverview`. While `addQuestToOverview` exists in `helpers.ts`, there is no `addEpicToOverview` helper. Epic overview insertion is done inline in `epic-create.ts` (lines 66-81) — it directly reads the overview, spreads items, and calls `setEntry()`. The plan must either (a) create an `addEpicToOverview` helper in `helpers.ts` (parallel to `addQuestToOverview`), or (b) specify that the CONVERT_TASK handler inlines the epic overview update using `getJson`/`setEntry` directly, following the pattern in `epic-create.ts`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `"drop"` and `"convert"` BeginPhase names are too generic — will conflict with future entity types
The plan adds `"drop"` and `"convert"` to `BeginPhase`. Unlike `"abandon"` (which already handles multiple entity types via target dispatch in `buildAbandonEvent`), these names imply task-only semantics now but would need to be task-scoped if any other entity later gains drop/convert semantics. This is a real risk since `BeginPhase` is a public API surface exposed via `schema --json`. The codebase precedent is `"create-decision"` for decision-specific phases. Consider `"drop-task"` and `"convert-task"` to be explicit, or document that `"drop"`/`"convert"` are intentionally generic and will route by target type (like `"abandon"` does).
Resolution: USER_INPUT

**[IMPORTANT]** `resolveEntityDir` in `paths.ts` has exhaustive switch without `never` default — task target will cause compile error but not in the expected way
The `resolveEntityDir` function (paths.ts line 139-153) switches over `target.type` but groups `project`/`decision`/`rollup` without a `default: never` check. Adding `{ type: "task" }` to `Target` will cause a compile error because the switch becomes non-exhaustive, but the error will point at the function return type (implicit undefined) rather than a clear exhaustive check. This is already the case for the existing code, so the plan will work — but the plan should explicitly list `resolveEntityDir()` in the exhaustive switch list (Phase 1 currently lists 6 switches but misses this one). Task entities need a case: `case "task": return nodePath.join(projectDir, "tasks", target.name);`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `taskConvertInputSchema` in Phase 1 vs `--to` flag in Phase 2 creates duplicated routing
Phase 1 defines `taskConvertInputSchema: { to: "quest" | "epic", name?: string, goal?: string }` as a stdin schema. Phase 2 says `convert.ts` uses `--to quest|epic` as a flag AND reads optional stdin for `name`/`goal` overrides. The `to` field appears in both the flag and the schema. The command should either read `to` from stdin only (consistent with other entity creation commands) or from flag only (consistent with `task:drop` which uses `--reason` flag). Having it in both places creates ambiguity about precedence. The plan should clarify: if `--to` is a required flag, remove `to` from `taskConvertInputSchema` (schema becomes `{ name?: string, goal?: string }`). This matches the `quest:abandon` pattern where simple required scalars are flags and complex/optional data is stdin.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `mapToBeginPhase` and `resolveForBeginPhase` in paths.ts need cases for new phases
Phase 1 lists updating `buildBeginEvent()`, `mapToBeginPhase()`, and `resolveForBeginPhase()` but doesn't specify what values they map to. For `mapToBeginPhase`: `"create-task"`, `"drop"`, and `"convert"` should pass through (they're BeginPhase values). For `resolveForBeginPhase`: all three are lifecycle phases with no artifact paths, so they should fall into the empty `{}` return group alongside `"create"`, `"abandon"`, etc. The plan should be explicit about these mappings to prevent an implementer from accidentally omitting them and hitting the `never` default.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** CONVERT_TASK quest creation shape missing `refinement: null` field
Phase 1, step 5 says CONVERT_TASK creates a quest via `setEntry()` with `{ name, goal, status: "created", created: ts }`. But the actual `questSchema` (in `quest.ts`) requires `refinement: refinementSchema.nullable()` and `updated: timestampSchema`. The `handleCreateQuest` handler (quest-create.ts line 42-52) shows the full shape: `{ name, status, goal, refinement: null, created, updated }`. The plan's quest creation shape is incomplete and will fail Zod validation on `commitState()` (INV-005). Add `refinement: null` and `updated: ts` to the documented shape. Similarly for epic creation — check `epicSchema` required fields.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1 fixes addressed the major structural issues (explicit name, exhaustive switch listing, BeginPhase values). This round found no CRITICALs but 3 IMPORTANT issues: a reference to a non-existent helper, overly generic phase names, and a missing entry in the exhaustive switch inventory. The incomplete quest schema shape in CONVERT_TASK (MINOR) would cause a runtime INV-005 violation if not caught. To reach 9+: fix the `addEpicToOverview` gap, resolve the phase naming question, add `resolveEntityDir` to the switch list, and complete the entity creation shapes.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
