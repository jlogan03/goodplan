# Generalist Review: Phase 2 — RPC Layer Integration

**Score: 6/10**

## Summary

The integration logic in `begin()`, `submit()`, and `complete()` is correctly wired: each extracts the base result, then spreads it with `nextCommands: computeNextCommands(target, baseResult.newStatus)`. The approach of computing nextCommands at the call site (not inside the helper) is sound and matches the plan's intent. However, the helper functions' return types now conflict with the updated result interfaces, producing TypeScript compilation errors that block the build.

## Critical Issues (1)

### C1: TypeScript compilation errors — helper functions return incomplete types

`tsc --noEmit` reports 5 errors:

- `buildBeginResult` (begin.ts:412) returns `BeginResult` but omits `nextCommands`
- `buildSubmitResult` (submit.ts:208) returns `SubmitResult` but omits `nextCommands`
- `buildCompleteResult` (complete.ts:269, 300, 400) returns `CompleteResult` but omits `nextCommands` in 3 places

The callers correctly add `nextCommands` via spread, but the helper functions' declared return types now require it. The fix is to change the helper return types to `Omit<BeginResult, 'nextCommands' | 'paths'>` (and equivalents for `SubmitResult`/`CompleteResult`), or introduce a `BaseBeginResult` type. This is a blocking issue — `bun run build` will fail, preventing Phase 3 E2E validation.

**Files**: `src/core/rpc/begin.ts`, `src/core/rpc/submit.ts`, `src/core/rpc/complete.ts`

## Important Issues (1)

### I1: Build report claims 1659 tests passed but tsc fails

The implementation agent reported all tests passing, but `tsc --noEmit` shows 5 type errors. Bun's test runner can execute tests despite TS errors (it transpiles without type-checking), so passing tests do not prove type safety. The plan's verification section requires both `bun run test` and `bun run check` to pass. `bun run check` (biome) also shows errors, though some may be pre-existing.

## Minor Issues (1)

### M1: Plan task checkbox mismatch

The plan shows the `bun run build` + E2E verification checkbox (line 100) as unchecked, which is correct since it belongs to Phase 3. No action needed, but confirming the implementation agent did not attempt premature E2E validation.

## Plan Adherence

| Task | Status | Notes |
|---|---|---|
| Add `nextCommands: NextCommands` to `BeginResult`, `SubmitResult`, `CompleteResult` | Done | Required field, correct per plan |
| `RollupResult` unchanged | Done | No `nextCommands` on rollup path |
| Wire `computeNextCommands()` in `begin()` | Done | Correct target + newStatus args |
| Wire `computeNextCommands()` in `submit()` | Done | Correct target + newStatus args |
| Wire `computeNextCommands()` in `complete()` | Done | Correct target + newStatus args |
| Error responses unchanged | Done | `nextCommands` only on success path |
| Command files need zero changes | Done | No command files modified |
| Type safety | Broken | Helper return types incompatible with new required field |

## Recommendation

Fix C1 by narrowing the helper return types (e.g., `Omit<BeginResult, 'nextCommands' | 'paths'>`). Then verify `tsc --noEmit` passes cleanly. The integration logic itself is correct — only the type annotations need adjustment.
