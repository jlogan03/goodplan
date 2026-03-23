# Holistic Review — Decisions, Learnings & Full Status

## Issues

**[IMPORTANT]** Phase 4 plan references `z.toJsonSchema()` but the correct API is `z.toJSONSchema()`

Phase 4 task for the schema command says: "derive JSON Schema from the actual Zod schema objects using `z.toJsonSchema()` (Zod v4 built-in) or manual projection." The research file (`zod-v4-toJsonSchema.md`) explicitly warns that `toJsonSchema` (camelCase) does not exist — the function is `z.toJSONSchema()` (all-caps JSON). Using the wrong casing will fail at runtime. Fix the task text to reference `z.toJSONSchema()`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 O(n^2) fix description references wrong line numbers and misses epic-rollup case

The task says "Remove the per-entry `getJsonl` + `setEntry` loop (lines ~93-100)" for slice-complete.ts. The actual O(n^2) loop spans lines 89-106 and includes both `epic` and `project` rollup targets in a nested loop (`for target of entry.rollupTo`). The plan's Phase 1 task for slice-complete mentions "Same for epic-rollup entries" but the main task description only says "collect all project-rollup `LearningEntry` items." The fix needs to batch both epic-rollup and project-rollup entries, collecting into separate arrays per target scope, then doing one `getJsonl` + concat + `setEntry` per target. The current task text could be misread as only fixing the project-rollup case.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 `buildBeginResult` gap not addressed

The research file (`_codebase-context.md`, Potential Issue #2) identifies that `buildBeginResult` in `begin.ts` (lines 239-273) only handles project/epic/slice/quest targets — there is no `decision` branch. When `begin('create', {type:'decision'}, ...)` or `begin('update-decision', ...)` returns, `buildBeginResult` will fall through without setting `previousStatus`/`newStatus` correctly (decisions live in JSONL, not individual JSON files). Phase 2 tasks wire `begin()` for decisions but never mention updating `buildBeginResult`. Add a task to handle `target.type === "decision"` in `buildBeginResult` — decisions don't have a single JSON entity file, so the result shape needs a different lookup (read the JSONL, find entry by id, extract status before/after).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 `buildStatusResult` references `assembleState` but needs to walk filesystem for artifact counts

The plan says "walk tree to count artifacts by type" and "Count markdown files under `architecture/`, `research/`, `brainstorm/`, `prototypes/` directories." However, `assembleState()` reads structured state (JSON/JSONL files in the state tree) — it does not enumerate markdown files in those directories. The task needs to clarify that artifact counting for markdown files requires direct filesystem `readdir` calls (or similar) alongside `assembleState()`, since the state tree doesn't index free-form markdown. Without this clarification, an implementer might expect `assembleState()` to surface these counts.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `learning:show` and `learning:list` have overlapping functionality

`learning:list` with `--scope` reads scope-level `learnings.jsonl` and returns items. `learning:show` also takes `--scope` (required) and returns scope-level `learnings.jsonl` entries. The distinction between these two commands is unclear from the task descriptions — both appear to read the same JSONL and return entries. In other entity namespaces (epic, slice, quest), `show` takes a specific entity ID and returns one record, while `list` returns all records. For learnings (which are JSONL entries without unique IDs), the plan should clarify the differentiation or consider merging them into one command with `--scope` as an optional filter on `learning:list`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 ROLLUP_LEARNINGS handler description says "invisible to RPC" but Phase 2 wires it through RPC

The overview states "ROLLUP_LEARNINGS is a reducer-level operation, invisible to RPC" but Phase 2 explicitly wires `begin('rollup', ...)` through RPC with a `learning:rollup` CLI command. This is a contradiction in the overview text. The event is visible to RPC — the overview description should be corrected.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 before-check is fragile

The "Before implementation" check for Phase 3 is: `bun run src/index.ts status --json | jq '.artifacts.decisions'` returns "null or 0". This depends on having decisions already created in the test project (which Phase 2 would set up). If run in isolation, the before-check would fail for a different reason (no decisions.jsonl at all). Consider making the before-check independent of Phase 2 state — e.g., check that `artifacts` is an empty object `{}` (the current stub behavior).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No documentation update task in Phases 1-3

Phase 4 includes updating `.project/conventions.md` with new directories, but no phase includes tasks for updating architecture docs (e.g., `commands-api.md`, `state-machine-api.md`) if the implementation deviates from the existing specs, or for updating the maturity table in `_overview.md`. Since the architecture docs are noted as "fresh" and already spec these features, this is likely fine — but a task to verify architecture doc accuracy post-implementation would be prudent.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good dependency ordering, and thorough E2E verification in Phase 4. The confirmed goal is fully covered. However, four IMPORTANT issues need resolution: the `toJSONSchema` casing error would cause a runtime failure, the `buildBeginResult` gap would produce incorrect output for decision commands, the O(n^2) fix description could lead to an incomplete fix, and the status artifact counting needs filesystem clarification. Fixing these four issues and the minor clarifications would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
