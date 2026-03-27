# Merged Review: Phase 1 — RPC, Commands & Tests

## Scores
- Generalist: 9/10
- SoftwareArchitecture: 6/10
- TypeScript: 9/10

## Merged Issues

### CRITICAL

1. **migrate.ts copies slice artifacts to wrong destination path**
   `copyMigrationArtifacts` writes to `path.join(projectDir, "slices", slice.name)` (the old flat layout) instead of `path.join(projectDir, "epics", epic.name, "slices", slice.name)`. Artifacts silently end up in a directory the CLI never reads.
   File: `src/core/rpc/migrate.ts:538`
   Resolution: DIRECTLY_ACTIONABLE
   Source: SoftwareArchitecture

### IMPORTANT

2. **requireActiveEpic loads full state redundantly**
   `requireActiveEpic(projectDir)` calls `loadState` internally; every caller then calls `loadState` again. The cache prevents correctness bugs, but it doubles I/O for non-cached invocations and is a design smell (hidden dependency, callers can't share state). Raised by both SoftwareArchitecture and TypeScript.
   Fix options: (a) accept `ProjectState` param instead of `projectDir`, or (b) read only `project.json` directly instead of full `loadState`.
   File: `src/commands/slice/utils.ts:17`
   Resolution: DIRECTLY_ACTIONABLE
   Source: SoftwareArchitecture, TypeScript

3. **Integration test asserts eliminated slices/overview.json**
   `workflow-init.test.ts:29` asserts `slices/overview.json` exists after init. This file was eliminated by entity restructuring (consolidated into `epics/overview.json`). Test fails.
   File: `tests/integration/workflow-init.test.ts:29`
   Resolution: DIRECTLY_ACTIONABLE
   Source: SoftwareArchitecture

4. **Fitness test uses unsupported expect.fail() API**
   `stateless-commands.test.ts:84` calls `expect.fail()` which is not a Bun test runner API. The INV-004 fitness guard errors instead of reporting a proper failure. Replace with `throw new Error(...)` or `expect(violations).toHaveLength(0)`.
   File: `tests/fitness/stateless-commands.test.ts:84`
   Resolution: DIRECTLY_ACTIONABLE
   Source: SoftwareArchitecture

5. **list.ts uses inline type alias instead of importing Project type**
   Line 57 uses `getJson<{ activeEpic: string | null }>(...)` instead of importing the `Project` type from schemas. Fragile if `Project` shape changes. `SliceWithEpic` type also defined inline inside `run`.
   File: `src/commands/slice/list.ts:57`
   Resolution: DIRECTLY_ACTIONABLE
   Source: TypeScript

### MINOR

6. **Error code mismatch with plan spec**
   Plan specifies `"NO_ACTIVE_EPIC"` per INV-007, but implementation uses `"VALIDATION_INVALID_INPUT"` since the former doesn't exist in `GoodplanErrorCode`. Pragmatic, but consumers can't programmatically distinguish "no active epic" from other validation errors.
   File: `src/commands/slice/utils.ts:21`
   Source: Generalist

7. **Slice mutation commands lack --epic override flag**
   `plan`, `refine-plan`, `implement`, `complete`, `abandon` resolve epic exclusively from `activeEpic` with no `--epic` flag. `commands-api.md` documents `--epic` flags. Not blocking for single-epic workflows.
   File: `src/commands/slice/plan.ts:32`
   Source: SoftwareArchitecture

8. **list.ts type cast** — `args.epic as string | undefined` could be avoided by using citty-provided types.
   File: `src/commands/slice/list.ts:53`
   Source: Generalist

## Observations (non-issues, not actionable)

- `complete.ts` deferred routing correctly iterates all epics' slices (not just same-epic) per DeferredItem.targetEpic spec.
- Architecture-deltas JSONL path fix at line 267 (flagged as "easy to miss" in plan) was correctly updated.
- `epicComplete` check correctly scopes to same epic via `epicEntry.slices`.
- Migration removes top-level `slices/` directory entirely — correct structural change.
- `rpc-layer-api.md` Target type is correctly updated (SoftwareArchitecture confirmed resolved).
- Two pre-existing test failures (workflow-init, stateless-commands) are not regressions from this phase.
