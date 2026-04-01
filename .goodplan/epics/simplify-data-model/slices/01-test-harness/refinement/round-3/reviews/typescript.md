# TypeScript Reviewer -- Test Harness Foundation (Round 3)

## Issues

**[MINOR] `writeTranscriptEntry` filtering spec still mixes type names with runtime checks**

The plan specifies filtering via "skip messages where `message.type !== 'stream_event'` is false (i.e., skip `stream_event` type), plus `SDKPartialAssistantMessage`, `SDKToolProgressMessage`, `SDKRateLimitEvent`." The first check (`message.type === 'stream_event'`) is a correct runtime discriminant. But `SDKToolProgressMessage` and `SDKRateLimitEvent` are listed as TypeScript type names without specifying their runtime `type`/`subtype` discriminant values. The research file (agent-sdk-api.md) lists the full `SDKMessage` union but does not document the `type` field for every variant. In practice, `SDKPartialAssistantMessage` already has `type: 'stream_event'` and would be caught by the first check. If `SDKToolProgressMessage` and `SDKRateLimitEvent` also use `type: 'stream_event'` or similar, the single `stream_event` check may be sufficient and the extra names are just documentation. If they use different discriminants, the implementer will need to check the SDK types at implementation time. This is low-risk since the unit test for `writeTranscriptEntry` will catch any missed filtering, and the Experimental maturity level makes this acceptable as an implementation detail.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `gpForce` return type `CliResult` is referenced but not defined in the plan**

Phase 1 specifies `gpForce(args: string[], opts?): CliResult` but does not define `CliResult`. The `gp()` function returns `{ stdout: string, exitCode: number }` which is presumably the same shape. The plan should either (a) name the shared return type `CliResult` and define it alongside `gp()`, or (b) use the inline type `{ stdout: string, exitCode: number }` consistently. This is minor since the implementer can trivially infer the shape from context, but explicit type definitions prevent drift between `gp()` and `gpForce()`.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

All IMPORTANT and MINOR issues from R2 have been thoroughly addressed. The plan is implementation-ready from a TypeScript perspective. Type safety is well-handled: `noUncheckedIndexedAccess` implications are addressed (the existing `?.label ?? "Proceed"` pattern is documented), `verbatimModuleSyntax` is respected (the plan uses `import type` for type-only imports like `AskUserQuestionInput`), and `exactOptionalPropertyTypes` is accommodated (the `withSource?: boolean` default is explicit). The `@anthropic-ai/sdk` dependency gap is now an explicit installation task. The `runSkillSession` composition model (accepting `simulatedUser` + `checkViolations` rather than raw `canUseTool`) is clean and type-safe. The `FixtureSetupError` custom error class enables proper `instanceof` narrowing. The two remaining minors are documentation clarity issues that will not block implementation. To reach 10: define `CliResult` as a named type and resolve the transcript filtering discriminant ambiguity.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
