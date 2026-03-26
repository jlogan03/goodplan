# Merged Feedback -- Round 1

## CRITICAL Issues

### C1. MIGRATE_PROJECT event bypasses lifecycle guards, creating entities at arbitrary statuses
**Flagged by:** Holistic, Software Architecture, TypeScript/JS
**Files:** Phase 4 (state construction), `src/core/state-machine/reduce.ts`, transition tables

The `MIGRATE_PROJECT` event constructs entities at any status (including terminal states like `completed`/`abandoned`) in a single transition, bypassing all guards and sequential transition logic. This is intentional for migration but has underspecified consequences:

1. **Exhaustiveness ripple:** Adding `MIGRATE_PROJECT` to the `StateEvent` union triggers `satisfies { [K in StateEvent['type']]: Handler<K> }` in `reduce.ts`. Every pattern-match on `StateEvent['type']` must handle the new variant. The plan doesn't acknowledge this.
2. **Missing entity fields:** Entities at intermediate/terminal statuses need fields populated by prior transitions (e.g., `activated` timestamp for activated epics, `verifications` for completed epics). The `MigratePayload` schema only captures `name, goal, status, sourcePath` -- insufficient for valid entity construction at most statuses.
3. **Timestamp sourcing:** `overview.json` items include `created` and `completed` timestamps. The plan doesn't specify how these are sourced (filesystem mtime? LLM-inferred? migration timestamp?).

**Contradiction resolved:** TypeScript/JS reviewer suggested bypassing the state machine entirely (construct `ProjectState` directly, pass to `commitState()`). Architecture and Holistic reviewers accepted the event approach but want explicit invariant relaxation documentation. **Resolved as USER_INPUT** -- this is a fundamental design decision the user should weigh in on (see Unresolved section).

Resolution: USER_INPUT

### C2. Phase 5 skill missing mandatory patterns from existing skill conventions
**Flagged by:** Agent Skill
**Files:** Phase 5 (migrate skill), `skills/migrate/SKILL.md`

Two critical omissions vs. established skill patterns:
1. **No version check step (Step 1):** Every existing skill starts with `goodplan --version --json` per `cli-interaction.md`. The migrate skill jumps straight to "Start migration."
2. **Wrong stdin piping syntax:** Plan says "pipe answers as JSON" but doesn't specify the Claude Code `stdin:` parameter syntax or `echo '...' | goodplan ...` pattern. The compiled binary blocks on empty stdin per documented convention.

Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

### I1. Error codes use wrong naming conventions
**Flagged by:** Holistic, Software Architecture, TypeScript/JS, TUI/CLI
**Files:** `src/util/errors.ts`, `src/core/state-machine/state-events.ts`, Phases 2-4

All four non-Agent reviewers flagged this. Proposed codes and fixes:
- `STATE_ALREADY_MIGRATED` -- acceptable in STATE namespace (all reviewers agree)
- `DATA_NO_PROJECT_DIR` -- reuse existing `DATA_NO_PROJECT` with migration-specific message
- `MIGRATION_VALIDATION_ERROR` -- use `VALIDATION_MIGRATION_INVALID` (VALIDATION namespace)
- `MIGRATION_CORRECTION_LIMIT` -- use `VALIDATION_MIGRATION_CORRECTION_LIMIT`
- `MIGRATION_BACKUP_EXISTS` -- use `DATA_MIGRATION_BACKUP_EXISTS`

Also specify exit code mappings (TUI/CLI): namespace-aligned codes get correct exit codes automatically via `exitCodeForError()`.

Resolution: DIRECTLY_ACTIONABLE

### I2. Migrate command bypasses RPC layer, violating architectural layering
**Flagged by:** Holistic, Software Architecture
**Files:** Phase 2-4 (migrate command), `src/core/rpc/`

The migrate command directly manages `.migration-in-progress.json`, validates answers, and triggers `MIGRATE_PROJECT` -- orchestration logic that belongs in the RPC layer per the architecture (Commands -> RPC -> State Machine). The RPC layer handles `loadState()` -> `reduce()` -> `commitState()` sequencing, version stamping, activity logging. Options:
- Add `rpcMigrate()` in `src/core/rpc/` that owns the protocol. Command stays thin.
- Or explicitly document that migration intentionally operates outside normal RPC flow and why.

Resolution: DIRECTLY_ACTIONABLE

### I3. `.migration-in-progress.json` location breaks after `.project/` rename
**Flagged by:** Holistic, Software Architecture, TUI/CLI
**Files:** Phase 2 (line 42), Phase 4 (line 27, 62)

Phase 2 writes `.migration-in-progress.json` to `.project/`. Phase 4 renames `.project/` to `.project-old/`. After rename, the file is in `.project-old/`, breaking resume logic. **Fix:** Store at `<cwd>/.migration-in-progress.json` (outside `.project/`). Clean up after successful migration.

Resolution: DIRECTLY_ACTIONABLE

### I4. `MigrationAnswer.data` typed as `unknown` loses type safety
**Flagged by:** TypeScript/JS
**Files:** Phase 1 schemas

After Zod validation, `data` should be narrowed to the concrete type. Use a generic: `MigrationAnswer<T = unknown> = { id: string, data: T }` with a `validateAnswer<T>(answer, schema): MigrationAnswer<T>` helper. Without this, Phases 3-4 code will need unsafe casts.

Resolution: DIRECTLY_ACTIONABLE

### I5. `MigrationState` Record types need `noUncheckedIndexedAccess` handling
**Flagged by:** TypeScript/JS
**Files:** Phase 1 schemas, Phase 3-4 usage

`epicDetails: Record<string, EpicDetailResponse>` with `noUncheckedIndexedAccess: true` means every lookup returns `T | undefined`. The plan should note required narrowing or use `Map<string, T>`.

Resolution: DIRECTLY_ACTIONABLE

### I6. `sourcePath` validation (filesystem I/O) placed in schema layer
**Flagged by:** TypeScript/JS
**Files:** Phase 1, `src/schemas/migration/`

Path existence checking requires `fs.existsSync()`. Schema files in `src/schemas/` are pure (no I/O). Move the validator to the command or utility layer.

Resolution: DIRECTLY_ACTIONABLE

### I7. `fs.renameSync` may fail across filesystem boundaries
**Flagged by:** TypeScript/JS
**Files:** Phase 4

If `.project/` is symlinked from another volume, `renameSync` throws `EXDEV`. Add fallback (recursive copy + remove) or catch `EXDEV` with a clear error message.

Resolution: DIRECTLY_ACTIONABLE

### I8. Plan does not mention updating fitness functions
**Flagged by:** Holistic
**Files:** `tests/fitness/transition-completeness.test.ts`, `tests/fitness/state-machine-purity.test.ts`, `tests/fitness/schema-output-accuracy.test.ts`, `tests/fitness/stateless-commands.test.ts`

Adding `MIGRATE_PROJECT` to the `StateEvent` union will break at least the transition-completeness fitness function. The plan needs explicit tasks for updating/verifying all fitness functions pass.

Resolution: DIRECTLY_ACTIONABLE

### I9. stdin handling diverges from established pattern
**Flagged by:** TUI/CLI
**Files:** Phase 2, `src/util/input.ts`

Existing commands use `readStdin()` + `validateInput()`. Migrate reads a typed `MigrationResponse` object. Plan should clarify: reuse existing utilities or justify new path. Note: `readStdin()` returns `{}` on TTY, which aligns with migrate's "fresh start" semantics.

Resolution: DIRECTLY_ACTIONABLE

### I10. No `--help` text or human-readable output specified
**Flagged by:** TUI/CLI
**Files:** Phase 2

Plan only describes `--json` mode. Per Commands API contract, help text should include stdin payload shape, state preconditions, and resulting state transition. Specify what happens without `--json` (require it and error, or provide human output).

Resolution: DIRECTLY_ACTIONABLE

### I11. Phase 5 skill description too vague to trigger
**Flagged by:** Agent Skill
**Files:** Phase 5, `skills/migrate/SKILL.md`

Current description won't trigger on natural prompts. Needs specific description: what the skill does, when to use it, what conditions indicate it should activate (e.g., "DATA_NO_PROJECT error + old-format `.project/` directory exists").

Resolution: DIRECTLY_ACTIONABLE

### I12. Phase 5 skill missing error handling and `cli-interaction.md` reference
**Flagged by:** Agent Skill
**Files:** Phase 5

Skill body should reference `../_shared/references/cli-interaction.md` for error handling patterns. Should follow Step 1 fail-fast pattern: version check first, then status detection, with explicit stop conditions.

Resolution: DIRECTLY_ACTIONABLE

### I13. Phase 5 skill body too large for SKILL.md -- needs references/ split
**Flagged by:** Agent Skill
**Files:** Phase 5, `skills/migrate/SKILL.md`, `skills/migrate/references/`

Status inference heuristics and directory scanning conventions should be split into `references/migration-heuristics.md`, keeping SKILL.md under 500 lines and focused on workflow steps.

Resolution: DIRECTLY_ACTIONABLE

### I14. Phase 5 verification is non-behavioral
**Flagged by:** Holistic, Agent Skill
**Files:** Phase 5

Verification only checks file content, doesn't invoke the skill. Should run `goodplan migrate --json` on a test fixture and confirm the skill's documented invocations produce valid output.

Resolution: DIRECTLY_ACTIONABLE

### I15. Phase 4 artifact copy logic is in the wrong layer
**Flagged by:** Software Architecture
**Files:** Phase 4

Per-entity copy rules belong in Data Layer or a dedicated migration module, not the state machine handler. The `MIGRATE_PROJECT` handler should only produce the `ProjectState` tree. Artifact copy should be a separate post-`commitState()` step using recursive directory copy with exclusion list (`*.json`, `*.jsonl`, `.state-cache.json`).

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1. `z.pick()` reference may be misleading for Zod v4
**Flagged by:** Holistic, TypeScript/JS
**Files:** Phase 1 overview

Overview says "composed from entity schemas using `z.pick()`" but Phase 1 tasks actually build new schemas referencing enum schemas. Define migration-specific schemas referencing shared enums (`epicStatusSchema`, etc.) rather than picking from entity object schemas. Likely just a wording fix in the overview.

Resolution: DIRECTLY_ACTIONABLE

### M2. No documentation update tasks
**Flagged by:** Holistic
**Files:** `.project/architecture/transition-tables.md`, `state-machine-api.md`, `commands-api.md`

Plan should include tasks for updating these source-of-truth architecture docs with the new MIGRATE_PROJECT event and migrate command.

Resolution: DIRECTLY_ACTIONABLE

### M3. Phase 6 verification hardcodes specific epic names and counts
**Flagged by:** Holistic, TUI/CLI
**Files:** Phase 6

"3 epics (initial, goodplan-cli, skills-cli-integration) all with completed status" is brittle. The synthetic fixture test can use exact assertions; the manual dogfood step should use relative assertions.

Resolution: DIRECTLY_ACTIONABLE

### M4. Schema location `src/schemas/migration/` adds permanent surface for transient feature
**Flagged by:** Software Architecture
**Files:** Phase 1

Consider `src/schemas/commands/migration.ts` or `src/commands/global/migrate/schemas.ts` to co-locate with other command-specific schemas.

Resolution: DIRECTLY_ACTIONABLE

### M5. Phase 5 status inference incomplete for intermediate statuses
**Flagged by:** Software Architecture, TypeScript/JS, Agent Skill
**Files:** Phase 5

Intermediate workflow statuses (e.g., `exploring`, `defining-architecture`) are unlikely in pre-CLI projects. Plan should explicitly state this and specify that intermediate statuses map to nearest stable predecessor.

Resolution: DIRECTLY_ACTIONABLE

### M6. Confirmation schema needs Zod discriminated union
**Flagged by:** TypeScript/JS
**Files:** Phase 1

`{ approved: boolean, reAnswerIds: string[] }` can't express conditional requirement. Use `z.discriminatedUnion("approved", [...])` for proper type narrowing.

Resolution: DIRECTLY_ACTIONABLE

### M7. `activatedDate` should use `timestampSchema.nullable()` not bare `z.string().nullable()`
**Flagged by:** TypeScript/JS
**Files:** Phase 1

Reuse `timestampSchema` from `src/schemas/shared.ts` for ISO 8601 validation.

Resolution: DIRECTLY_ACTIONABLE

### M8. Phase 6 `GOODPLAN_DIR` env var may not exist
**Flagged by:** TypeScript/JS
**Files:** Phase 6

Plan says "Set `GOODPLAN_DIR` to temp dir" but the codebase may use `process.cwd()` instead. Needs codebase exploration to confirm.

Resolution: CODEBASE_EXPLORATION

### M9. `goodplan migrate` not registered in `schema` command's `stdinSchemaRegistry`
**Flagged by:** TUI/CLI
**Files:** Phase 2, `src/commands/global/schema/`

Without this, `goodplan schema --command migrate` won't show the stdin schema, breaking the self-discovery contract.

Resolution: DIRECTLY_ACTIONABLE

### M10. Phase 5 missing explicit `goal` field pass-through for quests
**Flagged by:** Agent Skill
**Files:** Phase 5, Phase 1

Quest goals from inventory answers must be passed through to MIGRATE_PROJECT payload. Implied but easy to miss.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE (for loop exit)

### DA1. Fix error code naming (I1)
**Files:** Plan phases 2-4
**Change:** Replace proposed error codes:
- `MIGRATION_VALIDATION_ERROR` -> `VALIDATION_MIGRATION_INVALID`
- `MIGRATION_CORRECTION_LIMIT` -> `VALIDATION_MIGRATION_CORRECTION_LIMIT`
- `MIGRATION_BACKUP_EXISTS` -> `DATA_MIGRATION_BACKUP_EXISTS`
- `DATA_NO_PROJECT_DIR` -> reuse `DATA_NO_PROJECT`
- `STATE_ALREADY_MIGRATED` -> keep as-is
**Why:** Existing namespace conventions (`STATE_*`, `DATA_*`, `VALIDATION_*`) determine exit codes via `exitCodeForError()`. New `MIGRATION_*` namespace would need special handling.

### DA2. Fix `.migration-in-progress.json` location (I3)
**Files:** Phase 2 (line 42), Phase 4 (line 27, 62)
**Change:** Specify location as `<cwd>/.migration-in-progress.json` (outside `.project/` directory). Update Phase 4 cleanup to delete from cwd, not from `.project/` or `.project-old/`.
**Why:** Phase 4 renames `.project/` to `.project-old/`, moving any file inside it. Storing outside `.project/` ensures resume works after partial rename.

### DA3. Add fitness function update tasks (I8)
**Files:** Phase 4 tasks
**Change:** Add explicit tasks: "Update `tests/fitness/transition-completeness.test.ts` to handle MIGRATE_PROJECT", "Verify `state-machine-purity.test.ts` passes", "Verify `stateless-commands.test.ts` passes for migrate command", "Check if `schema-output-accuracy.test.ts` needs updating."
**Why:** Adding to `StateEvent` union breaks exhaustiveness checks.

### DA4. Route I/O through proper layers (I2, I15)
**Files:** Phase 2-4
**Change:** Either (a) add `rpcMigrate()` in `src/core/rpc/` owning the multi-round protocol, intermediate state, and final dispatch, OR (b) explicitly document that migration operates outside normal RPC flow as a one-time operation. Separately, ensure `MIGRATE_PROJECT` handler only produces `ProjectState` tree -- artifact copy should be a post-`commitState()` step in RPC/command layer.
**Why:** Architectural layering: Commands -> RPC -> State Machine + Data Layer.

### DA5. Add `MigrationAnswer<T>` generic and validate helper (I4)
**Files:** Phase 1 schemas
**Change:** Define `MigrationAnswer<T = unknown> = { id: string, data: T }` with `validateAnswer<T>(answer: MigrationAnswer, schema: z.ZodType<T>): MigrationAnswer<T>`.
**Why:** Avoids unsafe casts in Phases 3-4 after Zod validation.

### DA6. Note `noUncheckedIndexedAccess` handling for Record types (I5)
**Files:** Phase 1 schemas, Phase 3-4 tasks
**Change:** Add task notes: "All `Record<string, T>` lookups return `T | undefined` -- add explicit narrowing checks." Consider `Map<string, T>` where access patterns are frequent.
**Why:** Project uses `noUncheckedIndexedAccess: true`.

### DA7. Move sourcePath validation out of schema layer (I6)
**Files:** Phase 1
**Change:** Move `sourcePath` existence validation (requires `fs.existsSync`) to command or utility layer. Keep `src/schemas/migration/` pure (no I/O imports).
**Why:** Schema files in `src/schemas/` are currently pure.

### DA8. Add `EXDEV` handling for rename (I7)
**Files:** Phase 4
**Change:** Wrap `fs.renameSync` in try/catch. On `EXDEV`, either fall back to recursive copy + remove, or throw a clear error explaining the symlink/mount issue.
**Why:** Migration tool may run in diverse environments.

### DA9. Specify stdin handling approach (I9)
**Files:** Phase 2
**Change:** Clarify whether migrate reuses `readStdin()` + `validateInput()` (preferred) or introduces new path. If new, justify and follow same TTY detection / size limit / error handling patterns.
**Why:** Consistency with existing command patterns.

### DA10. Add `--help` and human-readable output spec (I10)
**Files:** Phase 2
**Change:** Specify citty command description for `--help`. Decide: require `--json` and error without it (valid for LLM-driven protocol), or provide human progress output. Document the choice.
**Why:** Commands API contract requires help text with stdin shape, preconditions, and state transition.

### DA11. Fix Phase 5 skill: add version check, stdin syntax, description, cli-interaction ref (C2, I11, I12)
**Files:** Phase 5
**Change:**
- Add Step 1: `goodplan --version --json` check per `cli-interaction.md`
- Use correct stdin syntax: `echo '...' | goodplan migrate --json`
- Reference `../_shared/references/cli-interaction.md` for error handling
- Write specific description: "Migrate a pre-CLI .project/ directory to CLI-managed state. Use when DATA_NO_PROJECT error occurs but old-format .project/ exists."
**Why:** Mandatory patterns from established skill conventions.

### DA12. Split Phase 5 skill content into references/ (I13)
**Files:** Phase 5
**Change:** Move status inference heuristics and directory scanning conventions to `skills/migrate/references/migration-heuristics.md`. Keep SKILL.md under 500 lines focused on workflow steps.
**Why:** Established skill pattern; keeps SKILL.md scannable.

### DA13. Add behavioral verification for Phase 5 (I14)
**Files:** Phase 5 verification section
**Change:** Add verification: run `goodplan migrate --json` on a test fixture and confirm skill invocations produce valid output. Add size check (`wc -c < skills/migrate/SKILL.md` < 15360) and grep for required sections.
**Why:** File-existence checks are insufficient; need to verify the skill actually works.

### DA14. Add documentation update tasks (M2)
**Files:** Plan (add as tasks in Phase 4 or Phase 6)
**Change:** Add tasks to update `.project/architecture/transition-tables.md` (new MIGRATE_PROJECT row), `state-machine-api.md` (new event), `commands-api.md` (migrate command).
**Why:** These are source-of-truth architecture docs.

### DA15. Fix Phase 6 hardcoded assertions (M3)
**Files:** Phase 6
**Change:** Manual dogfood step: use relative assertions ("all discovered epics appear with inferred statuses"). Synthetic fixture test: keep exact assertions.
**Why:** Repo state may change before implementation.

### DA16. Fix overview `z.pick()` wording (M1)
**Files:** Plan overview
**Change:** Replace "use `z.pick()`/composition from existing entity schemas" with "define migration-specific schemas referencing shared enum schemas (`epicStatusSchema`, etc.)."
**Why:** Aligns with what Phase 1 tasks actually describe.

### DA17. Use discriminated union for confirmation schema (M6)
**Files:** Phase 1
**Change:** Replace plain object `{ approved: boolean, reAnswerIds: string[] }` with `z.discriminatedUnion("approved", [z.object({ approved: z.literal(true), notes: z.string() }), z.object({ approved: z.literal(false), reAnswerIds: z.array(z.string()).min(1), notes: z.string() })])`.
**Why:** Enables proper type narrowing; plain object can't express conditional requirement.

### DA18. Use `timestampSchema.nullable()` for dates (M7)
**Files:** Phase 1 epic detail schema
**Change:** Use `timestampSchema.nullable()` from `src/schemas/shared.ts` instead of bare `z.string().nullable()`.
**Why:** Gets ISO 8601 validation for free.

### DA19. Register migrate in `stdinSchemaRegistry` (M9)
**Files:** Phase 2
**Change:** Add task: register migration stdin schemas in `stdinSchemaRegistry` so `goodplan schema --command migrate` works.
**Why:** Breaks self-discovery contract that skills rely on.

### DA20. Consider schema location (M4)
**Files:** Phase 1
**Change:** Consider `src/schemas/commands/migration.ts` or `src/commands/global/migrate/schemas.ts` instead of `src/schemas/migration/`. Either co-locates with relevant code and avoids permanent top-level directory for transient feature.
**Why:** Keeps schema tree focused on permanent concerns.

### DA21. Document intermediate status handling (M5)
**Files:** Phase 5
**Change:** Add explicit note: "Intermediate workflow statuses (e.g., `exploring`, `defining-architecture`) are not expected in pre-CLI projects. If detected, map to nearest stable predecessor (e.g., mid-refinement -> `architecture-defined`)."
**Why:** Prevents confusion during implementation.

### DA22. Note quest goal field pass-through (M10)
**Files:** Phase 1, Phase 5
**Change:** Add explicit note that quest goals from inventory answers must be included in MIGRATE_PROJECT payload.
**Why:** Implied but easy to miss; `CREATE_QUEST` requires `{ name, goal, ts }`.

---

## RESEARCH_NEEDED

### R1. Phase 6 `GOODPLAN_DIR` environment variable (CODEBASE_EXPLORATION)
**What:** Verify whether `GOODPLAN_DIR` env var is supported for overriding the `.project/` directory location.
**Why:** Phase 6 integration test says "Set `GOODPLAN_DIR` to temp dir's `.project/`" but the codebase may only use `process.cwd()`.
**Tool strategy:** `Grep` for `GOODPLAN_DIR` and `process.cwd()` in `src/` to determine how the project root is resolved. If not supported, the test should `chdir` to the temp dir instead.

---

## Contradictions Resolved

1. **MIGRATE_PROJECT: event vs. direct state construction**
   - TypeScript/JS reviewer suggested bypassing the state machine entirely (construct `ProjectState` directly, pass to `commitState()`).
   - Architecture and Holistic reviewers accepted the event approach but want explicit invariant relaxation.
   - **Resolution:** Escalated to USER_INPUT (C1). This is a fundamental design decision with valid arguments on both sides.

2. **Error code naming: new MIGRATION namespace vs. reuse existing namespaces**
   - Software Architecture treated this as MINOR; all other reviewers treated as IMPORTANT.
   - **Resolution:** Promoted to IMPORTANT (I1). All reviewers agree on the fix (use existing namespaces). Severity aligned to majority.

3. **RPC layer bypass: add `rpcMigrate()` vs. document exception**
   - Architecture reviewer was firm on adding `rpcMigrate()`. Holistic reviewer softer ("route through RPC function like rpcInit").
   - **Resolution:** Present both options (I2/DA4). Either is acceptable; the plan just needs to be explicit.

4. **Phase 5 verification: Holistic (MINOR) vs. Agent Skill (IMPORTANT)**
   - **Resolution:** Promoted to IMPORTANT (I14). Agent Skill is the domain specialist for skill quality.

---

## Unresolved (USER_INPUT required)

1. **Should MIGRATE_PROJECT be a state machine event or a direct state construction?**
   The TypeScript/JS reviewer argues migration is a data import, not a state transition, and should bypass the state machine (construct `ProjectState` directly, pass to `commitState()`). This keeps the state machine clean -- no "backdoor" event that bypasses all guards. The Architecture and Holistic reviewers accept the event approach but want explicit invariant relaxation documentation. Both approaches work; the question is whether you want migration logic inside or outside the state machine. If inside: add `MIGRATE_PROJECT` event with explicit "migration-only invariant relaxation" documentation. If outside: construct `ProjectState` in the RPC/command layer and call `commitState()` directly, skipping `reduce()`. **Flagged by:** TypeScript/JS (primary), Holistic, Software Architecture.
