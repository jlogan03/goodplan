# TUI and CLI Review — Round 2

## Round 1 Issue Resolution Check

All 5 IMPORTANT issues from round 1 have been addressed:

1. **Error codes** — Fixed. Phase 2 now uses `STATE_ALREADY_MIGRATED`, reuses `DATA_NO_PROJECT`, and uses `VALIDATION_MIGRATION_INVALID`, `VALIDATION_MIGRATION_CORRECTION_LIMIT`, `DATA_MIGRATION_BACKUP_EXISTS`. All follow namespace conventions. Exit codes are explicitly noted as automatic via `exitCodeForError()` namespace alignment.
2. **stdin handling** — Fixed. Phase 2 now includes a task explicitly calling out the need to clarify whether `readStdin()` + `validateInput()` are reused or a new path is introduced, with a mandate to follow the same TTY/size/error patterns.
3. **`.migration-in-progress.json` location** — Fixed. Overview and Phase 2 now specify `<cwd>/.migration-in-progress.json` (outside `.project/`), avoiding the rename problem.
4. **`--help` text** — Fixed. Phase 2 now includes a task to specify citty command description and decide on `--json`-required behavior.
5. **`stdinSchemaRegistry`** — Fixed. Phase 2 now includes a task to register migration stdin schemas in `stdinSchemaRegistry`.

Round 1 MINOR issues (hardcoded epic counts in Phase 6, `grep -r` verification) have also been addressed. Phase 6 now says "use relative assertions — don't hardcode specific epic names or counts."

## Issues

**[IMPORTANT] `readStdin()` returns `Record<string, unknown>` but migrate needs `MigrationResponse` shape — plan defers the decision rather than resolving it**
Phase 2 says to "clarify whether this reuses `readStdin()` + `validateInput()` or introduces a new path." This is still a deferred decision rather than a resolved one. The existing `readStdin()` returns `Record<string, unknown>` and `validateInput()` merges it with CLI flags. For migrate, there are no entity-targeting flags to merge — the entire payload is the `MigrationResponse` on stdin. The plan should commit to one approach. The simplest: use `readStdin()` as-is (it handles TTY detection, size limits, JSON parsing), then parse the returned record through `migrationResponseSchema.safeParse()` directly in `rpcMigrate()` or the command layer, bypassing `validateInput()` since there are no flags to merge. This avoids a new stdin path while keeping the existing TTY/size-limit protections.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `MigrationResult` output shape diverges from established CLI output conventions without explicit acknowledgment**
Every existing command outputs either a result object (for mutations) or entity data (for reads), with errors going through the shared `GoodplanError` path. The `MigrationResult` type introduces a `status` discriminator (`'questions' | 'error' | 'complete'`) that embeds error information directly in the success response shape rather than throwing `GoodplanError`. This means the migrate command has two error paths: (1) `GoodplanError` thrown for pre-checks (no `.project/`, already migrated), and (2) `MigrationResult.status === 'error'` for validation failures during the Q&A flow. The skill must handle both. The plan should either: (a) document this dual error path explicitly in Phase 5's error handling section and ensure the skill handles both, or (b) convert all validation errors to `GoodplanError` throws and simplify `MigrationResult` to just `'questions' | 'complete'`. Option (b) is more consistent with the rest of the CLI but may lose the ability to return multiple errors in one response (which is useful for listing all invalid `sourcePath` entries at once). If keeping option (a), Phase 2 should document the rationale.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No `--force` flag behavior specified for migrate**
The `globalArgs` definition includes a `force` flag (for skipping concurrent modification checks). Phase 4 constructs state directly via `commitState()`. If `.project/project.json` somehow gets created between the pre-check and state construction (e.g., another process), should `--force` bypass the "already migrated" guard? Probably not — migration is destructive enough that double-checking is warranted. But the plan should explicitly state that `--force` is not applicable to migrate and is silently ignored, consistent with how other global flags are handled for inapplicable commands.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 question IDs need consistent naming convention documented**
Phase 2 defines question IDs `project-info`, `epic-inventory`, `quest-inventory`. Phase 3 uses `epic-details-<name>`. Phase 3's correction protocol references `reAnswerIds` containing these IDs. The naming convention (kebab-case, entity-type prefix for parameterized IDs) should be documented as a convention in Phase 1's protocol types section so implementers generate consistent IDs. If `<name>` in `epic-details-<name>` uses the epic's `name` field from the inventory answer, this creates a dependency ordering that should be noted: question IDs for round N are derived from answers in round N-1.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6 integration test environment variable `GOODPLAN_DIR` not established in codebase**
Phase 6 says "Set `GOODPLAN_DIR` to temp dir's `.project/`." The existing codebase uses `resolveProjectDir()` which walks up from cwd looking for `.project/`. There is no `GOODPLAN_DIR` environment variable override in `src/core/data/project.ts`. The plan should either: add a task in Phase 2 or 6 to implement `GOODPLAN_DIR` support in `resolveProjectDir()`, or use a simpler approach — run the test with `cwd` set to the temp directory (which is what the manual dogfood step already does).
Resolution: CODEBASE_EXPLORATION

## Score: 8/10

All round 1 issues have been addressed well. The plan is now structurally sound with correct error namespacing, explicit `.migration-in-progress.json` placement, and `stdinSchemaRegistry` registration. The remaining issues are: one IMPORTANT about committing to a stdin handling approach (rather than deferring the decision), one IMPORTANT about the dual error path that the skill needs to handle, and three MINOR naming/convention items. Resolving the two IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
