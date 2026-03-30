# TypeScript and JavaScript Review — Phase 1: HMAC Core Module

## Issues

**[MINOR]** Plan specifies `Bun.CryptoHasher` but implementation uses `node:crypto` — no comment explaining the deviation
The plan (task 1.4) specifies using `new Bun.CryptoHasher("sha256", getHmacKey())` for HMAC computation, with `createHmac` from `node:crypto` as a fallback. The implementation goes straight to the `node:crypto` fallback without comment. This is arguably the better choice (portable, no Bun version sensitivity), but a brief comment noting the deliberate deviation from the plan would prevent future readers from "fixing" it back to `Bun.CryptoHasher`.
File: src/core/data/hmac.ts:8
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `serializeForHmac` mutates the return value of `serializeStateTree`
Line 46 replaces `serialized["project.json"]` in-place. This is safe today because `serializeStateTree` builds fresh objects, but it creates an implicit coupling — if `serializeStateTree` ever caches or reuses objects, this mutation becomes a bug. A local clone (`const result = { ...serialized }`) before mutation would make the function self-contained. Low priority given Developing maturity.
File: src/core/data/hmac.ts:46
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test for `verifyStateTree` with malformed (non-hex) signature input is missing
`Buffer.from(nonHex, "hex")` silently drops invalid characters, producing a shorter buffer. The length guard on line 67 catches this, but there is no test proving it. A single test case like `verifyStateTree(state, "not-hex-at-all")` returning `false` would document this edge case.
File: tests/unit/data/hmac.test.ts:120
Resolution: DIRECTLY_ACTIONABLE

No critical or important issues found.

## Score: 9/10

Strong implementation. Type safety is solid: `import type` for type-only imports, `verbatimModuleSyntax` compliance, proper `Record<string, unknown>` handling with runtime type narrowing instead of unsafe casts. The `typeof` guard pattern matches `version.ts` exactly. `timingSafeEqual` with length pre-check is the correct approach for signature comparison. `exactOptionalPropertyTypes` is handled correctly in the test fixture via conditional spread. The `node:crypto` choice over `Bun.CryptoHasher` is pragmatic. The three minor items are documentation/defense-in-depth — the code is functionally correct as-is.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
