# Plan: Test Harness Foundation

## Overview

Upgrade the Agent SDK test harness at `tools/dogfood/` to support the new consolidated skill model. The harness currently auto-selects the first option for every AskUserQuestion and hardcodes models per-file. This plan introduces four capabilities: shared utilities (extracted from duplicated code across 5 harness scripts), a stateless simulated-user that answers skill questions like a real user would (using `canUseTool` + `messages.create()` + raw transcript file), configurable model selection with tier-based defaults, and minimal fixture creation with real source code.

Key architectural decisions:
- **Simulated user via `canUseTool`**: AskUserQuestion is intercepted by the `canUseTool` callback (already proven in existing harness code). When an AskUserQuestion is detected, a stateless `messages.create()` call (via `@anthropic-ai/sdk`) sends the question + options + transcript context to a lightweight model, which returns the chosen answer. The callback returns `{ behavior: 'allow', updatedInput: { questions, answers } }` to inject the answer naturally.
- **Raw stream transcript**: all session messages (agent output, tool calls, sub-agent notifications) are written to a JSONL file in real-time, filtered to exclude streaming deltas (`stream_event`, `SDKPartialAssistantMessage`, `SDKToolProgressMessage`, `SDKRateLimitEvent`). Uses buffered writes with error handling so write failures don't crash the harness.
- **No autonomous suppression**: skills run exactly as they would with a real user. The `AUTONOMOUS_SYSTEM_PROMPT` that told agents "no AskUserQuestion" is removed — let skills ask questions naturally.
- **Shared query loop**: a `runSkillSession()` utility encapsulates the `for await (const message of query(...))` loop, message dispatch, transcript writing, cost tracking, and result extraction — eliminating the most duplicated pattern across all 5 scripts.

## Phase 1: Shared Utilities Foundation

Extract duplicated patterns from the 5 existing harness scripts into `tools/dogfood/utils.ts`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `import { createLogger } from "./utils"` in any harness file — fails with "Cannot find module"
- [ ] No `tools/dogfood/utils.ts` file exists

**After implementation** (should pass / show presence):
- [ ] `bun run tools/dogfood/utils.ts` — file parses without errors
- [ ] `bun test tests/unit/dogfood/utils.test.ts` — all unit tests pass
- [ ] A small integration script (`tools/dogfood/test-utils.ts`) imports all exports from `utils.ts`, calls `createLogger()`, `gp()`, `gpJson()`, `verifyEntityStatus()`, `checkViolation()`, `createCostTracker()`, `createMinimalFixture()`, `parseModel()`, `tierDefault()` against a temp fixture — all succeed

### Tasks

- [ ] Create `tools/dogfood/utils.ts` with the following exports:
  - `createLogger(logFile: string)` — returns `{ log(msg: string): void }` that writes to both file and console. Extracted from the inline `log()` pattern in all 5 harness scripts.
  - `gp(args: string[], opts?: { cwd?: string, gpBin?: string }): { stdout: string, exitCode: number }` — CLI helper wrapping `execFileSync`. Uses `GP_CLI_PATH` env var or defaults to the plugin binary path. Extracted from `goodplan()`/`gp()` in harness.ts and validate.ts.
  - `gpJson<T>(args: string[], opts?): T` — typed JSON-parsing wrapper. Throws with exit code description on failure. Extracted from `goodplanJson()`/`gpJson()`.
  - `CliResult` — named exported type: `{ stdout: string, exitCode: number }`. Defined alongside `gp()` to prevent shape drift between functions.
  - `gpForce(args: string[], opts?): CliResult & { retried: boolean }` — exactly 1 retry with `--force` appended on `CONCURRENT_MODIFICATION` (no delay). If `--force` also fails, returns the failing result as-is with `retried: true`. `retried: false` on first-attempt success. Callers can use `retried` to improve diagnostic logging. Extracted from validate.ts.
  - `verifyEntityStatus(type: "epic" | "slice" | "quest", name: string, expected: string, opts?): { ok: boolean, actual: string }` — queries `gp <type>:show --<type> <name> --json`, compares `.status` to expected. Returns `{ ok: false, actual }` on mismatch — does NOT throw. Caller decides whether to throw, log, or continue.
  - `checkViolation(toolName: string, input: unknown, violations: string[]): void` — checks Read/Write/Edit/Bash for direct `.goodplan/` state access (`.json`, `.jsonl` files). Checks `.goodplan/` (not `.project/`), fixing stale path references from pre-migration code in harness.ts and validate.ts. Appends to violations array.
  - `createCostTracker(): { add(cost: number): void, total(): number }` — simple accumulator.
  - `writeTranscriptEntry(file: string, message: SDKMessage): void` — append a message to the JSONL transcript file. Filters out streaming deltas using an inclusion-based approach: only write messages with `type` in `['assistant', 'user', 'result', 'system']`, excluding everything else (streaming deltas, partial messages, rate-limit events, etc.). This is more future-proof than an exclusion list since the SDK's `SDKMessage` union can grow. Note: review this filter list on each Agent SDK upgrade. Uses buffered writes with flush-on-close (buffer accumulates entries and flushes to disk when `flushTranscript(file)` is called or on process exit via `process.on('exit', ...)`). Wraps in try/catch so write failures log a warning but don't crash the harness. Signature may be refined in Phase 2; unit test should verify valid JSONL with full `SDKMessage` structure.
  - `isSuccess(result: SDKResultMessage): result is SDKResultSuccess` — one-line type guard exported from `utils.ts`. Prevents callers from accidentally checking `result.type` instead of `result.subtype`. Use instead of inline `result.subtype === 'success'` checks.
  - `runSkillSession(opts: { prompt: string, options: Options, transcriptFile: string, simulatedUser?: SimulatedUser, checkViolations?: boolean, onMessage?: (msg: SDKMessage) => void }): Promise<SDKResultMessage>` — encapsulates the `for await (const message of query(...))` loop, message type dispatch, transcript writing (via `writeTranscriptEntry`), cost tracking, and result extraction. When `simulatedUser` is provided, composes `canUseTool` internally via `createAskUserHandler`. When `checkViolations` is true, also composes violation detection into `canUseTool`. Callers no longer need to manually compose `canUseTool` handlers — `runSkillSession` owns that composition. Returns `SDKResultMessage` (which is `SDKResultSuccess | SDKResultError`) — does NOT throw on `SDKResultError`. Callers inspect the result subtype using `isSuccess()` and decide how to handle errors (validate.ts checks subtype, harness.ts has phase-specific recovery). This is the most duplicated pattern across all 5 scripts.
  - `createMinimalFixture(opts?: { dir?: string, epicName?: string, sliceName?: string, withSource?: boolean }): Promise<string>` — creates a temp directory containing: `package.json` (name, version, `type: "module"`, devDependencies), git init + commit, `.goodplan/` state via `gp init --name <name> --json` + `gp epic:create --json` (stdin: `{ "name": "<name>", "goal": "<goal>" }`) + `gp slice:create --epic <name> --json` (stdin: `{ "name": "<name>", "goal": "<goal>" }`). When `withSource` is true (default: false), also creates `tsconfig.json` (strict) and `src/index.ts` (simple export) — only needed when the skill under test reads source code. Returns temp dir path. Throws `FixtureSetupError` (custom error class) on fixture creation failures, distinguishing setup problems from downstream test failures. Cleanup: caller should use `finally { rmSync(tmpDir, { recursive: true, force: true }) }`.
  - `flushTranscript(file: string): void` — flushes buffered transcript entries to disk. Called automatically on process exit, but exposed for explicit flushing in tests or between phases.
  - `FixtureSetupError` — custom error class thrown by `createMinimalFixture` on fixture creation failures. Distinguishes setup problems from downstream test failures (e.g., `catch (e) { if (e instanceof FixtureSetupError) ... }`).
  - `parseModel(defaultModel: string): string` — reads `--model` from `process.argv`, returns override or default
  - `tierDefault(tier: "structural" | "pipeline" | "quality" | "e2e"): "claude-haiku-4-5" | "claude-sonnet-4-5" | "claude-opus-4-6"` — returns `claude-haiku-4-5` for structural/pipeline, `claude-sonnet-4-5` for quality, `claude-opus-4-6` for e2e. Note: quality tier uses sonnet for cost efficiency. For full-workflow validation runs (validate.ts), use `--model claude-opus-4-6` or pass `tierDefault("e2e")` to avoid silent quality degradation from the opus-to-sonnet default change.
- [ ] Create `tests/unit/dogfood/utils.test.ts` with unit tests for each utility function:
  - `createLogger`: writes to file and returns content
  - `gp`/`gpJson`: integration test calling real CLI (or note as acceptable deviation if mocking `execFileSync`, since it's process mock not filesystem mock)
  - `gpForce`: returns failing result if both attempts fail; retries exactly once
  - `verifyEntityStatus`: returns `{ ok: true, actual }` on match, `{ ok: false, actual }` on mismatch
  - `checkViolation`: detects `.goodplan/` `.json`/`.jsonl` reads, detects `Bash` patterns, ignores safe operations, does NOT match `.project/` (stale path)
  - `createCostTracker`: accumulates correctly
  - `writeTranscriptEntry`: appends valid JSONL line, filters out `stream_event` messages, survives write errors without throwing. `flushTranscript`: flushes buffered entries to disk; verify all buffered entries appear in file after flush
  - `parseModel`: returns override when `--model` is present, default otherwise
  - `tierDefault`: returns `claude-haiku-4-5` for structural/pipeline, `claude-sonnet-4-5` for quality, `claude-opus-4-6` for e2e
- [ ] Create `tools/dogfood/test-utils.ts` — integration test that exercises utils against a real temp directory with a real `gp init` call. Includes `createMinimalFixture` verification: all expected files exist, `gp status --json` works in the fixture dir. Uses `finally { rmSync(...) }` for cleanup.

### Verification
Run `bun test tests/unit/dogfood/utils.test.ts` — all tests pass. Run `bun tools/dogfood/test-utils.ts` — integration test completes with all checks passing. Inspect the created log file and verify it contains dual output. Verify `verifyEntityStatus` correctly reports a freshly-initialized project's status. Verify `createMinimalFixture` produces a valid project where `gp status --json` succeeds. Verify temp dirs are cleaned up.

## Phase 2: Simulated User via Stateless LLM Calls

Implement a simulated user that answers AskUserQuestion contextually using stateless `messages.create()` calls (via `@anthropic-ai/sdk`), integrated through the existing `canUseTool` callback pattern.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `import { createSimulatedUser } from "./utils"` — fails with "createSimulatedUser is not a function" or similar named export resolution error
- [ ] No contextual answer mechanism for AskUserQuestion exists — only auto-first-option

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/test-simulated-user.ts` — calls `simulatedUser.ask()` directly with a test question and receives a contextual answer (not just "Proceed" or first option)
- [ ] The simulated user's answer references project context from its system prompt
- [ ] The transcript JSONL file contains non-streaming session messages

### Tasks

- [ ] Install `@anthropic-ai/sdk` as a devDependency (`bun add -d @anthropic-ai/sdk`). This is a separate package from `@anthropic-ai/claude-agent-sdk` and is required for `messages.create()` calls in the simulated user.
- [ ] Add to `utils.ts`:
  - `createSimulatedUser(opts: { systemPrompt: string, transcriptFile: string, model?: string }): SimulatedUser` — creates and returns a `SimulatedUser` instance. No persistent session — each `ask()` is a stateless call. Default model uses `tierDefault("structural")` (not a hardcoded string).
  - `SimulatedUser` class/interface:
    - `ask(question: string, options: Array<{label: string, description: string}>): Promise<string>` — makes a single `messages.create()` call using `@anthropic-ai/sdk` (Anthropic SDK directly, not Agent SDK). Sends the question + options + recent transcript context as a system prompt. Returns the selected option label. Includes per-question cost tracking. Note: `AskUserQuestionInput` option shape is verified as `{label: string, description: string, preview?: string}` — our `{label: string, description: string}` is correct.
    - No `close()` needed — stateless, no session management, no hang risk.
  - The system prompt includes: persona description, project goal, fixture context, and instruction to choose from the provided options.
- [ ] Implement `canUseTool`-based `createAskUserHandler`:
  - Export `createAskUserHandler(simulatedUser: SimulatedUser): CanUseTool` — returns a `canUseTool` callback that:
    1. Checks if the tool is `AskUserQuestion`
    2. If yes: extracts questions + options from the input, calls `simulatedUser.ask()` for each question, returns `{ behavior: 'allow', updatedInput: { questions, answers } }` to inject answers naturally
    3. If no: returns `{ behavior: 'allow' }` (passthrough — note this blanket-allows all non-AskUserQuestion tools, so violation detection must be composed separately)
  - This is primarily used internally by `runSkillSession` (which composes it with violation detection when `checkViolations: true`). Exported for direct use in edge cases, but most callers should use `runSkillSession`'s `simulatedUser` + `checkViolations` params instead.
- [ ] Create `tools/dogfood/test-simulated-user.ts` — unit-level integration test:
  - Preflight: check `process.env.ANTHROPIC_API_KEY` — if absent, print a clear message ("ANTHROPIC_API_KEY not set — skipping simulated user tests") and exit 0 gracefully
  - Tests `simulatedUser.ask()` directly with a mock question and option set (does not require triggering AskUserQuestion from a real skill)
  - Verifies the answer is one of the provided options and contextual
  - Tests `createAskUserHandler` by calling the returned callback with a simulated AskUserQuestion input and verifying `updatedInput` shape
  - Full end-to-end AskUserQuestion-triggering skill test deferred to Phase 3 migrated scripts (e.g., `/gp:create-epic` or `/gp:explore` which always ask questions in fresh context)
  - Uses ad-hoc fixture pattern from existing `test-plugin-skills.ts` (~10 lines: temp dir + `gp init`) — Phase 1's `createMinimalFixture` handles the full pattern
  - Cleans up with `finally { rmSync(...) }`

### Verification
Run `test-simulated-user.ts`. Verify `simulatedUser.ask()` returns a contextual answer that references the provided options and context. Verify `createAskUserHandler` returns correct `updatedInput` shape. No hanging processes — stateless calls complete immediately.

**Integration verification** (validates full stack before Phase 3 migration):
- [ ] Create `tools/dogfood/test-integration.ts` — full-stack integration test:
  - Uses `createMinimalFixture()` to set up project
  - Uses `runSkillSession()` with `simulatedUser` + `checkViolations: true`
  - Runs a skill that triggers AskUserQuestion (e.g., `/gp:create-epic` or `/gp:explore`)
  - Verifies: contextual answers, transcript written, cost tracked, no hangs
  - Cleans up with `finally { rmSync(...) }`
- [ ] Verify `GP_CLI_PATH` env var precedence: documented in utils, integration test respects it
- [ ] Run `bun tools/dogfood/test-integration.ts` — completes successfully with contextual simulated user answers, transcript file written, cost reported. No hanging processes.
- [ ] Verify `bun tools/dogfood/test-plugin-skills.ts --model claude-haiku-4-5` — model override works (visible in log output or cost)

## Phase 3: Migrate Existing Harness Scripts

Update all 5 existing harness scripts to use shared utilities, the simulated user, and model selection. Remove `AUTONOMOUS_SYSTEM_PROMPT` and auto-first-option answer injection. Replace with `createAskUserHandler()` using `canUseTool` + stateless `messages.create()`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Each harness script defines its own inline `log()`, `gp()`, `canUseTool` handler, stats tracking — duplicated across files

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/test-plugin-skills.ts` — runs successfully using shared utils, no inline duplicates
- [ ] `bun tools/dogfood/test-onboard.ts --model claude-haiku-4-5` — uses model override, simulated user answers questions contextually
- [ ] `grep -c "AUTONOMOUS" tools/dogfood/*.ts` — returns 0 (removed from all files)
- [ ] `grep -c "firstOption" tools/dogfood/*.ts` — returns 0 (auto-first-option removed)
- [ ] Each script's log output shows simulated user responses, not "Proceed"

### Tasks

Migrate in order of complexity (simplest first, most complex last). **Rollback guidance**: if a migration breaks a script, revert that script to its pre-migration state (`git restore tools/dogfood/<script>.ts`) and file an issue describing the failure before continuing with the next script.

- [ ] **1. test-plugin-skills.ts** (simplest): Replace inline logging with `createLogger()`. Replace inline query loop with `runSkillSession()`. Add `parseModel()` for model selection. Replace hardcoded sonnet with `parseModel(tierDefault("structural"))`. Plugin discovery and project-status tests don't use AskUserQuestion, so simulated user is optional here — add it if the test evolves to need it.
- [ ] **2. test-onboard.ts**: Replace inline query loop with `runSkillSession()` using `simulatedUser` param. Replace inline logging, CLI helpers. Remove `AUTONOMOUS_SYSTEM_PROMPT` from the system prompt append. Add `parseModel()`. Transcript writing handled by `runSkillSession()`.
- [ ] **3. test-migrate.ts**: Same pattern as test-onboard. Replace inline query loop with `runSkillSession()` using `simulatedUser` param. Replace inline logging, CLI helpers. Add `parseModel()`.
- [ ] **4. validate.ts**: Replace `gp()`/`gpJson()`/`gpForce()` with shared versions. Replace `checkViolation()` with shared version (this fixes stale `.project/` path references to `.goodplan/`). Replace `MODEL` constant with `parseModel(tierDefault("quality"))`. Replace inline query loop with `runSkillSession()` using `simulatedUser` + `checkViolations: true`. Keep violation tracking via `runSkillSession`'s internal composition.
- [ ] **5. harness.ts** (most complex, ~600+ lines): Break into sub-steps:
  1. Replace `goodplan()`/`goodplanJson()` with shared `gp()`/`gpJson()`
  2. Replace `logFriction()` to use shared logger via `createLogger()`
  3. Replace `canUseTool` auto-first-option — pass `simulatedUser` + `checkViolations: true` to `runSkillSession()` instead of manual handler composition
  4. Replace `patchSkillModels()`/`restoreSkillModels()` with `parseModel()` — this is a behavioral change: verify `query()` `model` option overrides model for sub-agent spawns (skills are now plugin-bundled, not patched via file mutation)
  5. Remove `AUTONOMOUS_SYSTEM_PROMPT`
  6. Replace inline query loops with `runSkillSession()`
  7. Move `LOG_DIR` from `.goodplan/` (or `.project/`) to `tools/dogfood/logs/` — logs must not be written into state directories
  8. Truncated verification: run at least one phase to confirm the migration works
- [ ] **6. Cross-cutting cleanup**:
  - Remove all instances of `AUTONOMOUS_SYSTEM_PROMPT` or equivalent autonomous-mode system prompt additions across all scripts
  - Update all remaining `.project/` references to `.goodplan/` across all harness scripts
  - Verify: `grep -rn "\.project/" tools/dogfood/*.ts --exclude=test-migrate.ts` — zero matches. Note: `test-migrate.ts` may have legitimate `.project/` references in fixture setup/verification (it tests migration *from* `.project/` to `.goodplan/`) — exclude that file from this check.
- [ ] Run each migrated script once with `--model claude-haiku-4-5` to verify it works end-to-end

### Verification
Run each of the 5 harness scripts with `--model claude-haiku-4-5`. Verify: no errors, simulated user responds to questions contextually (check log output), transcript file is written, no `AUTONOMOUS_SYSTEM_PROMPT` in any file, no inline `canUseTool` answer injection. Run `grep -rn "firstOption\|AUTONOMOUS\|auto-first" tools/dogfood/*.ts` — zero matches. Run `grep -rn "\.project/" tools/dogfood/*.ts --exclude=test-migrate.ts` — zero matches (test-migrate.ts fixture references are exempt).
