# Merged Feedback — Test Harness Foundation (Round 1)

Reviewers: holistic (6/10), software-architecture (5/10), typescript (5/10)

---

### CRITICAL Issues

**C1. Plan conflates `canUseTool` and `PreToolUse` hook APIs — must commit to one mechanism with correct types**
[holistic, software-architecture, typescript — all three flagged this]

The plan's Phase 2 describes AskUserQuestion interception as a "PreToolUse hook" returning `{ behavior: "deny", message: "..." }`. This mixes two distinct APIs:
- `canUseTool`: returns `{ behavior: 'allow', updatedInput: { questions, answers } }` or `{ behavior: 'deny', message: '...' }`. Registered via `options.canUseTool`.
- `hooks.PreToolUse`: returns `{ decision: 'block', hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: '...' } }`. Registered via `options.hooks.PreToolUse`.

The existing harness scripts all use `canUseTool` successfully. A PreToolUse deny blocks the tool entirely — it does NOT inject answers. The `canUseTool` `updatedInput` pattern is the correct mechanism for injecting simulated user answers.

**Resolution: DIRECTLY_ACTIONABLE** — Standardize on `canUseTool`. Rename factory to `createAskUserHandler` (not `...Hook`). Use `{ behavior: 'allow', updatedInput: { questions, answers } }` return shape. Update all Phase 2 descriptions, type signatures, and task text.

---

**C2. Simulated user persistent `query()` session adds unnecessary complexity — stateless LLM call is simpler and cheaper**
[software-architecture]

Phase 2 proposes a persistent Agent SDK `query()` session with `AsyncQueue` for the simulated user. Issues:
1. **Hang risk**: If the main session finishes before the simulated user session, the process won't exit cleanly. `query()` sessions don't have a clean abort beyond `AbortController`.
2. **Overhead**: Two concurrent Claude Code subprocesses running for entire test duration, even though the simulated user is only needed for ~5-10 seconds per question.
3. **Cost**: Persistent session maintains its own context window, tool access, per-token cost — unestimated.
4. **Simpler alternative**: A stateless `messages.create()` call per question (Anthropic SDK directly, not Agent SDK) using haiku would answer in <1 second with no session management.

The simulated user doesn't need tools — it reads a question + options + transcript context and picks an answer.

**Resolution: DIRECTLY_ACTIONABLE** — Replace persistent `query()` session with stateless `messages.create()` calls using `@anthropic-ai/sdk`. Remove `AsyncQueue`, `SDKUserMessage` construction, and session management. Add `maxBudgetUsd` or per-question cost cap.

---

### IMPORTANT Issues

**I1. `.project/` references in violation detection are stale — plan doesn't address migration to `.goodplan/`**
[holistic, software-architecture, typescript — all three flagged this]

`validate.ts` line 48 and `harness.ts` line 360 check `filePath.includes(".project/")`. The plan's Phase 1 `checkViolation()` correctly checks `.goodplan/` but Phase 4 "Replace `checkViolation()` with shared version" doesn't call out that this is a behavioral change fixing stale path references.

**Resolution: DIRECTLY_ACTIONABLE** — Add explicit note to Phase 1 `checkViolation` task: "checks `.goodplan/` (not `.project/`), fixing stale path from pre-migration." Add Phase 4 task: "Verify all `.project/` references updated to `.goodplan/`."

---

**I2. Phase 2 integration test has no reliable way to trigger `AskUserQuestion`**
[holistic]

`test-simulated-user.ts` says "Runs a simple skill (e.g., `/gp:status`) that triggers an AskUserQuestion." But `/gp:status` is read-only and never asks questions. No skill is guaranteed to trigger `AskUserQuestion` in a minimal fixture context.

**Resolution: DIRECTLY_ACTIONABLE** — Test `simulatedUser.ask()` in isolation (unit test) by directly calling with a mock question. Test the `canUseTool` integration separately with a skill known to always ask questions in fresh context (e.g., `/gp:create-epic` or `/gp:explore`), or defer full end-to-end to Phase 4 migrated scripts.

---

**I3. Phase 4 `harness.ts` migration is under-specified given its ~600+ line complexity**
[holistic]

`harness.ts` has 20+ `runSkill()` calls, phase-specific state management, `patchSkillModels()`/`restoreSkillModels()` file mutation hack, `logFriction()`, `epicStatus()` with archived-directory fallback, and per-phase model overrides. The plan's Phase 4 task is a single bullet with 6 sub-items. This script went through ~12 commits of iterative fixes.

**Resolution: DIRECTLY_ACTIONABLE** — Break into sub-tasks: (1) replace CLI helpers, (2) replace logging, (3) replace AskUserQuestion handler, (4) replace model selection + remove `patchSkillModels`/`restoreSkillModels`, (5) remove `AUTONOMOUS_SYSTEM_PROMPT`. Add truncated harness verification step. Note that `patchSkillModels` removal is a behavioral change — verify `query()` `model` option overrides model for sub-agent spawns.

---

**I4. No shared `query()` loop abstraction despite it being the most duplicated pattern**
[software-architecture]

The `for await (const message of query(...))` loop with message type switching is duplicated across all 5 scripts. The plan extracts CLI helpers, logging, violation detection, and cost tracking — but not the query loop itself. Phase 4 hints at this but leaves it optional.

**Resolution: DIRECTLY_ACTIONABLE** — Add `runSkillSession()` (or similar) shared utility that encapsulates the query loop, message dispatch, transcript writing, cost tracking, and result extraction. Make it a required Phase 1 or Phase 3 deliverable rather than optional Phase 4.

---

**I5. Phase ordering creates testability gap — Phase 2 needs fixtures defined in Phase 3**
[software-architecture]

Phase 2's `test-simulated-user.ts` requires a minimal fixture, but `createMinimalFixture()` is Phase 3. Phase 2 would need ad-hoc fixture setup code that Phase 3 then replaces.

**Resolution: DIRECTLY_ACTIONABLE** — Either move `createMinimalFixture()` to Phase 1 shared utils, or have Phase 2 use the same ad-hoc fixture pattern as existing `test-plugin-skills.ts` (~10 lines: temp dir + `gp init`) with explicit note that Phase 3 will migrate it.

---

**I6. `SDKUserMessage` construction requirements not addressed in AsyncQueue design**
[typescript]

NOTE: This issue is largely resolved by C2 (replacing persistent session with stateless calls). If stateless `messages.create()` is adopted, `SDKUserMessage` and `AsyncQueue` are no longer needed. Retain only if persistent session approach is kept.

---

**I7. `writeTranscriptEntry` writes synchronously for every message including streaming deltas — needs filtering and error handling**
[typescript]

`SDKMessage` includes streaming deltas (`SDKPartialAssistantMessage`, `SDKToolProgressMessage`, `SDKRateLimitEvent`, etc.), producing enormous transcripts with high-frequency writes.

**Resolution: DIRECTLY_ACTIONABLE** — Specify which message types to include (filter out `stream_event` partial messages). Use buffered writes (not `appendFileSync` on every message). Add error handling so write failures don't crash the harness.

---

**I8. `createMinimalFixture` couples test harness to CLI command surface with no error handling**
[software-architecture, typescript]

`gp epic:create` and `gp slice:create` are interactive commands; required flags not specified. If CLI bug breaks fixture setup, every test fails with unclear errors.

**Resolution: DIRECTLY_ACTIONABLE** — Specify exact CLI invocations with all required flags (verify against CLI schema). Add error handling that distinguishes "fixture setup failed" from "skill test failed."

---

### MINOR Issues

**M1. `gpForce()` retry count, delay, and failure behavior unspecified**
[holistic, typescript]

Plan says "auto-retries with `--force` on `CONCURRENT_MODIFICATION`" but no max retries, delay, or behavior if `--force` also fails. `--force` bypasses optimistic locking — silent retries could mask bugs.

**Resolution: CODEBASE_EXPLORATION** — Check existing `validate.ts` implementation for retry details and document the behavior.

---

**M2. `createMinimalFixture` CLI commands may need specific flags per INV-004**
[holistic, typescript]

`gp epic:create` and `gp slice:create` likely need `--epic`, `--goal`, `--slice` flags. Plan doesn't specify complete invocations.

**Resolution: CODEBASE_EXPLORATION** — Verify required flags against CLI command schema.

---

**M3. No cleanup/teardown for temp directories in integration tests**
[holistic, software-architecture]

Existing scripts use `/tmp/gp-*` paths with manual `rmSync`. Shared utility should either clean up on process exit or use naming convention for batch cleanup.

**Resolution: DIRECTLY_ACTIONABLE** — Add cleanup in `finally` block or document OS-managed cleanup approach.

---

**M4. `writeTranscriptEntry` defined in Phase 1 but unused until Phase 2 — signature may change**
[holistic, software-architecture]

Fine for shared utils file, but unit test should verify JSONL format matches Phase 2 consumer expectations. Consider moving to Phase 2 or noting Phase 2 may refine signature.

**Resolution: DIRECTLY_ACTIONABLE** — Note in Phase 1 that signature may be refined in Phase 2; unit test should verify valid JSONL with full `SDKMessage` structure.

---

**M5. Binary path standardization not documented**
[holistic]

4 different binary paths across scripts. Phase 1's `gp()` helper uses `GP_CLI_PATH` env var but precedence rules and CI setup not documented.

**Resolution: DIRECTLY_ACTIONABLE** — Add documentation note on `GP_CLI_PATH` precedence.

---

**M6. Phase 2 "before" check error message is imprecise**
[holistic]

Import failure error message would be a named export resolution error, not "createSimulatedUser is not exported."

**Resolution: DIRECTLY_ACTIONABLE** — Fix the expected error description.

---

**M7. Unit tests mock `execFileSync` but conventions say "no filesystem mocks"**
[typescript]

`execFileSync` is a process mock not filesystem mock, but the spirit of the convention favors real invocations. Integration test may be more appropriate.

**Resolution: DIRECTLY_ACTIONABLE** — Either use integration test for CLI helper verification or note as acceptable deviation from convention.

---

**M8. `tierDefault` returns plain `string` — should be typed as string literal union**
[typescript]

Given project's TypeScript strictness, return type should be `"claude-haiku-4-5" | "claude-opus-4-6"` or a branded `ModelId` type.

**Resolution: DIRECTLY_ACTIONABLE** — Use string literal union return type.

---

**M9. `tierDefault` model mapping may not match epic architecture**
[software-architecture]

Plan maps "quality" to `claude-opus-4-6`. Epic architecture says "sonnet for quality tests." These disagree.

**Resolution: DIRECTLY_ACTIONABLE** — Clarify correct model for quality tier and ensure consistency with epic architecture.

---

**M10. Phase 4 migration order not specified**
[typescript]

`test-plugin-skills.ts` (simplest) should go first; `harness.ts` (most complex) should go last.

**Resolution: DIRECTLY_ACTIONABLE** — Specify migration order: test-plugin-skills → test-onboard → test-migrate → validate → harness.

---

### DIRECTLY_ACTIONABLE (for loop exit)

1. **C1**: Replace all `PreToolUse` hook references with `canUseTool` in Phase 2. Rename `createAskUserQuestionHook` → `createAskUserHandler`. Change return type to `{ behavior: 'allow', updatedInput: { questions, answers } }`. Update Overview, Phase 2 description, Tasks, and type signatures.

2. **C2**: Replace persistent `query()` session design with stateless `messages.create()` calls using `@anthropic-ai/sdk` directly. Remove `AsyncQueue<SDKUserMessage>`, session management, `close()` method. The `ask(question, options, transcript)` method makes a single `messages.create()` call with haiku, returns chosen answer. Add `maxBudgetUsd` or per-question cost note.

3. **I1**: Phase 1 `checkViolation` task description: add "checks `.goodplan/` (not `.project/`), fixing stale path references from pre-migration code." Phase 4: add explicit sub-task "Update all remaining `.project/` references to `.goodplan/`."

4. **I2**: Phase 2 integration test: test `simulatedUser.ask()` directly with a mock question (unit-level). Defer full AskUserQuestion-triggering skill test to Phase 4. Remove reference to `/gp:status` triggering questions.

5. **I3**: Break Phase 4 `harness.ts` into 5 sub-tasks (CLI helpers → logging → AskUserQuestion handler → model selection/remove patchSkillModels → remove AUTONOMOUS_SYSTEM_PROMPT). Add truncated verification step. Note behavioral change from `patchSkillModels` removal.

6. **I4**: Add `runSkillSession()` to Phase 1 or Phase 3 as a required shared utility encapsulating the query loop, message dispatch, transcript, cost tracking.

7. **I5**: Move `createMinimalFixture()` to Phase 1 OR note Phase 2 uses ad-hoc fixture pattern from existing `test-plugin-skills.ts`.

8. **I7**: Add message type filter to `writeTranscriptEntry` (exclude streaming deltas). Use buffered writes. Add try/catch so write failures don't crash harness.

9. **I8**: Specify exact CLI flag invocations for `createMinimalFixture`. Add error handling distinguishing fixture failure from test failure.

10. **M3**: Add `finally { rmSync(tmpDir, { recursive: true, force: true }) }` pattern or equivalent.

11. **M8**: Change `tierDefault` return type to `"claude-haiku-4-5" | "claude-opus-4-6"` (or include sonnet per M9 resolution).

12. **M9**: Resolve quality tier model: opus (plan) vs sonnet (epic architecture). Update `tierDefault` mapping to match.

13. **M10**: Specify Phase 4 migration order: test-plugin-skills → test-onboard → test-migrate → validate → harness.

---

### RESEARCH_NEEDED

1. **`gpForce()` retry behavior** (M1) — Check existing `validate.ts` implementation for retry count, delay, and failure handling. Tool strategy: Read `tools/dogfood/validate.ts`, search for `--force` and `CONCURRENT_MODIFICATION` patterns.

2. **`createMinimalFixture` CLI flags** (M2) — Verify required flags for `gp epic:create` and `gp slice:create`. Tool strategy: Run `gp epic:create --help` and `gp slice:create --help`, or read CLI command definitions in `src/`.

3. **`verifyEntityStatus` CLI flag format** (I5/typescript) — Verify `gp <type>:show --<type> <name> --json` format against actual CLI schema. Tool strategy: Run `gp epic:show --help`, `gp slice:show --help`.

---

### Contradictions Resolved

1. **Quality tier model (M9)**: software-architecture says epic architecture specifies "sonnet for quality tests" while the plan says "opus for quality." **Trusted: software-architecture** as the domain specialist on architectural alignment. The plan should align with the epic architecture document. If opus is intentionally different from the epic architecture, this should be explicitly noted as a deviation.

2. **Simulated user complexity (C2)**: holistic suggests option (c) — unit-test `ask()` in isolation — which partially aligns with software-architecture's "stateless LLM call" recommendation. **Trusted: software-architecture** for the full recommendation (stateless calls over persistent sessions) as it addresses the root architectural concern. Holistic's suggestion is complementary for testing strategy.

---

### Unresolved (USER_INPUT required)

None — all issues are resolvable without user input. The quality tier model question (M9) has a clear path: check the epic architecture document and align.
