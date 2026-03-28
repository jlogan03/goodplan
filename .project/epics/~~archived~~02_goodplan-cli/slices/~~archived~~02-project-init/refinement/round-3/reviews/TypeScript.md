# TypeScript Review — 02-project-init Plan (Round 3)

## Issues

**[IMPORTANT]** `JsonEntry<T>` generic parameter erased at runtime — schema registry lookup needed in tree navigation

Phase 1 defines `getJson<T>(state, path): T | undefined` which returns `entry.content` cast to `T`. The caller supplies `T` as a type parameter, but there's no runtime validation — the cast is unchecked. This is fine when the data was already validated during `assembleState`, but the plan's Phase 1 note acknowledges this as "an intentional tradeoff." The concern is that `setEntry` (used by the state machine in Phase 4) can insert a `JsonEntry` with arbitrary content, and a subsequent `getJson<T>` would return it as `T` without validation. Since the state machine is pure and its output goes through `commitState` validation before reaching the filesystem, this is safe in practice — but the plan should explicitly state that `getJson<T>` is unsafe for unvalidated trees and that `commitState` is the validation boundary for state-machine-produced entries. Without this note, an implementer might assume `getJson<T>` is always type-safe.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `assembleState` skipping unregistered `.json` files is undocumented in plan tasks

The plan's Phase 3 task for `assembleState` says: "For `.json` files: look up schema via registry — if found, parse and validate. If not found..." — it doesn't say what happens. The `data-layer-api.md` says "Files not matching any pattern are either markdown (`.md` -> `MarkdownEntry`) or ignored." So unregistered `.json` files should be silently skipped (not included in the tree). The plan's test list includes "unregistered `.json` files silently skipped (not in tree)" which is correct, but the corresponding task text doesn't specify this behavior. An implementer reading just the task would not know what to do with `.json` files that have no matching schema. Add explicit "silently skip" language to the task.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `state-events.ts` — `StateEvent` should be defined as a Zod discriminated union or a plain TypeScript type?

Phase 2 task says "Create `src/schemas/state-events.ts` — `StateEvent` discriminated union type (INIT_PROJECT only for this slice, but define the union structure so future slices extend it)." The Zod research doc covers `z.discriminatedUnion()`, and the project convention is to infer types from Zod schemas (`z.infer<typeof schema>`). However, `StateEvent` is an internal type consumed only by the state machine — it never crosses a trust boundary (it's constructed by the RPC layer, not parsed from external input). Using Zod here adds runtime overhead with no validation benefit. The plan should clarify: define `StateEvent` as a plain TypeScript discriminated union type (not a Zod schema), consistent with `StateError` which is also defined as a plain object type. Reserve Zod for entity schemas that validate filesystem data.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `commitState` JSONL append logic — `noUncheckedIndexedAccess` implications

The plan says JSONL append detection works by "comparing array lengths only (existing entries are trusted unchanged per INV-003 reducer purity), append only new lines." With `noUncheckedIndexedAccess: true`, slicing the new array (`newState.content.slice(oldState.content.length)`) returns `T[]` which is fine. But if the implementation tries to access individual entries by index (e.g., `newEntries[i]`), the result is `T | undefined` and needs narrowing. This is unlikely to be a problem with `Array.prototype.slice` + `Array.prototype.map`, but worth a brief note in the task to use array methods (not indexed access) for the append entries to avoid unnecessary undefined checks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `reduce` return type — discriminating `ProjectState` from `StateError`

The plan defines `reduce(state, event): ProjectState | StateError`. At the call site (Phase 5 RPC), the caller needs to discriminate between success and error. `ProjectState` is `DirectoryEntry` which has `{ type: "directory", contents: ... }`. `StateError` is `{ code: string, message: string }`. These are structurally distinct (no overlapping discriminant key), so TypeScript can narrow via `"code" in result` or a type guard. The plan's Phase 5 task says "check for `StateError` — if present, map to `GoodplanError`" but doesn't specify the narrowing approach. A simple `isStateError(result): result is StateError` type guard (checking for `"code" in result`) would be the cleanest pattern and should be exported from `src/core/state/types.ts` alongside the type.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 2 feedback was thoroughly addressed. The plan now specifies `StateError.detail` as `Record<string, unknown>` matching the architecture, `assembleState` collects all validation errors into a single `GoodplanError` throw, `commitState` write ordering is clarified (collect into two arrays, flush JSON then JSONL), overview item status uses `z.string()`, learning schema fields are required (not optional), `ZERO_STATE` uses `as const satisfies`, and the `Verification` schema is called out. The remaining issues are precision gaps rather than correctness problems: clarifying `getJson<T>` safety boundaries, documenting skip behavior for unregistered JSON files, choosing plain TS types vs Zod for internal-only types, and adding a type guard for the reduce return type. All are directly actionable and straightforward to address.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
