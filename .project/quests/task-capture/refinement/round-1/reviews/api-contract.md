# API Contract Review: Task Capture Plan

## Issues

**[CRITICAL]** task:create contract diverges from established entity creation pattern (name generation)

The plan states `task:create` receives `{ title, description?, context? }` via stdin and auto-generates the name by slugifying the title at the command layer. Every other entity creation command (`quest:create`, `epic:create`, `slice:create`) requires the caller to provide `name` explicitly in stdin. This is an inconsistency in the public API contract: callers of `task:create` cannot control the resulting entity name, and there is no documented collision-avoidance strategy when two tasks have titles that slugify to the same value.

Either (a) require `name` in `taskCreateInputSchema` (consistent with all other entities) and make title-to-slug a convenience of the `/capture` skill, or (b) document the divergence explicitly and include a collision-handling strategy (e.g., append a numeric suffix). The plan currently says "duplicate name rejection" in tests but the command layer would generate the name opaquely, so the user has no way to fix a collision without changing their title.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** task:drop uses stdin but established pattern for simple scalar operations uses flags

The plan specifies `task:drop` reads `{ reason }` from stdin via `taskDropInputSchema`. However, the established codebase pattern for simple scalar mutation parameters is CLI flags, not stdin. `quest:abandon` (the closest analog) uses `--reason <text>` as a flag (`src/commands/quest/abandon.ts` lines 29-32). Using stdin for a single scalar breaks contract consistency and makes the command harder to use from the command line (requires piping JSON instead of a simple flag).

Change `task:drop` to use `--task <name> --reason <text>` flags (matching `quest:abandon`). Remove `taskDropInputSchema` or convert it to flag validation. The plan already identifies this in the research file ("Task drop could use --reason flag (like quest abandon) or stdin") but chose stdin anyway.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing `{ type: "task" }` in Target union and exhaustive switch updates

The plan (Phase 1) adds `{ type: "task", name: string }` to the `Target` union and notes that `resolveEntityName()` and `resolveEntityJsonPath()` must be updated. However, the plan does not account for the exhaustive switch in `buildBeginResult()` (`src/core/rpc/begin.ts` lines 302-344), which extracts status from entities by target type. A task case is needed there to extract `previousStatus`/`newStatus` from the task entity. Without it, task create/drop/convert results would return `previousStatus: "none", newStatus: "unknown"` instead of correct values.

Add a task case to `buildBeginResult()` in Phase 1 tasks, following the quest pattern (read old/new task.json, extract status).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** BeginPhase union needs "drop" and "convert" phases but plan is ambiguous

The plan says `task:drop` calls "RPC to dispatch DROP_TASK" and `task:convert` calls "RPC to dispatch CONVERT_TASK," but does not specify what `BeginPhase` values are used. The `buildBeginEvent()` function has an exhaustive switch on `BeginPhase` with a `never` default. Two options exist (the research file lists them): (1) add `"drop"` and `"convert"` to `BeginPhase` with payloads in `BeginPayloadMap`, or (2) reuse existing phases. The plan must be explicit about which approach is taken, because either one requires updating the exhaustive switch, `BeginPayloadMap`, and potentially `resolvePathReferences()`.

Specify explicitly: add `"drop"` and `"convert"` to `BeginPhase`, add corresponding entries to `BeginPayloadMap`, and add cases to `buildBeginEvent()`. This is the cleaner approach since drop/convert are semantically distinct from abandon/create.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** CONVERT_TASK result shape is underdocumented for the API contract

Phase 2 Expected Behavior says `task:convert` returns `{ task: { status: "converted", convertedTo: { type: "quest", name } }, created: { entity, type: "quest" } }`. This is a novel result shape -- no other command returns a compound result with two entities. `BeginResult` (the standard return type from `begin()`) has `{ entity, phase, previousStatus, newStatus, paths? }` and cannot represent both the task status change and the created quest/epic.

The plan needs to specify how this dual-entity result is constructed. Options: (a) extend `BeginResult` with an optional `secondaryResult` field, (b) have `task:convert` make two RPC calls (begin convert + begin create), (c) return a custom result type. The choice affects the public contract. Since the Expected Behavior already documents a specific shape, the plan should include a task item that implements that shape.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** tasks/overview.json not created during INIT_PROJECT

`src/core/state/transitions/init.ts` creates `epics/overview.json`, `slices/overview.json`, and `quests/overview.json` during `INIT_PROJECT`. The plan does not add `tasks/overview.json` to this handler. The research file (gotcha #8) identifies this: "Must also create `tasks/overview.json` for newly initialized projects. Existing projects need the overview file created on first task creation (or migration)."

The plan's Phase 1 tasks should explicitly include updating `init.ts` to create `tasks/overview.json`. For existing projects, the `task-create.ts` handler should create the overview if missing (like a lazy init), or the plan should include a migration step. Without this, `task:list` on a newly initialized project would work (the quest:list pattern gracefully handles missing overview), but `task:create` would fail because `quest-create.ts` guards on overview existence.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Overview item schema lacks `title` field needed for task display

The shared `overviewSchema` defines items as `{ name, status, epic?, created, completed }`. Tasks use `title` for display (not `name`). The plan's Phase 2 says `task:list` returns `{ items: [{ name, title, status, created }] }`, but the shared `overviewItemSchema` has no `title` field. Either: (a) add an optional `title` field to `overviewItemSchema` (backward-compatible additive change), or (b) have `task:list` join overview items with individual task.json files to get titles (expensive). The research file flags this as gotcha #6.

The plan should specify approach (a) -- add optional `title` to `overviewItemSchema`. This is additive and backward-compatible (existing overview items simply won't have it).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Schema command (INV-006) not addressed

INV-006 requires that `goodplan schema` output reflects actual command signatures. Adding 5 new `task:*` commands must be verified against `schema` output. The plan includes no verification step that runs `goodplan schema` and confirms the new task commands appear with correct flags and input schemas.

Add a verification step to Phase 2: `goodplan schema --json | jq '.commands | keys[] | select(startswith("task:"))'` should return all 5 task commands with correct flag and stdin schema descriptions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** task:list --all flag not documented in Expected Behavior

Phase 2 tasks describe `--all` flag to include converted/dropped tasks, but the Expected Behavior section only tests the default (open tasks). Add an Expected Behavior item: `goodplan task:list --all --json` returns items including converted and dropped tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** task:convert stdin schema is too minimal for quest/epic creation

`taskConvertInputSchema` only has `{ to: "quest" | "epic" }`. But creating a quest requires `{ name, goal }` (per `createQuestInputSchema`). The plan says "Auto-derives quest/epic name from task slug, goal from task title + description." This derivation logic is undocumented in the contract. If the auto-derived name or goal is wrong, the user has no override mechanism. Consider adding optional `name` and `goal` overrides to `taskConvertInputSchema`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Error contract for task-specific errors not specified

The plan tests "duplicate name rejection" and "drop/convert on non-existent task" but does not specify error codes. Existing patterns use `STATE_INVALID_TRANSITION` for guard failures. The plan should confirm these use the same error code (no new `StateErrorCode` values needed) or document new ones if task-specific error codes are warranted.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan captures the right scope and follows existing patterns well for the happy path. However, several API contract design decisions are left ambiguous or inconsistent with established conventions: name generation diverges from the existing pattern, drop uses stdin instead of flags, the convert result shape is novel but unspecified, and critical infrastructure updates (init handler, overview schema, BeginPhase union, buildBeginResult) are either missing or underspecified. To reach 9+: resolve all CRITICAL and IMPORTANT items above -- primarily by aligning task:create and task:drop with existing entity patterns, explicitly specifying the RPC phase/payload additions, documenting the CONVERT_TASK result shape, and adding the missing init/overview/schema updates.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
