# Phase 02: Data Layer Upgrades — Merged Review

**Composite Score: 7.7/10** (Generalist 8, Architecture 7, TypeScript 8)

## Issues

### Important (3)

**IMP-1: SKIP_NAMES duplicated between assemble.ts and load.ts**
The plan explicitly states "Do NOT duplicate the skip rules; import the shared helpers." `load.ts:37` defines its own `SKIP_NAMES` set rather than importing from `assemble.ts`. If either set is updated independently, the incremental and full assembly paths will silently diverge.
Fix: Export `SKIP_NAMES` from `assemble.ts`, import in `load.ts`.
File: `src/core/data/load.ts:37`
Flagged by: all 3 reviewers

**IMP-2: CACHE_FILENAME duplicated between load.ts and commit.ts**
`CACHE_FILENAME = ".state-cache.json"` is defined independently in `load.ts:34` and `commit.ts:23`. If one changes without the other, `commitState` would write a cache that `loadState` can't find.
Fix: Export `CACHE_FILENAME` from `load.ts`, import in `commit.ts`.
File: `src/core/data/commit.ts:23`
Flagged by: all 3 reviewers

**IMP-3: Incremental loadState silently swallows validation errors; assembleState throws**
`assembleState` collects schema validation errors and throws `DATA_VALIDATION_ERROR` (INV-005). The incremental path in `loadState` uses `safeParse` and silently skips files that fail validation (lines 322-325 for JSON, 352-354 for JSONL). A corrupted file on disk would be detected by `assembleState` but silently ignored by the incremental path, producing different state trees for the same filesystem.
Fix: When the incremental path encounters a validation failure, either fall back to full `assembleState()` or collect and throw errors consistently.
File: `src/core/data/load.ts:322`
Flagged by: software-architecture

### Minor (3)

**MIN-1: `readCache` returns `undefined` for invalid shape instead of throwing**
An invalid-shape cache hits the "no cache found" debug path rather than the "cache read/parse failed" path. Both reach the same `assembleState` fallback, but the debug messages are misleading. Consider throwing from the invalid-shape branch to use the corrupt-cache path consistently.
File: `src/core/data/load.ts:110`
Flagged by: generalist, typescript

**MIN-2: State cache is not schema-validated on read**
`readCache` does a manual shape check and casts with `as StateCache`. Per INV-005, schema validation should happen at every read boundary. A Zod schema for the cache would be consistent with the validation-at-boundaries pattern. The `state` field in particular is trusted without validation.
File: `src/core/data/load.ts:101`
Flagged by: software-architecture

**MIN-3: Concurrent modification check has double-serialization cost**
`checkConcurrentModification` parses the on-disk file then re-serializes both old and disk content via `deterministicStringify` to compare. Could compare on-disk raw bytes against a single serialization of `oldContent` instead. Not a correctness issue.
File: `src/core/data/commit.ts:257`
Flagged by: software-architecture

### Dropped

**`collectDirMtimes` root entry not filtered by SKIP_NAMES** (typescript, minor) — dropped as reviewer acknowledged this is a non-issue since `projectDir` is always `.project/`.

## Consensus Notes

- All reviewers agree the implementation is solid with good test coverage and correct separation of concerns
- All reviewers agree IMP-1 and IMP-2 are straightforward fixes that would raise the score to 9+
- Type safety is strong: `noUncheckedIndexedAccess` respected, proper undefined checks throughout
- Crash-safety ordering (cache written last) and unidirectional dependency flow are correct
- Test coverage is thorough across both load.test.ts (9 tests) and commit.test.ts (6 new tests)
