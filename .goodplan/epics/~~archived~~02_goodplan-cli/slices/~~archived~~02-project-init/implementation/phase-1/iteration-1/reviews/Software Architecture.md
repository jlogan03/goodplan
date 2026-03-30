# Software Architecture Review — Phase 1: State Tree Types & Navigation

## Issues

**[IMPORTANT]** `setEntry` silently overwrites non-directory intermediates instead of erroring
When `setEntry` encounters a non-directory node at an intermediate path segment (e.g., setting `project.json/child.json` where `project.json` is a `JsonEntry`), it silently replaces the existing node with a new `DirectoryEntry`. This matches `mkdirSync({ recursive: true })` semantics as documented, but it creates a data-loss footprint: a reducer bug that builds the wrong path could silently destroy an entity file by replacing it with a directory. The test at line 356 explicitly tests this behavior, confirming it is intentional. However, given INV-001 (every mutation goes through the state machine) and INV-005 (schema validation on every write), this could mask a bug that only surfaces at `commitState` time rather than at the point of the erroneous `setEntry` call. Consider throwing an error or returning an error result when an intermediate segment is a non-directory leaf node, making path construction bugs fail fast.
File: src/core/data/tree.ts:199
Resolution: USER_INPUT

**[MINOR]** `getJson` and `getJsonl` use unchecked casts without runtime narrowing of content type
The `as T` cast on line 94 and `as T[]` on line 106 are documented as unsafe and rely on callers passing the correct type parameter. This is acceptable for a module consumed only by schema-validated paths (assembleState/commitState), but the comment should note that direct usage outside those paths is a type-safety gap. The current JSDoc on `getJson` already does this well; `getJsonl` should mirror that same warning.
File: src/core/data/tree.ts:106
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing `removeEntry` helper for completeness
The architecture's `commitState` diff algorithm (data-model.md "Recursive Diff" section, point 4) describes handling entries present in `oldState` but missing from `newState`. While `commitState` itself will handle the diff, the tree module provides `setEntry` for adding/updating but no `removeEntry` for deletion. Callers (the state machine's `apply` functions) would need to manually reconstruct parent directories to remove a child. This is low priority since the architecture says removed entries are generally no-ops, but worth noting as a future deepening opportunity.
File: src/core/data/tree.ts
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The implementation is clean, well-aligned with the architecture, and thoroughly tested. Types match the data model specification exactly. Navigation helpers correctly handle `noUncheckedIndexedAccess` (explicit `undefined` checks at every indexed access). `ZERO_STATE` uses `as const satisfies` for type-level immutability. `setEntry` is properly immutable with structural sharing via spread. The `splitPath` helper correctly normalizes leading/trailing/double slashes. All 41 tests pass, covering happy paths, edge cases (empty paths, non-directory traversal, missing intermediates), and immutability verification. The module has zero I/O imports, satisfying INV-003 by design.

The one point deducted is for the `setEntry` intermediate-overwrite behavior (IMPORTANT item above) which could mask reducer bugs. If that is confirmed as intentional by the user, this is a 10/10.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
