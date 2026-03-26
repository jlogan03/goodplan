# Risk/Dependency Analysis Review

## Issues

**[IMPORTANT]** `goal-refining.md [05-tests-and-migration]`: `copyMigrationArtifacts()` slice destination path not mentioned in scope

The slice 05 goal states "copyMigrationArtifacts() copies to epics/<epic>/slices/<name>/ instead of slices/<name>/", but the actual function in `src/core/rpc/migrate.ts` (line 527) uses `path.join(projectDir, "slices", slice.name)` as the destination. The goal's Behavior section describes the `buildMigrationState()` change (writing slices inside the epic tree, removing `slices/overview.json` construction) but is ambiguous about whether `copyMigrationArtifacts()` is also updated. The current code builds slices under a separate flat `slices/` tree (lines 266–323) AND copies artifacts to `slices/<name>/` (line 527). Both must change in slice 05 — the goal Behavior section should explicitly name `copyMigrationArtifacts()` as a change site alongside `buildMigrationState()`. If `copyMigrationArtifacts()` is missed, markdown artifacts (SKILL.md files, architecture docs) end up in the old flat path while JSON state lands in the nested path, leaving an inconsistent layout that silently passes the `goodplan status --json` check but breaks any tool that reads artifact paths.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [05-tests-and-migration]`: Rollback verification uses `diff -r` over glob, which may not work as stated

The rollback procedure specifies `diff -r .project-old/slices/ .project/epics/*/slices/` to confirm restructuring. Shell glob expansion of `epics/*/slices/` produces multiple directories, and `diff -r` accepts exactly two paths — the command will fail or compare only the first glob expansion result. A reliable alternative is `find .project/epics/*/slices/ -type f | sort` compared to `find .project-old/slices/ -type f | sort`. This is a minor correctness issue in the rollback procedure, not a blocker.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [01-schema-and-state-machine]`: `sliceSequence` removal from `migrate.ts` is not addressed in any slice

`migrate.ts` line 241 sets `sliceSequence: detail?.sliceSequence ?? []` in the epic JSON content, and `epicDetailResponseSchema` in `src/commands/global/migrate/schemas.ts` (line 75) has a `sliceSequence` field. Slice 01 removes `sliceSequence` from `epicSchema` — but if `migrate.ts` and its associated `epicDetailResponseSchema` are not updated, migration will produce epic.json files that fail the new schema validation on round-trip (INV-005). Slice 05 mentions `migrate.ts` changes but only in the context of path restructuring. Neither slice 01 nor slice 05 explicitly calls out updating `epicDetailResponseSchema` or removing the `sliceSequence` field from `buildMigrationState()`'s epic construction logic.

Resolution: DIRECTLY_ACTIONABLE

## Verification of Round 1 Fixes

All five round-1 issues (1 CRITICAL, 4 IMPORTANT) are now addressed:

- **[CRITICAL] Schema registry in slice 01**: Slice 01 Behavior item 9 and Scope Boundaries now explicitly include `src/core/data/schema-registry.ts`. The registry update (adding `epics/[^/]+/slices/[^/]+/slice.json` → `sliceSchema`, removing old flat `slices/` patterns) is in scope for the foundation slice. Fixed.

- **[IMPORTANT] Slice 02 schema registry ambiguity**: Slice 02 now states "Schema registry already updated in slice 01 — this slice consumes those patterns." Ownership is clear. Fixed.

- **[IMPORTANT] Slice 03 over-dependency on slice 02**: Slice 03 goal says "no RPC dependency" and the sequencing table shows dependency on 01 only. Fixed.

- **[IMPORTANT] Slice 04 over-dependency on slices 01-03**: Sequencing table shows slice 04 depends only on 01. Fixed.

- **[IMPORTANT] Slice 05 self-migration rollback**: Slice 05 now contains an explicit rollback procedure with `.project-old/` backup, diff verification, and restore instructions. Fixed.

## Score: 8/10

Round 1 fixes are solid and the ordering is now robust — slices 02, 03, 04 can run in parallel after 01, reducing the blast radius of any single slice failing. The schema registry CRITICAL is resolved. Remaining gaps: (1) `copyMigrationArtifacts()` is a definite change site not named in slice 05's Behavior, (2) `sliceSequence` removal in `epicDetailResponseSchema` / `migrate.ts` falls between slices 01 and 05 with neither owning it explicitly. To reach 9+: name `copyMigrationArtifacts()` explicitly in slice 05 Behavior, and assign `epicDetailResponseSchema` + `buildMigrationState()` `sliceSequence` removal to slice 05 scope.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
