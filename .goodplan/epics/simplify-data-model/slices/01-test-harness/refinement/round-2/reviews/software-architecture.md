# Software Architecture Review — Test Harness Foundation (Round 2)

## Issues

**[IMPORTANT]** `@anthropic-ai/sdk` is not a project dependency — `messages.create()` calls will fail at runtime

The plan specifies that the simulated user makes stateless `messages.create()` calls "via `@anthropic-ai/sdk` (Anthropic SDK directly, not Agent SDK)." However, the project's `package.json` only has `@anthropic-ai/claude-agent-sdk` as a devDependency — `@anthropic-ai/sdk` is not installed and not listed. The `node_modules/@anthropic-ai/` directory contains only `claude-agent-sdk/`, and the agent SDK's `package.json` does not depend on `@anthropic-ai/sdk`.

The plan must either: (a) add `@anthropic-ai/sdk` to `devDependencies` as an explicit task in Phase 2, or (b) use the Anthropic API directly via `fetch()` (more fragile), or (c) find an alternative mechanism that uses only the agent SDK. Option (a) is cleanest — it is a small, well-scoped addition. The task list should call this out explicitly to avoid the implementer discovering it mid-phase.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `runSkillSession` signature conflates `canUseTool` with `options` — callers lose control of the permission callback

Phase 1 defines `runSkillSession(opts: { prompt: string, options: Options, transcriptFile: string, onMessage?: (msg: SDKMessage) => void })`. The `options: Options` parameter includes `canUseTool` as one of its fields. But Phase 2 introduces `createAskUserHandler()` which returns a `CanUseTool` callback, and Phase 4 scripts need to compose this with violation detection (validate.ts) or other per-script logic.

The current signature forces callers to wire up `canUseTool` inside `options` themselves, which means `runSkillSession` does not actually encapsulate the AskUserQuestion handling pattern — callers still assemble the full options object manually. Consider either: (a) accepting `canUseTool` handlers as a separate array/parameter that `runSkillSession` composes (violation detection + simulated user + passthrough), or (b) making `runSkillSession` accept a `simulatedUser` parameter and internally compose the `canUseTool` callback (violation detection built-in, simulated user optional). Option (b) would make the common case trivial: `runSkillSession({ ..., simulatedUser, checkViolations: true })`.

Without this, the "most duplicated pattern" (the query loop) is extracted but the second-most duplicated pattern (canUseTool composition) remains scattered across callers.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 is thin — consider merging into Phase 2 verification

Phase 3 ("Integration Verification") contains a single task: create `test-integration.ts` and verify `GP_CLI_PATH`. The test exercises the same utilities that Phase 2 already tests (`createAskUserHandler` + `simulatedUser.ask()`) plus Phase 1 utilities (`runSkillSession`, `createMinimalFixture`). But Phase 2's `test-simulated-user.ts` already tests `createAskUserHandler` with simulated AskUserQuestion input, and Phase 1's `test-utils.ts` already tests `createMinimalFixture` + `runSkillSession` individually.

The only new thing Phase 3 adds is running them all together in a real skill session. This is valuable but could be the "end-to-end" test at the end of Phase 2 rather than a separate phase. A 4-phase plan with a phase containing one task introduces unnecessary phase boundaries. Merging into Phase 2 (as a final integration task) or into Phase 4 (as a pre-migration smoke test) would reduce overhead without losing coverage.

This is a structural concern, not a blocker — the plan works as-is, but the phase boundary adds ceremony without proportional value for an Experimental subsystem.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `createMinimalFixture` includes `src/index.ts` and `tsconfig.json` — unclear why

The fixture creates a temp directory with `package.json`, `tsconfig.json`, `src/index.ts` (simple export), git init + commit, then `.goodplan/` state via CLI. But the test harness scripts test *skills*, not TypeScript compilation. The existing `test-plugin-skills.ts` fixture is simpler: temp dir + `gp init` + a few files. The `tsconfig.json` and `src/index.ts` add complexity that is only needed if a skill under test reads or compiles source code (e.g., `/gp:onboard-repo` which scans repo structure).

Consider making the TypeScript scaffolding optional (e.g., `createMinimalFixture({ withSource: true })`) so structural tests get a minimal fixture and quality tests get a realistic one. This keeps fixture creation fast for the common case.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `createAskUserHandler` return type is `CanUseTool` but it also handles non-AskUserQuestion tools

The description says: "If no [AskUserQuestion]: returns `{ behavior: 'allow' }` (passthrough)." This means the handler swallows all non-AskUserQuestion tools with a blanket allow. But validate.ts needs violation detection on *all* tool calls (Read/Write/Edit/Bash checking for `.goodplan/` access). If `createAskUserHandler` is used as the sole `canUseTool` callback, violation detection is lost.

This is partially addressed by the round-1 feedback about `canUseTool` composition, but the plan's description of `createAskUserHandler` should explicitly note that callers needing additional tool inspection must compose it with other handlers (or the `runSkillSession` composition discussed above should handle it).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `writeTranscriptEntry` buffered write strategy is unspecified

The plan says "Uses buffered/batched writes (not `appendFileSync` on every message)" but does not specify the buffering strategy. Options include: (a) in-memory buffer flushed on interval or size threshold, (b) write stream with OS-level buffering, (c) batch writes collected per-turn. For an Experimental subsystem this is fine to leave to the implementer, but the unit test should verify the flush behavior (e.g., messages are visible in the file after explicit flush or close, not just after process exit).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 shows substantial improvement. All round-1 CRITICAL issues were addressed correctly: the plan now uses `canUseTool` (not PreToolUse hooks) for AskUserQuestion interception, and the simulated user uses stateless `messages.create()` calls instead of a persistent Agent SDK session. The `.project/` to `.goodplan/` migration gap is explicitly addressed in Phase 4's cross-cutting cleanup task. The `runSkillSession` abstraction is now a required shared utility in Phase 1. The `tierDefault` model mapping now correctly uses sonnet for quality (matching epic architecture). The fixture creation phase ordering is resolved — Phase 2 uses the ad-hoc pattern from `test-plugin-skills.ts` and Phase 1's `createMinimalFixture` handles the full pattern.

To reach 9+: Add `@anthropic-ai/sdk` as an explicit dependency task. Address the `canUseTool` composition gap (either in `runSkillSession`'s interface or as explicit guidance for callers). Consider merging Phase 3 into Phase 2 to reduce unnecessary phase boundaries.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
