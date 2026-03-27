# Holistic Review (Round 2) — Slice 05: Tests and Migration

## Issues

**[IMPORTANT] Phase 1 fitness test: `migrate` belongs in `STDIN_ENTITY_COMMANDS` only if it actually has entity-identifying stdin fields — it does not**
The plan says to add `migrate` to `STDIN_ENTITY_COMMANDS` with a comment "it operates on the entire project scope rather than targeting a specific entity." But `STDIN_ENTITY_COMMANDS` is specifically for commands whose stdin payload has required entity-identifying fields (like `epic:create` whose stdin has a required `name`). `migrate`'s stdin is `{round, answers}` — no entity identifier. The more semantically correct exemption list is `READ_ONLY_COMMANDS`, which already contains `init` (another project-wide command). Alternatively, the test could use a new `PROJECT_SCOPE_COMMANDS` set. Adding `migrate` to `STDIN_ENTITY_COMMANDS` works mechanically but is misleading — a future reader would expect `migrate`'s stdin to have an entity field.

Fix: Either add `migrate` to `READ_ONLY_COMMANDS` (alongside `init`) since both are project-scope commands, or rename the exemption to make the intent clear. If using `STDIN_ENTITY_COMMANDS`, the comment must be very clear that this is a project-scope exemption, not a claim about stdin entity fields.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 context test task for `startContext.test.ts` is vague and conditional — should be decisive**
The task says: "check `sliceSequence` at line 43: if it appears in an `epicSchema`-validated fixture, remove it; if it's a raw JSON blob not validated against the schema, note as latent inconsistency and skip." The research already confirms `epicSchema` no longer has `sliceSequence` (removed in slice 01). Codebase exploration confirms the fixture at line 43 is a raw object literal with `satisfies DirectoryEntry` on the parent (not validated against `epicSchema`). The test currently passes, so this field is harmless but inconsistent. The plan should make a definitive decision rather than leaving it as conditional.

Fix: State definitively: "Remove `sliceSequence` from the fixture at line 43 for consistency with `epicSchema`. The test currently passes because this is a raw JSON blob not validated against `epicSchema`, but removing it keeps fixtures aligned with the schema." This eliminates implementer ambiguity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 Expected Behavior "before" check references `STATE_ALREADY_INITIALIZED` guard but that guard check does not fail the listed test commands**
The Phase 2 before check says `bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts` will show "failures related to `sliceSequence` assertions and `STATE_ALREADY_INITIALIZED` guard." But the `STATE_ALREADY_INITIALIZED` guard in `migrate.ts` (the RPC function) is not tested by the unit tests in `tests/unit/rpc/migrate.test.ts` — those test `buildMigrationState` (the pure function), which doesn't hit the guard. The integration test in `migrate.test.ts` doesn't currently test the guard either (it uses pre-CLI fixtures without `project.json`). The before check's mention of `STATE_ALREADY_INITIALIZED` is misleading — the actual failures are only about `sliceSequence` assertions and path references.

Fix: Update the before check to: "failures related to `sliceSequence` assertions and stale path references." Remove the `STATE_ALREADY_INITIALIZED` mention.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2.5 is missing a verification that the build succeeded**
Phase 2.5 runs `bun run build` and `bun run install:cli` but the only verification is `goodplan migrate --help`. If the build fails silently (non-zero exit code not caught), the install would use a stale binary. The verification should include confirming the build step completed successfully.

Fix: Add `bun run build && echo "Build OK"` or verify the binary timestamp/version before proceeding to install.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 `goodplan status --json | grep totalSlices` before check uses wrong grep syntax**
The before check says `goodplan status --json | grep totalSlices` with expected output "current count (26)." The field is nested at `artifacts.totalSlices` in JSON output. `grep totalSlices` will match but the expected value "(26)" is ambiguous — it's unclear if the implementer should check the exact value or just that the field exists. The corresponding after check also just says "all entities intact, same counts" without specifying a concrete expected value.

Fix: Use `goodplan status --json | jq '.artifacts.totalSlices'` for a concrete check that outputs `26`, and reference the same in the after check to confirm the count is preserved.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is dramatically improved from round 1. All critical and important issues from round 1 have been addressed: Phase 1 now targets the correct 4 integration/fitness test files plus 2 fixtures (not the 9 already-passing unit tests), Phase 2 has explicit task items with specific line numbers for migration test updates, Expected Behavior checks are test-command-based rather than installed-CLI-based, and the Phase 2.5 build-and-install step correctly sequences the dependency. The plan is clear, complete, and well-phased.

To reach 9+: Resolve the `STDIN_ENTITY_COMMANDS` categorization issue (the most impactful remaining item), make the `startContext.test.ts` task decisive rather than conditional, and tighten the minor Expected Behavior phrasing issues.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
