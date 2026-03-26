# Learnings — 03-epic-lifecycle

## Universal `ts` on all StateEvent variants is simpler than per-event selective `ts`

The plan initially followed state-machine-api.md's convention of `ts` only on events that set timestamp fields. This created stale `updated` and activity log timestamps across most transitions. Switching to universal `ts` (RPC injects on all events) simplified every handler and eliminated a class of timestamp staleness bugs. Future event types should always include `ts`.

## `satisfies Record<K, V>` before Map conversion provides compile-time exhaustiveness that Map.get() loses

With `noUncheckedIndexedAccess`, `Map.get()` returns `T | undefined`, forcing runtime error handling but losing compile-time coverage guarantees. The `satisfies` pattern on the plain handler object catches missing handlers at compile time before converting to Map for runtime dispatch. This is the canonical pattern for typed handler maps in this codebase.

## Overview.json must be kept in sync by handlers, not rebuilt at read time

The initial implementation only set overview status at creation time. Every handler that changes entity status must also update the matching overview item. The shared `updateOverviewStatus` helper keeps this consistent. Future entities (slice, quest) should follow this pattern from the start.

## Shared helpers with narrowing return types eliminate non-null assertions across handlers

Guard functions like `guardEpicStatus` returning `Epic | StateError` (instead of `StateError | null` + separate entity lookup) let `isStateError()` narrow the type, eliminating 30+ `!` assertions across handler files. This pattern should be standard for all future guard helpers.

## Shared constants must be exported from their source module, not duplicated

The data layer's `SKIP_NAMES` and `CACHE_FILENAME` were duplicated between `assemble.ts` and `load.ts`/`commit.ts`. All 3 reviewers flagged this immediately. Export from the source module and import elsewhere — never duplicate constants that define shared behavior.

## Validation divergence between code paths serving the same data is a design bug

`loadState()` incremental path initially skipped invalid files silently while `assembleState()` threw. Same filesystem, different behavior depending on cache state. Fix: incremental path throws to trigger fallback to `assembleState()`, ensuring consistent validation behavior regardless of cache state.
