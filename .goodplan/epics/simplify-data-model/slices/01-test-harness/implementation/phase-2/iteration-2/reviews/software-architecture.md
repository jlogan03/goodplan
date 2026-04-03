# Software Architecture Review — Phase 2: Simulated User via Stateless LLM Calls (Iteration 2)

Reviewer: software-architecture
Context: a code implementation
Files: tools/dogfood/utils.ts, tools/dogfood/test-simulated-user.ts, tools/dogfood/test-integration.ts

## Issues

**[IMPORTANT]** Simulated user cost not aggregated into runSkillSession totalCost
The `SimulatedUser` interface now correctly exposes `totalCost()` (fix from iteration 1), and `createSimulatedUser` tracks per-call costs internally. However, `runSkillSession` never calls `opts.simulatedUser.totalCost()` to include it in the returned `SkillSessionResult.totalCost`. The session cost tracker (line 520) only adds `message.total_cost_usd` from the Agent SDK result message. Simulated user LLM spend (Anthropic SDK `messages.create()` calls) is still silently excluded from the aggregate cost. Fix: after the `for await` loop completes, add `if (opts.simulatedUser) { costTracker.add(opts.simulatedUser.totalCost()); }` before returning.
File: tools/dogfood/utils.ts:542
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `platformBinaryDir` does not handle non-arm64/non-x64 architectures
`platformBinaryDir()` maps `process.arch` to either `"x64"` or `"arm64"`, defaulting anything that isn't `"x64"` to `"arm64"`. On uncommon architectures (e.g., `"arm"`, `"s390x"`), this silently produces an incorrect path. At Experimental maturity and given this is a test harness, this is low-risk, but a guard clause or warning log would prevent confusing "binary not found" errors.
File: tools/dogfood/utils.ts:26
Resolution: DIRECTLY_ACTIONABLE

## Fixes Verified from Iteration 1

- **Cost tracker exposure (was IMPORTANT)**: Fixed. `SimulatedUser` interface now includes `totalCost(): number` and `createSimulatedUser` implements it via an internal `costTracker`. The interface half is correct; the aggregation half is not yet wired (see IMPORTANT above).
- **`createAskUserHandler` passthrough (was IMPORTANT)**: Fixed. Both `createAskUserHandler` and `composedCanUseTool` in `runSkillSession` now return `{ behavior: "allow" }` without `updatedInput` for non-AskUserQuestion tools. This correctly avoids leaking input identity and makes the passthrough semantics clearer.
- **Hardcoded cost rates (was MINOR)**: Acknowledged via inline comment (lines 408-409). The comment explicitly states the rates are Haiku pricing and will underestimate for other models. Acceptable at Experimental maturity.
- **Flaky LLM assertion (was MINOR)**: Fixed. The specific "Create a new epic" assertion is removed. Test now only asserts the answer is one of the valid option labels.

## Score: 9/10

All four issues from iteration 1 were addressed. Three are fully resolved. One (cost aggregation) is half-fixed: the interface is exposed but `runSkillSession` doesn't call it, which is a straightforward one-line fix.

The architecture is clean and well-layered. The stateless simulated user design (separate Anthropic SDK client for question-answering, separate Agent SDK session for skill execution) is a good separation of concerns. The `canUseTool` composition in `runSkillSession` correctly layers violation detection, simulated user handling, and original handler delegation in the right priority order. The transcript buffer integration for context-passing to the simulated user is effective.

Module boundaries remain appropriate for Experimental maturity. No invariant violations. No conflicts with the epic's target architecture.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
