# Merged Feedback — Test Harness Foundation (Round 2)

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1. `@anthropic-ai/sdk` is not a project dependency — `messages.create()` calls will fail at runtime**
(Flagged by: software-architecture, typescript)

The plan specifies `simulatedUser.ask()` makes `messages.create()` calls via `@anthropic-ai/sdk`, but `package.json` only lists `@anthropic-ai/claude-agent-sdk`. The base SDK is a separate package and is not re-exported by the agent SDK. Add `@anthropic-ai/sdk` to `devDependencies` as an explicit task in Phase 2.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-2. `runSkillSession` does not compose `canUseTool` — violation detection and AskUserQuestion handling remain scattered across callers**
(Flagged by: software-architecture, typescript)

`runSkillSession` accepts `options: Options` which includes `canUseTool`, but callers must manually compose violation detection + AskUserQuestion handling + passthrough. This is the second-most duplicated pattern across harness scripts and partially defeats the deduplication goal. Options: (a) accept `canUseTool` handlers as a separate array that `runSkillSession` composes, or (b) accept `simulatedUser` + `checkViolations: boolean` parameters and compose internally. Option (b) makes the common case trivial.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-3. Phase 3 is thin — single task could be absorbed into Phase 2 or Phase 4**
(Flagged by: holistic, software-architecture)

Phase 3 ("Integration Verification") contains one task. Phase 2 already tests individual utilities, and Phase 4's first migration inherently validates the full stack. Either: (a) justify what Phase 3 catches that Phase 4 would miss, (b) merge into Phase 2 as a final integration task, or (c) accept the ceremony and keep it as a confidence checkpoint.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-4. `runSkillSession` error handling contract unspecified — does it throw on `SDKResultError` or return it?**
(Flagged by: holistic)

`runSkillSession()` returns `Promise<SDKResultMessage>` which is `SDKResultSuccess | SDKResultError`. Existing scripts handle errors differently (validate.ts checks subtype, harness.ts has phase-specific recovery). The shared utility needs an explicit contract: throw on error, or return and let the caller decide?

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-5. `tierDefault("quality")` returns sonnet but existing `validate.ts` uses opus — downgrade risk**
(Flagged by: typescript)

Changing from `claude-opus-4-6` to `claude-sonnet-4-5` for full-workflow validation (2 epics + 2 quests) is a significant behavioral change that could affect test reliability. Options: (a) acknowledge as intentional cost-saving with documented risk, (b) add an `"e2e"` tier defaulting to opus, or (c) keep sonnet but document `--model claude-opus-4-6` for quality-gated runs.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-6. Test file placement does not follow repo convention**
(Flagged by: holistic)

Plan places tests at `tests/unit/dogfood-utils.test.ts` (flat at unit root). All other unit tests use subdirectories (`tests/unit/schemas/`, `tests/unit/state/`, etc.). Should be `tests/unit/dogfood/utils.test.ts` or similar.

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**MIN-1. `createAskUserHandler` blanket-allows non-AskUserQuestion tools — violation detection lost if used as sole `canUseTool`**
(Flagged by: software-architecture, typescript)

Handler returns `{ behavior: 'allow' }` for all non-AskUserQuestion tools. Scripts needing violation detection (validate.ts, harness.ts) must compose handlers. This is addressed by IMP-2 if `runSkillSession` handles composition, but should be documented either way.

Resolution: DIRECTLY_ACTIONABLE (covered by IMP-2 resolution)

---

**MIN-2. `verifyEntityStatus` — contradictory spec (throws vs returns result object)**
(Flagged by: holistic)

Description says "throws on mismatch" but return type is `{ ok: boolean, actual: string }`. Existing pattern returns string, caller compares. Recommend: return result object, let caller decide.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-3. Phase 4 missing rollback guidance for mid-migration failures**
(Flagged by: holistic)

No guidance on what to do if a migration breaks a script. Add: "revert that script to pre-migration state and file an issue."

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-4. `createSimulatedUser` model default should use `tierDefault()` not hardcoded string**
(Flagged by: holistic)

Default model should call `tierDefault("structural")` rather than hardcoding `"claude-haiku-4-5"`.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-5. `harness.ts` LOG_DIR references `.project/` — writing logs into `.goodplan/` would violate state integrity**
(Flagged by: holistic)

LOG_DIR should move to a non-state location (e.g., `tools/dogfood/harness-logs/`) rather than being migrated to `.goodplan/`.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-6. `createMinimalFixture` includes `tsconfig.json` + `src/index.ts` unconditionally — consider making TypeScript scaffolding optional**
(Flagged by: software-architecture)

Only needed if skill under test reads source code. Consider `createMinimalFixture({ withSource: true })` for realistic fixtures.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-7. `writeTranscriptEntry` filtering uses TypeScript type names, not runtime discriminant values**
(Flagged by: typescript)

Plan should specify concrete discriminant checks (e.g., `message.type === 'stream_event'`) rather than type names.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-8. `SimulatedUser.ask()` option type may not match `AskUserQuestionInput` shape**
(Flagged by: typescript)

Plan uses `{label: string, description: string}` but SDK may use `{label: string, value?: string}`. Should reference actual SDK type.

Resolution: RESEARCH_NEEDED

---

**MIN-9. No explicit error type for `createMinimalFixture` failure**
(Flagged by: typescript)

"Distinguishes fixture setup from downstream test failures" is vague. A custom `FixtureSetupError` class or result type would make this concrete.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-10. `writeTranscriptEntry` buffered write strategy unspecified**
(Flagged by: software-architecture)

Plan says "buffered/batched writes" but doesn't specify strategy. Fine for Experimental subsystem but tests should verify flush behavior.

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE (for loop exit)

1. IMP-1: Add `@anthropic-ai/sdk` to devDependencies
2. IMP-2: Compose `canUseTool` inside `runSkillSession` (simulatedUser + checkViolations params)
3. IMP-3: Merge Phase 3 into Phase 2 or justify its existence
4. IMP-4: Specify `runSkillSession` error handling contract
5. IMP-5: Resolve quality tier model downgrade (sonnet vs opus)
6. IMP-6: Move test file to `tests/unit/dogfood/` subdirectory
7. MIN-1: Document canUseTool composition requirement (or resolve via IMP-2)
8. MIN-2: Pick return-object or throw for `verifyEntityStatus`
9. MIN-3: Add rollback guidance to Phase 4
10. MIN-4: Use `tierDefault()` for simulated user default model
11. MIN-5: Move LOG_DIR out of `.goodplan/` state directory
12. MIN-6: Make fixture TypeScript scaffolding optional
13. MIN-7: Specify runtime discriminant values for transcript filtering
14. MIN-9: Define explicit error type for fixture setup failures
15. MIN-10: Specify or defer buffered write strategy

### RESEARCH_NEEDED

1. MIN-8: Verify `AskUserQuestionInput` option shape from SDK types

### Contradictions Resolved

1. **Phase 3 value**: holistic says "accept slight redundancy as confidence checkpoint" vs software-architecture says "merge into Phase 2." Resolved: both agree Phase 3 is thin; the actionable ask is to either justify or merge — left as a choice for the plan author.

2. **`createAskUserHandler` composition gap**: software-architecture proposes `composeCanUseTool(...handlers)` combinator; typescript proposes `onToolUse` observation callback alongside `canUseTool`. Resolved: both point to the same root cause (IMP-2). The specific composition mechanism is an implementation choice — the plan should pick one.

### Unresolved (USER_INPUT required)

None.
