# TypeScript Review — Phase 04 (RPC Layer: begin/complete/submit)

**Score: 9/10 | Critical: 0, Important: 2, Minor: 2**

---

## Summary

Strong implementation overall. The generic constraint `<P extends BeginPhase>` on `begin()` with `BeginPayloadMap[P]` is the right approach — callers get compile-time enforcement that payload shape matches the phase. `verbatimModuleSyntax` is respected throughout (all cross-module imports use `import type`). `noUncheckedIndexedAccess` has no obvious violations. `spreadOverride` correctly avoids `override: undefined` under `exactOptionalPropertyTypes`.

---

## Issues

### Important

**1. `buildBeginEvent` switch: type-narrowed branches use `as` casts instead of narrowed types**

In `begin.ts` lines 53, 67, 73, 76: cases like `"create"` and `"abandon"` cast `payload` to the specific map type (`payload as BeginPayloadMap["create"]`) rather than relying on narrowing. This works at runtime but bypasses the type safety the generic was designed to provide — if `BeginPayloadMap` gains a new entry and the case is missed, TypeScript won't catch a wrong cast. The exhaustive `never` check at the bottom only covers unhandled `phase` values, not payload type mismatches inside handled cases.

Recommendation: extract typed helpers with explicit parameter types (already done for `buildCreateEvent` and `buildAbandonEvent`), but the inline `as` casts in the direct-return branches (`add-verification`, `update-verification`) should also use the typed helper pattern.

**2. `buildCompleteResult` in `complete.ts`: entityPath falls back to `"unknown"` for non-epic targets**

Lines 90–93: for slice/quest targets, `entityPath` is `"unknown"`, so `getJson` returns `undefined`, and `previousStatus`/`newStatus` both fall back to `"none"`/`"unknown"`. Since `buildCompleteEvent` throws for slice/quest targets before `buildCompleteResult` is ever reached, this is dead code — but it's misleading. If a future contributor adds slice/quest support to `buildCompleteEvent` without updating `buildCompleteResult`, the result will silently report wrong statuses.

Recommendation: replace the `entityPath = "unknown"` fallback with an explicit `throw new GoodplanError("INTERNAL_ERROR", ...)`, or extract status resolution to a shared helper like `resolveStatuses` in `submit.ts`.

---

### Minor

**3. `buildSubmitResult` entity resolution: ternary chain duplicates logic from `resolveEntityName` in `begin.ts`**

`complete.ts` lines 85–88 and `submit.ts` lines 184–187 both contain the same inline ternary chain. This is copy-paste with no shared abstraction. Low-risk now but will drift as entity types are added.

Recommendation: extract a shared `resolveEntityName(target: Target): string` to `types.ts` or a small `rpc-utils.ts` helper, then reference it from both files.

**4. `begin.ts` inline `import(...)` in function signature**

`buildBeginResult` at line 170 uses inline `import("../tree.js").ProjectState` rather than a top-level `import type`. This is valid TypeScript but inconsistent with every other import in the file, and makes the signature harder to read. `complete.ts` and `submit.ts` correctly use top-level `import type { ProjectState }`.

---

## What's Done Well

- `BeginPayloadMap` with `Record<string, never>` for no-payload phases is the correct solution — avoids `undefined` as a positional arg and satisfies `exactOptionalPropertyTypes`.
- Phase-mismatch assertion in `submit()` (line 36) is the right guard for a dual-redundant parameter design; the comment explaining the intentional redundancy is clear.
- Exhaustive `never` checks in both `buildBeginEvent` and `buildSubmitEvent` provide compile-time completeness guarantees.
- `spreadOverride` is a clean, minimal solution to the optional property problem.
- `init.ts` refactor to delegate to `begin()` is clean — no logic duplication, backward-compatible signature.
- Test coverage is solid: all implemented phases tested, phase-mismatch assertion tested, error propagation tested, full lifecycle integration test in `complete.test.ts`.
