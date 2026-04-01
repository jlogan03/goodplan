# Plan: Test Harness Foundation

## Overview

Upgrade the Agent SDK test harness at `tools/dogfood/` to support the new consolidated skill model. The harness currently auto-selects the first option for every AskUserQuestion and hardcodes models per-file. This plan introduces four capabilities: shared utilities (extracted from duplicated code across 5 harness scripts), a persistent simulated-user session that answers skill questions like a real user would (using AsyncIterable + PreToolUse hook + raw transcript file), configurable model selection with tier-based defaults, and minimal fixture creation with real source code.

Key architectural decisions:
- **Simulated user via PreToolUse hook**: AskUserQuestion is intercepted by a hook that forwards the question to a persistent Agent SDK `query()` session. The hook denies the tool use and returns the answer — the skill sees it naturally, as if a real user responded.
- **Raw stream transcript**: all session messages (agent output, tool calls, sub-agent notifications) are written to a JSONL file in real-time. The simulated user has Read tools and can inspect this file for full context before answering.
- **No autonomous suppression**: skills run exactly as they would with a real user. The `AUTONOMOUS_SYSTEM_PROMPT` that told agents "no AskUserQuestion" is removed — let skills ask questions naturally.

## Phase 1: Shared Utilities Foundation

Extract duplicated patterns from the 5 existing harness scripts into `tools/dogfood/utils.ts`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `import { createLogger } from "./utils"` in any harness file — fails with "Cannot find module"
- [ ] No `tools/dogfood/utils.ts` file exists

**After implementation** (should pass / show presence):
- [ ] `bun run tools/dogfood/utils.ts` — file parses without errors
- [ ] `bun test tests/unit/dogfood-utils.test.ts` — all unit tests pass
- [ ] A small integration script (`tools/dogfood/test-utils.ts`) imports all exports from `utils.ts`, calls `createLogger()`, `gp()`, `gpJson()`, `verifyEntityStatus()`, `checkViolation()`, `createCostTracker()` against a temp fixture — all succeed

### Tasks

- [ ] Create `tools/dogfood/utils.ts` with the following exports:
  - `createLogger(logFile: string)` — returns `{ log(msg: string): void }` that writes to both file and console. Extracted from the inline `log()` pattern in all 5 harness scripts.
  - `gp(args: string[], opts?: { cwd?: string, gpBin?: string }): { stdout: string, exitCode: number }` — CLI helper wrapping `execFileSync`. Uses `GP_CLI_PATH` env var or defaults to the plugin binary path. Extracted from `goodplan()`/`gp()` in harness.ts and validate.ts.
  - `gpJson<T>(args: string[], opts?): T` — typed JSON-parsing wrapper. Throws with exit code description on failure. Extracted from `goodplanJson()`/`gpJson()`.
  - `gpForce(args: string[], opts?): string` — auto-retries with `--force` on `CONCURRENT_MODIFICATION`. Extracted from validate.ts.
  - `verifyEntityStatus(type: "epic" | "slice" | "quest", name: string, expected: string, opts?): { ok: boolean, actual: string }` — queries `gp <type>:show --<type> <name> --json`, compares `.status` to expected. Throws on mismatch with expected vs actual.
  - `checkViolation(toolName: string, input: unknown, violations: string[]): void` — checks Read/Write/Edit/Bash for direct `.goodplan/` state access (`.json`, `.jsonl` files). Appends to violations array. Extracted from harness.ts and validate.ts.
  - `createCostTracker(): { add(cost: number): void, total(): number }` — simple accumulator.
  - `writeTranscriptEntry(file: string, message: SDKMessage): void` — append a message to the JSONL transcript file. Serializes the full message object.
- [ ] Create `tests/unit/dogfood-utils.test.ts` with unit tests for each utility function:
  - `createLogger`: writes to file and returns content
  - `gp`/`gpJson`: calls CLI with correct args (mock `execFileSync`)
  - `verifyEntityStatus`: passes on match, throws on mismatch
  - `checkViolation`: detects `.json`/`.jsonl` reads, detects `Bash` patterns, ignores safe operations
  - `createCostTracker`: accumulates correctly
  - `writeTranscriptEntry`: appends valid JSONL line
- [ ] Create `tools/dogfood/test-utils.ts` — integration test that exercises utils against a real temp directory with a real `gp init` call

### Verification
Run `bun test tests/unit/dogfood-utils.test.ts` — all tests pass. Run `bun tools/dogfood/test-utils.ts` — integration test completes with all checks passing. Inspect the created log file and verify it contains dual output. Verify `verifyEntityStatus` correctly reports a freshly-initialized project's status.

## Phase 2: Simulated User Session

Implement the persistent simulated-user session using Agent SDK `query()` with `AsyncIterable<SDKUserMessage>`, a PreToolUse hook that bridges AskUserQuestion to the simulated user, and a raw stream transcript file.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `import { createSimulatedUser } from "./utils"` — fails with "createSimulatedUser is not exported"
- [ ] No PreToolUse hook mechanism for AskUserQuestion exists in any harness script

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/test-simulated-user.ts` — spawns a simulated user session, sends a test question, receives a contextual answer (not just "Proceed")
- [ ] The simulated user's answer references project context from its system prompt
- [ ] The transcript JSONL file contains all session messages up to the question point
- [ ] The simulated user can Read the transcript file and reference events from it in its answer

### Tasks

- [ ] Add to `utils.ts`:
  - `createSimulatedUser(opts: { cwd: string, systemPrompt: string, transcriptFile: string, model?: string }): SimulatedUser` — creates and returns a `SimulatedUser` instance
  - `SimulatedUser` class/interface:
    - Internal: `query()` session with `AsyncIterable<SDKUserMessage>` as prompt
    - Internal: async queue for pushing questions and receiving answers
    - `ask(question: string, options: Array<{label: string, description: string}>): Promise<string>` — pushes the question + options to the queue, waits for the response, returns the selected option label
    - `close(): void` — terminates the session
  - The simulated user's `query()` session runs with `permissionMode: "bypassPermissions"`, has access to Read/Grep/Glob tools, and its system prompt includes: persona description, project goal, fixture context, and the transcript file path
- [ ] Implement async queue mechanism:
  - Create a simple push/pull async queue (`AsyncQueue<T>`) that implements `AsyncIterable<T>`
  - The queue's `push()` adds items; iterating yields them
  - The simulated user session's prompt is the queue — each pushed message becomes a new user turn
  - Response capture: iterate the `query()` output stream, extract the assistant's text response
- [ ] Implement PreToolUse hook integration:
  - Export `createAskUserQuestionHook(simulatedUser: SimulatedUser, transcriptFile: string): PreToolUseHook` — returns a hook function that:
    1. Checks if the tool is `AskUserQuestion`
    2. If yes: extracts questions + options from the input, calls `simulatedUser.ask()` for each question, formats the answers, returns `{ behavior: "deny", message: "User responded: <answer>" }`
    3. If no: returns `{ behavior: "allow" }`
- [ ] Implement transcript writing:
  - The main test run calls `writeTranscriptEntry()` (from Phase 1) for every message yielded by the skill's `query()` stream
  - The simulated user's system prompt tells it: "The full session transcript is at <path>. You can Read it to understand what has happened so far."
- [ ] Create `tools/dogfood/test-simulated-user.ts` — integration test:
  - Creates a minimal fixture
  - Spawns a simulated user with persona "TypeScript developer building a CLI tool"
  - Runs a simple skill (e.g., `/gp:status`) that triggers an AskUserQuestion
  - Verifies the simulated user's answer is contextual, not "Proceed"
  - Verifies the transcript file contains messages
  - Cleans up

### Verification
Run `test-simulated-user.ts` end-to-end. Check that the simulated user answers a real AskUserQuestion with a contextual response. Verify the transcript JSONL file captures all messages. Verify the simulated user session closes cleanly without hanging.

## Phase 3: Model Selection + Fixture Helpers

Add `--model` CLI argument parsing with tier-based defaults and a `createMinimalFixture()` helper that produces a real TypeScript project with `.goodplan/` state.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/test-plugin-skills.ts --model claude-haiku-4-5` — the `--model` flag is ignored, script uses hardcoded sonnet
- [ ] `import { createMinimalFixture } from "./utils"` — fails, not exported

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/test-plugin-skills.ts --model claude-haiku-4-5` — uses haiku (visible in log output or cost)
- [ ] `createMinimalFixture()` produces a temp directory with: `package.json`, `src/index.ts`, `tsconfig.json`, `.goodplan/` (initialized via CLI), git repo initialized

### Tasks

- [ ] Add to `utils.ts`:
  - `parseModel(defaultModel: string): string` — reads `--model` from `process.argv`, returns override or default
  - `tierDefault(tier: "structural" | "pipeline" | "quality"): string` — returns `claude-haiku-4-5` for structural/pipeline, `claude-opus-4-6` for quality
  - `createMinimalFixture(opts?: { dir?: string, epicName?: string, sliceName?: string }): Promise<string>` — creates a temp directory containing:
    - `package.json` with `name`, `version`, `type: "module"`, `devDependencies: { typescript: "^5.0.0" }`
    - `tsconfig.json` with strict mode
    - `src/index.ts` with a simple exported function
    - Git initialized (`git init && git add -A && git commit`)
    - `.goodplan/` state via `gp init --name <name>` + `gp epic:create` + `gp slice:create`
    - Returns the temp directory path
- [ ] Add unit tests:
  - `parseModel`: returns override when `--model` is present, default otherwise
  - `tierDefault`: correct model per tier
- [ ] Add integration test for `createMinimalFixture`: verify all expected files exist, `gp status --json` works in the fixture dir

### Verification
Run `bun tools/dogfood/test-utils.ts` (extended) — fixture creation produces a valid project. Run any harness script with `--model claude-haiku-4-5` and verify the model override is used.

## Phase 4: Migrate Existing Harness Scripts

Update all 5 existing harness scripts to use shared utilities, the simulated user, and model selection. Remove `AUTONOMOUS_SYSTEM_PROMPT` and `canUseTool` answer injection.

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

- [ ] **test-plugin-skills.ts**: Replace inline logging with `createLogger()`. Add `parseModel()` for model selection. Replace hardcoded sonnet with `parseModel(tierDefault("structural"))`. Plugin discovery and project-status tests don't use AskUserQuestion, so simulated user is optional here — add it if the test evolves to need it.
- [ ] **test-migrate.ts**: Replace inline `query()` loop with shared `runSkill()` (or keep inline but use shared utils for logging, CLI helpers). Add simulated user + PreToolUse hook. Remove `canUseTool` auto-first-option. Add `parseModel()`. Add transcript writing.
- [ ] **test-onboard.ts**: Same pattern as test-migrate. Replace inline logging, CLI helpers, `canUseTool`. Add simulated user. Remove `AUTONOMOUS_SYSTEM_PROMPT` from the system prompt append. Add model selection.
- [ ] **validate.ts**: Replace `gp()`/`gpJson()`/`gpForce()` with shared versions. Replace `checkViolation()` with shared version. Replace `MODEL` constant with `parseModel(tierDefault("quality"))`. Add simulated user + PreToolUse hook. Remove `canUseTool` auto-first-option. Add transcript writing. Keep violation tracking.
- [ ] **harness.ts**: Replace `goodplan()`/`goodplanJson()` with shared `gp()`/`gpJson()`. Replace `logFriction()` to use shared logger. Replace `runSkill()` with shared version that uses simulated user + PreToolUse hook. Remove `canUseTool` auto-first-option. Replace `patchSkillModels()`/`restoreSkillModels()` with `parseModel()` (skills are now plugin-bundled, not patched). Remove `AUTONOMOUS_SYSTEM_PROMPT`. Add transcript writing.
- [ ] Remove all instances of `AUTONOMOUS_SYSTEM_PROMPT` or equivalent autonomous-mode system prompt additions across all scripts
- [ ] Run each migrated script once with `--model claude-haiku-4-5` to verify it works end-to-end

### Verification
Run each of the 5 harness scripts with `--model claude-haiku-4-5`. Verify: no errors, simulated user responds to questions contextually (check log output), transcript file is written, no `AUTONOMOUS_SYSTEM_PROMPT` in any file, no inline `canUseTool` answer injection. Run `grep -rn "firstOption\|AUTONOMOUS\|auto-first" tools/dogfood/*.ts` — zero matches.
