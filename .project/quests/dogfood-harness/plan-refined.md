# Plan: Dogfood Test Harness

## Overview

Build a test harness using `@anthropic-ai/claude-agent-sdk` that programmatically runs the new CLI-integrated goodplan skills in the nondet-eval sample repo. The harness exercises the full workflow lifecycle (explore → architecture → slices → plan → implement → complete) to validate that skills and CLI work together correctly. Uses Haiku for all model calls (testing integration, not output quality). The Agent SDK's `canUseTool` callback intercepts `AskUserQuestion` to enable fully autonomous execution.

**Slug:** `dogfood-harness`

**Terminology:** This plan uses "Step 1–4" to refer to plan implementation steps. Within the harness code, "Phase 2/3/4" refers to goodplan's own workflow phases that the harness exercises. In task descriptions, "[harness]" means the harness code calls a CLI command directly via `goodplan()`, while "[skill]" means the Agent SDK runs a skill via `runSkill()` which may internally invoke CLI commands.

**Key decisions:**
- Haiku everywhere (including sub-agents) — `model: "claude-haiku-4-5"` via SDK `query()` options, plus `patchSkillModels()` / `restoreSkillModels()` to replace `"opus"` / `"sonnet"` with `"haiku"` in all skill files with model references (discovered via `grep -rl`), with startup check for previously-patched files and verification that replacements changed something
- `canUseTool` callback for AskUserQuestion interception — auto-respond and log questions to friction log. Do NOT add `AskUserQuestion` to `disallowedTools` (mutually exclusive with `canUseTool`). System prompt append kept as soft secondary guard only.
- `settingSources: ["project"]` to load nondet-eval's in-project skills
- `bypassPermissions` with `maxBudgetUsd` as safety net
- Build on previous state between steps (testing incremental workflow)
- `execFileSync` (not `execSync`) for CLI calls per project conventions
- All CLI calls use `--json` flag for structured output per CLI interaction conventions
- `goodplan()` helper exposes exit code + parsed error JSON; recovery logic branches on exit code per `cli-interaction-conventions.md` (exit 2 = validation/usage error, exit 3 = state machine error with possible idempotent re-entry, exit 1 = internal error, stop)
- Accumulate `total_cost_usd` from `SDKResultSuccess` across all runs, report aggregate cost at end

**Reference:** Agent SDK research at `.project/quests/dogfood-harness/research/agent-sdk-harness.md`

## Step 1: Core Harness + Explore Validation

Get the Agent SDK `query()` working end-to-end for a single skill (`/explore`), with autonomous AskUserQuestion handling, CLI state transitions, and structured logging.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Source code has no `canUseTool` callback in `harness.ts` (`grep -c canUseTool tools/dogfood/harness.ts` returns 0)
- [ ] No model override — defaults to opus/sonnet (`grep -c haiku tools/dogfood/harness.ts` returns 0)
- [ ] No `reset` subcommand exists (`bun tools/dogfood/harness.ts reset` exits non-zero)
- [ ] No exit-code branching logic in `goodplan()` helper
- [ ] `ls .project/quests/dogfood-harness/harness-logs/` — does not exist

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/harness.ts reset` — resets nondet-eval to clean state (fresh init + epic:create)
- [ ] `bun tools/dogfood/harness.ts 2 explore` — completes successfully, exits 0
- [ ] `goodplan epic:show --epic core-provider --json` (in nondet-eval) — `status === "explored"`
- [ ] `ls ~/Repos/nondet-eval/.project/epics/core-provider/research/` — contains at least 1 .md file
- [ ] `ls .project/quests/dogfood-harness/harness-logs/phase2-explore.log` — exists with content

### Tasks

- [x] **Update `LOG_DIR` and `FRICTION_LOG` constants** to `.project/quests/dogfood-harness/harness-logs/` (old paths point to stale epic slice directory)

- [x] **Validate required environment variables at startup**: Check `process.env.HOME` (and other required env vars) with clear error messages instead of non-null assertion (`!`)

- [x] **Harden `goodplan()` helper**:
  - Expose exit code and parsed error JSON in return value
  - Branch state-recovery logic on exit code: exit 2 = fix invocation, exit 3 = check idempotent re-entry (recoverable), exit 1 = internal error (stop)
  - Replace `as { stdout?: string; ... }` catch block with type guard: `err instanceof Error && 'status' in err && 'stdout' in err`, then cast to `NodeJS.ErrnoException & { stdout?: Buffer; stderr?: Buffer; status?: number | null }`. Add `// known shape from execFileSync` comment at the cast site.

- [x] **Harden `goodplanJson()`**: **REQUIRED:** Check `result.ok` before parsing. **REQUIRED:** Wrap `JSON.parse` in try/catch with descriptive error including raw stdout. Optionally accept a Zod schema parameter (`goodplanJson(args, schema)` returning `z.infer<typeof schema>`) for runtime validation instead of `as T` — not blocking, but improves robustness.

- [x] **Fix `logFriction()`**: Unify to canonical signature `logFriction(severity: string, source: string, message: string)`. All existing call sites (e.g. `logFriction(2, "Skill: /explore", "...", "MINOR")`) must be updated to the new 3-arg signature. Create friction log file if absent before writing, or use `appendFileSync` directly (current `readFileSync` throws on missing file).

- [x] **Rewrite `runSkill()`** to use `canUseTool` callback:
  - Intercept `AskUserQuestion` tool calls — import `AskUserQuestionInput` type from SDK's `sdk-tools.d.ts` for type-safe narrowing of the `Record<string, unknown>` input. The `as AskUserQuestionInput` cast is an accepted exception here since it's guarded by `toolName === "AskUserQuestion"` (no `as any` elsewhere)
  - Auto-select the first option (or "approve/continue" when available)
  - Build answers as `Record<string, string>` keyed by `q.question` (NOT a positional array):
    ```typescript
    const answers: Record<string, string> = {};
    for (const q of typed.questions) {
      answers[q.question] = q.options[0]?.label ?? "Proceed";
    }
    ```
  - Return `{ behavior: 'allow', updatedInput: { questions: typed.questions, answers } }` (SDK `PermissionResult` shape — NOT `{ allowed: true, answer: ... }`)
  - Log each intercepted question to the run log
  - Do NOT add `AskUserQuestion` to `disallowedTools` — this is mutually exclusive with `canUseTool` at the SDK level
  - Keep system prompt append as soft secondary guard only

- [x] **Add `model` option** defaulting to `"claude-haiku-4-5"`:
  - Add `model?: string` to `runSkill()`'s opts type (defaulting to `"claude-haiku-4-5"`)
  - Pass `model` to `query()` options (SDK field is `model?: string`)
  - Also append to system prompt: "Use haiku (claude-haiku-4-5) for ALL Agent sub-agent calls, not opus or sonnet"

- [x] **Add `patchSkillModels()` / `restoreSkillModels()`**:
  - Discover all skill files with model references via `grep -rl "opus\|sonnet" skills/` (do not maintain an explicit file list — let grep find them all)
  - Store original file contents in a `Map<string, string>` (path → content; safer than `Record` with `noUncheckedIndexedAccess`)
  - Replace `"opus"` and `"sonnet"` with `"haiku"` in all matched files
  - **Startup check**: Before patching, verify files don't already contain unexpected `"haiku"` references (detect previously-patched files from a crashed run) — restore originals first if detected
  - **Verify replacements**: After each file patch, confirm the replacement actually changed something. Log a warning if a file's content was unchanged (pattern may have moved)
  - Call `patchSkillModels()` before running skills, `restoreSkillModels()` in a `finally` block after

- [x] **Add `reset` command** that:
  - Deletes nondet-eval's `.project/` directory — verify removal succeeded (handle permissions errors, file locks). Also handle the case where `.project/` doesn't exist (first run)
  - Runs `goodplan init --name nondet-eval --json`
  - Runs `echo '{"name":"core-provider","goal":"Implement a core provider..."}' | goodplan epic:create --json` (epic goal is set via stdin, not a separate `goal.md`)
  - Error handling: check exit code at each step, abort with descriptive message on failure
  - Verifies via `goodplan status --json`

- [x] **Improve logging**:
  - Switch result detection from `"result" in message` to `message.type === "result" && message.subtype === "success"` (discriminated union, not implementation detail)
  - Fix tool call counting: check `message.type === "assistant"` then count `content.filter(b => b.type === "tool_use")` (current code checks system messages — counter is always 0)
  - Log `SDKAssistantMessage` content summaries (tool names used, text length)
  - Log `task_started`/`task_notification` for sub-agent visibility
  - Accumulate `total_cost_usd` from `SDKResultSuccess` across all runs
  - Print elapsed time, message count, tool call count, and aggregate cost summary at end

- [x] **Implement `phase2Explore()`**:
  - Check epic status; if `created`, run `goodplan epic:explore --epic core-provider --json`
  - Call `runSkill("explore", ...)` with prompt telling skill to research and write files
  - After skill completes: verify epic status, if still `exploring` → run `submit-explore --epic core-provider --json` manually, log as friction
  - Verify research files exist
  - Note: Phase 1 defers state recovery logic to Step 2 — the existing `submit-explore` fallback is the only recovery path here

- [x] **Add top-level try/catch and structured exit codes**: Harness exits 0 on success, 1 on any failure. Final summary report printed before exit.

- [ ] **Verify**: Reset nondet-eval → run `bun tools/dogfood/harness.ts 2 explore` → epic reaches `explored`, research files exist, log produced

### Verification

1. Run the full sequence: `reset` → `2 explore` → check state and files
2. Log file contains message count, tool call count, elapsed time, aggregate cost, and any intercepted AskUserQuestion entries
3. `bun test` passes in goodplan (no regressions from adding harness)
4. Note: `tools/` is not covered by `tsconfig.json` (which includes only `src/**/*.ts`). Run `bun tsc --noEmit tools/dogfood/harness.ts` as a smoke check and log results — not blocking but useful.
5. `goodplan()`, `goodplanJson()`, `logFriction()`, `runSkill()` are candidates for unit testing in a follow-up — note this but do not block on it.

## Step 2: Full Epic Lifecycle Pipeline

Wire up all remaining epic lifecycle steps and run the complete first-epic lifecycle end-to-end.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/harness.ts 2` — fails after explore (architecture step not wired up or crashes)
- [ ] No state recovery logic beyond the explore fallback from Step 1

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/harness.ts 2` — completes all steps: explore → architecture → refine-architecture → slices → activate → per-slice cycles → epic complete
- [ ] `goodplan epic:show --epic core-provider --json` (in nondet-eval) → `status === "completed"`
- [ ] `ls ~/Repos/nondet-eval/src/` — contains TypeScript files written by `/implement-plan`
- [ ] Friction log in goodplan repo updated with issues found during run
- [ ] Log files exist for each step in `harness-logs/`

### Tasks

- [x] **Implement `phase2Architecture()`**: First run `goodplan epic:define-architecture --epic core-provider --json` to transition from `explored` to `defining-architecture` (this CLI call is required before the skill can run — add it explicitly to the existing function). After the CLI call, assert exit code 0 and verify `epicStatus()` (which uses `epic:show --epic core-provider --json`) returns `defining-architecture` before proceeding to `runSkill`. Then run `/create-architecture`. Run `goodplan submit-architecture --epic core-provider --json` to advance state. Verify architecture files written and CLI state advanced to `architecture-defined`.
- [x] **Implement `phase2RefineArchitecture()`**: Run `goodplan epic:refine-architecture --epic core-provider --json` (this CLI transition call is required before the skill can run — the existing code lacks it, so it must be added explicitly), then `/refine-architecture`. Run `echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refine-architecture --epic core-provider --override --json` to advance (`--override` required because Haiku-quality scores won't meet the threshold — deliberate, not a shortcut). Verify state reaches `architecture-refined`.
- [x] **Implement `phase2Slices()`**: First run `goodplan epic:define-slices --epic core-provider --json` to transition from `architecture-refined` to `defining-slices` (required before `/create-slices` skill can run). Assert exit 0 and verify `epicStatus()` returns `defining-slices`. Then run `/create-slices` skill, followed by `goodplan submit-slices --epic core-provider --json`. Then run `goodplan epic:refine-slices --epic core-provider --json` to transition to `refining-slices` (required before `/refine-slices` skill can run). Then run `/refine-slices` skill, followed by `echo '{"scores":{...}}' | goodplan submit-refine-slices --epic core-provider --override --json`. Verify slices created via `goodplan slice:list --epic core-provider --json`. Note: all `slice:list` calls must include `--epic <name>` to avoid picking up slices from other epics (critical in Phase 4 when multiple epics exist).
- [x] **Implement `phase2Activate()`**: Add verification via `goodplan epic:add-verification --epic core-provider --json`, run `goodplan epic:activate --epic core-provider --json`, verify `activeEpic` set
- [x] **Implement `phase2SliceCycle(name)`**: **Full rewrite** — the existing implementation has only bare skill invocations with no explicit submit commands. Replace entirely with the full state machine path using explicit submit commands between each skill invocation:
    1. `goodplan slice:plan --slice <name> --json` (activate slice for planning)
    2. Run `/create-plan` skill
    3. `echo '' | goodplan submit-plan --slice <name> --json` (planning → plan-created)
    4. `goodplan slice:refine-plan --slice <name> --json` (plan-created → refining)
    5. Run `/refine-plan` skill
    6. `echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refinement --slice <name> --override --json` (refining → plan-refined; `--override` is required because Haiku-quality scores won't meet the threshold — this is deliberate, not a shortcut)
    7. `goodplan slice:implement --slice <name> --json` (plan-refined → implementing)
    8. Run `/implement-plan` skill
    9. `echo '' | goodplan submit-implementation --slice <name> --json` (implementing → implementation-complete)
    10. `echo '{"verificationPassed":true,"deferred":[],"learnings":[],"architectureDelta":[]}' | goodplan slice:complete --slice <name> --json`
  - Follow the same fallback pattern as `phase2Explore`: after each skill, check if state transitioned. If not, attempt the explicit submit command as recovery and log friction.
  - **Important distinction:** Steps 3, 6, 9, and 10 are explicit `goodplan()` CLI calls. If they return non-zero, apply exit-code branching (already defined in Step 1 helper). Do NOT re-run the preceding skill as recovery for a CLI failure — skill-failure recovery (re-try submit) is different from CLI-failure recovery (exit-code branching).
- [x] **Implement `phase2EpicComplete()`**: Run `/complete` for the epic. Pass the verificationResults payload in the skill prompt, e.g.: `"Complete the epic. Verification results: [{"index": 0, "passed": true, "notes": "Harness automated verification"}]. Call epic:complete with this payload."` After the skill completes, verify the epic reached `completed` status via `goodplan epic:show`. If not completed, attempt manual CLI fallback: `echo '{"verificationResults": [{"index": 0, "passed": true, "notes": "Harness automated verification"}]}' | goodplan epic:complete --epic core-provider --json` and log friction.
- [x] **Add state recovery**: After each skill run, check if state transitioned. If not, attempt manual CLI transition (branching on exit code per Step 1's `goodplan()` helper) and log friction.
- [ ] **Run full epic lifecycle**: Reset → `bun tools/dogfood/harness.ts 2`. Fix skill/CLI issues discovered during execution. Update friction log.

### Verification

1. Full pipeline completes without manual intervention
2. nondet-eval has actual TypeScript code. Run `bun tsc --noEmit` and log results (pass/fail) — compilation failures are informational, not blocking.
3. All CLI state transitions exercised: created → exploring → explored → defining-architecture → architecture-defined → refining-architecture → architecture-refined → defining-slices → slices-defined → refining-slices → slices-refined → activated → (per-slice planning/implementing/completing) → completed
4. Friction log has entries for any issues
5. `bun test` passes in goodplan

## Step 3: Quest Lifecycle (Goodplan Phase 3)

Add quest lifecycle. Run end-to-end building on Step 2's state.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/harness.ts 3` — prints "Phase 3 not yet implemented"

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/harness.ts 3` — completes quest lifecycle (create → plan → refine → implement → complete)
- [ ] `goodplan quest:list --json` (in nondet-eval) — at least 1 completed quest
- [ ] Friction log updated with quest-specific issues

### Tasks

- [x] **Implement Phase 3** (`runPhase3()`):
  - Create a deliberate quest: `echo '{"name":"add-readme","goal":"Add a README.md to the project"}' | goodplan quest:create --json`
  - Run quest lifecycle with full state machine path:
    1. `goodplan quest:plan --quest add-readme --json` (created → planning)
    2. Run `/create-plan` skill
    3. `echo '' | goodplan submit-plan --quest add-readme --json` (planning → plan-created)
    4. `goodplan quest:refine-plan --quest add-readme --json` (plan-created → refining)
    5. Run `/refine-plan` skill
    6. `echo '{"scores":{...}}' | goodplan submit-refinement --quest add-readme --override --json` (refining → plan-refined)
    7. `goodplan quest:implement --quest add-readme --json` (plan-refined → implementing; guard: `plan-refined.md` must exist)
    8. Run `/implement-plan` skill
    9. `echo '' | goodplan submit-implementation --quest add-readme --json` (implementing → implementation-complete)
    10. `echo '{"verificationPassed":true,"learnings":[],"architectureDelta":[]}' | goodplan quest:complete --quest add-readme --json`
  - Handle `STATE_QUEST_ALREADY_ACTIVE` guard (only one quest can be active at a time)
  - Verify quest completed via `goodplan quest:show --quest add-readme --json`

### Verification

1. Quest lifecycle completes without manual intervention
2. All quest state transitions exercised: created → planning → plan-created → refining → plan-refined → implementing → implementation-complete → completed
3. Friction log updated
4. `bun test` passes in goodplan

## Step 4: Second Epic Lifecycle (Goodplan Phase 4) + Full Execution

Add second epic lifecycle with architecture proposal path. Run all steps end-to-end.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/harness.ts 4` — prints "Phase 4 not yet implemented"

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/harness.ts 4` — completes second epic lifecycle (create → explore → architecture proposal → activate → slices → complete)
- [ ] Both epics show `status === "completed"` via `goodplan epic:show --epic <name> --json`
- [ ] Comprehensive friction log covers all steps

### Tasks

- [ ] **Implement Phase 4** (`runPhase4()`):
  - Create second epic: `echo '{"name":"llm-judge","goal":"Implement an LLM judge..."}' | goodplan epic:create --json`
  - Run explore → `goodplan epic:define-architecture --epic llm-judge --json` → `/create-architecture` (proposal path — skill writes to `architecture-proposal/`)
  - Architecture approval: No CLI command exists for proposal approval. Perform manual filesystem copy of `architecture-proposal/` → `architecture/` and write `approved.md`. This is NOT a state machine bypass (INV-001) — it is a free-form markdown content operation (LLM-owned files). The actual state transition happens via `goodplan submit-architecture --epic llm-judge --json` which goes through the state machine. Log the missing approval CLI command as a friction item (`logFriction("important", "phase4-architecture", "No CLI command for architecture proposal approval — required manual filesystem copy of architecture-proposal/ to architecture/")`). Then run `goodplan submit-architecture --epic llm-judge --json`.
  - Run `goodplan epic:refine-architecture --epic llm-judge --json` → `/refine-architecture` → `echo '{"scores":{...}}' | goodplan submit-refine-architecture --epic llm-judge --json`
  - Create slices: run `goodplan epic:define-slices --epic llm-judge --json` → `/create-slices` → `goodplan submit-slices --epic llm-judge --json` → `goodplan epic:refine-slices --epic llm-judge --json` → `/refine-slices` → `submit-refine-slices --epic llm-judge --override --json`. Use `slice:list --epic llm-judge --json` to avoid picking up slices from `core-provider`. Then activate, run per-slice cycles (same pattern as Step 2), complete epic
  - When completing the second epic, use the same verificationResults pattern as Step 2 but confirm the verification `index` matches the epic's own verification item (added during its `phase2Activate()` equivalent). Parameterize the index rather than hardcoding `0`.
  - Verify second epic completed via `goodplan epic:show --epic llm-judge --json`

- [ ] **Add `all` command**: `bun tools/dogfood/harness.ts all` runs reset → Phase 2 → Phase 3 → Phase 4. Wire both `reset` and `all` into the CLI argument parser / entry point switch statement (lines ~383-446 in harness.ts) alongside the existing phase commands.

- [ ] **Run full execution**: `bun tools/dogfood/harness.ts all`. Fix issues. Update friction log with comprehensive findings.

- [ ] **Produce friction summary**: After full run, print a summary of all friction items discovered, categorized by skill and severity. Include aggregate cost report.

### Verification

1. `bun tools/dogfood/harness.ts all` completes (reset through Phase 4)
2. nondet-eval has two completed epics and at least one completed quest
3. Friction log is comprehensive — captures CLI gaps, skill issues, convention doc mismatches
4. Harness logs provide enough detail to reproduce and debug any issues
5. `bun test` passes in goodplan
