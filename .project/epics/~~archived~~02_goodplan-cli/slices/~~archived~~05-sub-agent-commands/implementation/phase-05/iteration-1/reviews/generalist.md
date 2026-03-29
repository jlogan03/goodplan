# Generalist Review — Phase 05: Start Commands & E2E

**Score: 8/10**

## Plan Adherence

All plan tasks are implemented. Eight `start-*` commands created and registered. `parseInlineBudget` extracted to `global-args.ts`. `complete()` wired with `--inline` support. Architecture docs updated. Tests written and passing. E2E walkthrough verified per checklist.

## Critical Issues (0)

None.

## Important Issues (2)

### I1: Massive code duplication across start commands

The 8 `start-*` command files are nearly identical. The slice-targeted commands (`start-plan`, `start-refinement`, `start-implementation`) share ~95% of their code (identical arg definitions, identical validation logic, identical inline budget parsing, identical state loading). The epic-targeted commands (`start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`) similarly share ~95%. A factory function like `makeSliceStartCommand(phase, name, description)` and `makeEpicStartCommand(phase, name, description)` would reduce 8 files to 2 factory functions + 8 one-liner registrations. This is not just aesthetics -- any future change to the inline budget wiring, error messages, or output behavior requires updating all 8 files identically.

**Files:** All `src/commands/subagent/start-*.ts`

### I2: `parseInlineBudget` silently coerces invalid input to `true`

When given a non-numeric, non-"true" string like `"abc"` or `"-5"` (negative), `parseInlineBudget` falls through to `return true` instead of throwing a validation error. This means `--inline=garbage` silently uses the default budget. While the test acknowledges this behavior, it seems like a UX bug -- the user likely made a typo and should be told. Negative numbers also fall through to `true` since the `parsed > 0` guard rejects them silently.

**File:** `src/commands/global-args.ts`, line 44-45

## Minor Issues (3)

### M1: Non-null assertion on quest value

In `start-plan.ts` line 50: `{ type: "quest", name: questVal! }`. The `!` is safe given the XOR validation above, but this could be avoided by restructuring the conditional (e.g., early return after building the slice target). Same pattern in `start-refinement.ts` and `start-implementation.ts`.

### M2: `as string | undefined` casts on args

Every start command casts `args.slice as string | undefined` and `args.inline as string | undefined`. This suggests citty's type inference doesn't match runtime behavior. While functional, a shared type-safe arg extraction helper would be cleaner and document the citty quirk in one place rather than scattered across 8 files.

### M3: Test coverage gaps for epic-targeted start commands

Only `start-explore` has a test runner (`runStartExplore`). The other 4 epic-targeted commands (`start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`) have no test coverage. Given they share identical structure with `start-explore`, the risk is low, but coverage would catch any copy-paste errors in phase name strings.

## Cross-File Integration

- `startContext` signature in `src/core/context/index.ts` matches usage in all start commands and `complete.ts` -- `(state, phase, target, options?)`.
- `DEFAULT_INLINE_BUDGET` is correctly re-exported from `context/index.ts` and imported by both `complete.ts` and all start commands.
- `SubmitPhase` in `src/core/rpc/types.ts` includes `'complete'` and matches the type in `src/core/context/types.ts`.
- `CompleteResult.context` field properly typed as `ContextBundle | undefined`.
- `main.ts` registers all 8 start commands as flat top-level subcommands, consistent with submit-* pattern.
- Architecture docs (`rpc-layer-api.md`, `_overview.md`) updated to reflect context module as peer, `startContext` signature with state param, and `'complete'` in `SubmitPhase`.

## Code Quality

The implementation is correct and well-documented. JSDoc comments explain the "always JSON" sub-agent convention. The `complete.ts` inline wiring is clean -- budget resolution logic is straightforward. The architecture doc updates are thorough and consistent with the code.

The main concern is maintainability: 8 near-identical files is a maintenance burden that a factory pattern would eliminate. This is worth addressing before more start commands are added.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Important | 2 |
| Minor | 3 |
