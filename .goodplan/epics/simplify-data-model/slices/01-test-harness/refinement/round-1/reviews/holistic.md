# Holistic Review — Test Harness Foundation

## Issues

**[CRITICAL]** Plan conflates `canUseTool` and `hooks.PreToolUse` APIs throughout

The plan's Overview and Phase 2 describe the AskUserQuestion interception as a "PreToolUse hook" and export `createAskUserQuestionHook(simulatedUser, transcriptFile): PreToolUseHook`. However, the actual mechanism described — returning `{ behavior: "deny", message: "User responded: <answer>" }` — is the `canUseTool` callback signature, not the `hooks.PreToolUse` hook signature. The research file (agent-sdk-api.md, Section 6) clearly documents these are different APIs with different registration, return types, and capabilities.

The plan must pick one mechanism and be consistent:
- If using `canUseTool`: the factory should return a `CanUseTool` callback, not a "PreToolUseHook". The deny return is `{ behavior: "deny", message: "..." }`. Registration is via `options.canUseTool`.
- If using `hooks.PreToolUse`: the deny return is `{ decision: "block", hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "..." } }`. Registration is via `options.hooks.PreToolUse`.

Either works, but the plan currently mixes terminology and return types from both. Since the existing harness already uses `canUseTool` successfully (all 4 scripts), and `canUseTool` is simpler, recommend standardizing on `canUseTool` and renaming the factory accordingly (e.g., `createAskUserHandler` rather than `createAskUserQuestionHook`).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `validate.ts` violation detection still checks `.project/` — plan doesn't address this

The codebase context research file notes that `validate.ts` line 48 checks `filePath.includes(".project/")` and `harness.ts` line 360 does the same. The project has migrated from `.project/` to `.goodplan/`. The plan's Phase 1 exports a shared `checkViolation()` that "checks Read/Write/Edit/Bash for direct `.goodplan/` state access" — but the plan doesn't mention that the migration from `.project/` to `.goodplan/` needs to happen in the shared version. The Phase 4 tasks for `validate.ts` and `harness.ts` say "Replace `checkViolation()` with shared version" but don't call out this path fix.

This should be explicitly noted in the Phase 1 `checkViolation` task description: the shared version must check for `.goodplan/` (not `.project/`), and Phase 4 migration implicitly fixes the stale path references.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 simulated user assumes a skill exists that triggers `AskUserQuestion` in a simple test — unclear which skill or how to trigger it reliably

Phase 2's integration test (`test-simulated-user.ts`) says: "Runs a simple skill (e.g., `/gp:status`) that triggers an AskUserQuestion." But `/gp:status` is a read-only command — it does not ask questions. No skill is guaranteed to trigger `AskUserQuestion` on every invocation in a minimal fixture context. The test needs a deterministic way to trigger an `AskUserQuestion` to validate the simulated user responds contextually.

Options: (a) use a mock skill/prompt that explicitly calls AskUserQuestion, (b) use a skill known to always ask questions in fresh project context (like `/gp:create-epic` or `/gp:explore`), or (c) test the `ask()` method in isolation by directly calling `simulatedUser.ask()` without going through a full skill run, then separately test the `canUseTool`/hook integration with a real skill.

Option (c) is most reliable for a unit-level integration test. The full end-to-end validation can happen when migrated scripts run in Phase 4.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 migration of `harness.ts` is under-specified given its complexity

`harness.ts` is ~600+ lines with 20+ `runSkill()` calls, phase-specific state management, `patchSkillModels()`/`restoreSkillModels()` (file mutation hack), `logFriction()`, `epicStatus()` with archived-directory fallback, and per-phase model overrides. The plan's Phase 4 task for `harness.ts` is a single bullet point with 6 sub-items. Given the research finding that `harness.ts` went through ~12 commits of iterative fixes, this script is the highest-risk migration target.

The plan should:
1. Break `harness.ts` migration into sub-tasks (e.g., replace CLI helpers first, then logging, then AskUserQuestion handler, then model selection, then remove AUTONOMOUS_SYSTEM_PROMPT)
2. Add an explicit verification step after the `harness.ts` migration (run a truncated harness test, not the full multi-hour run)
3. Call out that `patchSkillModels()`/`restoreSkillModels()` removal is a behavioral change — the old approach mutated installed skill files to force haiku; the new approach passes `--model` to the script, but the harness spawns skills via `query()` which takes a `model` option. Verify that the `model` option on `query()` actually overrides the model for sub-agent spawns too (or document that it doesn't and the limitation is accepted).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `gpForce()` auto-retry logic is only in `validate.ts` — plan should specify the retry pattern

Phase 1 lists `gpForce(args, opts): string` that "auto-retries with `--force` on `CONCURRENT_MODIFICATION`." But the plan doesn't specify: how many retries? What delay? What if `--force` also fails? The existing `validate.ts` implementation should be examined and the behavior documented in the task. This is important because `--force` bypasses optimistic locking — silently retrying could mask real bugs.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 3 `createMinimalFixture()` calls `gp epic:create` + `gp slice:create` but these are interactive commands

The `createMinimalFixture` helper is supposed to produce a fixture with `.goodplan/` state including an epic and slice. But `gp epic:create` and `gp slice:create` are interactive commands that require goal text and other inputs. The plan should specify the exact CLI invocation with all required flags (e.g., `gp epic:create --name test-epic --goal "Test goal"` — if such flags exist) or note that `gp init` alone is sufficient for most test scenarios.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** No explicit cleanup/teardown task for temp directories in integration tests

Phase 1's `test-utils.ts` and Phase 2's `test-simulated-user.ts` create temp directories but the plan doesn't mention cleanup. The testing conventions say "use temp dirs with real `.goodplan/` structures" but the plan should specify whether cleanup is automatic (e.g., using `os.tmpdir()` with unique names and letting the OS handle it) or explicit (`rmSync` in a finally block). This is minor but repeated test runs could accumulate disk usage.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `writeTranscriptEntry` is defined in Phase 1 but only used starting Phase 2

The `writeTranscriptEntry(file, message)` function is listed as a Phase 1 utility export, but it depends on `SDKMessage` types and is only used in Phase 2+. Including it in Phase 1 means Phase 1's unit tests must test it in isolation (which is fine), but the function's design might change once Phase 2 reveals what transcript format the simulated user actually needs. Consider moving it to Phase 2 or noting that Phase 2 may refine its signature.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Binary path standardization not explicitly called out as a task

The research identifies 4 different binary paths across scripts (`~/bin/goodplan`, `~/.local/bin/goodplan`, plugin binary path). Phase 1's `gp()` helper uses `GP_CLI_PATH` env var or "defaults to the plugin binary path." But the plan doesn't include a task to set `GP_CLI_PATH` in CI or document which path takes precedence. This is implicitly handled by the shared utility but worth a documentation note.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Expected Behavior "before" check is not falsifiable

The "before" check says: `import { createSimulatedUser } from "./utils"` fails with "createSimulatedUser is not exported." But after Phase 1, `utils.ts` exists — it just doesn't export `createSimulatedUser` yet. The import would fail with a different error message than "not exported" (it would be a named export resolution error). This is a nitpick on the expected error message, but the before/after pattern should be precise.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has strong structural foundations: clear 4-phase ordering, good extraction targets identified from real duplication analysis, and sensible shared utility API design. However, the critical `canUseTool` vs `hooks.PreToolUse` conflation undermines confidence in the core architectural decision (Phase 2). The under-specified `harness.ts` migration (the highest-risk phase) and the untestable integration test design (Phase 2's reliance on a skill that may not trigger AskUserQuestion) are significant gaps. To reach 9+: fix the API conflation with a clear decision, break down the `harness.ts` migration, make the Phase 2 integration test deterministic, and address the `.project/` → `.goodplan/` path fix explicitly.

## Summary
- Critical: 1
- Important: 4
- Minor: 5
