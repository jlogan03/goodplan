# Phase 3 Review: Generalist

**Score: 7/10**

## Summary

Phase 3 successfully migrates all 5 harness scripts to shared utilities, removes `AUTONOMOUS_SYSTEM_PROMPT` and auto-first-option injection, and replaces inline patterns with `runSkillSession`/`createSimulatedUser`/`parseModel`/`tierDefault`. The net deletion of ~385 lines is a clear win. The grepped verification (0 matches for AUTONOMOUS, firstOption, .project/ excluding test-migrate.ts) confirms cross-cutting cleanup is complete. However, two critical functional regressions were introduced during the migration.

## Critical Issues

### C1: stdin payloads silently dropped from gpForce/gpLocalForce calls

**Files:** `validate.ts`, `harness.ts`

In `validate.ts`, ALL `stdin` parameters were removed from `gpForce` calls. The old code passed JSON payloads via stdin for `epic:create` (name+goal), `epic:add-verification` (verification item), `epic:complete` (verificationResults), `slice:complete` (verificationPassed, learnings, architectureDelta), `quest:create` (name+goal), `quest:complete` (same). The new code calls `gpForce(["epic:create", "--json"], { cwd: PROJECT_DIR })` with no stdin at all. These CLI commands require stdin JSON -- without it they will fail or produce wrong behavior at runtime.

In `harness.ts`, the pattern is different but equally broken: `completePayload` variables are still constructed via `JSON.stringify(...)` but then `gpLocalForce()` is called without passing `{ stdin: completePayload }`. The payload is dead code. This affects:
- `slice:complete` (lines 913-919, 1686-1692)
- `epic:complete` (lines 957-960, 1727-1730)
- `quest:complete` (lines 1163-1168)

Additionally, `gpForce` in `utils.ts` does not accept `stdin` in its options type (`{ cwd?, gpBin? }` only), so even if callers tried to pass stdin, it would be silently ignored. This is a design gap that needs fixing.

**Fix:** Add `stdin` to `gpForce`'s opts type in utils.ts (forwarding to `gp()`). Then restore stdin passing at all affected call sites in both validate.ts and harness.ts.

### C2: validate.ts submit-refine-architecture and submit-refine-slices lost stdin scores

**File:** `validate.ts`

The old code passed `'{"scores":{"overall":8}}'` via stdin to `submit-refine-architecture` and `submit-refine-slices`. These are now called with only `{ cwd: PROJECT_DIR }` and no scores payload, which will likely cause the submission to fail or use incorrect defaults.

## Important Issues

### I1: Violation summary removed from validate.ts

**File:** `validate.ts`

The old code maintained a global `violations` array and printed an aggregate violation summary at the end (with count and per-violation details). The new code delegates violation tracking to `runSkillSession` internally, but each session's violations are only logged inline during that session. The final summary section no longer reports violations at all. For a validation script whose stated purpose is "monitors for direct .goodplan/ access violations," losing the aggregate report is a significant regression.

**Fix:** Track violations across sessions (e.g., accumulate from each `session.violations`) and restore the summary block.

### I2: Unused imports in harness.ts and validate.ts

**Files:** `harness.ts`, `validate.ts`

- `harness.ts` imports `createLogger` (line 29) but never uses it -- it retains its own inline `log()` function.
- Both `harness.ts` (line 40) and `validate.ts` (line 34) import `type SkillSessionResult` but never reference it.

These will cause lint/build warnings with strict tooling. Fix: remove unused imports.

### I3: validate.ts log function uses require() instead of ESM import

**File:** `validate.ts` (line 49)

```typescript
function log(file: string, content: string): void {
    const { appendFileSync } = require("node:fs");
    appendFileSync(join(LOG_DIR, file), `${content}\n`);
}
```

`appendFileSync` is already available from the top-level `import` in the file (it was removed during migration but could be re-added). Using `require()` inside a function is an ESM anti-pattern and inconsistent with the rest of the codebase. It works in Bun but adds unnecessary runtime overhead on every call.

## Minor Issues

### M1: harness.ts gpLocalForce drops stdin in its implementation

**File:** `harness.ts` (line 80-82)

```typescript
function gpLocalForce(args: string[], opts: { cwd?: string; stdin?: string } = {}): CliResult & { retried: boolean } {
    return gpForce(args, { cwd: opts.cwd ?? NONDET_EVAL_DIR });
}
```

The function signature accepts `stdin` but the implementation does not forward it to `gpForce`. This creates a false sense of safety -- callers think they can pass stdin, but it's silently discarded. (The broader issue of gpForce not accepting stdin is covered in C1, but this wrapper has its own forwarding bug.)

### M2: harness.ts epicStatus uses verifyEntityStatus unconventionally

**File:** `harness.ts` (lines 101-118)

```typescript
const result = verifyEntityStatus("epic", epicName, "", { cwd: NONDET_EVAL_DIR });
```

Passing empty string as `expected` to `verifyEntityStatus` is a hack to just retrieve the status. The function is designed to compare against an expected value. This works but is semantically misleading. Consider using `gpLocalJson` directly to get the status, or adding a dedicated `getEntityStatus` helper.

### M3: Unicode box-drawing characters replaced with ASCII

**File:** `harness.ts`

All `═` (double horizontal line) characters were replaced with `=`. While this improves terminal compatibility, it's an undocumented change not mentioned in the plan's tasks. Cosmetic, not functional.

### M4: Dead completePayload variables in harness.ts

**File:** `harness.ts`

Multiple `const completePayload = JSON.stringify(...)` declarations are now dead code since the subsequent `gpLocalForce` calls don't use them. These should be removed to avoid confusion. (The functional aspect is covered in C1; this is about code cleanliness.)

## What Went Well

- Clean extraction to shared utilities -- `runSkillSession` with `simulatedUser` + `checkViolations` is a much better API than inline `canUseTool` handlers.
- `.project/` to `.goodplan/` path migration is complete and correct.
- Model patching (`patchSkillModels`/`restoreSkillModels`) correctly removed in favor of `parseModel()` -- this was a fragile pattern.
- `AUTONOMOUS_SYSTEM_PROMPT` replaced with contextual `SIMULATED_USER_PROMPT` that enables natural skill interaction.
- test-migrate.ts `.project/` references properly documented as intentional.
- LOG_DIR moved out of `.goodplan/` to `tools/dogfood/logs/` as planned.
