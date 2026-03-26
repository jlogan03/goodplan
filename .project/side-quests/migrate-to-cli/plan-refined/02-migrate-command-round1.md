# Phase 2: Migrate Command — Round 1 (Inventory)

Implement the `goodplan migrate --json` global command. On first call (no stdin answers), it emits inventory questions with auto-generated `responseSchema`. On subsequent calls with stdin answers, it validates and stores them in `<cwd>/.migration-in-progress.json`. The command is a thin wrapper — orchestration logic lives in `rpcMigrate()` in the RPC layer.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan migrate --json` → "Unknown command" or similar error (command not registered)

**After implementation** (should pass / show presence):
- [ ] `goodplan migrate --json` (no stdin, in a dir with `.project/` but no `project.json`) → outputs JSON with `{ "status": "questions", "round": { "round": 1, "questions": [...] } }` containing inventory questions with `responseSchema` fields
- [ ] `goodplan migrate --json` (in a dir with `.project/project.json` already) → throws `GoodplanError` with code `STATE_ALREADY_INITIALIZED`
- [ ] `goodplan migrate --json` (in a dir with no `.project/`) → error: `DATA_NO_PROJECT`
- [ ] `echo '{"round":1,"answers":[...valid inventory...]}' | goodplan migrate --json` → validates answers, writes `.migration-in-progress.json`, outputs round 2 questions (throws `GoodplanError` if answers invalid)
- [ ] If any `sourcePath` in answers doesn't exist → throws `GoodplanError` with code `VALIDATION_MIGRATION_INVALID` listing invalid paths, no state written

### Tasks

- [ ] Create `src/commands/global/migrate.ts` — thin command wrapper:
  - Uses `globalArgs` for `--json`, `--quiet`, `--query`
  - Delegates to `rpcMigrate()` for all orchestration logic
  - Specify citty command description for `--help`: include stdin payload shape, state preconditions, and what happens. Decide: require `--json` and error without it (valid for LLM-driven protocol), or provide human progress output. Document the choice.
- [ ] Create `rpcMigrate(projectDir: string, stdin: Record<string, unknown> | null)` in `src/core/rpc/migrate.ts` — owns the multi-round protocol. Accepts a `projectDir` argument (like `rpcInit()`) for testability; the command wrapper reads stdin via `readStdin()` and passes the result. `null` represents "no stdin" (detected by checking `Object.keys(result).length === 0` from `readStdin()`). Optionally accept `stdinStream?: Readable` for test injection, passed through to `readStdin(stdinStream)` to enable testing answer-submission rounds without piping actual stdin:
  - Pre-checks:
    - `.project/` must exist within `projectDir` (walk-up resolution NOT used — check directly, like `init`)
    - `.project/project.json` must NOT exist within `.project/` (already migrated → `STATE_ALREADY_INITIALIZED`). Note: the guard checks for `project.json` inside `.project/`, NOT for `.project/` existence itself (which is required).
  - Fresh start (no stdin, no `.migration-in-progress.json`):
    - Generate inventory questions from `z.toJSONSchema()` on the inventory response schema
    - Emit `MigrationResult` with `status: 'questions'`
  - Resume (`.migration-in-progress.json` exists, no stdin):
    - Read state, re-emit the current round's questions
  - Answer submission (stdin payload is non-null):
    - Parse the stdin record through `migrationResponseSchema.safeParse()` directly in `rpcMigrate()`, bypassing `validateInput()` (no entity-targeting flags to merge). The stdin payload must be a `{ round, answers }` object envelope — document this in the command help.
    - Validate each answer's `data` against the corresponding round's Zod schema in the round dispatch logic, keyed by `id` matched against the question list for the current round
    - Validate all `sourcePath` fields exist (relative to `.project/`)
    - On validation failure: throw `GoodplanError` with `VALIDATION_MIGRATION_INVALID` code listing all errors (single error path via throws, no embedded error status)
    - On success: update `<cwd>/.migration-in-progress.json` and emit next round's questions
- [ ] Register `migrate` command in `src/commands/main.ts` under `subCommands`
- [ ] Import and wire the command (add to imports + subCommands object)
- [ ] Add error codes to `src/util/errors.ts` — each code must be added to the correct string literal union type:
  - Reuse `STATE_ALREADY_INITIALIZED` (already in `StateErrorCode`; migration-specific message — semantics are identical to "project.json already exists")
  - Reuse `DATA_NO_PROJECT` (already in `DataErrorCode`; migration-specific message)
  - Add `VALIDATION_MIGRATION_INVALID` to the `ValidationErrorCode` union
  - Add `VALIDATION_MIGRATION_CORRECTION_LIMIT` to the `ValidationErrorCode` union
  - Add `DATA_MIGRATION_BACKUP_EXISTS` to the `DataErrorCode` union
  - Exit codes are automatically correct via `exitCodeForError()` namespace alignment. All errors use the single `GoodplanError` throw path — no embedded error status in `MigrationResult`.
- [ ] Generate Round 1 questions — one question per entity type:
  - `project-info`: "What is the project name and goal?" with hint about `idea.md`
  - `epic-inventory`: "List all epics with names, goals, statuses, and source paths" with hint about `epics/` directory naming conventions
  - `quest-inventory`: "List all quests/side-quests with names, goals, statuses, and source paths" with hint about `side-quests/` directory
- [ ] Write `<cwd>/.migration-in-progress.json` (outside `.project/` — avoids breakage when Phase 4 renames `.project/` to `.project-old/`) on successful Round 1 answer validation
- [ ] Register migration stdin schema in `stdinSchemaRegistry` so `goodplan schema --command migrate` works (self-discovery contract). Register the base `migrationResponseSchema` (`{ round: z.number(), answers: z.array(migrationAnswerSchema) }`) as a single entry — NOT a discriminated union of all round types. The union approach is architecturally awkward because round count is dynamic and `goodplan schema --command migrate` would expose an opaque union. The skill uses the per-question `responseSchema` emitted inline to construct valid payloads; the registry entry is for completeness/discoverability only.
- [ ] Add `.migration-in-progress.json` to `.gitignore` — the file is transient and should not be committed if user commits during migration.
- [ ] `--force` flag: `--force` has no migration-specific behavior — the global flag is handled by `commitState()` as usual. No special handling needed.

### Verification

- Run `goodplan migrate --json` on a test copy of this repo's `.project/` — confirm it emits sensible inventory questions
- Pipe valid inventory JSON to stdin — confirm `.migration-in-progress.json` is created and Round 2 questions are emitted
- Pipe invalid JSON (missing fields, bad sourcePath) — confirm clear error messages
- `bun run check` passes
