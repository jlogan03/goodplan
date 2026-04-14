# Side Quest Proposals: 03-derived-state-core-commands

## 1. Migrate error codes from v1 to v2

**Rationale:** `gp init` uses `STATE_ALREADY_INITIALIZED` (v1) instead of `ALREADY_EXISTS` (v2). The v2 error code enum is defined in `commands.md` but not yet implemented in `src/util/errors.ts`. All v2 commands should use the v2 error codes.

**Scope:** Small -- update GoodplanError to support v2 error codes, update init and migrate commands.

**Priority:** Low -- existing behavior is functional, can be batched with other error code work.

## 2. Add lastActivityTs to derived state entities

**Rationale:** `buildStatusResult.detectStaleEntities` is stubbed because `EpicState`, `SliceState`, and `SideQuestState` lack a `lastActivityTs` field. Stale warnings are a useful signal for users with long-running projects.

**Scope:** Small -- add field to interfaces, update entity-lifecycle reducer to track latest event timestamp, implement stale detection logic.

**Priority:** Medium -- stale warnings existed in v1 and are expected by users.

## 3. Add replayAllScopes adapter for testability

**Rationale:** `replayAllScopes` uses `fs.readdirSync` directly for filesystem discovery, deviating from the ports-and-adapters pattern. This makes integration tests require real filesystem setup. A `ScopeDiscovery` adapter interface would allow injecting a memory-backed implementation for unit tests.

**Scope:** Small -- define interface, extract filesystem calls, inject in tests.

**Priority:** Low -- current integration tests work fine; this is a code quality improvement.

## 4. Unify command registry (v1 + v2)

**Rationale:** `schema.ts` contains a large parallel command registry mixing v1 commands (submit-plan, quest:create, etc.) with v2 commands (init, status, migrate). As commands migrate to v2, the registry should be cleaned up and v1 entries removed or marked deprecated.

**Scope:** Medium -- needs coordination with each command migration slice.

**Priority:** Low -- functional as-is, cleanup should happen as v1 commands are retired.
