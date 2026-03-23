# TypeScript Review — Phase 4: Context Bundling Module

## Issues

**[IMPORTANT]** Unsafe `as` cast in `learnings.ts` bypasses category validation

`collectLearnings` casts `entry.category as LearningSummary["category"]` without verifying the value is one of the four allowed literals (`"domain" | "worked" | "didnt-work" | "do-differently"`). The `LearningEntry` schema defines `category` as `z.string().min(1)` (open string), so any string passes Zod validation. If a stored learning has a non-standard category value (e.g., `"experimental"`), the cast silently produces an invalid `LearningSummary` at runtime.

Fix: Add a runtime guard — either filter to known categories or use a type-safe narrowing check. A simple approach: define the valid categories as a `Set` and skip entries that don't match, or use `satisfies` on a mapped object. Since the codebase convention (per INV-005) is schema validation at boundaries, validating here is consistent.

File: src/core/context/learnings.ts:50
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Double `as unknown as` casts in `priorities.ts` undermine type safety

`getPriorityTable` returns `PRIORITY_TABLES[phase] as unknown as ContentSource[]` and `resolveSourcePath` casts back `(source as unknown as InternalSource).path`. The internal `InternalSource` type uses `(rt: ResolvedTarget) => string | undefined` for path functions, while the public `ContentSource` type says `(target: Target) => string`. These are genuinely incompatible signatures (different parameter types, different return types), and the double cast hides that.

The root problem is that `ContentSource.path` declares `(target: Target) => string` but the actual functions take `ResolvedTarget` and return `string | undefined`. This means the public `ContentSource` type is a lie — no consumer could call `source.path(target)` and get the correct behavior.

Fix: Either (a) change `ContentSource.path` to `string | ((rt: ResolvedTarget) => string | undefined)` and drop the `InternalSource` type entirely, or (b) keep the split but use a proper adapter function in `resolveSourcePath` rather than raw casts. Option (a) is simpler and avoids dual types.

File: src/core/context/priorities.ts:163-176
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `resolveContentSource` extracts `goal` field with `as { goal: string }` cast

When a JSON entity file is used as a "goal" source, line 103-105 does `(content as { goal: string }).goal`. This assumes the `goal` field exists and is a string, but the check `"goal" in content` only confirms presence, not type. For robustness under strict TypeScript, narrow with `typeof (content as Record<string, unknown>).goal === "string"` before using.

File: src/core/context/collect.ts:103-105
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Test files import from `../../../src/core/data/tree.js` instead of `../../../src/core/tree.js`

The context module source files import from `../tree.js` (the canonical location). The test files import `ProjectState` and `DirectoryEntry` from `../../../src/core/data/tree.js` (the re-export shim). This works because `data/tree.ts` re-exports everything, but it creates an inconsistency: the module under test uses one import path while its tests use a different one. If the re-export shim ever changes, tests could break independently of source.

This matches the existing test convention (other tests also use `data/tree.js`), so it is consistent with the codebase — flagging only as minor since the source module itself uses the canonical path.

File: tests/unit/context/collect.test.ts:8, tests/unit/context/decisions.test.ts:3, tests/unit/context/learnings.test.ts:3, tests/unit/context/startContext.test.ts:3
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `SubmitPhase` addition of `"complete"` diverges from `rpc-layer-api.md` spec

The `SubmitPhase` type in `src/core/rpc/types.ts` now includes `"complete"`, but the architecture spec (`rpc-layer-api.md`) does not list `"complete"` in `SubmitPhase`. The plan explicitly calls for this addition and notes it needs a doc update in Phase 5, plus the code comment on `SubmitPhase` documents the rationale. The submit function correctly rejects `"complete"` at runtime with a clear error. No action needed now, but confirming the Phase 5 doc update task exists.

File: src/core/rpc/types.ts:35-44
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation. Types, tests, budget logic, and tree traversal are well-structured. The double `as unknown as` cast pattern in `priorities.ts` is the main concern — it breaks the type contract between `ContentSource` (public) and `InternalSource` (internal) in a way that would cause runtime errors if anyone tried to use `ContentSource.path` directly. The `category` cast is a smaller but real soundness gap. Fixing the two IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
