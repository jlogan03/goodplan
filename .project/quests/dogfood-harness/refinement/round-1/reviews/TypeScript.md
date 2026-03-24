# TypeScript and JavaScript Review — Dogfood Harness Plan

## Issues

**[CRITICAL]** `"result" in message` type narrowing is fragile and the plan perpetuates it
The existing harness code (line 132) uses `"result" in message` to detect successful results. The Agent SDK research file explicitly documents this is fragile: `SDKResultError` lacks a `result` field, so the idiom happens to work, but it relies on an implementation detail rather than the discriminated union. The plan does not address fixing this. Phase 1's "Improve logging" task should include switching to `message.type === "result" && message.subtype === "success"` as documented in the research.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Missing `canUseTool` type safety — plan uses `(input as any)` pattern
The plan's Phase 1 task "Rewrite `runSkill()`" references the `canUseTool` approach from the research, which casts `input as any` to access `questions`. This violates the project's anti-pattern rule against `as any`. The plan should specify importing or defining the `AskUserQuestion` input type from the SDK's type definitions and using proper type narrowing. The SDK exports these types — the plan should call out using them.
Resolution: CODEBASE_EXPLORATION
Research: Check `@anthropic-ai/claude-agent-sdk` exported types for `canUseTool` input parameter typing. Look at `node_modules/@anthropic-ai/claude-agent-sdk/dist/sdk.d.ts` for the `CanUseToolInput` or equivalent type, and the `AskUserQuestion` input shape.

**[IMPORTANT]** `goodplanJson` swallows parse errors and has unsafe return type
`goodplanJson<T>` (line 57-60) does `JSON.parse(result.stdout) as T` without any validation. If the CLI returns non-JSON (error message, empty string on failure), this throws an unstructured `SyntaxError`. With `noUncheckedIndexedAccess` enabled, callers treat the returned `T` as fully typed, but there is no runtime validation. The plan should add either: (a) a check that `result.ok` is true before parsing, or (b) Zod validation of the parsed output. At minimum, wrap in try/catch with a descriptive error. This is called extensively throughout the harness.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `process.env.HOME!` non-null assertion without validation
Line 20 uses `process.env.HOME!` which is a non-null assertion on an indexed access that could be `undefined` (especially with `noUncheckedIndexedAccess`). The plan's Phase 1 should include validating required environment variables at startup (HOME at minimum) with a clear error message, rather than relying on `!`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Error catch block uses unsafe type assertion `as { stdout?: string; ... }`
Line 52 casts the caught error with `as { ... }` instead of using proper type narrowing. This is fragile — if `execFileSync` throws a different error shape, the destructuring silently produces `undefined`. The plan should specify using Bun's / Node's typed `child_process` error types or a type guard.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `logFriction` assumes friction log file exists — no error handling for missing file
Line 74 calls `readFileSync(FRICTION_LOG, "utf-8")` but the plan relocates logs to `harness-logs/` under the quest directory. If `FRICTION_LOG` path doesn't exist (which is likely since the plan moves away from the old slice-based path), this throws. The plan should address creating the friction log if absent, or updating the path.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan does not specify model type for `query()` options
Phase 1 says "Add `model` option defaulting to `claude-haiku-4-5`" but the plan doesn't specify which SDK option field to use. The Agent SDK `query()` options type should be checked to confirm the field name is `model` (it could be `modelId` or similar). The task should be precise about the API.
Resolution: CODEBASE_EXPLORATION
Research: Check `@anthropic-ai/claude-agent-sdk` type definitions for the correct field name to specify model in `query()` options. Look at `QueryOptions` or similar type in the SDK.

**[IMPORTANT]** `message.subtype === "tool_use"` on system messages is incorrect
Line 139 checks `message.subtype === "tool_use"` within the `message.type === "system"` branch. The SDK research documents that system message subtypes are `init`, `status`, `task_started`, `task_progress`, `task_notification`, `api_retry`, etc. Tool use blocks appear in `assistant` messages, not `system` messages. This means `toolCalls` is always 0. The plan's "Improve logging" task should fix this to count tool calls from `assistant` message content blocks.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `const [phase, step] = process.argv.slice(2)` destructuring with `noUncheckedIndexedAccess`
With `noUncheckedIndexedAccess`, array destructuring from `process.argv.slice(2)` gives `string | undefined` for both `phase` and `step`. The existing code handles `!phase` at line 385 but never narrows `step` from `string | undefined`. The switch at line 406 works because `===` handles `undefined`, but it's worth noting this file lives outside `src/` (in `tools/`) and isn't covered by `tsconfig.json`'s `include: ["src/**/*.ts"]`. The plan should note whether Bun's implicit type checking covers `tools/` or if a separate tsconfig is needed.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan specifies `bun test` verification but harness is in `tools/`, not `tests/`
The plan's verification sections say "bun test passes in goodplan" but the harness itself has no unit tests. Since it's a tool (not library code), integration testing by running it is appropriate, but the plan should be explicit that "bun test" verifies no regressions in the main codebase, not that the harness itself has test coverage.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Team default says pnpm for web/JS but project uses Bun — plan should not change this
The project already uses Bun as package manager (established convention). The plan correctly uses Bun throughout. No action needed, just confirming alignment — the team default of pnpm is correctly deferred to the existing Bun convention per team defaults rule 3.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has solid overall structure and the research backing is thorough, but there are significant TypeScript-specific gaps: unsafe type assertions (`as any`, `as { ... }`), a confirmed bug in tool call counting (checking `system` messages for `tool_use` instead of `assistant` messages), fragile result detection using `"result" in message`, and missing runtime validation on `goodplanJson`. These are exactly the patterns the project's CLAUDE.md and tsconfig strictness settings exist to prevent. To reach 9+: fix the `as any`/`as` casts with proper types, fix the tool_use counting bug, switch to discriminated union checking for results, add `goodplanJson` error handling, and validate environment variables at startup.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
