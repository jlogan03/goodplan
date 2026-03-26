# TypeScript Review: Phase 2 — Status File Arrays

## Issues

**[MINOR] Redundant `count` field in `fileArtifactSchema`**
The `count` field is always `files.length`. This creates a data consistency invariant that must be maintained at every construction site. If `count` ever diverges from `files.length`, consumers face ambiguous data. Currently there is only one construction site (`countArtifacts`), but as the codebase grows this is a maintenance risk. Consider either (a) deriving `count` at output time via a Zod `.transform()`, or (b) documenting the invariant prominently and adding a runtime assertion. The existing test "count matches files array length" partially mitigates this, but a schema-level transform would eliminate the risk entirely.
File: src/schemas/commands/status.ts:21
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Inline `import()` type for `ProjectState` parameter**
The `collectMdFiles` function (and pre-existing `countArtifacts`, `resolveActiveEpic`, etc.) uses `import("../../core/tree.js").ProjectState` as an inline type annotation rather than a top-level `import type`. The file already has `import type { DirectoryEntry } from "../../core/tree.js"` — `ProjectState` should be added to that import for consistency and readability.
File: src/commands/global/status.ts:108
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `_projectDir` parameter retained but unused**
The `countArtifacts` function still accepts `_projectDir: string` (prefixed with underscore to suppress the unused-parameter lint). The caller `buildStatusResult` still passes `dir` to it. Since the function now uses the state tree exclusively, this parameter could be removed to simplify the API. However, this may be intentional to maintain a stable internal signature during the transition period.
File: src/commands/global/status.ts:123
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The implementation is clean, well-typed, and follows existing codebase patterns. Types are inferred from Zod schemas (single source of truth), `noUncheckedIndexedAccess` is respected (the `getDir` return is properly guarded as `DirectoryEntry | undefined`), and `exactOptionalPropertyTypes` is handled via `.default()` on the schema. Tests are thorough — 6 new test cases covering the enriched shape, dual-directory aggregation, empty state, path format, count-files consistency, and plain-number field preservation. The schema test with `artifacts: {}` continues to work because all fields have defaults. Type-checking and all 43 tests pass. The three minor items are polish, not correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
