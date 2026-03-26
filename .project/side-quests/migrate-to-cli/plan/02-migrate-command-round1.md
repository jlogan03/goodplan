# Phase 2: Migrate Command — Round 1 (Inventory)

Implement the `goodplan migrate --json` global command. On first call (no stdin answers), it emits inventory questions with auto-generated `responseSchema`. On subsequent calls with stdin answers, it validates and stores them in `.migration-in-progress.json`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan migrate --json` → "Unknown command" or similar error (command not registered)

**After implementation** (should pass / show presence):
- [ ] `goodplan migrate --json` (no stdin, in a dir with `.project/` but no `project.json`) → outputs JSON with `{ "status": "questions", "round": { "round": 1, "questions": [...] } }` containing inventory questions with `responseSchema` fields
- [ ] `goodplan migrate --json` (in a dir with `.project/project.json` already) → error: `STATE_ALREADY_MIGRATED`
- [ ] `goodplan migrate --json` (in a dir with no `.project/`) → error: `DATA_NO_PROJECT_DIR`
- [ ] `echo '{"round":1,"answers":[...valid inventory...]}' | goodplan migrate --json` → validates answers, writes `.migration-in-progress.json`, outputs round 2 questions (or error if answers invalid)
- [ ] If any `sourcePath` in answers doesn't exist → error response listing invalid paths, no state written

### Tasks

- [ ] Create `src/commands/global/migrate.ts` — the migrate command definition:
  - Uses `globalArgs` for `--json`, `--quiet`, `--query`
  - Pre-checks:
    - `.project/` must exist (walk-up resolution NOT used — check cwd directly, like `init`)
    - `project.json` must NOT exist (already migrated → `STATE_ALREADY_MIGRATED`)
  - Fresh start (no stdin, no `.migration-in-progress.json`):
    - Generate inventory questions from `z.toJSONSchema()` on the inventory response schema
    - Emit `MigrationResult` with `status: 'questions'`
  - Resume (`.migration-in-progress.json` exists, no stdin):
    - Read state, re-emit the current round's questions
  - Answer submission (stdin JSON):
    - Parse stdin as `MigrationResponse`
    - Validate each answer's `data` against the corresponding question's Zod schema
    - Validate all `sourcePath` fields exist (relative to `.project/`)
    - On validation failure: return `MigrationResult` with `status: 'error'` listing all errors
    - On success: update `.migration-in-progress.json` and emit next round's questions
- [ ] Register `migrate` command in `src/commands/main.ts` under `subCommands`
- [ ] Import and wire the command (add to imports + subCommands object)
- [ ] Add error codes to `src/util/errors.ts` if needed: `STATE_ALREADY_MIGRATED`, `DATA_NO_PROJECT_DIR`, `MIGRATION_VALIDATION_ERROR`
- [ ] Generate Round 1 questions — one question per entity type:
  - `project-info`: "What is the project name and goal?" with hint about `idea.md`
  - `epic-inventory`: "List all epics with names, goals, statuses, and source paths" with hint about `epics/` directory naming conventions
  - `quest-inventory`: "List all quests/side-quests with names, goals, statuses, and source paths" with hint about `side-quests/` directory
- [ ] Write `.migration-in-progress.json` to `.project/` on successful Round 1 answer validation

### Verification

- Run `goodplan migrate --json` on a test copy of this repo's `.project/` — confirm it emits sensible inventory questions
- Pipe valid inventory JSON to stdin — confirm `.migration-in-progress.json` is created and Round 2 questions are emitted
- Pipe invalid JSON (missing fields, bad sourcePath) — confirm clear error messages
- `bun run check` passes
