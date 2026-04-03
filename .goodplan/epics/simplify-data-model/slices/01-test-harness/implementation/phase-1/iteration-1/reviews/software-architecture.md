# Software Architecture Review — Phase 1: Shared Utilities Foundation

## Issues

**[IMPORTANT]** Module-level mutable state in transcript buffering makes testing unreliable and couples concurrent callers

The `transcriptBuffers` Map and `exitHandlerRegistered` boolean are module-level singletons (lines 207-208 of `utils.ts`). This means:
1. Tests that call `writeTranscriptEntry` / `flushTranscript` share state across test cases — the Map persists between `describe` blocks in the same Vitest process.
2. Multiple concurrent `runSkillSession` calls writing to different transcript files share the same exit handler, which is fine, but the buffer accumulates entries that won't be flushed if `flushTranscript` isn't called (e.g., on early abort).
3. The exit handler registers `process.on("exit")` once and never cleans up, which is acceptable for CLI scripts but problematic for test isolation.

This is an Experimental subsystem so it's acceptable to ship and improve later, but the singleton pattern will cause subtle test pollution if unit tests grow. Consider exposing a `resetTranscriptState()` for test cleanup, or restructuring so transcript state is owned by `runSkillSession` (passed as a local closure rather than module global).

File: tools/dogfood/utils.ts:207
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `createAskUserHandler` is re-instantiated on every tool call inside `runSkillSession`

In `runSkillSession` (line 348-349), the composed `canUseTool` creates a new handler via `createAskUserHandler(opts.simulatedUser)` on every `AskUserQuestion` tool call. The handler itself is stateless so this is functionally correct, but it's wasteful and obscures intent. The handler should be created once outside the loop and reused.

File: tools/dogfood/utils.ts:348
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `runSkillSession` cost tracker is created but its accumulated total is never exposed to callers

`runSkillSession` creates a `costTracker` (line 335) and accumulates costs (line 375), but the return type is `SDKResultMessage` which only contains the final message's cost. The accumulated cost is lost. Callers who run multi-turn sessions will only see the last result's cost, not the total. Either return the cost tracker's total alongside the result, or remove the tracker to avoid misleading internal state.

File: tools/dogfood/utils.ts:335
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Hardcoded plugin binary path as fallback is brittle

`DEFAULT_GP_BIN` falls back to a hardcoded path containing a specific version (`1.0.2`) and architecture (`macos-arm64`). This will break silently on version upgrades or on different architectures (Intel Mac, Linux CI). The existing scripts had similar hardcoding — this is inherited tech debt, not new — but the consolidation is a good moment to add a more robust fallback (e.g., `which gp` or scanning the plugin cache directory).

File: tools/dogfood/utils.ts:26
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `createMinimalFixture` uses `DEFAULT_GP_BIN` directly for `epic:create` and `slice:create` instead of the `gp()` helper

Lines 479 and 500 call `execFileSync(DEFAULT_GP_BIN, ...)` directly rather than using the `gp()` helper. This bypasses the `gpBin` option that callers might pass, creating an inconsistency: `gp init` respects custom binary paths but `epic:create` and `slice:create` do not. The reason (stdin support) is valid — `gp()` passes `input: ""` which may conflict — but the fix is to add `input` to the `gp()` opts interface rather than bypassing it.

File: tools/dogfood/utils.ts:479
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `checkViolation` drops the `.project/` legacy path detection from validate.ts

The existing `validate.ts` checks `.project/` paths (line 48 of validate.ts). The new `checkViolation` only checks `.goodplan/`. The test in `utils.test.ts` explicitly asserts `.project/` is NOT matched (line 166-169), so this is intentional. However, `validate.ts` runs against the flashcards project which may still have `.project/` state if it hasn't been migrated. When Phase 4 migrates `validate.ts` to use utils, this could silently stop detecting violations in an unmigrated project. This is a later-phase concern, not a Phase 1 blocker — flagging for awareness.

File: tools/dogfood/utils.ts:155
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `verifyEntityStatus` uses `--${type}` flag pattern that may not match all CLI commands

The function constructs `[`${type}:show`, `--${type}`, name, "--json"]`. This assumes every entity show command uses `--epic`, `--slice`, `--quest` as the name flag. This appears correct per the current CLI, but the pattern is implicit and would break silently if the CLI changed a flag name. Low risk given Experimental maturity.

File: tools/dogfood/utils.ts:132
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Good extraction of duplicated patterns into a cohesive utility module. The module boundaries are well-drawn — CLI helpers, violation detection, transcript management, session runner, and fixture creation each have clear responsibilities. The `SimulatedUser` interface is a clean abstraction point for the LLM-simulated responses planned in later phases.

To reach 9+: (1) Fix the cost tracker leak in `runSkillSession` — either expose it or remove it. (2) Add `input` to the `gp()` helper opts to eliminate the `execFileSync` bypass in `createMinimalFixture`. (3) Hoist the `createAskUserHandler` call outside the per-tool-call path. These are all small, directly actionable changes.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
