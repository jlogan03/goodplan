# Merged Review — Phase 2: RPC Layer Integration

**Composite Score: 6/10**
*(Generalist: 6, Software Architecture: 7, TypeScript: 5 — weighted by scope)*

---

## Critical Issues (1)

### C1: Helper functions return incomplete types — 5 `tsc` compilation errors

All three reviewers identified this independently. The helper functions `buildBeginResult`, `buildSubmitResult`, and `buildCompleteResult` (including its epic/slice/quest branches) have return type annotations claiming to return `BeginResult`, `SubmitResult`, and `CompleteResult` respectively. Phase 2 made `nextCommands: NextCommands` a required field on all three types. The helpers do not include `nextCommands`, so `tsc --noEmit` fails with 5 errors:

```
src/core/rpc/begin.ts(412,2): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'BeginResult'.
src/core/rpc/submit.ts(208,2): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'SubmitResult'.
src/core/rpc/complete.ts(269,3): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'CompleteResult'.
src/core/rpc/complete.ts(300,8): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'CompleteResult'.
src/core/rpc/complete.ts(400,8): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'CompleteResult'.
```

The runtime behavior is correct — callers spread the base result and add `nextCommands` before returning — but the helper return type annotations are wrong. Bun transpiles without type-checking, so tests pass despite broken types.

**Fix:** Change helper return types to `Omit<BeginResult, 'nextCommands' | 'paths'>`, `Omit<SubmitResult, 'nextCommands' | 'paths'>`, and `Omit<CompleteResult, 'nextCommands' | 'paths' | 'context'>`. This makes the contract explicit: helpers build the base result; callers augment with `paths` and `nextCommands`. The `paths` field is already caller-added, so it should be omitted from helper return types for the same reason.

**Files:**
- `src/core/rpc/begin.ts:412` (return type of `buildBeginResult`)
- `src/core/rpc/submit.ts:208` (return type of `buildSubmitResult`)
- `src/core/rpc/complete.ts:269`, `:300`, `:400` (return type of `buildCompleteResult` and its branches)

**Resolution:** DIRECTLY_ACTIONABLE — blocking, must fix before Phase 3.

---

## Important Issues (1)

### I1: Test passage does not prove type safety

The implementation agent reported all 1659 tests passing, but `tsc --noEmit` shows 5 type errors. Bun's test runner transpiles without type-checking, so green tests are not sufficient verification. The plan's verification criteria require both `bun run test` and `bun run check` to pass. Future iterations must run `tsc --noEmit` (or `bun run check`) as part of verification before marking a phase complete.

---

## Minor Issues (1)

### M1: Asymmetric optionality between `nextCommands` and `paths` on result types

`paths` is typed as optional (`paths?: PathReferences`) with a backward-compatibility comment, but `nextCommands` is typed as required (`nextCommands: NextCommands`). If backward compatibility is a concern for `paths`, the same concern applies to `nextCommands` — existing consumers destructuring these types will fail to compile. The asymmetry should be a deliberate choice. Either make both required (cleaner, since this is a new addition in an active epic) or make both optional (true backward compatibility). The current state is inconsistent.

**File:** `src/core/rpc/types.ts:133`
**Resolution:** DIRECTLY_ACTIONABLE — low urgency, but should be resolved before Phase 3 ships.

---

## What Is Working Well

All reviewers agreed the integration logic itself is correct:

- `computeNextCommands(target, baseResult.newStatus)` is called at the right point in `begin()`, `submit()`, and `complete()`.
- The function is pure (no I/O), preserving INV-003 and INV-004.
- Dependency direction is correct — no Commands layer imports in `next-commands.ts`.
- `nextCommands` is correctly absent from rollup results.
- Error response paths are unchanged.
- No command files were modified (per plan).

The only issue is the type annotation mismatch on internal helpers — the architecture and wiring are sound.

---

## Required Actions Before Phase 3

1. Fix helper return types (C1) — change to `Omit<ResultType, 'nextCommands' | 'paths'>`.
2. Run `tsc --noEmit` and confirm zero errors.
3. Run `bun run check` (Biome) and confirm no new errors introduced.
4. Address M1 (optionality consistency) before shipping.
