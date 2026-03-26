# TUI and CLI Review

## Issues

**[IMPORTANT] Error codes don't follow established namespace conventions**
Phase 2 introduces `STATE_ALREADY_MIGRATED`, `DATA_NO_PROJECT_DIR`, and `MIGRATION_VALIDATION_ERROR`. The existing error code system uses strict namespace prefixes: `STATE_*` (state machine), `DATA_*` (filesystem I/O), `VALIDATION_*` (input validation), `INTERNAL_*` (catch-all). The `MIGRATION_*` namespace doesn't exist and breaks the convention. `MIGRATION_VALIDATION_ERROR` should be `VALIDATION_MIGRATION_*` or just `VALIDATION_INVALID_INPUT` (already exists). Similarly `MIGRATION_CORRECTION_LIMIT` (Phase 3) and `MIGRATION_BACKUP_EXISTS` (Phase 4) need namespace alignment. `DATA_NO_PROJECT_DIR` fits `DATA_*` namespace but is oddly named vs the existing `DATA_NO_PROJECT` — consider reusing `DATA_NO_PROJECT` with a different message, or at minimum explain the distinction. `STATE_ALREADY_MIGRATED` fits `STATE_*` namespace and is fine.
File: `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/02-migrate-command-round1.md` (lines 37), also Phase 3 and 4.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] stdin handling diverges from established pattern without justification**
Existing commands use `readStdin()` which returns `Record<string, unknown>` and is validated via `validateInput()` merging flags + stdin. The migrate command plan describes a fundamentally different stdin pattern: reading stdin as `MigrationResponse` (a typed object with `round` and `answers` fields). The plan should clarify whether it will reuse `readStdin()` + `validateInput()` or introduce a new path. If a new path, it should justify why and follow the same TTY detection / size limit / error handling patterns. The current `readStdin()` always returns `{}` on TTY — but for migrate, TTY (no stdin) means "fresh start / re-emit questions", which actually aligns. This just needs explicit acknowledgment in the plan.
File: `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/02-migrate-command-round1.md`
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] No exit code specification for migrate-specific errors**
The plan defines new error codes but doesn't specify exit codes for them. Per `exitCodeForError()` in `src/util/output.ts`, codes are mapped by prefix: `VALIDATION_*` -> 2, `STATE_*` -> 3, `DATA_*` -> 1. If `MIGRATION_*` codes are introduced (which I recommend against per the issue above), they'd fall through to exit code 1 (generic). The plan should explicitly state which exit codes each error produces, or confirm that namespace-aligned codes get the right exit codes automatically.
File: `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/02-migrate-command-round1.md`
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `.migration-in-progress.json` location and lifecycle not fully specified**
Phase 2 says "Write `.migration-in-progress.json` to `.project/`" but Phase 4 renames `.project/` to `.project-old/`. This means the in-progress file moves with the rename. Phase 4's state construction then creates a fresh `.project/`, and later says "Clean up `.migration-in-progress.json` after successful state construction." But by that point, the file is in `.project-old/`, not `.project/`. The plan needs to clarify: is the file at `<cwd>/.migration-in-progress.json` (outside `.project/`) or at `.project/.migration-in-progress.json`? Placing it outside `.project/` would avoid the rename problem. Alternatively, the plan could specify reading it from `.project-old/` after rename and deleting it there.
File: `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/02-migrate-command-round1.md` (line 42), `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/04-state-construction.md` (line 27, 62)
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] No `--help` text or human-readable output specified for `goodplan migrate`**
The plan only describes `--json` mode output. Per the Commands API contract: "Help text should include: the expected stdin payload shape (if any), the state preconditions for the command, and the resulting state transition." The plan should specify what `goodplan migrate` (without `--json`) outputs for human users — progress messages, summaries, or an error saying `--json` is required. Given this is an LLM-driven Q&A protocol, requiring `--json` and erroring without it would be a valid choice, but it needs to be explicit. The command description for citty's `--help` output also needs specifying.
File: `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/02-migrate-command-round1.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `goodplan migrate` not registered in `schema` command's `stdinSchemaRegistry`**
The `schema` command maintains a `stdinSchemaRegistry` mapping command names to their stdin Zod schemas. Phase 2 registers the command in `main.ts` but doesn't mention adding migration stdin schemas to this registry. Without this, `goodplan schema --command migrate` won't show the stdin schema, breaking the self-discovery contract that skills rely on.
File: `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/02-migrate-command-round1.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6 verification hardcodes expected epic count**
Phase 6 Expected Behavior says `epic:list --json` should list "3 epics (initial, goodplan-cli, skills-cli-integration) all with `completed` status." This couples the integration test to the repo's current state, which may change before implementation. The synthetic fixture test is the right approach — the manual dogfood step should be a task, not an expected-behavior assertion.
File: `/Users/iwhite/Repos/goodplan/.project/side-quests/migrate-to-cli/plan-refining/06-integration-test.md` (line 14)
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Verification steps in Phases 2-3 use `grep -r` instead of running actual CLI commands**
Phase 1's "Before implementation" checks use `grep -r "toJSONSchema"` and `ls` commands. These are fine for absence checks. But Phases 2-3 verification sections say to run `goodplan migrate --json` with various inputs, which is correct and thorough. Phase 4's "Before implementation" uses `grep -r "MIGRATE_PROJECT"` — also fine. Overall the verification approach is appropriate for a CLI feature, with real command invocations as the primary verification method.
File: Multiple phase files
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan demonstrates solid understanding of the CLI's architecture and correctly models the multi-round Q&A protocol. The schema-driven approach using `z.toJSONSchema()` is well-researched. However, there are several integration gaps: error codes don't follow namespace conventions, the `.migration-in-progress.json` lifecycle has a logical inconsistency around the `.project/` rename, stdin handling divergence isn't addressed, and human-readable output is unspecified. Fixing the 5 IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
