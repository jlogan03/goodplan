# Software Architecture Review (Round 2)

Reviewed: Entire plan (Phases 01-06)
Goal: Build `goodplan migrate` -- multi-round Q&A protocol converting pre-CLI `.project/` to CLI-managed state.

Round 1 issues addressed: MIGRATE_PROJECT event replaced with direct state construction in `rpcMigrate()`, `.migration-in-progress.json` moved to cwd, error codes fixed to existing namespaces, artifact copy moved to post-commitState step, RPC layer routing documented.

## Issues

**[IMPORTANT]** Direct state construction in `rpcMigrate()` bypasses INV-001 without explicit invariant amendment

The plan correctly decided to bypass the state machine (no `MIGRATE_PROJECT` event), which avoids the exhaustiveness ripple and keeps the state machine clean. However, INV-001 states "Every state mutation goes through the state machine" with the only documented exception being version stamping. Phase 4 constructs `ProjectState` directly and calls `commitState()`, which is a clear violation of INV-001.

The plan says "migration is a data import, not a state transition" -- this is a reasonable justification, but it needs to be formally documented as a known exception in `architecture/invariants.md`, similar to the version stamp exception. Without this, the next developer who reads INV-001 will either (a) think the migration code is a bug, or (b) conclude that INV-001 is aspirational rather than enforced, weakening the invariant system.

Phase 4 tasks mention "Update architecture docs: add `migrate` command to `commands-api.md`" but do not mention updating `invariants.md`.

Resolution: DIRECTLY_ACTIONABLE
- Add a task in Phase 4: "Add known exception to INV-001 in `architecture/invariants.md`: `rpcMigrate()` constructs `ProjectState` directly and calls `commitState()` without going through `reduce()`. Migration is a one-time data import that creates entities at arbitrary statuses -- the state machine's lifecycle guards are not applicable."

---

**[IMPORTANT]** `commitState()` diff logic may not handle a "from zero" construction correctly

Phase 4 constructs a complete `ProjectState` from scratch and calls `commitState(projectDir, oldState, newState)`. But what is `oldState` here? After `.project/` is renamed to `.project-old/` and before `commitState()` runs, the `.project/` directory does not exist. The plan doesn't specify how `oldState` is obtained.

Looking at `commitState()` in `src/core/data/commit.ts`, it performs a recursive diff between `oldState` and `newState`. For the diff to work correctly when creating from nothing, `oldState` must be an empty directory entry (the "zero state" described in `data-layer-api.md`: `{ type: "directory", contents: {} }`). But the plan doesn't specify this -- it says "construct `ProjectState`" and "call `commitState()`" without explaining what the old state is.

Additionally, `commitState()` includes concurrent modification detection -- it reads on-disk files and compares against `oldState`. If `oldState` is zero state, all entries are "new" and skip verification, which is correct. But `commitState()` also writes a state cache as the last step, and `mkdirSync` is called for new directories. Since `.project/` doesn't exist yet at this point, the very first `mkdirSync(projectDir + "/...")` will fail unless `commitState()` creates the root `.project/` directory first.

Looking at the existing `init` flow: `rpcInit()` calls `begin()` which calls `loadState()` (returns zero state since `.project/` doesn't exist) then `commitState()`. So `commitState()` must already handle creating `.project/` when it doesn't exist. But migration has an extra wrinkle: the directory DID exist and was renamed. If there's any file-locking or caching, this could cause issues.

Resolution: DIRECTLY_ACTIONABLE
- Phase 4 should explicitly state: "Pass zero state (`{ type: 'directory', contents: {} }`) as `oldState` to `commitState()`. This mirrors the `init` flow where `.project/` doesn't exist yet."
- Verify that `commitState()` creates the `.project/` directory when it doesn't exist (check `init` path for confirmation).

---

**[IMPORTANT]** `rpcMigrate()` has dual responsibilities that should be separated within the function

The plan describes `rpcMigrate()` as handling both the multi-round Q&A protocol (reading/writing `.migration-in-progress.json`, validating answers, emitting questions) AND the final state construction + artifact copy. These are two fundamentally different concerns:

1. **Protocol orchestration** -- stateful, multi-call, operates on transient migration state
2. **State construction** -- one-shot, operates on validated migration data to produce `ProjectState`

Combining both in a single `rpcMigrate()` function will create a large, hard-to-test function. The protocol concern is naturally tested by simulating round-trips. The state construction concern is naturally tested by providing validated migration data and asserting on the produced `ProjectState`.

The plan's test strategy (Phase 6) only tests end-to-end. Unit testing `rpcMigrate()` will be difficult if protocol and construction are interleaved.

Resolution: DIRECTLY_ACTIONABLE
- Split within `src/core/rpc/migrate.ts`: export `rpcMigrate()` as the public API (protocol orchestration), but extract state construction into a separate internal function (e.g., `buildMigrationState(validatedData): ProjectState`). This keeps a single entry point for the command layer while enabling focused unit tests for state construction logic.
- Phase 6 should include unit tests for `buildMigrationState()` in addition to the end-to-end integration test.

---

**[MINOR]** Activity log entry for migration uses generic `activityEntrySchema` fields

Phase 4 says "append an activity log entry to record that migration occurred." The `activityEntrySchema` has fields `{ ts, phase, scope, status, summary, detail? }`. The plan doesn't specify what values to use for `phase` and `scope`. For a migration entry, reasonable values might be `phase: "migration"` and `scope: "project"`, but "migration" is not an existing phase value and this should be documented to prevent confusion when reading activity logs.

Resolution: DIRECTLY_ACTIONABLE
- Specify the activity log entry shape in Phase 4 tasks: `{ ts: <migration timestamp>, phase: "migration", scope: "project", status: "complete", summary: "Migrated from pre-CLI .project/ format", detail: "<entity counts>" }`.

---

**[MINOR]** Schema validation during `commitState()` will validate migration-constructed state against the schema registry, but the plan doesn't verify field completeness per status

Phase 4 mentions "Entities at intermediate/terminal statuses need all required fields populated" and "Source timestamps from migration answers or use migration timestamp as fallback." This is correct but vague. For example, the `epicSchema` requires `verifications: z.array(verificationSchema)` and `sliceSequence: z.array(z.string())`. A migrated epic at `activated` status needs a non-null `activated` timestamp AND a non-empty `sliceSequence` (since activation requires slices).

`commitState()` validates via the schema registry, so structurally invalid state will be caught at write time. But the plan should enumerate the per-status required fields to avoid trial-and-error during implementation.

Resolution: DIRECTLY_ACTIONABLE
- Add a task or note in Phase 4 listing the non-obvious required fields per entity status:
  - Epic `activated`/`completed`: `activated` must be non-null, `sliceSequence` must list slice names
  - Epic `completed`: `verifications` should be populated (though empty array is schema-valid)
  - Slice/Quest at any status: `refinement` is nullable, use `null` for non-refined entities
  - All entities: `created` and `updated` timestamps required, use migration timestamp as fallback

---

**[MINOR]** No rollback strategy if `commitState()` fails after `.project/` has been renamed

Phase 4 sequence is: rename `.project/` to `.project-old/` -> construct state -> `commitState()`. If `commitState()` throws (e.g., schema validation failure on the constructed state), the user is left with `.project-old/` and no `.project/`. The plan mentions "clean up `.migration-in-progress.json` after successful migration" but doesn't address the failure case.

This is acceptable for a one-time migration tool (the user can manually rename `.project-old/` back), but it should be documented as expected behavior in error scenarios.

Resolution: DIRECTLY_ACTIONABLE
- Add a note in Phase 4 tasks: "If `commitState()` fails after rename, the error message should instruct the user to rename `.project-old/` back to `.project/` and retry. Do NOT attempt automatic rollback (rename back) as that could mask the root cause."

## Score: 8/10

All critical issues from round 1 are resolved. The direct state construction decision is sound and avoids state machine pollution. The plan has clear phase boundaries and good separation between protocol orchestration and state construction. Remaining issues are all IMPORTANT or MINOR and relate to: (1) formally documenting the INV-001 exception, (2) specifying the `oldState` parameter for `commitState()`, and (3) splitting `rpcMigrate()` internals for testability. Bringing it to 9+ requires addressing the INV-001 amendment (preventing future confusion about invariant enforcement) and specifying the `commitState()` oldState parameter (preventing a runtime bug).

## Summary
- Critical: 0
- Important: 3
- Minor: 3
