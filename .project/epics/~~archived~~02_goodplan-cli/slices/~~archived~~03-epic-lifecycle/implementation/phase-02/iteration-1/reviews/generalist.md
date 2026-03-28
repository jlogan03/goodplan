# Phase 02: Data Layer Upgrades — Generalist Review

**Score: 8/10**

## Plan Adherence

All 7 tasks completed and checked off. The implementation matches the plan specification:

- `loadState()` handles undefined projectDir, cache miss, version mismatch, corrupt cache, and incremental updates
- Cache format matches spec: `{ version, writtenAt, dirMtimes, state }`
- Concurrent modification detection in `commitState()` for JSON only, skips new files and JSONL
- Cache written as last step of `commitState()`
- `.state-cache.json` already in `assembleState()` SKIP_NAMES (verified)
- Unit tests cover all specified scenarios

## Findings

### Important (1)

**SKIP_NAMES duplication violates plan directive.** The plan explicitly says "Do NOT duplicate the skip rules; import the shared helpers." However, `load.ts:37` defines its own `SKIP_NAMES = new Set([CACHE_FILENAME, "node_modules"])` rather than importing from `assemble.ts`. The values happen to match today, but if `assemble.ts` adds entries (e.g., `.git`, `.DS_Store`), `load.ts` will silently diverge. The implementation agent noted this as tech debt — `assemble.ts` doesn't export `SKIP_NAMES`. The fix is straightforward: export `SKIP_NAMES` from `assemble.ts` and import it in `load.ts`. This should be resolved before moving on.

### Minor (2)

1. **CACHE_FILENAME also duplicated.** `commit.ts:22` defines `const CACHE_FILENAME = ".state-cache.json"` and `load.ts:34` defines the same constant. Since `commit.ts` already imports `collectDirMtimes` and `StateCache` from `load.ts`, it could also import `CACHE_FILENAME` if it were exported. Low risk since the value is unlikely to change independently, but a single source of truth would be cleaner.

2. **`readCache` returns `undefined` for invalid shape instead of throwing.** At `load.ts:110-112`, an invalid-shape cache returns `undefined`, which triggers the "no cache found" debug path and `assembleState()` fallback. This works correctly but the debug message "no cache found" is misleading when a cache file exists but has bad shape. The shape-invalid case already has its own debug line ("cache has invalid shape") so the functional behavior is fine — just slightly confusing log output when both messages appear.

## Cross-File Integration

- `commit.ts` imports `collectDirMtimes` and `StateCache` from `load.ts` — correct, no circular dependency (commit depends on load, not vice versa)
- `load.ts` imports `assembleState` from `assemble.ts` for fallback — correct
- Both `load.ts` and `assemble.ts` use `findSchema` from `schema-registry.ts` — consistent
- The incremental file-reading logic in `load.ts` (readJsonFile, readJsonlFile, readMarkdownFile) correctly mirrors `assemble.ts` behavior: schema validation, skip unregistered JSON, skip unknown types

## Test Coverage

Tests are thorough and well-structured:
- **load.test.ts** (9 tests): ZERO_STATE for undefined/nonexistent, cache miss fallback, cache hit, stale version, corrupt cache, new file detection, removed file detection, cache written by commitState, cache excluded from assembleState
- **commit.test.ts** (6 new tests): cache write verification, concurrent modification throw + error detail, new file skip, JSONL skip, no false positive when disk matches oldState

## Summary

Solid implementation that fulfills the phase objectives. The SKIP_NAMES duplication is the only issue worth fixing before proceeding — it directly contradicts the plan's explicit instruction and creates a maintenance risk.
