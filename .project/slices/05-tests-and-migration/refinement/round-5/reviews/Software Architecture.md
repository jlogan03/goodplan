# Software Architecture Review — Slice 05: Tests and Migration (Round 5)

## Issues

No issues found.

All IMPORTANT and MINOR issues from round 4 have been resolved:

1. **`warning` field placement** -- now explicitly scoped to the `questions` variant only, with clear rationale (pre-check phase timing, `exactOptionalPropertyTypes` compliance, Zod stripping). Well-designed.

2. **Timestamped backup naming** -- the plan now explicitly states the `fs.existsSync` guard must check the timestamped path (not the old fixed path) and that error recovery messages must use the `projectOldDir` variable. Verified that existing code at line 633 already uses interpolation, so this is safe.

3. **`ENTITY_EXEMPT_COMMANDS` naming** -- adopted, with a clear comment explaining why `migrate` belongs here and why `PROJECT_SCOPE_COMMANDS` was avoided (since `init` in `READ_ONLY_COMMANDS` is also project-scoped).

4. **`epicJsonContent` field count verification** -- the plan now explicitly requires verifying 8 fields match `epicSchema` before applying the type annotation.

5. **`state-machine-api.md` stale references** -- the plan now enumerates `slices/overview.json` references in `CREATE_SLICE`, `COMPLETE_SLICE`, and `COMPLETE_EPIC` rows as needing replacement, plus the Directory-Based Guards section.

**Architectural assessment of the full plan:**

- **Layer boundaries**: Clean. Phase 1 (tests only), Phase 2 (RPC + command + schema), Phase 2.5 (build/install), Phase 3 (self-migration + docs). No layer violations.
- **Dependency direction**: Correct. Schema changes (`migrationResultSchema`) happen at the right layer (command schemas), typed `epicJsonContent` uses the domain type from `src/schemas/entities/epic.ts` -- dependency flows inward.
- **Data flow**: Re-migration flow is sound: remove guard, emit warning on first `questions` response, proceed with normal Q&A. The rename-to-timestamped-backup approach correctly prevents collision with prior backups.
- **Maturity awareness**: All touched subsystems are Developing. Changes are appropriate: test fixes, migration guard removal, type tightening, doc updates. No maturity concerns.
- **Testability**: Phase ordering ensures each phase is independently verifiable (`bun test` at phase boundaries). The `ENTITY_EXEMPT_COMMANDS` set is testable via the existing fitness function pattern.
- **INV-001 compliance**: Migration continues to bypass `reduce()` via `buildMigrationState()` + `commitState()`, consistent with the documented exception in INV-001.
- **INV-007 compliance**: The `warning` field approach keeps output machine-parseable (structured JSON field, not stderr), consistent with INV-007.

## Score: 9/10

The plan is architecturally sound with clean phase boundaries, correct dependency direction, and all prior review issues thoroughly addressed. The one point deducted is minor: Phase 3's architecture doc updates are described at a high level (file + section references) rather than with the same precision as Phase 1-2 tasks. This is acceptable given that doc updates are inherently less risky than code changes, but a brief note about which specific path patterns to search-and-replace (e.g., `slices/<name>/` to `epics/<epic>/slices/<name>/`, `slices/overview.json` to removal) would reduce implementation ambiguity. The plan already does this partially but not exhaustively for all doc files.

## Summary
- Critical: 0
- Important: 0
- Minor: 0
