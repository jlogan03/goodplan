# Software Architecture Review — Test Harness Foundation

## Issues

**[CRITICAL]** Plan uses PreToolUse hooks for AskUserQuestion interception but the mechanism is wrong for this use case

The plan (Phase 2) proposes using `hooks.PreToolUse` with `permissionDecision: 'deny'` to intercept AskUserQuestion and return the simulated user's answer. However, a PreToolUse hook that denies a tool use does not inject a user response — it blocks the tool call entirely and surfaces a reason string. The existing harness scripts use `canUseTool` which returns `{ behavior: 'allow', updatedInput: { questions, answers } }` — this injects the answers directly into the tool input so the skill sees them as user responses.

The plan's overview says "The hook denies the tool use and returns the answer — the skill sees it naturally, as if a real user responded." This is incorrect. A denied tool use is not the same as a tool use that completes with user answers. The skill will see a tool failure, not a user response.

The correct mechanism is to keep using `canUseTool` (which is already proven) and have it call `simulatedUser.ask()` before returning `{ behavior: 'allow', updatedInput: { questions, answers } }`. Alternatively, the `Elicitation` hook event (visible in the SDK types) may be relevant, but this needs verification.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Simulated user session architecture introduces unnecessary complexity and potential hangs

Phase 2 proposes a persistent `query()` session for the simulated user that runs alongside the main skill session, communicating via `AsyncQueue`. This creates two concurrent Agent SDK sessions. Concerns:

1. **Hang risk**: If the simulated user session's `query()` call blocks waiting for input but the main session has already finished, the process won't exit cleanly. The plan's `close()` method needs to handle this, but `query()` sessions don't have a clean abort mechanism beyond `AbortController`.
2. **Overhead**: Each `query()` session spawns a Claude Code subprocess. A persistent simulated user session means two Claude Code processes running for the entire test duration, even though the simulated user is only needed for the ~5-10 seconds it takes to answer each question.
3. **Simpler alternative**: A stateless LLM call per question (using the Anthropic SDK directly, not Agent SDK `query()`) would be far simpler. The simulated user doesn't need tools — it just reads a question + options + transcript context and picks an answer. A single `messages.create()` call with haiku would accomplish this in <1 second with no session management.

If the persistent session is truly needed (e.g., for multi-turn reasoning), the plan should justify why a stateless call per question is insufficient.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `.project/` references in violation detection are stale — plan doesn't address this

The codebase research file notes that `validate.ts` and `harness.ts` still reference `.project/` in violation detection patterns (confirmed: 51 occurrences of `.project/` across the 4 harness files). The plan's `checkViolation()` shared utility description says it "checks Read/Write/Edit/Bash for direct `.goodplan/` state access" — good. But the Phase 4 migration tasks don't explicitly call out updating all `.project/` references to `.goodplan/` in the scripts being migrated. This could result in violation detection silently missing actual violations against the new directory name.

Add an explicit task in Phase 4: "Update all `.project/` references to `.goodplan/` in violation detection patterns and project paths."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `createMinimalFixture` couples test harness to CLI command surface

Phase 3's `createMinimalFixture()` calls `gp init --name <name>`, `gp epic:create`, and `gp slice:create`. This means the test harness for testing skills depends on the CLI working correctly. If a CLI bug breaks `epic:create`, every harness test fails — not because of a skill problem but because of a fixture setup problem.

For the Test Harness subsystem at Experimental maturity, this coupling is acceptable for now. But the plan should acknowledge this dependency and consider a fallback: if CLI setup fails, log a clear message distinguishing "fixture setup failed" from "skill test failed." The current `createMinimalFixture` description says nothing about error handling.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No shared `query()` loop abstraction despite it being the most duplicated pattern

The codebase context identifies the `for await (const message of query(...))` loop with message type switching as duplicated across all 5 scripts (point #9 in the duplication analysis). The plan extracts CLI helpers, logging, violation detection, and cost tracking — but does not extract the query loop itself. Each migrated script in Phase 4 will still have its own query loop boilerplate.

A `runSkillSession()` or similar function that encapsulates the query loop, message dispatch, transcript writing, cost tracking, and result extraction would eliminate the largest remaining duplication. The Phase 4 task for `test-migrate.ts` hints at this ("Replace inline `query()` loop with shared `runSkill()` (or keep inline but use shared utils...)") but leaves it optional. Given this is the core purpose of the refactor, it should be a required shared utility.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase ordering creates a testability gap — Phase 2 can't be verified without Phase 3 fixtures

Phase 2 (Simulated User Session) requires a "minimal fixture" for its integration test (`test-simulated-user.ts`). But `createMinimalFixture()` is defined in Phase 3. The Phase 2 integration test says "Creates a minimal fixture" inline — presumably with ad-hoc setup code rather than the shared helper.

This means Phase 2 introduces fixture creation code that Phase 3 then replaces, creating throwaway work. Consider either: (a) moving `createMinimalFixture()` to Phase 1 as part of the shared utilities, or (b) having Phase 2's test use the same ad-hoc fixture pattern as `test-plugin-skills.ts` (which already creates a temp dir + init in ~10 lines) and explicitly noting it will be migrated in Phase 3.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `writeTranscriptEntry` in Phase 1 has no consumer until Phase 2

Phase 1 defines `writeTranscriptEntry(file, message)` in `utils.ts` and tests it in isolation. But it has no real consumer until Phase 2 adds the simulated user. This is fine for a shared utilities file, but the unit test should verify the JSONL format matches what Phase 2 will consume (i.e., test that the output is valid JSONL with the full `SDKMessage` structure, not just "appends a line").

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `tierDefault` model mapping may not match the epic architecture

The plan maps `"quality"` tier to `claude-opus-4-6`. The epic architecture overview says "Haiku for structural tests, sonnet for quality tests." The plan says "opus for quality." These disagree. Clarify which is correct and ensure the `tierDefault` mapping matches the agreed-upon strategy.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No cleanup strategy for temp directories across test runs

`createMinimalFixture` creates temp directories but the plan doesn't specify cleanup. The existing scripts use `/tmp/gp-*` paths and manually `rmSync` them. The shared utility should either clean up on process exit or use a naming convention that allows batch cleanup (e.g., `/tmp/gp-harness-<timestamp>/`).

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan correctly identifies the duplication problem and proposes a reasonable decomposition into shared utilities. The phased approach (utilities first, then simulated user, then model selection, then migration) is sound in principle. However, the core architectural decision — using PreToolUse hooks to deny AskUserQuestion and inject answers — is mechanically incorrect based on how the SDK API works. The simulated user session design adds substantial complexity (persistent Agent SDK session, async queue, concurrent processes) where a simpler stateless LLM call would suffice. These two issues together mean the most architecturally significant parts of the plan (Phases 2 and 4) would need significant rework.

To reach 9+: Fix the AskUserQuestion interception mechanism (use `canUseTool` with simulated user, not PreToolUse deny). Simplify the simulated user to stateless LLM calls unless persistent sessions are justified. Add a shared `query()` loop abstraction. Address the `.project/` → `.goodplan/` migration gap. Resolve the fixture creation phase ordering.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
