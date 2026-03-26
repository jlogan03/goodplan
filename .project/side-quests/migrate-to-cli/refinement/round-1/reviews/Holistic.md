## Issues

**[CRITICAL]** MIGRATE_PROJECT event violates INV-003 (State Machine Purity) by design
The plan says the `MIGRATE_PROJECT` transition handler should "construct the full `ProjectState` tree in one operation" including creating entities at any status (completed, abandoned, etc.). This is architecturally sound -- the state machine _should_ own this. However, the plan does not address the fact that this event bypasses ALL guards and lifecycle transitions. Every other entity reaches `completed` via a chain of guarded transitions (CREATE -> ... -> COMPLETE). MIGRATE_PROJECT would produce entities in terminal states without those guards ever running. The plan should explicitly acknowledge this as an intentional invariant relaxation for migration-only use and add a guard ensuring MIGRATE_PROJECT can only run on zero state (which it does mention -- "Guard: project.json must not exist in state"). Additionally, the `transition-completeness.test.ts` fitness function will need updating since it checks exhaustiveness of the `StateEvent` union. The plan does not mention updating this fitness function.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Error codes use wrong naming convention
Phase 2 proposes error codes `STATE_ALREADY_MIGRATED`, `DATA_NO_PROJECT_DIR`, and `MIGRATION_VALIDATION_ERROR`. These do not follow established conventions:
- `STATE_ALREADY_MIGRATED` -- the STATE namespace is defined in `state-events.ts` as `StateErrorCode`. Adding migration-specific codes there pollutes the state machine's error surface. Since the "already migrated" check happens in the command layer (checking if `project.json` exists), it should use an existing code like `STATE_ALREADY_INITIALIZED` with a migration-specific message, or create a new namespace.
- `DATA_NO_PROJECT_DIR` -- the existing code is `DATA_NO_PROJECT` (in `errors.ts`). Use that instead of inventing a near-duplicate.
- `MIGRATION_VALIDATION_ERROR` and `MIGRATION_CORRECTION_LIMIT` (Phase 3) -- there is no `MIGRATION` error namespace in `GoodplanErrorCode`. Either add a `MigrationErrorCode` type to the union or use `VALIDATION_INVALID_INPUT` with appropriate detail.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan does not mention updating fitness functions affected by MIGRATE_PROJECT
Adding `MIGRATE_PROJECT` to the `StateEvent` union will affect at least:
- `tests/fitness/transition-completeness.test.ts` -- checks all event types have handlers
- `tests/fitness/state-machine-purity.test.ts` -- checks the state machine has no I/O imports
- `tests/fitness/schema-output-accuracy.test.ts` -- if the schema command should expose migration
- `tests/fitness/stateless-commands.test.ts` -- the new `migrate` command must comply
The plan should include explicit tasks for updating or verifying these fitness functions pass after changes.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 mixes I/O operations into the migrate command without clear layering
Phase 4 tasks include `.project/` rename (`fs.renameSync`), markdown artifact copy, and `.migration-in-progress.json` cleanup -- all directly in the migrate command. Per the architecture, filesystem I/O belongs in the Data Layer. The plan should route these operations through an RPC function (like `rpcInit` for INIT_PROJECT) rather than putting `fs.renameSync` and recursive copy logic directly in the command file. The current approach would violate the architectural boundary: Commands -> RPC -> State Machine + Data Layer.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `.migration-in-progress.json` location and lifecycle not clearly specified
Phase 2 says "Write `.migration-in-progress.json` to `.project/`" but Phase 4 renames `.project/` to `.project-old/` before state construction. This means the in-progress file moves with the rename, and the migration command would need to read it from `.project-old/` after the rename. The plan should clarify: does the rename happen after reading the final state from `.migration-in-progress.json`? If so, the sequencing should be explicit: (1) read and validate final state from `.project/.migration-in-progress.json`, (2) rename `.project/` to `.project-old/`, (3) create fresh `.project/` via state machine, (4) copy artifacts. This ordering matters for crash recovery.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6 Expected Behavior hardcodes specific epic names and counts
Phase 6 says `epic:list --json` should list "3 epics (initial, goodplan-cli, skills-cli-integration) all with `completed` status." This is brittle -- it assumes the repo's `.project/` state at implementation time. By the time this phase is implemented, the repo may have additional epics or quests. The Expected Behavior for the manual dogfood step should use relative assertions ("all discovered epics appear with inferred statuses") rather than absolute counts. The synthetic fixture test can use exact assertions since it controls the fixture.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 references `z.pick()` but Zod v4 may not support it identically
The overview says "Schemas derived from entities: Migration round schemas use `z.pick()`/composition from existing entity schemas." The research file on `z.toJSONSchema()` does not cover `z.pick()` behavior in Zod v4. If `z.pick()` is unavailable or changed, the plan's approach of composing from entity schemas needs adjustment. However, the Phase 1 tasks themselves describe building new schemas that reference entity status enums (`epicStatusSchema`, etc.) rather than picking from entity object schemas, so this is likely just an overview wording issue.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update tasks
The plan does not include tasks for updating documentation. At minimum:
- `.project/architecture/transition-tables.md` needs a new MIGRATE_PROJECT row
- `.project/architecture/state-machine-api.md` should document the new event
- `.project/architecture/commands-api.md` should document the `migrate` command
These are the source-of-truth documents the project uses for architectural guidance.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 verification is subjective ("read the skill and confirm")
Phase 5's Expected Behavior and Verification sections rely on manual reading ("cat skills/migrate/SKILL.md -> full skill with..."). Unlike other phases which have runnable commands, Phase 5 has no falsifiable automated checks. Consider adding a size check (`wc -c < skills/migrate/SKILL.md` returns < 15360) and a grep for required sections as concrete before/after checks.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 pre-check logic may conflict with existing `DATA_NO_PROJECT` handling
The plan says the migrate command should check cwd directly for `.project/` (like `init`), but the existing `loadState` in the RPC layer already handles missing `.project/` by returning zero state. If the migrate command uses the RPC pattern, the pre-check is redundant. If it skips the RPC layer (doing its own fs checks), it needs to be consistent with the init command's approach. The plan should be explicit about whether migrate uses `loadState` or direct fs checks.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan has a clear structure with well-defined phases, good Expected Behavior sections (criteria 6), and sensible phasing (criteria 4). However, it has two critical issues: the MIGRATE_PROJECT event's relationship to existing invariants and fitness functions is underspecified, and the error codes violate established naming conventions. Several important architectural boundary concerns (I/O in command layer, migration file lifecycle) need resolution. To reach 9+: fix error code naming, add explicit fitness function update tasks, route I/O through proper layers, clarify `.migration-in-progress.json` lifecycle across the rename, and add documentation update tasks.

## Summary
- Critical: 2
- Important: 4
- Minor: 4
