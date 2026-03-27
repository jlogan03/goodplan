# Software Architecture Review — Slice 05: Tests and Migration (Round 4)

## Issues

**[IMPORTANT] `warning` field placement in `migrationResultSchema` is architecturally misaligned**
The plan adds a `warning` field to `migrationResultSchema`'s discriminated union variants. However, the warning is emitted during the pre-check phase (before Q&A starts), while `migrationResultSchema` describes the final output (either `{status:"questions",...}` or `{status:"complete",...}`). The warning should be emitted as part of the `questions` variant's first response — or as a separate initial response envelope — not shoehorned into both variants. As written, the `complete` variant would carry a stale warning from much earlier in the workflow. Additionally, the plan says to add `warning` to "the Q&A variant (or both variants)" — this ambiguity will cause implementation confusion. Pick one approach: emit the warning as a top-level field on the first `questions` response only, which is when the user can still abort.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `renameProjectDir` timestamped naming breaks error recovery instructions**
The plan updates `renameProjectDir` to use `.project-old-<YYYYMMDD-HHmmss>/` timestamps. However, the `executeMigration` function (line 630-637) has error recovery instructions that tell the user to "rename .project-old/ back to .project/". With timestamped names, this error message becomes wrong because the actual backup directory name is dynamic. The plan must also update the error recovery message in `executeMigration` to use the actual `projectOldDir` variable (which it already does via string interpolation — verified at line 633). However, the existing `renameProjectDir` currently throws `DATA_MIGRATION_BACKUP_EXISTS` if `.project-old` already exists. With timestamped names, this guard changes semantics: now it should only guard against the specific timestamped name collision (sub-second), not the existence of any prior backup. Verify the plan's `fs.existsSync` guard targets the new timestamped path, not the old fixed path. The plan's wording ("Retain `fs.existsSync` guard for the edge case of sub-second collisions") is correct in intent but should be explicit that the guard checks the new timestamped path.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 fitness test task: `PROJECT_SCOPE_COMMANDS` naming may not age well**
The plan creates a `PROJECT_SCOPE_COMMANDS` set for `migrate`. This is fine for now, but `init` (already in `READ_ONLY_COMMANDS`) is also project-scoped. If `init` were moved to this new set in the future, it would require changes in two places. Consider naming it `ENTITY_EXEMPT_COMMANDS` or documenting that `READ_ONLY_COMMANDS` already covers some project-scope commands. Minor because the fitness test is a developing subsystem.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 task ordering for `epicJsonContent` typing could mask bugs**
The plan says "remove `sliceSequence` first, then apply the type annotation, then verify the resulting object satisfies the type exactly." This ordering is correct, but the plan should note that after applying the `Epic` type, the object literal must also include all required `Epic` fields. Looking at `epicSchema`, it requires `name`, `status`, `goal`, `verifications`, `refinement`, `created`, `activated`, `updated` — all present in the current code at lines 250-260. No issue, but worth noting that `epicJsonContent` currently has a `slices`-related field count mismatch: the `Epic` type has 8 fields, the current object has 9 (including `sliceSequence`). After removal, the 8-field object should match exactly. This is already implicitly covered but could be made explicit.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 architecture doc updates: `state-machine-api.md` has 7 stale path references, not just the ones enumerated**
The plan lists specific line numbers for `state-machine-api.md` updates (lines 235-240, 262-263). Verified: lines 235-240 contain `slices/<name>/` (6 rows), and lines 262-263 contain `slices/<name>` (2 guard examples). Line 239 (`COMPLETE_SLICE`) also references `slices/overview.json` which is an eliminated file. Line 240 (`COMPLETE_EPIC`) references `slices/overview.json` too. The plan should enumerate all stale `slices/overview.json` references in the State Key Dependencies table (present in `CREATE_SLICE`, `COMPLETE_SLICE`, `COMPLETE_EPIC` rows) for replacement with the embedded overview approach.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured with clear phase boundaries, accurate codebase analysis (confirmed by exploration), and appropriate verification steps. The two IMPORTANT issues are real: the `warning` field placement needs a clear architectural decision (not ambiguity), and the timestamped backup naming needs explicit attention to the error recovery message contract. The plan correctly identifies that `buildMigrationState` already nests slices (no structural changes needed) and accurately scopes the migration guard removal. Maturity awareness is appropriate — all touched subsystems are Developing. To reach 9+: resolve the `warning` field placement ambiguity with a concrete design choice, and make the `state-machine-api.md` stale reference enumeration exhaustive.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
