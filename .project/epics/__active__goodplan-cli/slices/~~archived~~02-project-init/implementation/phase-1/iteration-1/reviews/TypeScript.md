# TypeScript Review: Phase 1 — State Tree Types & Navigation

## Issues

**[MINOR]** Non-mutation test uses shallow copy instead of deep structural check
The test "does not mutate the original tree on nested set" creates a shallow copy with `{ ...fixture }` and compares with `toEqual`. Since `toEqual` does deep equality and the spread is shallow, both `fixture` and `original` share the same nested references — so a mutation to a nested object would affect both and the test would still pass. A more robust approach: snapshot a specific nested value before the call and assert it is unchanged after, or use `structuredClone(fixture)` for a true deep copy.
File: tests/unit/data/tree.test.ts:338
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `hasChild` duplicates `resolve` logic instead of delegating
`hasChild` re-implements the path-walking loop that `resolve` already provides. It could be simplified to `const dir = getDir(state, dirPath); return dir !== undefined && dir.contents[childName] !== undefined;` — fewer lines, one code path for traversal. The current duplication is not a bug but adds maintenance surface.
File: src/core/data/tree.ts:142
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation. Types are precise, `noUncheckedIndexedAccess` is honored at every index access (line 74, 148, 154, 199), `verbatimModuleSyntax` is respected with `export type` for type-only exports and `import type` in the test file. The discriminated union matches the architecture spec exactly. Generics on `JsonEntry<T>` and `JsonlEntry<T>` are appropriate. `ZERO_STATE` uses `as const satisfies` correctly for type-level immutability. The `setEntry` recursive helper properly maintains immutability via spread. Test coverage is thorough — 41 tests covering happy paths, edge cases (empty path, leading/trailing slashes, traversal through non-directory), mutation checks, and intermediate directory auto-creation. No `as any`, no `@ts-ignore`, no I/O imports. The two minor items above would bring this to 10/10.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
