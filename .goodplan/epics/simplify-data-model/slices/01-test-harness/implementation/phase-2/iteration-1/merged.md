# Merged Review Feedback — Phase 2, Iteration 1

Reviewers: Generalist (8/10), Software Architecture (8/10), TypeScript (5/10)

## Critical Issues

### C-1: Type errors in test-simulated-user.ts — CanUseTool options parameter
**Source:** typescript
**File:** `tools/dogfood/test-simulated-user.ts:105`

Calls like `handler("AskUserQuestion", mockInput, {})` pass `{}` where `{ signal: AbortSignal; toolUseID: string; ... }` is required. Confirmed by `tsc --noEmit`. Fix by constructing a minimal valid options object (e.g., `{ signal: AbortSignal.timeout(5000), toolUseID: "test-123" }`).

### C-2: Type error in test-integration.ts — accessing `.result` without narrowing
**Source:** typescript
**File:** `tools/dogfood/test-integration.ts:135`

`const success = isSuccess(sessionResult.result)` followed by `if (success)` does not narrow the type — TypeScript doesn't propagate narrowing through boolean variables. `.result` only exists on `SDKResultSuccess`. Fix by inlining: `if (isSuccess(sessionResult.result)) { const resultText = sessionResult.result.result; ... }`.

### C-3: Type errors in test-simulated-user.ts — accessing `.updatedInput` without narrowing
**Source:** typescript
**File:** `tools/dogfood/test-simulated-user.ts:108, 112, 138`

`result.updatedInput` accessed without narrowing the `PermissionResult` discriminated union. `updatedInput` only exists on the `{ behavior: 'allow' }` branch. Restructure to narrow first: `if (result.behavior === 'allow') { ... result.updatedInput ... }`.

## Important Issues

### I-1: Simulated user cost tracker is created but never exposed
**Sources:** software-architecture, typescript, generalist (related)
**File:** `tools/dogfood/utils.ts:340`

`createSimulatedUser` creates a `costTracker` and calls `costTracker.add()` on each `ask()`, but the `SimulatedUser` interface has no way to read accumulated cost. `runSkillSession` has a separate cost tracker that only tracks Agent SDK `total_cost_usd`. Simulated-user LLM costs are silently lost. Either expose a `totalCost()` method on `SimulatedUser` or remove the dead tracking code.

### I-2: `createAskUserHandler` standalone export is misleading — can't compose
**Sources:** software-architecture, generalist (related)
**File:** `tools/dogfood/utils.ts:418-446`

Two sub-issues:
1. For non-AskUserQuestion tools, returns `{ behavior: "allow", updatedInput: input }` — supplying `updatedInput` when no modification is intended. Should return `{ behavior: "allow" as const }` without `updatedInput` for clean passthrough semantics.
2. The export is documented "for direct use in edge cases" but the standalone handler silently drops any original `canUseTool` composition. Either add a JSDoc note about this limitation or remove the export.

Note: In `runSkillSession` composition, non-AskUserQuestion tools are routed away before reaching this handler, so this only affects standalone callers.

### I-3: Hardcoded `macos-arm64` in PATH construction
**Source:** generalist
**File:** `tools/dogfood/test-integration.ts:113`

PATH hardcodes `binaries/macos-arm64`, failing on x64 macOS or Linux. `resolveDefaultGpBin()` in `utils.ts` already has arch/platform detection. Extract that into a shared helper (e.g., `platformBinaryDir()`) and reuse it.

### I-4: Mid-file import of `mkdirSync`
**Sources:** generalist, typescript
**File:** `tools/dogfood/test-simulated-user.ts:44`

`import { mkdirSync } from "node:fs"` appears after constant declarations at line 41, while `rmSync` is already imported from `node:fs` at line 13. Combine into a single import at the top.

## Minor Issues

### M-1: Cost estimation uses haiku-only pricing regardless of model
**Sources:** generalist, software-architecture, typescript
**File:** `tools/dogfood/utils.ts:396-398`

Hardcoded $0.25/$1.25 per MTok rates are haiku-specific, but `model` is configurable. Currently inert (cost tracker not exposed), but will compound when exposed. Add a comment noting the estimate is haiku-only, or make rates model-aware.

### M-2: Test assertion brittleness — exact LLM response check
**Sources:** software-architecture, typescript
**File:** `tools/dogfood/test-simulated-user.ts:72-83`

Asserts `answer === "Create a new epic"` depends on LLM determinism. The `validLabels.includes(answer)` check above is sufficient; the exact match will cause flaky CI. Soften to a warning or remove.

### M-3: Pre-existing Biome lint warning — `versions[0]!` non-null assertion
**Source:** typescript
**File:** `tools/dogfood/utils.ts:41`

Not introduced in this diff but flagged by `biome check`. The guard `if (versions.length > 0)` makes it safe, but idiomatic fix is `const first = versions[0]; if (first) { ... }`.
