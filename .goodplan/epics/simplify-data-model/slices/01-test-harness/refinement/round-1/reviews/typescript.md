# TypeScript Reviewer — Test Harness Foundation

## Issues

**[CRITICAL] Plan uses PreToolUse hook to intercept AskUserQuestion, but existing code and SDK docs show `canUseTool` is the proven mechanism**

The plan's Phase 2 designs the simulated user around a `PreToolUse` hook that intercepts `AskUserQuestion` and returns `{ behavior: "deny", message: "User responded: <answer>" }`. However:

1. The existing codebase uses `canUseTool` for AskUserQuestion interception — all 4 scripts with this pattern use it successfully.
2. The Agent SDK's `PreToolUse` hook return type uses `{ decision: 'block', hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: '...' } }` — NOT `{ behavior: "deny", message: "..." }`. The plan's Phase 2 Tasks bullet says the hook returns `{ behavior: "deny", message: "..." }` which is `canUseTool`'s return shape, not the hook's.
3. The `canUseTool` callback already supports denying with a message and providing `updatedInput` — which is exactly what the existing auto-first-option code does. Switching to `PreToolUse` hooks adds complexity (matcher patterns, `HookCallbackMatcher` arrays, different return shape) without clear benefit.
4. If the goal is specifically to use the hook's `additionalContext` capability (to inject the user's answer as context rather than denying the tool call), the plan should spell that out and prototype it — the behavior of denying `AskUserQuestion` with a `permissionDecisionReason` may not surface the answer to the LLM the same way the existing `canUseTool` `updatedInput` pattern does.

The plan conflates the two APIs. Either commit to `canUseTool` (proven, simpler) or commit to `PreToolUse` hooks (more capable but unproven for this use case) — and use the correct return types for whichever is chosen.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `SDKUserMessage` requires `session_id`, `parent_tool_use_id`, and `message: MessageParam` fields — plan's AsyncQueue design doesn't address these**

Phase 2 designs an `AsyncQueue<T>` that implements `AsyncIterable<SDKUserMessage>`. But `SDKUserMessage` is a complex type requiring:
- `type: 'user'`
- `message: MessageParam` (from `@anthropic-ai/sdk` — this is the Anthropic API message format with `role` and `content` blocks)
- `parent_tool_use_id: string | null`
- `session_id: string`

The plan says "each pushed message becomes a new user turn" but doesn't address how to construct valid `SDKUserMessage` objects. The `session_id` must match the running session, `parent_tool_use_id` must be null for top-level messages, and `message` must be a properly formatted `MessageParam`. A helper function like `createUserMessage(text: string, sessionId: string): SDKUserMessage` should be specified, or the plan should use `Query.send()` / `Query.streamInput()` instead of the raw `AsyncIterable` prompt approach (both of which are available on the `Query` interface per the research).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `createSimulatedUser` spawns a full Agent SDK `query()` session to answer each question — cost and latency implications are unaddressed**

Each `simulatedUser.ask()` call sends a question to a persistent `query()` session with Read/Grep/Glob tools. For a single harness run that encounters 5-10 AskUserQuestion calls, this means maintaining a parallel LLM session with its own context window, tool access, and per-token cost. The plan specifies haiku for structural tests and opus for quality tests, but doesn't estimate:
- Added cost per harness run (the simulated user session itself costs tokens for every question)
- Latency impact (each AskUserQuestion now blocks on a full LLM round-trip instead of instant auto-response)
- Whether the simulated user session stays within budget when the main session's `maxBudgetUsd` is shared

This is a significant design choice that should at minimum have a cost estimate and a `maxBudgetUsd` cap on the simulated user's session.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `checkViolation` in the plan checks `.goodplan/` but existing code checks `.project/` — the plan should explicitly call out this migration**

The existing `checkViolation` in `validate.ts` and `harness.ts` checks for `.project/` access (lines 48, 64-70 in validate.ts). The codebase context research notes this discrepancy and says "needs updating to `.goodplan/`". The plan's Phase 1 `checkViolation` description says "checks Read/Write/Edit/Bash for direct `.goodplan/` state access" which is correct for the new version, but Phase 4 says "Replace `checkViolation()` with shared version" without noting that this changes what directory is being checked. This should be explicit since it's a behavioral change, not just a refactor.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `verifyEntityStatus` uses `gp <type>:show --<type> <name> --json` — the flag format should be verified against actual CLI**

The plan specifies `verifyEntityStatus` queries `gp <type>:show --<type> <name> --json`. But for epics, the actual CLI command is `gp epic:show --epic <name> --json` — the flag name matches the entity type. For slices it would be `gp slice:show --slice <name> --json`. This format should be verified against the CLI schema (which the plan doesn't reference). If any entity type uses a different flag format (e.g., `--name` instead of `--<type>`), the function will silently fail.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT] `writeTranscriptEntry` appends JSONL synchronously inside the message loop — no error handling or buffering specified**

Phase 1 defines `writeTranscriptEntry(file: string, message: SDKMessage): void` that appends a message to JSONL. Phase 2 says "The main test run calls `writeTranscriptEntry()` for every message yielded by the skill's `query()` stream." Given that `SDKMessage` includes streaming deltas (`SDKPartialAssistantMessage`, `SDKToolProgressMessage`, `SDKRateLimitEvent`, etc.), this will produce enormous transcript files with high-frequency writes. The plan should specify:
- Which message types to include (likely filter out `stream_event` partial messages)
- Whether to use buffered writes (`appendFileSync` on every message in a tight async loop is I/O-heavy)
- Error handling if the write fails mid-session (should not crash the harness)

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `gpForce` auto-retries with `--force` on `CONCURRENT_MODIFICATION` — retry count and backoff unspecified**

The plan says `gpForce(args, opts)` "auto-retries with `--force` on `CONCURRENT_MODIFICATION`" but doesn't specify max retries or delay between attempts. The existing `validate.ts` implementation should be checked for these details and the plan should be explicit.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR] `createMinimalFixture` calls `gp init --name <name>` + `gp epic:create` + `gp slice:create` — these are CLI mutations that may require specific flags**

The plan doesn't specify what flags `gp epic:create` and `gp slice:create` require. These commands likely need `--epic`, `--goal`, `--slice` and similar mandatory flags per INV-004 (every command is stateless — target flags required). The fixture helper needs the complete command invocations specified.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR] Unit tests mock `execFileSync` but conventions say "no filesystem mocks"**

Phase 1 unit tests specify "calls CLI with correct args (mock `execFileSync`)" for `gp`/`gpJson` tests. The project conventions in `.goodplan/conventions.md` say "no filesystem mocks, use temp dirs with real `.goodplan/` structures." `execFileSync` isn't a filesystem mock per se (it's a process mock), but the spirit of the convention is to test against real CLI invocations. Consider using the integration test (`test-utils.ts`) for CLI helper verification instead of mocking, or explicitly note this as an acceptable deviation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `tierDefault` returns model strings — these should be typed as a union, not plain `string`**

`tierDefault(tier: "structural" | "pipeline" | "quality"): string` returns `claude-haiku-4-5` or `claude-opus-4-6`. Given the project's TypeScript strictness (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), the return type should be a string literal union or at least a `ModelId` branded type so downstream code has compile-time guarantees about valid model values.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 4 migration order matters but isn't specified**

Phase 4 lists all 5 scripts to migrate but doesn't specify order. `test-plugin-skills.ts` is the simplest (no canUseTool, no AUTONOMOUS_PROMPT) and should go first as a smoke test of the shared utils. `harness.ts` is the most complex (~600+ lines, model patching, multi-phase lifecycle) and should go last. The plan should specify this ordering to reduce risk.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has a solid vision — extracting shared utilities from 5 duplicated scripts, replacing auto-first-option with contextual LLM answers, and adding model selection are all valuable improvements. However, the critical API confusion between `canUseTool` and `PreToolUse` hooks (using the wrong return types, not committing to one mechanism) undermines the core Phase 2 design. The `SDKUserMessage` construction gap means the AsyncQueue implementation will hit type errors immediately. The cost/latency implications of maintaining a parallel LLM session for simulated user answers are significant and unaddressed. To reach 9+: fix the hook vs canUseTool API choice with correct types, specify SDKUserMessage construction, add cost estimates for simulated user sessions, filter transcript message types, and verify CLI command flag formats.

## Summary
- Critical: 1
- Important: 5
- Minor: 4
