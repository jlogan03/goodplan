# Merged Review: Phase 1 — State Tree Types & Navigation

## Verdict

**Score: 9/10** (consensus across all three reviewers)

All five plan tasks complete. 41 tests pass, `tsc --noEmit` clean. Types match architecture spec exactly. No correctness issues.

## Issues

### Important (1)

1. **`setEntry` silently overwrites non-directory intermediates** — When an intermediate path segment is a non-directory leaf (e.g., setting `project.json/child.json`), it is silently replaced with a `DirectoryEntry`. Intentional (tested at line 356, mirrors `mkdirSync({ recursive: true })`), but could mask reducer bugs that build wrong paths — the error only surfaces later at `commitState` rather than at the erroneous `setEntry` call. Consider throwing when an intermediate is a non-directory leaf to fail fast.
   - File: `src/core/data/tree.ts:199`
   - Resolution: USER_INPUT
   - Source: Software Architecture reviewer

### Minor (3)

1. **`hasChild` duplicates `resolve` traversal logic** — Lines 142-155 re-implement the path-walking loop. Could be simplified to: `const dir = getDir(state, dirPath); return dir !== undefined && dir.contents[childName] !== undefined;` — fewer lines, single traversal code path.
   - File: `src/core/data/tree.ts:142`
   - Resolution: DIRECTLY_ACTIONABLE
   - Source: All three reviewers (consensus)

2. **Non-mutation test uses shallow copy instead of deep structural check** — Test at line 338 uses `{ ...fixture }` (shallow spread) with `toEqual` (deep compare). Since nested refs are shared, a nested mutation would affect both copies and the test would still pass. Use `structuredClone(fixture)` for a true deep copy, or snapshot a specific nested value before/after.
   - File: `tests/unit/data/tree.test.ts:338`
   - Resolution: DIRECTLY_ACTIONABLE
   - Source: TypeScript reviewer (confirmed by Generalist who noted the same weakness but considered it mitigated by other tests)

3. **`getJsonl` missing unsafe-cast JSDoc warning** — `getJson` documents the `as T` cast tradeoff inline; `getJsonl` (line 106) should mirror the same warning about direct usage outside schema-validated paths being a type-safety gap.
   - File: `src/core/data/tree.ts:106`
   - Resolution: DIRECTLY_ACTIONABLE
   - Source: Software Architecture reviewer

### Noted (not actionable now)

- **No `removeEntry` helper** — Not required by the plan. `commitState` diff handles deletions. Worth adding in a future phase if callers need it. (Generalist + Software Architecture)
