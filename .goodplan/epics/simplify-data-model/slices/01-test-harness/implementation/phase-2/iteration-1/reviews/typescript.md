# TypeScript and JavaScript Review — Phase 2: Simulated User via Stateless LLM Calls

## Issues

**[CRITICAL]** Type errors in test-simulated-user.ts: CanUseTool options parameter
The `createAskUserHandler` returns a `CanUseTool`, whose third parameter requires `{ signal: AbortSignal; toolUseID: string; ... }`. The test calls `handler("AskUserQuestion", mockInput, {})` and `handler("Read", { file_path: "/tmp/test.txt" }, {})` — passing `{}` where `signal` and `toolUseID` are required. This is a compile-time type error confirmed by `tsc --noEmit`. Fix by constructing a minimal valid options object (e.g., `{ signal: AbortSignal.timeout(5000), toolUseID: "test-123" }`) or by casting the handler to a test-friendly signature with a comment explaining the deviation.
File: tools/dogfood/test-simulated-user.ts:105
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Type error in test-integration.ts: accessing `.result` on SDKResultMessage without narrowing
Line 136 accesses `sessionResult.result.result` but `sessionResult.result` is typed as `SDKResultMessage` (union of `SDKResultSuccess | SDKResultError`). The `isSuccess()` guard narrows inside the `if (success)` block, but the code uses `const success = isSuccess(sessionResult.result)` and then checks `if (success)` — TypeScript does not propagate type narrowing through a boolean variable. The `result` property only exists on `SDKResultSuccess`, not `SDKResultError`. Fix by inlining the guard: `if (isSuccess(sessionResult.result)) { const resultText = sessionResult.result.result; ... }`.
File: tools/dogfood/test-integration.ts:135
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Type errors in test-simulated-user.ts: accessing `.updatedInput` on PermissionResult union
Lines 108, 112, and 138 access `result.updatedInput` without narrowing the `PermissionResult` discriminated union. `updatedInput` only exists on the `{ behavior: 'allow' }` branch, not the `{ behavior: 'deny' }` branch. Since the test already asserts `result.behavior === "allow"`, restructure to narrow first: `if (result.behavior === 'allow') { ... result.updatedInput ... }` or use a type assertion after the behavior check.
File: tools/dogfood/test-simulated-user.ts:108
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Cost tracker in createSimulatedUser is created but never exposed
`createSimulatedUser` creates a `costTracker` via `createCostTracker()` and calls `costTracker.add()` on each `ask()` call, but the `SimulatedUser` interface has no way to read the accumulated cost. The tracker's `total()` is never called or returned. Either expose a `totalCost()` method on the `SimulatedUser` interface or remove the dead cost tracking code. The integration test tracks cost via `sessionResult.totalCost` (from the Agent SDK's `total_cost_usd`), so this simulated-user-level tracking may be intentionally separate — but it's currently inaccessible.
File: tools/dogfood/utils.ts:340
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Hardcoded cost rates in createSimulatedUser
The comment says "Rough cost estimate for haiku: $0.25/MTok input, $1.25/MTok output" but the `model` parameter can be overridden to any model (sonnet, opus). The cost calculation will be wrong for non-haiku models. Since the cost tracker is currently inaccessible (see above), this is inert — but if cost tracking is exposed, the rates should either vary by model or the estimate should be documented as haiku-only.
File: tools/dogfood/utils.ts:397
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Import ordering: `mkdirSync` imported mid-file in test-simulated-user.ts
Line 44 imports `mkdirSync` from `node:fs` after the fixture constant declarations (lines 41-42). Line 13 already imports `rmSync` from `node:fs`. These should be combined into a single import statement at the top of the file. Mid-file imports hurt readability and may confuse linters.
File: tools/dogfood/test-simulated-user.ts:44
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Biome lint warning: non-null assertion on `versions[0]!` in utils.ts
`versions[0]!` at line 41 triggers `lint/style/noNonNullAssertion`. While this is pre-existing code (not introduced in this diff — it's a formatting-only change), it's flagged by `biome check`. The guard `if (versions.length > 0)` makes it safe, but the idiomatic fix is `versions[0]` with a conditional: `const first = versions[0]; if (first) { ... }`.
File: tools/dogfood/utils.ts:41
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test assertion brittleness: asserting exact LLM response
Test 1 in test-simulated-user.ts asserts `answer === "Create a new epic"` — this depends on the LLM reliably choosing a specific option. While the system prompt strongly biases toward this, LLM non-determinism means this assertion could flake. The first assertion (`validLabels.includes(answer)`) is the important one; the second could be softened to a warning or removed.
File: tools/dogfood/test-simulated-user.ts:83
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Three compile-time type errors (confirmed by `tsc --noEmit`) make this code unable to pass strict TypeScript checking. The core logic in `utils.ts` (createSimulatedUser, createAskUserHandler, runSkillSession composition) is well-structured and correct — the issues are concentrated in the test files and the dead cost tracker. Fixing the three CRITICAL type errors and the inaccessible cost tracker would bring this to 8/10. Addressing the import ordering and test brittleness would reach 9+.

## Summary
- Critical: 3
- Important: 3
- Minor: 2
