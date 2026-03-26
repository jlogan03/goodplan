## Issues

**[IMPORTANT]** Phase 4 Expected Behavior "Before" check is already false
Phase 4's first "Before" check says `grep -r "rpcMigrate" src/core/rpc/` should have no matches. But `rpcMigrate()` is called from the command in Phase 2 and receives answer submissions in Phase 3. By the time Phase 4 is implemented, `rpcMigrate` will already exist in `src/core/rpc/`. The "Before" check should test something Phase 4 specifically adds -- e.g., "rpcMigrate does not yet call commitState()" or "no `.project-old/` rename logic exists." The second "Before" check ("CLI returns status: complete but no state files") is fine.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 does not specify where `rpcMigrate()` lives within `src/core/rpc/`
Phase 2 says "Create `rpcMigrate()` in `src/core/rpc/`" but does not specify a file name. Existing RPC functions follow a convention: `init.ts`, `begin.ts`, `complete.ts`, `submit.ts`. The plan should specify the file name (e.g., `src/core/rpc/migrate.ts`) for clarity, and the implementer should not have to guess. The migration RPC function is large enough to warrant its own file rather than being appended to an existing one.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `STATE_ALREADY_MIGRATED` error code still listed but doesn't exist in any namespace
The plan says "Add error codes to `src/util/errors.ts` using existing namespaces: `STATE_ALREADY_MIGRATED`..." However, `StateErrorCode` is defined in `src/schemas/state-events.ts` as a union literal type -- adding `STATE_ALREADY_MIGRATED` there requires modifying the state machine's error surface for a non-state-machine concern (migration is a data import, not a state transition, per the plan's own design). The plan should either: (a) reuse `STATE_ALREADY_INITIALIZED` with a migration-specific message (the semantics are identical -- project.json already exists), or (b) use `DATA_VALIDATION_ERROR` with detail explaining the project is already migrated. Option (a) is simpler and avoids polluting the state machine error type.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 task for `stdinSchemaRegistry` registration may not fit the migration protocol
The plan says "Register migration stdin schemas in `stdinSchemaRegistry` so `goodplan schema --command migrate` works." However, the migration protocol has multiple rounds with different schemas per round (inventory response, epic detail response, confirmation). The existing `stdinSchemaRegistry` maps a single schema per command name. The plan should clarify what schema to register -- perhaps a discriminated union of all round response types, or just the initial `MigrationResponse` envelope. If the registry cannot represent multi-round schemas, this task may need adjustment or a note explaining the limitation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 correction protocol question ID format not fully specified
Phase 3's Expected Behavior shows `reAnswerIds: ["epic-details-initial"]` but Phase 3 tasks say question IDs are `epic-details-<name>`. The example should use a consistent format (e.g., `epic-details-my-epic`). This is a minor clarity issue but could confuse an implementer about whether "initial" is a placeholder or a literal value.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 test references `GOODPLAN_DIR` env var but migration checks cwd directly
Phase 6 says "Set `GOODPLAN_DIR` to temp dir's `.project/`" for the integration test. But Phase 2 explicitly says the migrate command "checks cwd directly (not via resolveProjectDir, which walks up)" -- the same pattern as `init`. If migrate doesn't use `resolveProjectDir()`, it won't respect `GOODPLAN_DIR`. The test setup should use `process.chdir()` to the temp directory instead of setting `GOODPLAN_DIR`, or the plan should clarify that `rpcMigrate()` accepts a `projectDir` argument (like `rpcInit()`) so tests can pass the path directly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No explicit task for adding `.migration-in-progress.json` to `.gitignore`
The migration-in-progress file lives in cwd (outside `.project/`) and is a temporary artifact. If a user commits during migration, this file could end up in version control. The plan should include a note about either adding it to `.gitignore` or documenting that it's transient. This is minor since migration is a one-shot operation, but worth noting.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
The plan has significantly improved from round 1. The critical issues (MIGRATE_PROJECT event removal, error code namespacing, .migration-in-progress.json location, I/O layering) are all addressed well. Phase ordering is logical and dependencies are clear (criteria 4). Success criteria are concrete and mostly falsifiable (criteria 5, 6). The direct state construction approach in `rpcMigrate()` is simpler and avoids state machine pollution. Documentation updates are now included (criteria 7, Phase 4). Fitness function concerns are resolved since no state machine changes are needed. To reach 9+: fix the Phase 4 "Before" check that will be stale by implementation time, specify the `rpcMigrate` file name, resolve the `STATE_ALREADY_MIGRATED` error code provenance, and clarify the `stdinSchemaRegistry` multi-round limitation.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
