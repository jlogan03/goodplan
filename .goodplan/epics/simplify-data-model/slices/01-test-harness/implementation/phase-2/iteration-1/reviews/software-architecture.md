# Software Architecture Review — Phase 2: Simulated User via Stateless LLM Calls

Reviewer: software-architecture
Context: a code implementation
Files: tools/dogfood/utils.ts, tools/dogfood/test-simulated-user.ts, tools/dogfood/test-integration.ts, package.json

## Issues

**[IMPORTANT]** Simulated user's internal cost tracker is silently discarded
The `createSimulatedUser` function creates its own `costTracker` via `createCostTracker()` and calls `costTracker.add(estimatedCost)` on every `ask()` call, but the tracker is never exposed to callers. The `SimulatedUser` interface only has `ask()` — there is no way to retrieve accumulated simulated-user costs. Meanwhile, `runSkillSession` has a separate `costTracker` that only tracks `message.total_cost_usd` from the Agent SDK session. This means the cost of all simulated-user LLM calls (Anthropic SDK `messages.create()`) is silently lost and never included in `SkillSessionResult.totalCost`.
File: tools/dogfood/utils.ts:340
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `createAskUserHandler` passthrough leaks `updatedInput` identity for non-AskUserQuestion tools
When `createAskUserHandler` receives a non-AskUserQuestion tool, it returns `{ behavior: "allow", updatedInput: input }`. However, the original `input` is passed through without being forwarded to `originalCanUseTool` (if one exists). In the composed `canUseTool` in `runSkillSession`, the `askUserHandler` path returns early for `AskUserQuestion`, and non-AskUserQuestion tools fall through to `originalCanUseTool`. This is correct in `runSkillSession`, but the standalone `createAskUserHandler` (exported for "direct use in edge cases" per the plan) silently drops any original `canUseTool` composition. A caller using `createAskUserHandler` directly and expecting it to compose with other handlers would get incorrect behavior. The doc comment says "Exported for direct use in edge cases" — this interface is misleading since it can't compose.
File: tools/dogfood/utils.ts:418
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Hardcoded cost rates in simulated user will silently produce wrong estimates for non-Haiku models
The cost calculation uses hardcoded Haiku rates (`$0.25/MTok input, $1.25/MTok output`) regardless of the `model` parameter. If `tierDefault("quality")` (sonnet) or `tierDefault("e2e")` (opus) is passed, costs will be substantially underestimated. Since the cost tracker is already silently discarded (see first issue), this is low-impact currently, but will compound when the tracker is exposed.
File: tools/dogfood/utils.ts:396
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test assertion couples to LLM behavior — `test-simulated-user.ts` asserts specific option choice
The test asserts `answer === "Create a new epic"` on line ~73 of `test-simulated-user.ts`. While the system prompt is engineered to prefer this answer, LLM behavior is non-deterministic. This assertion will occasionally fail in CI, producing flaky test runs. Better to assert the answer is one of the valid options (which is already checked on the line above) and log the choice for manual inspection.
File: tools/dogfood/test-simulated-user.ts:72
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The architecture is well-structured. The stateless simulated user is a clean design — no session management, no hang risk, clean separation between the Anthropic SDK (stateless LLM calls) and Agent SDK (session management). The composition in `runSkillSession` correctly layers violation detection, simulated user handling, and original canUseTool delegation. The transcript buffer integration for context passing is a nice touch.

What would bring it to 9+: (1) expose the simulated user's cost tracking so callers can account for total LLM spend, (2) add a JSDoc note or remove the export on `createAskUserHandler` to clarify its composition limitations.

Module boundaries are clean — `utils.ts` is a shared utilities module for the test harness (Experimental maturity), and the two test scripts are appropriately thin consumers. The dependency on `@anthropic-ai/sdk` (direct API client) alongside `@anthropic-ai/claude-agent-sdk` (session orchestration) is architecturally sound — they serve different purposes and the separation matches the domain split (stateless question answering vs. session management).

No invariant violations detected. The test harness operates on fixture repos, not this repo's `.goodplan/` state.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
