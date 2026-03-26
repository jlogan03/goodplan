# Holistic Review — Round 4 (Verification Pass)

## Context

Round 4 is a verification pass confirming that all R3 issues landed correctly. R3 raised 2 IMPORTANT and 5 MINOR issues. All were addressed. This pass checks each fix and does a final holistic scan.

---

## R3 Fix Verification

**R3-1 (IMPORTANT) — Error code unions explicitly named:**
Phase 2 now states: "Add `VALIDATION_MIGRATION_INVALID` to the `ValidationErrorCode` union", "Add `VALIDATION_MIGRATION_CORRECTION_LIMIT` to the `ValidationErrorCode` union", "Add `DATA_MIGRATION_BACKUP_EXISTS` to the `DataErrorCode` union". Verified in current Phase 2 text. Fix landed correctly.

**R3-2 (IMPORTANT) — stdin detection check:**
Phase 2 now includes: "`null` represents 'no stdin' (detected by checking `Object.keys(result).length === 0` from `readStdin()`)". The detection logic is explicit. Fix landed correctly.

**R3-3 (MINOR) — Schema location pinned:**
Phase 1 now specifies `src/commands/global/migrate/schemas.ts` as the single location, with rationale ("avoids polluting the shared schema namespace for a transient feature"). Fix landed correctly.

**R3-4 (MINOR) — `--force` documentation:**
Phase 2 now reads: "`--force` has no migration-specific behavior — the global flag is handled by `commitState()` as usual. No special handling needed." Fix landed correctly.

**R3-5 (MINOR) — Activity log entry format:**
Phase 4 now references `activityEntrySchema` (defined in `src/schemas/records/activity-log.ts`) with the concrete shape matching the existing schema: `{ ts, phase, scope, status, summary, detail }`. Codebase confirmed: `activityEntrySchema` in `src/schemas/records/activity-log.ts` matches the shape specified in Phase 4. Fix landed correctly.

**R3-6 (MINOR) — `buildMigrationState()` testability:**
Phase 4 now says "Extract `buildMigrationState(validatedData): ProjectState` as a named export from `src/core/rpc/migrate.ts` with `@internal` JSDoc annotation." Phase 6 references it as "the `@internal` named export from `src/core/rpc/migrate.ts`, extracted in Phase 4" and uses `z.infer<typeof inventoryResponseSchema>` for typed test data. Fix landed correctly.

**R3-7 (MINOR) — `cli-interaction.md` path:**
Phase 5 references `../_shared/references/cli-interaction.md`. Codebase confirmed: file exists at `skills/_shared/references/cli-interaction.md`. From `skills/migrate/`, the relative path `../_shared/references/cli-interaction.md` resolves correctly. Fix verified correct.

---

## Issues

No issues found.

All seven R3 issues are cleanly addressed. The plan is internally consistent, complete, and correctly scoped to the confirmed goal. Key structural checks:

- **Goal alignment:** Every phase directly serves "build `goodplan migrate`" + "update `/migrate` skill". No scope creep.
- **Completeness:** Phases cover schemas → Round 1 → follow-up rounds → state construction → skill → integration test. The ordering is dependency-sound (schemas before command, command before skill, skill before integration test).
- **Success criteria:** Each phase has concrete before/after checks with executable commands (`goodplan migrate --json`, `grep`, `bun test`, `wc -c`).
- **Verification-first:** Before checks test genuine absence (file not yet created, command not registered). After checks are falsifiable with specific expected outputs.
- **Invariant compliance:** INV-001 exception is formally documented in Phase 4. INV-005 is satisfied via `migrationStateSchema` Zod validation on re-read. INV-006 is satisfied via `stdinSchemaRegistry` entry. INV-007 is satisfied via single `GoodplanError` throw path with no embedded error status. INV-003 is respected (schema files explicitly prohibited from importing `fs`).
- **Code cleanup:** `.migration-in-progress.json` cleanup after success is specified in Phase 4. No permanent dead code is introduced.
- **Fitness functions:** Phase 4 verification explicitly states "Verify fitness functions pass without modification (no `StateEvent` union changes)". The plan makes no changes to the state machine, so `state-machine-purity.test.ts` and `transition-completeness.test.ts` are unaffected. No fitness function update is needed — correctly recognized.
- **Database backup:** Not applicable (no production database).
- **Documentation:** Phase 4 includes updating `commands-api.md` and `data-layer-api.md` and adding the INV-001 exception to `invariants.md`.
- **Simplicity:** The design is appropriately scoped — direct state construction bypassing the state machine for a one-time import operation is the simplest correct approach.

One very minor observation (not an issue, no action needed): Phase 3's confirmation round description says "CLI returns `{ status: 'complete', ... }` (Phase 4 will handle actual state construction)" — this staging is clear and intentional. The implementer is expected to complete Phase 4 before the system is end-to-end functional, which is fine since Phase 4 follows Phase 3 in sequence.

## Score: 10/10

All R3 issues confirmed fixed. Plan is complete, consistent, and implementable without guessing. Phases are logically ordered with concrete success criteria, invariant compliance is explicit, and the integration test phase provides both a real-data dogfood check and a repeatable CI fixture.

## Summary
- Critical: 0
- Important: 0
- Minor: 0
