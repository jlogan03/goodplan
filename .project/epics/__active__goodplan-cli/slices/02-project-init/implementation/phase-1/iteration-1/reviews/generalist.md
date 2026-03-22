# Phase 1 Review: State Tree Types & Navigation

## Plan Adherence

All five tasks from the plan are complete:

1. `StateEntry` discriminated union with all four variants, `ProjectState` type alias, `import type`/`export type` used correctly per `verbatimModuleSyntax: true` -- **done**
2. Navigation helpers (`resolve`, `getJson`, `getJsonl`, `getDir`, `getMarkdown`, `hasChild`) -- **done**
3. `setEntry` with immutable semantics and auto-created intermediate directories -- **done**
4. `ZERO_STATE` with `as const satisfies ProjectState` -- **done**
5. Unit tests covering all specified cases -- **done**

Build verification: 41 tests pass, `tsc --noEmit` clean.

## Code Quality

**Types** match the architecture spec in `data-model.md` exactly. The discriminated union shape, `ProjectState = DirectoryEntry` alias, and generic parameters on `JsonEntry<T>`/`JsonlEntry<T>` all align.

**`resolve`** correctly handles empty paths (returns root), missing intermediates, traversal through non-directories, and leading/trailing slashes. The `splitPath` helper with `.filter(s => s.length > 0)` handles edge cases cleanly.

**`getJson<T>`** documents the unchecked cast tradeoff inline, matching the plan's explicit note about unsafe casts validated at the assembly/commit boundary.

**`hasChild`** duplicates the traversal logic from `resolve` rather than delegating. This is a minor style point -- it could call `resolve(state, dirPath)` and then check `contents[childName]`, reducing code. However, the current approach avoids an intermediate allocation and is straightforward.

**`setEntry`** uses a clean recursive helper with proper immutability (spread at each level). The `!` assertion on line 187 (`segments[index]!`) is justified by the caller contract and avoids unnecessary `noUncheckedIndexedAccess` ceremony.

**`ZERO_STATE`** uses `as const satisfies ProjectState` exactly as specified, providing type-level immutability.

## Test Coverage

Tests cover all plan-specified scenarios:

- resolve: top-level, nested, deeply nested, missing, non-directory traversal, empty path, leading/trailing slashes
- getJson/getJsonl/getDir/getMarkdown: happy path, missing path, wrong type
- hasChild: root children, nested directories, missing children, non-directory dirPath, deeply nested
- setEntry: add at root, replace existing, nested with auto-created intermediates, deep path from ZERO_STATE, immutability verification, sibling preservation, non-directory overwrite, root replacement edge cases

The test for immutability (line 336-343) uses a shallow copy (`{ ...fixture }`) which only proves the top-level reference is unchanged. A deep freeze or `structuredClone` comparison would be more rigorous. However, the "adds a new entry at root level" test (line 272-283) already verifies the original lacks the new entry, which is a stronger functional check.

## Findings

### Minor

1. **`hasChild` could delegate to `resolve`** -- lines 142-155 re-implement path traversal. Using `const dir = getDir(state, dirPath); return dir !== undefined && dir.contents[childName] !== undefined;` would be 2 lines instead of 13 and eliminate duplicated logic. Not a correctness issue.

2. **No `removeEntry` helper** -- the plan doesn't call for one and `commitState` treats missing keys in the new tree as no-ops, so this is fine for now. Just noting it for later phases if needed.

3. **Test file import uses `.js` extension** (line 11: `from "../../../src/core/data/tree.js"`). This is standard for TypeScript with ESM module resolution and `verbatimModuleSyntax`, so it's correct.

## Verdict

Clean implementation that matches the plan spec and architecture docs precisely. Types are strict, immutability is maintained, edge cases are covered. No correctness issues found.

**Score: 9/10**

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | -- |
| Important | 0 | -- |
| Minor | 1 | `hasChild` duplicates traversal logic from `resolve` |
