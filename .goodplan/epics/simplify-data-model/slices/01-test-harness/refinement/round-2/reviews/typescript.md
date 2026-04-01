# TypeScript Reviewer — Test Harness Foundation (Round 2)

## Issues

**[IMPORTANT] `@anthropic-ai/sdk` is not in package.json — `createSimulatedUser` depends on it for `messages.create()`**

Phase 2 specifies that `simulatedUser.ask()` makes a `messages.create()` call using `@anthropic-ai/sdk` (the Anthropic SDK, not the Agent SDK). However, `package.json` only lists `@anthropic-ai/claude-agent-sdk` as a devDependency — the base `@anthropic-ai/sdk` package is not present. The plan should include a task to add `@anthropic-ai/sdk` as a devDependency, or clarify whether the Agent SDK re-exports the base SDK's `Anthropic` client (it does not — they are separate packages). Without this, `import Anthropic from "@anthropic-ai/sdk"` will fail at runtime.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `runSkillSession` signature accepts `options: Options` but `canUseTool` is part of `Options` — the relationship between `runSkillSession` and `createAskUserHandler` is ambiguous**

Phase 1 defines `runSkillSession(opts: { prompt: string, options: Options, transcriptFile: string, onMessage?: (msg: SDKMessage) => void })`. Phase 4 says each migrated script should "Replace inline query loop with `runSkillSession()`" and "Replace `canUseTool` auto-first-option with `createAskUserHandler()` + simulated user." Since `canUseTool` is a field on `Options`, the caller would set `options.canUseTool` to the handler returned by `createAskUserHandler()`. This works, but `runSkillSession` itself also needs to wire up transcript writing inside the message loop. The plan should clarify whether `runSkillSession` composes `canUseTool` internally (e.g., wrapping the caller's handler with violation detection) or whether the caller is fully responsible for composing `canUseTool` before passing `options`. The existing `validate.ts` and `harness.ts` both combine AskUserQuestion handling with violation detection in a single `canUseTool` — if `runSkillSession` doesn't compose these, each migrated script will still need custom `canUseTool` composition, partially defeating the deduplication goal.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `tierDefault` returns `claude-sonnet-4-5` for quality tier but existing `validate.ts` uses `claude-opus-4-6` and research notes say "sonnet for quality tests"**

The plan specifies `tierDefault("quality")` returns `claude-sonnet-4-5`, and Phase 4 says validate.ts should use `parseModel(tierDefault("quality"))`. But the existing `validate.ts` uses `claude-opus-4-6` for its full-workflow validation (2 epics + 2 quests). Downgrading from opus to sonnet is a significant behavioral change that could affect test reliability for complex multi-step workflows. The plan should either: (a) acknowledge this as an intentional cost-saving downgrade and note the risk, or (b) add an `"e2e"` tier that defaults to opus for end-to-end workflow tests, or (c) keep `claude-sonnet-4-5` but document that `--model claude-opus-4-6` should be used for quality-gated runs.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `createAskUserHandler` return type is `CanUseTool` but it only handles `AskUserQuestion` — non-AskUserQuestion tools pass through without violation detection**

Phase 2 specifies `createAskUserHandler(simulatedUser: SimulatedUser): CanUseTool` that returns `{ behavior: 'allow' }` for non-AskUserQuestion tools. But `validate.ts` and `harness.ts` also run `checkViolation()` inside `canUseTool` for every tool call (not just AskUserQuestion). If `createAskUserHandler` is the only `canUseTool` callback, violation detection is lost. The plan's Phase 4 migrate step for `validate.ts` says "Keep violation tracking" but doesn't explain where `checkViolation` calls go if `canUseTool` is replaced by `createAskUserHandler`. Consider either: (a) a `composeCanUseTool(...handlers)` combinator, or (b) having `runSkillSession` accept an `onToolUse` callback alongside `canUseTool` for observation-only hooks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `SimulatedUser.ask()` option type `Array<{label: string, description: string}>` doesn't match `AskUserQuestionInput` option shape**

The existing `AskUserQuestionInput` question options have the shape `{ label: string, value?: string, ... }` (from `@anthropic-ai/claude-agent-sdk/sdk-tools`). The plan specifies `options: Array<{label: string, description: string}>` for `SimulatedUser.ask()`. If the actual SDK type uses a different field name than `description` (e.g., `value` or `detail`), the mapping in `createAskUserHandler` will silently drop context. The plan should reference the actual `AskUserQuestionInput` type or use `Pick` from the SDK type to keep the interface aligned.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR] `writeTranscriptEntry` filtering logic lists `SDKRateLimitEvent` but this type name should be verified against the SDK union**

Phase 1 specifies filtering out `stream_event`, `SDKPartialAssistantMessage`, `SDKToolProgressMessage`, and `SDKRateLimitEvent`. These are TypeScript type names from the `SDKMessage` union, but the filtering logic would need to match on runtime `type`/`subtype` discriminants, not type names. The plan should specify the concrete discriminant values to filter (e.g., `message.type === 'stream_event'` for partials). The research file shows `SDKPartialAssistantMessage` has `type: 'stream_event'`, but `SDKToolProgressMessage` and `SDKRateLimitEvent` may use different discriminants. Specify the actual runtime checks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] No explicit error type for `createMinimalFixture` failure — "distinguishes fixture setup failed from downstream test failures" is vague**

Phase 1 says `createMinimalFixture` "includes error handling that distinguishes 'fixture setup failed' from downstream test failures" but doesn't specify how. A custom error class (e.g., `FixtureSetupError`) or a result type would make this concrete and let callers use `instanceof` or discriminated union narrowing.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 7/10

Round 2 is a substantial improvement over round 1. The critical API confusion (PreToolUse vs canUseTool) is fully resolved — the plan now consistently uses `canUseTool` with correct return shapes. The simulated user redesign from persistent Agent SDK session to stateless `messages.create()` is sound and eliminates the cost/latency/hang concerns. The `SDKUserMessage` / AsyncQueue issue is gone since the plan no longer uses async iterable prompts. Transcript filtering, CLI flag formats, retry behavior, and migration ordering are all now specified. To reach 9+: add `@anthropic-ai/sdk` as a dependency, clarify how `runSkillSession` composes with violation detection, resolve the quality tier model downgrade, and specify the `writeTranscriptEntry` runtime discriminant values.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
