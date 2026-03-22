# TypeScript Review — Phase 02: Data Layer Upgrades (Iteration 2)

## Issues

**[IMPORTANT] Incremental JSONL path silently skips malformed JSON lines; assembleState reports them**
The `readJsonlFile` function in `load.ts` catches JSON parse failures and `continue`s (line 353), silently dropping malformed lines. In contrast, `assembleState`'s `readJsonlFile` (assemble.ts:170) pushes a `ValidationError` for each invalid JSON line and ultimately throws `DATA_VALIDATION_ERROR`. This means the incremental and full-assembly paths produce different trees for the same filesystem when a JSONL file contains a malformed line: incremental silently drops it, full assembly rejects the entire file.
This is the remaining piece of iteration-1's IMP-3 fix. The JSON validation path was fixed (now throws to trigger fallback) but the JSONL malformed-line path was not.
Fix: Replace the `continue` on line 353 with a `throw new Error(...)` matching the pattern on line 359, so the incremental path falls back to `assembleState` which reports the error properly.
File: src/core/data/load.ts:353
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `readCache` uses `as StateCache` cast without runtime guarantee**
The manual shape check at lines 101-108 verifies four top-level keys exist but does not verify their types (e.g., `version` could be a string, `dirMtimes` could be an array, `state` could be a number). The `as StateCache` cast on line 112 then trusts the shape completely. While the cache is internal-only and written by `commitState`, a manually corrupted cache file could cause subtle runtime errors rather than a clean fallback. This was flagged as MIN-2 in iteration 1. A lightweight fix would be to add `typeof` checks for the four fields (number, string, object, object) before casting, without needing a full Zod schema.
File: src/core/data/load.ts:101
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Iteration-1 fixes for SKIP_NAMES dedup (IMP-1), CACHE_FILENAME dedup (IMP-2), validation divergence (IMP-3 partial), and double-serialization (MIN-3) are all properly applied. The import/export structure is clean with no circular dependencies. Type safety is strong throughout: `noUncheckedIndexedAccess` is respected with proper `undefined` checks, `import type` is used correctly with `verbatimModuleSyntax`, and generics are concrete. The one remaining IMPORTANT issue is a narrow JSONL edge case from the IMP-3 fix that was only partially applied. Fixing the JSONL malformed-line path would bring this to 10/10.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
