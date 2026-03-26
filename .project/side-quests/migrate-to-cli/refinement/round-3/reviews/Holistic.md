# Holistic Review — Round 3

## Issues

**[IMPORTANT]** New error codes need adding to type unions, not just `errors.ts`

Phase 2 says "Add error codes to `src/util/errors.ts`" but the actual type unions are split: `VALIDATION_MIGRATION_INVALID` and `VALIDATION_MIGRATION_CORRECTION_LIMIT` belong in `ValidationErrorCode` (in `errors.ts`), and `DATA_MIGRATION_BACKUP_EXISTS` belongs in `DataErrorCode` (also in `errors.ts`). The plan correctly identifies the namespaces but says "using existing namespaces" without specifying which union each code goes into. However, `STATE_ALREADY_INITIALIZED` lives in `StateErrorCode` (imported from `state-events.ts`), not in `errors.ts` directly -- the plan's instruction to "reuse" it is correct since it's already in the `GoodplanErrorCode` union via the import. The task should explicitly state: "Add `VALIDATION_MIGRATION_INVALID` and `VALIDATION_MIGRATION_CORRECTION_LIMIT` to `ValidationErrorCode` type union, and `DATA_MIGRATION_BACKUP_EXISTS` to `DataErrorCode` type union."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `readStdin()` returns `Record<string, unknown>` -- plan should clarify the parse chain

Phase 2 says "Parse stdin using `readStdin()` as-is... Then parse the returned record through `migrationResponseSchema.safeParse()` directly in `rpcMigrate()`." This is correct -- `readStdin()` returns `Promise<Record<string, unknown>>` and returns `{}` when stdin is a TTY. But the plan doesn't address the TTY case: when there's no stdin and no `.migration-in-progress.json`, generate questions; when there's no stdin but migration state exists, re-emit current round. The "no stdin" detection should check if `readStdin()` returned `{}` (empty object). The plan's "Fresh start (no stdin, no `.migration-in-progress.json`)" and "Resume" branches implicitly depend on this but don't specify the check. Add: "Detect 'no stdin' by checking if `readStdin()` returned an empty object (`Object.keys(result).length === 0`)."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 schema location still says "TBD"

The Before check in Phase 1 says "location TBD: `src/commands/global/migrate/schemas.ts` or `src/schemas/commands/migration.ts`". The task body also lists both options. By round 3, the location should be decided. The plan overview says "co-located with the migrate command" which points to `src/commands/global/migrate/schemas.ts`. Pin this location.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `--force` documentation is unclear

The plan says "document as N/A for migrate. Migration is destructive enough that `--force` should not bypass the 'already migrated' guard. Silently ignore if passed." This is fine but the init command does NOT silently ignore `--force` -- it's parsed globally via `parseGlobalFlags()` and set on `globalThis`. The migrate command doesn't need to do anything special since `--force` only affects `commitState()` concurrent modification checks. The task should simply say: "`--force` has no migration-specific behavior -- the global flag is handled by `commitState()` as usual. No special handling needed."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 activity log entry format should reference existing patterns

Phase 4 specifies a migration activity log entry format but doesn't reference how other activity log entries are structured. The plan should note "follow the existing `ActivityLogEntry` schema shape" and reference where it's defined (likely in `src/schemas/` or the transition helpers). This prevents the migration entry from diverging from the established format.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 6 `buildMigrationState()` unit tests listed but function is non-exported

Phase 4 says `buildMigrationState()` is "internal (non-exported)". Phase 6 says to write unit tests for it. Non-exported functions can't be directly imported in test files. Either: (a) export it (with a `@internal` JSDoc annotation), or (b) test it indirectly through `rpcMigrate()`. The plan should decide which approach to use. Option (a) is simpler and follows "narrow interfaces, deep implementation" -- the `@internal` annotation signals intent.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `MigrationState` schema uses `z.enum` for status but doesn't show the import

The schema defines `status: z.enum(["in-progress", "confirming", "complete"])`. This is fine as an inline enum since it's migration-specific (not reused elsewhere). No issue, just noting that the plan correctly avoids creating a shared enum for a transient feature.

Resolution: N/A (no action needed -- removing this from issues)

---

**[MINOR]** Phase 5 skill references `cli-interaction.md` but path may differ

Phase 5 says "Skill references `../_shared/references/cli-interaction.md`". Verify this path exists. If the actual path is different (e.g., `../_shared/references/cli-interaction-conventions.md` or similar), the skill will reference a non-existent file.

Resolution: CODEBASE_EXPLORATION

## Score: 9/10

Significant improvement from R2 (8/10). All R2 IMPORTANT issues have been addressed. The plan is well-structured, phases are logically ordered, success criteria are concrete and falsifiable, and invariant compliance is explicitly handled (INV-001 exception documented, INV-005 via Zod validation of migration state). The remaining issues are minor -- mostly about pinning decisions that are still ambiguous (schema location, export strategy for testing) and ensuring error code additions reference the correct type unions. One IMPORTANT issue around stdin detection warrants a small clarification. To reach 10/10: resolve the two IMPORTANT items and pin the schema file location.

## Summary
- Critical: 0
- Important: 2
- Minor: 5
