# Software Architecture Review — Test Harness Foundation (Round 3)

## Issues

**[MINOR]** `runSkillSession` return type obscures error handling responsibility

`runSkillSession` returns `Promise<SDKResultMessage>` (which is `SDKResultSuccess | SDKResultError`) and explicitly "does NOT throw on `SDKResultError`." The plan notes callers inspect the result subtype and decide how to handle errors. This is a reasonable design, but the Phase 1 specification does not include a narrowing helper or type guard (e.g., `isSuccess(result): result is SDKResultSuccess`). Without one, every caller must write the discriminant check (`result.subtype === 'success'`) — a shallow repetition that is easy to get wrong (e.g., checking `result.type === 'success'` instead of `result.subtype`). A one-line type guard exported from `utils.ts` would deepen the module at negligible cost.

This is minor because the discriminant is simple and callers are few (5 scripts), but it is worth noting as a deepening opportunity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `gpForce` returns `CliResult` on second failure — no signal to distinguish "retried and failed" from "first attempt failed without retry"

The plan says `gpForce` "returns the failing `CliResult` as-is" if `--force` also fails. The returned `CliResult` has `{ ok: false, stdout, exitCode }` — identical shape whether `--force` was attempted or not. Callers cannot distinguish "failed once, no retry" from "failed twice after retry." This matches the existing `validate.ts` behavior exactly (callers ignore the return value), so it is not a regression, but it is a missed opportunity to surface retry metadata (e.g., `{ ...result, retried: true }`) that would improve diagnostic logging in Phase 3 migrations.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 rollback guidance references `git checkout --` which is a destructive operation

Phase 3 says: "if a migration breaks a script, revert that script to its pre-migration state (`git checkout -- tools/dogfood/<script>.ts`)." This is sound rollback guidance, but the CLAUDE.md rules (from the system prompt) say "consider whether there is a safer alternative" before destructive git operations. `git restore tools/dogfood/<script>.ts` achieves the same effect and is the modern equivalent. This is cosmetic — both commands do the same thing — but aligning the plan's guidance with the harness environment's conventions avoids friction during implementation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All R2 IMPORTANT issues have been addressed correctly and thoroughly:

1. **`@anthropic-ai/sdk` dependency**: Now an explicit task in Phase 2 with the exact install command.
2. **`runSkillSession` canUseTool composition**: Redesigned with `simulatedUser` + `checkViolations` parameters that compose `canUseTool` internally via `createAskUserHandler`. Callers no longer manually wire up permission callbacks. This is a substantial deepening of the module — callers go from assembling 3 concerns (query loop + AskUserQuestion handling + violation detection) to a single call with two boolean/object params.
3. **Phase 3 merger**: Integration verification is now part of Phase 2's verification section. The plan is now 3 phases (foundation, simulated user, migration) — clean and proportional.
4. **`createMinimalFixture` source scaffolding**: Now optional via `withSource?: boolean` (default: false).
5. **`createAskUserHandler` blanket allow**: Explicitly documented as a limitation, with the note that `runSkillSession` owns composition.
6. **`writeTranscriptEntry` buffering**: Specified as flush-on-close with explicit `flushTranscript()` export and unit test coverage.

The plan is implementation-ready. Module boundaries are clean: `utils.ts` is a deep module hiding query loop mechanics, canUseTool composition, transcript buffering, and fixture lifecycle behind a small public API. The `runSkillSession` abstraction correctly centralizes the most duplicated pattern (query loop + message dispatch + cost tracking + transcript writing + violation detection + simulated user) while leaving script-specific logic (prompts, assertions, workflow sequencing) to callers. Dependency direction is correct — utils depends on the Agent SDK and Anthropic SDK; harness scripts depend on utils; no circular dependencies.

The three remaining MINOR issues are all deepening opportunities, not structural problems. The plan is ready for implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
