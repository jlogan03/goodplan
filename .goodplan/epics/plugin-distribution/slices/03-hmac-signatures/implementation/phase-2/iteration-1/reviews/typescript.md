# TypeScript and JavaScript Review — Phase 2: Write Path Integration

## Issues

**[CRITICAL]** Missing `__GP_HMAC_KEY__` define in `vitest.config.ts`
The plan explicitly requires adding `__GP_HMAC_KEY__` to `vitest.config.ts` (the Vitest module transform define for unit tests), mirroring the `global-setup.ts` define for integration tests. The plan warns: "If one is omitted, the dev-key fallback in `getHmacKey()` silently masks the missing define." Currently, unit tests exercise the **fallback path** (`typeof __GP_HMAC_KEY__ === "undefined"` -> `DEV_KEY`), not the injected-key path. Both happen to produce the same string `"goodplan-dev-hmac-key"`, so tests pass — but this silently masks the fact that the define is missing. If the dev key constant or the define value ever diverge, unit tests would use a different key than integration tests with no visible failure.
File: vitest.config.ts:8
Resolution: DIRECTLY_ACTIONABLE

Fix: Add `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to the `define` object in `vitest.config.ts`, matching the pattern used for `__GOODPLAN_VERSION__`.

**[IMPORTANT]** `atomicWrite` exported but not yet consumed outside `commit.ts`
The function was changed from a private `function` to `export function` with a doc comment saying it's for `verify --fix`. This is premature — no consumer exists yet, and exporting internal utilities widens the module's public API surface unnecessarily. The `verify --fix` phase (Phase 4 per the plan) should export it when it actually needs it.
File: src/core/data/commit.ts:266
Resolution: DIRECTLY_ACTIONABLE

Fix: Remove the `export` keyword. Re-add it in Phase 4 when `verify --fix` is implemented.

**[MINOR]** `signStateTree` always returns `string`, making the conditional spread redundant
In `embedStateSignature`, the code uses `...(signature !== undefined ? { stateSignature: signature } : {})` for `exactOptionalPropertyTypes` compliance. However, `signStateTree()` returns `string` (never `undefined`). The conditional spread is defensive but misleading — it suggests `signStateTree` might return `undefined`. A plain `{ ...projectNode, stateSignature: signature }` would be type-safe and clearer.
File: src/core/data/commit.ts:227
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `as Record<string, unknown>` type assertion on project node content
The line `const projectNode = projectEntry.content as Record<string, unknown>` uses a type assertion. The `content` field on a `JsonEntry` is typed as `unknown`. A runtime check or Zod parse would be safer, though the subsequent `projectSchema.parse()` on the clone provides validation. This is acceptable given the schema validation downstream, but worth noting.
File: src/core/data/commit.ts:225
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation is solid and well-structured. The HMAC signature embedding logic is correct, atomicity is preserved, concurrent modification detection properly strips signatures, and the test coverage is thorough (including the write-read equivalence test). The CRITICAL issue (missing vitest.config.ts define) is a real gap that the plan explicitly called out as required — fixing it plus reverting the premature export would bring this to 9+.

## Summary
- Critical: 1
- Important: 1
- Minor: 2
