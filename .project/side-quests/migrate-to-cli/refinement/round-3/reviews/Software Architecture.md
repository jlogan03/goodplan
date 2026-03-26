# Software Architecture Review — Round 3

## Issues

**[IMPORTANT]** New error codes need adding to the `GoodplanErrorCode` union type

Phase 2 introduces three new error codes: `VALIDATION_MIGRATION_INVALID`, `VALIDATION_MIGRATION_CORRECTION_LIMIT`, and `DATA_MIGRATION_BACKUP_EXISTS`. The plan says to "add error codes to `src/util/errors.ts` using existing namespaces" but the actual type definitions are discriminated union members on `ValidationErrorCode` and `DataErrorCode` — these are string literal unions, not extensible namespaces. The plan must specify that `VALIDATION_MIGRATION_INVALID` and `VALIDATION_MIGRATION_CORRECTION_LIMIT` are added to the `ValidationErrorCode` type union, and `DATA_MIGRATION_BACKUP_EXISTS` is added to the `DataErrorCode` type union in `src/util/errors.ts`. The current phrasing ("using existing namespaces") is vague enough to cause confusion — it reads like the namespaces are dynamic, but they are static union types that must be explicitly extended.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `buildMigrationState()` is non-exported but Phase 6 requires unit testing it

Phase 4 says `buildMigrationState()` is "internal (non-exported)" within `src/core/rpc/migrate.ts`. Phase 6 says "Unit tests for `buildMigrationState()`" should test it directly. These are contradictory — you cannot unit-test a non-exported function without either: (a) exporting it (even if only via a `@internal` convention or a test-only export), (b) using a barrel test helper, or (c) testing it indirectly through `rpcMigrate()`. The plan should decide which approach to use. Given the "narrow interfaces, deep implementation" philosophy, the recommended approach is to export `buildMigrationState()` as a named export (it is still internal to the `rpc/` module — no external consumer uses it, but tests can import it). This matches the existing pattern where `rpcInit` exports from `src/core/rpc/init.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `MigrationState` schema location ambiguity

Phase 1 defines `MigrationState` as a Zod schema (`migrationStateSchema`) but the plan offers two candidate locations: `src/commands/global/migrate/schemas.ts` or `src/schemas/commands/migration.ts`. The plan should pick one. Given that migration schemas are transient and the plan explicitly says "avoid permanent top-level `src/schemas/migration/`", the better choice is `src/commands/global/migrate/schemas.ts` — this co-locates everything with the command and avoids polluting the shared schema namespace. The plan should commit to this location.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `readStdin()` returns `Record<string, unknown>` but migration expects `{ round, answers }` envelope

Phase 2 says to "parse the returned record through `migrationResponseSchema.safeParse()` directly in `rpcMigrate()`." This is correct — `readStdin()` returns `Record<string, unknown>` and the plan correctly avoids `validateInput()` (which merges CLI flags). However, the plan should note that `readStdin()` is called in the *command* wrapper (not in `rpcMigrate()`), and the parsed record is passed to `rpcMigrate()` as an argument. Currently `rpcMigrate(projectDir)` only takes `projectDir` — the signature needs a second parameter for the stdin payload (e.g., `rpcMigrate(projectDir: string, stdin: Record<string, unknown> | null)`). The `null` case represents "no stdin" (TTY or fresh start). This matches the existing pattern where commands read stdin and pass parsed data to RPC functions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Confirmation schema uses `z.discriminatedUnion` on boolean literal — verify Zod v4 support

Phase 1 specifies `z.discriminatedUnion("approved", [...])` with `z.literal(true)` and `z.literal(false)` variants. In Zod v4, `z.discriminatedUnion` works on string/number discriminators. Boolean literals as discriminators may or may not be supported depending on Zod v4's implementation. The research file (`zod-v4-json-schema.md`) does not cover `discriminatedUnion` behavior. This should be verified — if unsupported, use a plain `z.union` with refinement or switch the discriminator to a string field (e.g., `type: "approve" | "reject"`).

Resolution: CODEBASE_EXPLORATION

## Score: 9/10

Strong improvement from R2. All prior IMPORTANT issues have been addressed: ZERO_STATE is specified, INV-001 amendment is included, `buildMigrationState()` is extracted, failure handling is specified, activity log fields are enumerated, per-status required fields are documented. The architecture is sound: migration correctly bypasses the state machine as a data import, uses `commitState(projectDir, ZERO_STATE, newState)` matching the init pattern, and the four-layer stack boundaries are respected (schemas are pure, I/O stays in command/RPC layer). Module boundaries are clean — `rpcMigrate()` owns orchestration, `buildMigrationState()` owns state construction, schemas own validation. The remaining issues are minor specification gaps (schema location, function signature, error code types) that would not require architectural changes.

To reach 10: resolve the schema location ambiguity (pick one), specify `rpcMigrate()` full signature including stdin parameter, and confirm `z.discriminatedUnion` boolean support.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
