# TypeScript Review — 02-project-init Plan

## Issues

**[IMPORTANT]** `StateEvent` and `StateError` are defined in two places with conflicting shapes

Phase 2 task says: "Create `src/schemas/state-events.ts` — `StateEvent` discriminated union type ... `StateError` interface." Phase 4 task says: "Export `StateEvent` and `StateError` types from `src/core/state/types.ts` (re-export from schemas)." Meanwhile, the architecture's `state-machine-api.md` defines `StateError` as `{ code: string; message: string; detail?: Record<string, unknown> }` — a plain object. But `src/util/errors.ts` already has `GoodplanError` (a class with `code: GoodplanErrorCode`). The plan's Phase 4 uses `StateError` as the return type of `reduce()`, but Phase 5 checks "for StateError" and then presumably throws a `GoodplanError` at the command layer. The plan should clarify: (1) `StateError` is a plain discriminant object (not a class, not `GoodplanError`) returned from pure `reduce()`, and (2) the RPC layer maps `StateError` to `GoodplanError` for the command layer. Without this, the implementer may conflate the two, breaking INV-003 (state machine purity) or creating a confusing dual-error system. Add a task to Phase 4 specifying the `StateError` shape and a note in Phase 5 for the RPC-layer mapping.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `assembleState` typing is underspecified for `JsonEntry<T>` generic parameter

The plan says `assembleState` creates `JsonEntry<T>` with "concrete typed content" by looking up schemas via the registry and validating. But at the type level, `assembleState` returns `ProjectState` which is `DirectoryEntry` containing `Record<string, StateEntry>`. Since `StateEntry` uses `JsonEntry<unknown>`, the concrete `T` from Zod inference is erased — `getJson<T>(state, path)` performs an unsafe cast. This is fine architecturally (the schema registry provides runtime safety), but the plan should acknowledge that `getJson<T>` is a trust-the-caller generic cast, not a type-safe narrowing. With `noUncheckedIndexedAccess: true`, the implementer needs to handle `undefined` returns from `getJson`, but there's no compile-time guarantee that the `T` matches the actual content. Add a note to Phase 1 that `getJson<T>` is an unchecked assertion (equivalent to `as T`) guarded by runtime schema validation in assembleState/commitState, so callers must use the correct type parameter.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `setEntry` must handle intermediate directory creation — plan says "edge case" but no explicit task

Phase 1 lists `setEntry(state, path, entry)` as a task and mentions "missing intermediate directories" as an edge case for tests. However, there's no explicit design decision on whether `setEntry` should auto-create intermediate `DirectoryEntry` nodes or throw. Phase 4's INIT_PROJECT handler calls `setEntry` to create entries at paths like `epics/overview.json` — this requires `epics/` to exist as a `DirectoryEntry` first. The handler could either: (a) call `setEntry` for directories first, then files, or (b) `setEntry` auto-creates intermediates. The plan should specify which approach. Auto-creation is simpler and matches `mkdirSync({ recursive: true })` semantics.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** JSONL append detection in `commitState` needs explicit comparison strategy

Phase 3 says commitState detects appended JSONL entries by "comparing lengths." But with `exactOptionalPropertyTypes: true` and the general strictness settings, the comparison needs to be precise. If `oldState` has a `JsonlEntry` with 3 items and `newState` has 5 items, commitState appends items [3] and [4]. But how does it verify items [0]-[2] haven't changed? If it doesn't verify, a reducer bug that mutates existing entries would go undetected. The architecture doc says "unchanged entries -> skip" but doesn't address JSONL mutation detection. The plan should specify: either (a) compare existing entries by value (deep equality or deterministic stringify) and throw on mismatch, or (b) trust the reducer (pure functions don't mutate) and only compare lengths. Option (b) is simpler and aligns with INV-003, but should be an explicit decision.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 schema for `activityEntrySchema` — `phase` field needs constrained type

The `activityEntrySchema` has a `phase` field, but the plan doesn't specify whether it should be `z.string()` or `z.enum([...])`. Looking at the architecture, `phase` values come from the event types (e.g., "init", "begin-plan", "complete-slice"). Without an enum, any string is accepted, which weakens validation. At minimum, use `z.string().min(1)`. Ideally define an `activityPhase` enum matching the known phases, but this could be deferred since the full set of phases isn't implemented until later slices.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Debug logging approach (`GOODPLAN_DEBUG=1`) conflicts with conventions

The codebase research notes this: conventions say `--verbose` for diagnostics but the plan uses `GOODPLAN_DEBUG=1`. Both could coexist, but the plan should pick one for this slice and note that it will be unified later. An env var is actually better for debug logging in tests (no CLI flag available), so `GOODPLAN_DEBUG` is reasonable — just add a brief note acknowledging the conventions divergence.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 task "Remove or update `src/core/data/json.ts`" is ambiguous

The task says "Remove the old functions if no callers remain; otherwise mark deprecated." This creates a decision point during implementation that should be resolved now. The codebase context doc clearly shows `readEntity`/`writeEntity` are only called from `project.ts` (`readProject`/`writeProject`), which are themselves being removed. So `json.ts` functions will have zero callers. The plan should say "Remove `readEntity` and `writeEntity` from `src/core/data/json.ts`" (or delete the file entirely since `deterministicStringify` already lives in `src/util/json.ts`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing `import type` awareness for `verbatimModuleSyntax`

With `verbatimModuleSyntax: true` in tsconfig, all type-only imports must use `import type`. The plan doesn't mention this anywhere, and it's a common source of build failures. For example, Phase 2 schemas export both runtime values (schemas) and types (inferred types). Phase 4's `src/core/state/types.ts` re-exports types from schemas — these must be `export type` re-exports. Add a brief note in Phase 1 or Phase 2 reminding implementers to use `import type` / `export type` consistently, per tsconfig requirements.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is architecturally sound and well-structured — phases build cleanly on each other, the bottom-up approach is correct, and it faithfully implements the architecture docs. The issues are not about wrong decisions but about under-specification that will cause implementation friction. The `StateError` vs `GoodplanError` confusion (most impactful) could lead to an incorrect purity boundary. The `setEntry` intermediate directory policy and JSONL comparison strategy need explicit choices to avoid implementation-time guesswork. Fixing the 4 IMPORTANT items and 4 MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
