# TypeScript Reviewer — Phase 3: Migrate Existing Harness Scripts (Iteration 2)

## Issues

**[IMPORTANT]** `exactOptionalPropertyTypes` violations in harness.ts wrapper functions
The `gpLocal`, `gpLocalJson`, and `gpLocalForce` functions pass `opts.stdin` and `opts?.stdin` directly into the opts object literal for `gp()`, `gpJson()`, and `gpForce()`. Under `exactOptionalPropertyTypes: true`, a property typed as `stdin?: string` cannot receive `undefined` — it must either be `string` or omitted entirely. This produces TS2379 errors at lines 70, 74, and 78. Fix with conditional spread: `...(opts.stdin !== undefined ? { stdin: opts.stdin } : {})` or `...(opts?.stdin != null && { stdin: opts.stdin })`.
File: tools/dogfood/harness.ts:70
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Inconsistent `onMessage` casting patterns across scripts
In `harness.ts`, the `onMessage` callback casts the message to `Record<string, unknown>` and manually navigates nested properties (`raw.message`, `inner.content`). In `test-onboard.ts`, `test-migrate.ts`, and `validate.ts`, the same callback casts to `{ message: { content: Array<...> } }` directly. Both approaches work but the inconsistency makes maintenance harder. Recommend aligning on one pattern — the direct cast used in the other scripts is cleaner and should be adopted in `harness.ts` as well.
File: tools/dogfood/harness.ts:220
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `logCliResult` defined but only used in `harness.ts` — not extracted to utils
The `logCliResult` function is defined locally in `harness.ts` (line 80) and provides a nice formatting pattern. `validate.ts` has its own `log()` with different semantics. Given the migration's goal of deduplication, this is a candidate for `utils.ts` in a future pass, but not blocking.
File: tools/dogfood/harness.ts:80
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Significant improvement from 5/10. All previous CRITICAL and IMPORTANT issues are resolved: `gpForce` now accepts and passes through `stdin`, `.project/` references are correctly updated (with intentional exceptions documented in `test-migrate.ts`), `AUTONOMOUS_SYSTEM_PROMPT` and `firstOption` patterns are fully removed, and all scripts correctly use shared utilities from `utils.ts`. The one remaining IMPORTANT is a real `exactOptionalPropertyTypes` violation that would fail strict type checking — straightforward to fix with conditional spread. The code compiles and runs under Bun (which is the intended runtime), but the type issue would surface if these files were ever included in a stricter tsconfig.

To reach 9+: fix the `exactOptionalPropertyTypes` violation.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
