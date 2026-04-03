# Generalist Review — Phase 2, Iteration 2

**Score: 9/10** | Critical: 0, Important: 1, Minor: 2

## Summary

Strong iteration. All 10 issues from iteration 1 have been addressed. The simulated user implementation is clean and stateless as specified, the `createAskUserHandler` correctly composes into `runSkillSession`, the passthrough fix (removing `updatedInput: input` for non-AskUserQuestion tools) is correct, and the test scripts are well-structured with proper preflight checks, cleanup, and graceful API key handling. The `platformBinaryDir()` extraction reduces duplication. Formatting cleanup throughout `utils.ts` is welcome.

## IMPORTANT

### 1. Cost estimation is hardcoded to haiku pricing regardless of model

`utils.ts` line 408-409: The cost estimate always uses haiku pricing (`$0.25/MTok input, $1.25/MTok output`), even when a non-haiku model is used. The comment acknowledges this ("Underestimates when a non-haiku model is used"), but if someone passes `claude-sonnet-4-5` or `claude-opus-4-6` to the simulated user, cost tracking will underreport by 10-80x. This could lead to unexpected spend in test runs.

**Suggestion:** Accept a `pricing` parameter or derive from model name. Even a simple `if (model.includes("opus"))` multiplier table would be more accurate. Alternatively, surface the model name alongside the cost in logs so the underestimate is obvious.

## MINOR

### 2. Duplicated `assert` helper across test scripts

Both `test-simulated-user.ts` and `test-integration.ts` define identical `assert()` + `passed`/`failed` counter patterns. This is the exact kind of duplication `utils.ts` was created to eliminate. Not blocking since these are test files and Phase 3 may consolidate further, but worth noting.

### 3. `test-integration.ts` uses `import.meta.dir` (Bun-specific)

Line 56: `const GOODPLAN_DIR = join(import.meta.dir, "../..");` uses `import.meta.dir` which is a Bun extension not available in Node. This is consistent with the existing harness pattern (all scripts run via `bun`), so it's fine in practice, but worth a one-line comment for anyone who tries to port these to Node later.

## What Improved Since Iteration 1

- Passthrough `canUseTool` no longer injects `updatedInput: input` for non-AskUserQuestion tools (was CRITICAL)
- `SimulatedUser` interface now includes `totalCost()` method
- `platformBinaryDir()` extracted and exported (was duplicated inline)
- `noUncheckedIndexedAccess` satisfaction: `versions[0]` guard added
- Formatting normalized throughout `utils.ts`

## Alignment with Plan

The implementation matches Phase 2 spec closely:
- `createSimulatedUser` is stateless, uses `messages.create()` via `@anthropic-ai/sdk`
- `createAskUserHandler` returns correct `canUseTool` shape with `updatedInput: { questions, answers }`
- `test-simulated-user.ts` has API key preflight, tests `ask()` directly, tests handler shape, tests passthrough
- `test-integration.ts` uses `createMinimalFixture()`, `runSkillSession()` with `simulatedUser` + `checkViolations`, and `/gp:status`
- `@anthropic-ai/sdk` added as devDependency
- Plan checklist items correctly marked `[x]`
