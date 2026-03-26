# Merged Feedback — Task Capture Plan (Round 1)

## CRITICAL Issues

**C1. INIT_PROJECT must create `tasks/overview.json`**
Flagged by: holistic, software-architecture, typescript, tui-cli, agent-skill, api-contract (all 6)
File: `src/core/state/transitions/init.ts`
The `handleInitProject` creates overview files for epics, slices, and quests but not tasks. Without this, `task:create` will fail on newly initialized projects because the overview guard rejects missing overview files. Research gotcha #8 identified this but the plan omitted it.
Additionally, for existing projects (including goodplan itself), `CREATE_TASK` handler must create `tasks/overview.json` lazily if missing (rather than failing like `CREATE_QUEST` does), or a migration step is needed.
Resolution: DIRECTLY_ACTIONABLE

**C2. CONVERT_TASK atomicity: plan must commit to inlining, not recursive reduce()**
Flagged by: holistic, software-architecture, typescript, agent-skill
The plan says "reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic" without choosing. Recursive `reduce()` violates INV-003 purity assumptions and the single-event-per-commit model. The plan must prescribe: inline quest/epic creation in the CONVERT_TASK handler using tree helpers (`setEntry`, `addQuestToOverview`, `appendActivityLog`). Do NOT call `reduce()` recursively.
Explicit steps the handler must perform:
1. Guard task exists and status is "open"
2. Guard no duplicate quest/epic name
3. Update task status to "converted", set `convertedTo`
4. Update tasks overview
5. Create quest/epic JSON (reusing `setEntry`)
6. Add to quests/epics overview
7. Append activity log entries (one for convert, one for new entity creation)
Resolution: DIRECTLY_ACTIONABLE

**C3. Task transition table missing from `transition-tables.md`**
Flagged by: holistic, software-architecture
File: `.project/architecture/transition-tables.md`
Adding a new entity type requires updating this source-of-truth document. A new "Task" section is needed with rows for: `(none) -> CREATE_TASK -> open`, `open -> DROP_TASK -> dropped`, `open -> CONVERT_TASK -> converted`, plus guards (duplicate name rejection, invalid transitions on terminal states). Terminal states `converted` and `dropped` must be listed in the Terminal States section.
Resolution: DIRECTLY_ACTIONABLE

**C4. `task:create` name generation diverges from all other entity creation commands**
Flagged by: api-contract (CRITICAL), tui-cli (IMPORTANT)
Every other entity creation command requires the caller to provide `name` explicitly. `task:create` auto-generates name by slugifying title, removing user control over the entity name. No collision-avoidance strategy is documented. Either: (a) require `name` in `taskCreateInputSchema` (consistent) and make title-to-slug a convenience of the `/capture` skill only, or (b) accept optional `name` that overrides auto-derivation, with documented collision handling.
Resolution: DIRECTLY_ACTIONABLE

**C5. `task:drop` uses stdin but established pattern uses flags for simple scalars**
Flagged by: api-contract (CRITICAL), software-architecture (IMPORTANT), typescript (IMPORTANT), tui-cli (IMPORTANT), holistic (MINOR)
`quest:abandon` uses `--reason` flag, not stdin. `task:drop` only takes a `reason` string — the same shape. Using stdin breaks convention without justification. Change to `--task <name> --reason <text>` flags. This eliminates `taskDropInputSchema` or converts it to flag validation.
Resolution: DIRECTLY_ACTIONABLE

## IMPORTANT Issues

**I1. Exhaustive switches over Target type not fully enumerated**
Flagged by: typescript, software-architecture, api-contract, holistic
Adding `{ type: "task" }` to `Target` requires updating ALL exhaustive switches:
1. `resolveEntityName()` in `src/core/rpc/types.ts` (line ~198)
2. `resolveEntityJsonPath()` in `src/core/rpc/types.ts` (line ~216)
3. `resolveEntityDir()` in `src/core/rpc/paths.ts` (line ~139)
4. `buildBeginResult()` in `src/core/rpc/begin.ts` (line ~302)
5. `buildCreateEvent()` in `src/core/rpc/begin.ts` (line ~167)
6. `resolvePathReferences()` in `src/core/rpc/paths.ts`
The plan mentions only `resolveEntityName` and `resolveEntityJsonPath`. All 6 must be listed in Phase 1 alongside the Target union change since the code won't compile otherwise.
Resolution: DIRECTLY_ACTIONABLE

**I2. New `BeginPhase` values needed for `drop` and `convert`**
Flagged by: typescript, software-architecture, api-contract, holistic, agent-skill
The plan says task:drop and task:convert call RPC but doesn't specify what `BeginPhase` values they use. No `"drop"` or `"convert"` exists in the union. The plan must specify: (a) add `"drop"` and `"convert"` to `BeginPhase`, (b) add entries to `BeginPayloadMap`, (c) add cases to `buildBeginEvent()`, (d) update `mapToBeginPhase()` in paths.ts — all have exhaustive `never` defaults.
Resolution: DIRECTLY_ACTIONABLE

**I3. `task:create` payload shape doesn't match `BeginPayloadMap["create"]`**
Flagged by: holistic, software-architecture, typescript, api-contract
Current `BeginPayloadMap["create"]` is `{ name, goal?, epic? }`. Tasks need `title`, `description`, `context`. Options: (a) extend the create payload with optional task fields (leaky), (b) add a separate `"create-task"` phase (follows `"create-decision"` precedent). Option (b) is cleanest. The plan must specify the chosen approach.
Resolution: DIRECTLY_ACTIONABLE

**I4. Overview schema lacks `title` field for task display**
Flagged by: holistic, software-architecture, typescript, api-contract, agent-skill
Shared `overviewItemSchema` has `{ name, status, epic?, created, completed }` — no `title`. `task:list` says it shows title but can't get it from overview. Add optional `title` to `overviewItemSchema` in `src/schemas/entities/overview.ts` (backward-compatible, additive).
Resolution: DIRECTLY_ACTIONABLE

**I5. Missing `schema` command registration for task input schemas (INV-006)**
Flagged by: tui-cli, api-contract
`schema.ts` imports and registers input schemas for all entity commands. Plan doesn't mention updating it for `taskCreateInputSchema`, `taskDropInputSchema`, `taskConvertInputSchema`. Without this, skills using `goodplan schema --command task:create --json` won't discover input shapes. Add verification: `goodplan schema --json` shows all 5 task commands.
Resolution: DIRECTLY_ACTIONABLE

**I6. `task:convert` needs optional `name`/`goal` overrides and collision handling**
Flagged by: tui-cli, api-contract
`taskConvertInputSchema` only has `{ to: "quest" | "epic" }`. Auto-deriving name removes user control. Add optional `name` and `goal` fields that default to task slug and title+description if not provided. Document collision handling (fails with duplicate name error from state machine).
Resolution: DIRECTLY_ACTIONABLE

**I7. `task:convert` result shape is novel and underdocumented**
Flagged by: tui-cli (MINOR), api-contract (IMPORTANT)
The Expected Behavior shows a compound result with two entities, but `BeginResult` can only represent one entity transition. Options: (a) extend `BeginResult` with optional `secondaryResult`, (b) return standard `BeginResult` for the task transition (created quest verifiable via `quest:show`), (c) custom result type. Option (b) is simplest and consistent. The plan must specify.
Resolution: DIRECTLY_ACTIONABLE

**I8. /capture skill missing standard scaffolding (version check, reference loading, frontmatter)**
Flagged by: agent-skill
Every existing skill starts with version check (`goodplan --version --json`) and loads `../_shared/references/cli-interaction.md`. The plan's skill spec has neither. Add Step 0/1 for these. Include `requires: goodplan >= 1.0.0` frontmatter and a specific `description` field text.
Resolution: DIRECTLY_ACTIONABLE

**I9. /capture skill description too vague — will false-trigger**
Flagged by: agent-skill
Triggers like "todo:" and "remember to" are too common in conversation. The `description` frontmatter must be specific to "quick capture of a bug, idea, or thought noticed during work" and distinguish from quests/epics. Drop overly generic triggers.
Resolution: DIRECTLY_ACTIONABLE

**I10. `task:list` default open-only filtering inconsistent with other list commands**
Flagged by: tui-cli
No other list command filters by default. If intentional, human output must signal: "3 open tasks (use --all to show all 7)". JSON output should indicate filter state. Add verification for this.
Resolution: DIRECTLY_ACTIONABLE

**I11. Phase 3 verification doesn't test /capture skill end-to-end**
Flagged by: holistic, agent-skill, tui-cli
Verification is limited to file existence checks. Should include: install skill, create task via CLI, verify `task:list --json` shows it, verify `status --json` includes `openTasks` count.
Resolution: DIRECTLY_ACTIONABLE

**I12. Architecture docs not updated (data-model.md, architecture overview)**
Flagged by: holistic
Adding a new entity type requires updating `.project/architecture/data-model.md` and the architecture overview's subsystem notes. The plan has no documentation update tasks.
Resolution: DIRECTLY_ACTIONABLE

**I13. CONVERT_TASK must create enough entity structure for lifecycle**
Flagged by: software-architecture
When converting to quest, the handler must create `quest.json` with correct fields, add to overview, and produce an entity in `created` status ready for normal workflow. The plan should specify exactly what fields the converted quest/epic gets.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. `taskConvertInputSchema` should include `task` field (or clarify flag merge pattern)**
Flagged by: typescript
Existing `completeQuestInputSchema` merges the `--quest` flag into the schema. Plan should be explicit about whether `task` comes from flag or stdin schema merge.
Resolution: DIRECTLY_ACTIONABLE

**M2. `taskContextSchema.capturedDuring` needs documented format**
Flagged by: typescript
Add a brief doc comment explaining expected values (e.g., "implementing slice foo-bar", "planning quest task-capture").
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 2 tests may be integration tests needing filesystem fixtures**
Flagged by: typescript
Plan says `tests/integration/task.test.ts` but no integration test pattern exists yet. Clarify whether tests use `reduce()` directly (unit, go in tests/unit/) or `begin()` (integration, need temp dir setup).
Resolution: DIRECTLY_ACTIONABLE

**M4. `StateErrorCode` may need task-specific codes**
Flagged by: typescript, api-contract
Current plan reuses `STATE_INVALID_TRANSITION`. This is fine per existing pattern but plan should confirm no new codes needed.
Resolution: DIRECTLY_ACTIONABLE

**M5. Human output strings don't follow established pattern**
Flagged by: tui-cli
Established pattern: `"entity-name: previousStatus -> newStatus"` with picocolors. Plan says `"Created task: <name>"` which diverges.
Resolution: DIRECTLY_ACTIONABLE

**M6. /capture skill output format not specified**
Flagged by: agent-skill
Plan should include a one-liner output example, e.g., "Captured: **Fix error handling** (while working on migrate slice, branch: feat/migrate)".
Resolution: DIRECTLY_ACTIONABLE

**M7. project-status template placement for task count not specified**
Flagged by: agent-skill
Plan says "add Tasks line showing open task count" but doesn't say where in Format A/B templates.
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 1 before-checks may produce false positives**
Flagged by: holistic
Grep patterns like `task.json` might match comments. `taskSchema` is probably unique enough.
Resolution: DIRECTLY_ACTIONABLE

**M9. No `--status` filter flag for `task:list`**
Flagged by: tui-cli
Only `--all` exists. A `--status <value>` flag would allow targeted filtering. Low priority.
Resolution: DIRECTLY_ACTIONABLE

**M10. `task:list --all` not covered in Expected Behavior**
Flagged by: api-contract
Add verification item: `goodplan task:list --all --json` returns items including converted/dropped.
Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE (for loop exit)

**C1 — Add `tasks/overview.json` to INIT_PROJECT**
File: `src/core/state/transitions/init.ts`
Add `tasks/overview.json` creation with `{ items: [] }` alongside existing overview file creation. Also: decide whether `CREATE_TASK` handler lazily creates overview if missing (for existing projects) or whether a migration step is needed. Recommend lazy creation since it's simpler and self-healing.

**C2 — Prescribe inlined entity creation for CONVERT_TASK**
In plan Phase 1 CONVERT_TASK task: replace "reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic" with explicit directive: "Inline quest/epic creation using tree helpers (setEntry, addQuestToOverview, appendActivityLog). Do NOT call reduce() recursively." Add the 7-step handler specification from the CRITICAL section above.

**C3 — Add task transition table to architecture docs**
File: `.project/architecture/transition-tables.md`
Add a "Task" section with transitions: `(none) -> CREATE_TASK -> open`, `open -> DROP_TASK -> dropped`, `open -> CONVERT_TASK -> converted`. Add `converted` and `dropped` to Terminal States. Also update `.project/architecture/data-model.md` with task entity description.

**C4 — Make task name explicit or optional with override**
In `taskCreateInputSchema`: add optional `name` field. If omitted, auto-derive from title. If provided, use as-is. This preserves friction-free capture while allowing control. Document collision behavior (state machine rejects duplicate names).

**C5 — Change `task:drop` to use flags**
Replace stdin-based `taskDropInputSchema: { reason }` with flags: `--task <name> --reason <text>`. Matches `quest:abandon` pattern. Similarly, `task:convert` should use `--task <name> --to quest|epic` for the simple scalar, with optional stdin for `name`/`goal` overrides only.

**I1 — List all exhaustive switches in Phase 1**
Add explicit list of all 6 functions requiring task cases: `resolveEntityName()`, `resolveEntityJsonPath()`, `resolveEntityDir()`, `buildBeginResult()`, `buildCreateEvent()`, `resolvePathReferences()`. Move from Phase 2 vagueness to Phase 1 specificity.

**I2 — Specify BeginPhase additions**
Add to plan Phase 1: add `"drop"` and `"convert"` to `BeginPhase` union, add entries to `BeginPayloadMap`, add cases to `buildBeginEvent()`, update `mapToBeginPhase()` and `resolveForBeginPhase()`.

**I3 — Use separate `"create-task"` phase**
Follow `"create-decision"` precedent. Add `"create-task"` to `BeginPhase`, add corresponding `BeginPayloadMap["create-task"]` with `{ name, title, description?, context? }`, add case to `buildCreateEvent()`.

**I4 — Add optional `title` to `overviewItemSchema`**
File: `src/schemas/entities/overview.ts`
Add `title: z.string().optional()` to `overviewItemSchema`. Backward-compatible, additive.

**I5 — Register task schemas in `schema.ts`**
Import and register `taskCreateInputSchema`, `taskDropInputSchema` (or flag validation), `taskConvertInputSchema` in the schema command. Add verification step.

**I6 — Add optional `name`/`goal` to `taskConvertInputSchema`**
Extend to `{ to: "quest" | "epic", name?: string, goal?: string }`. Defaults: name from task slug, goal from title + description. Document collision handling.

**I7 — Use standard `BeginResult` for task:convert**
Return standard `BeginResult` for the task's status transition (open -> converted). Created quest/epic verifiable via `quest:show` or `epic:show`.

**I8 — Add skill scaffolding to /capture spec**
Add Step 0: version check with `goodplan --version --json`. Add Step 1: load `../_shared/references/cli-interaction.md`. Add `requires: goodplan >= 1.0.0` to frontmatter.

**I9 — Write specific skill description**
Replace vague triggers with targeted description for frontmatter. Focus on "quick capture of a bug, idea, or thought noticed during current work." Drop "todo:" and "remember to" triggers.

**I10 — Add filter signaling to `task:list`**
Human output should show: "3 open tasks (use --all to show all 7)" when filtering is active. JSON output should indicate filter state.

**I11 — Strengthen Phase 3 verification**
Add: install skill (`bun run install:skills`), create task via CLI, verify `task:list --json`, verify `status --json` includes `openTasks`.

**I12 — Add architecture doc update tasks**
Add plan tasks to update `data-model.md` and architecture overview with task entity documentation.

**I13 — Specify CONVERT_TASK created entity fields**
Document: created quest gets `{ name, goal, status: "created" }` from task's `{ slug, title + description }`. Created epic gets `{ name, goal, status: "created" }`. Both in `created` status ready for normal workflow.

---

## RESEARCH_NEEDED

No items require external research. All issues are directly actionable based on existing codebase patterns.

### CODEBASE_EXPLORATION items

**CE1. Verify all exhaustive switches over Target.type**
Strategy: `Grep` for `target.type` and `type: "quest"` in `src/core/rpc/` to find all exhaustive switches. Confirm the list of 6 functions in I1 is complete.

**CE2. Verify `schema.ts` registration pattern**
Strategy: `Read` `src/commands/schema.ts` to confirm how input schemas are registered, then determine exact import/registration pattern for task schemas.

**CE3. Check existing skill frontmatter format**
Strategy: `Read` any existing skill SKILL.md (e.g., `skills/project-status/SKILL.md`) to confirm exact frontmatter fields and version check step format.

---

## Contradictions Resolved

1. **Severity of `task:drop` stdin issue**: api-contract rated CRITICAL, software-architecture/typescript/tui-cli rated IMPORTANT, holistic rated MINOR. Trusted api-contract (domain specialist for contract consistency) — elevated to CRITICAL since it's a public API contract divergence from established pattern.

2. **Severity of `task:create` name generation**: api-contract rated CRITICAL, tui-cli rated IMPORTANT. Trusted api-contract — this is a contract-level inconsistency affecting all callers, not just CLI ergonomics.

3. **CONVERT_TASK result shape**: tui-cli flagged as MINOR (output format), api-contract flagged as IMPORTANT (contract design). Trusted api-contract — the result shape is a contract concern, kept as IMPORTANT.

4. **`task:convert` approach for `to` parameter**: software-architecture and typescript both suggest flags for `to` since it's a simple scalar; tui-cli suggests stdin is too minimal. Aligned all to: use `--to` flag for the scalar, with optional stdin for `name`/`goal` overrides.

5. **Overview schema approach**: software-architecture suggests option (a) extend shared schema or (b) separate taskOverviewSchema. typescript suggests (a) or (b). Aligned to option (a) — add optional `title` to shared schema — as it's simpler and backward-compatible.

---

## Unresolved (USER_INPUT required)

(All resolved — see below)

### USER_INPUT Resolved

1. **Task name**: Always explicit — require `name` in `taskCreateInputSchema` like other entities. The `/capture` skill auto-derives name from title (slugify) so the user never has to think about it. This keeps CLI consistency while preserving frictionless capture.

2. **Existing project migration**: Lazy creation — `CREATE_TASK` handler creates `tasks/overview.json` if missing. Self-healing, no migration step needed.

3. **`task:list` default filtering**: Open-only default is intentional. Human output must signal: "3 open tasks (use --all to show all)". JSON output should indicate filter state. Note for future: consider adopting this `--all` convention for other list commands too (out of scope for this quest).
