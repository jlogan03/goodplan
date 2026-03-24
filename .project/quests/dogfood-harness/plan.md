# Plan: Dogfood Test Harness

## Overview

Build a test harness using `@anthropic-ai/claude-agent-sdk` that programmatically runs the new CLI-integrated goodplan skills in the nondet-eval sample repo. The harness exercises the full workflow lifecycle (explore → architecture → slices → plan → implement → complete) to validate that skills and CLI work together correctly. Uses Haiku for all model calls (testing integration, not output quality). The Agent SDK's `canUseTool` callback intercepts `AskUserQuestion` to enable fully autonomous execution.

**Slug:** `dogfood-harness`

**Key decisions:**
- Haiku everywhere (including sub-agents) — override via system prompt append
- `canUseTool` callback for AskUserQuestion auto-responses (not just system prompt)
- `settingSources: ["project"]` to load nondet-eval's in-project skills
- `bypassPermissions` with `maxBudgetUsd` as safety net
- Build on previous state between phases (testing incremental workflow)
- `execFileSync` (not `execSync`) for CLI calls per project conventions

**Reference:** Agent SDK research at `.project/quests/dogfood-harness/research/agent-sdk-harness.md`

## Phase 1: Core Harness + Explore Validation

Get the Agent SDK `query()` working end-to-end for a single skill (`/explore`), with autonomous AskUserQuestion handling, CLI state transitions, and structured logging.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/harness.ts 2 explore` — fails or produces no useful output (current draft doesn't use `canUseTool`, uses wrong model)
- [ ] `ls .project/quests/dogfood-harness/harness-logs/` — does not exist

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/harness.ts reset` — resets nondet-eval to clean state (fresh init + epic:create)
- [ ] `bun tools/dogfood/harness.ts 2 explore` — completes successfully, exits 0
- [ ] `goodplan epic:show --epic core-provider --json` (in nondet-eval) — `status === "explored"`
- [ ] `ls ~/Repos/nondet-eval/.project/epics/core-provider/research/` — contains at least 1 .md file
- [ ] `ls .project/quests/dogfood-harness/harness-logs/phase2-explore.log` — exists with content

### Tasks

- [ ] **Rewrite `runSkill()`** to use `canUseTool` callback:
  - Intercept `AskUserQuestion` tool calls — inspect the question, auto-select the first option (or "approve/continue" when available)
  - Return `{ allowed: true, answer: ... }` with a reasonable auto-response
  - Log each intercepted question to the run log
  - Keep the system prompt append as a soft guard (tells agent to prefer not asking)

- [ ] **Add `model` option** defaulting to `"claude-haiku-4-5"`:
  - Pass to `query()` options
  - Also append to system prompt: "Use haiku (claude-haiku-4-5) for ALL Agent sub-agent calls, not opus or sonnet"

- [ ] **Add `reset` command** that:
  - Deletes nondet-eval's `.project/` directory
  - Runs `goodplan init --name nondet-eval`
  - Runs `epic:create` with core-provider name/goal
  - Writes `goal.md` for the epic
  - Verifies via `goodplan status --json`

- [ ] **Improve logging**:
  - Log `SDKAssistantMessage` content summaries (tool names used, text length)
  - Log `task_started`/`task_notification` for sub-agent visibility
  - Print elapsed time and message count summary at end

- [ ] **Implement `phase2Explore()`**:
  - Check epic status; if `created`, run `epic:explore` CLI transition
  - Call `runSkill("explore", ...)` with prompt telling skill to research and write files
  - After skill completes: verify epic status, if still `exploring` → write `explore-complete.md` and run `submit-explore` manually, log as friction
  - Verify research files exist

- [ ] **Verify**: Reset nondet-eval → run `bun tools/dogfood/harness.ts 2 explore` → epic reaches `explored`, research files exist, log produced

### Verification

1. Run the full sequence: `reset` → `2 explore` → check state and files
2. Log file contains message count, tool call count, elapsed time, and any intercepted AskUserQuestion entries
3. `bun test` passes in goodplan (no regressions from adding harness)

## Phase 2: Full Phase 2 Pipeline

Wire up all remaining Phase 2 steps and run the complete first-epic lifecycle end-to-end.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/harness.ts 2` — fails after explore (architecture step not wired up or crashes)

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/harness.ts 2` — completes all steps: explore → architecture → refine-architecture → slices → activate → per-slice cycles → epic complete
- [ ] `goodplan epic:show --epic core-provider --json` (in nondet-eval) → `status === "completed"`
- [ ] `ls ~/Repos/nondet-eval/src/` — contains TypeScript files written by `/implement-plan`
- [ ] Friction log in goodplan repo updated with issues found during run
- [ ] Log files exist for each step in `harness-logs/`

### Tasks

- [ ] **Implement `phase2Architecture()`**: Run `/create-architecture`, verify architecture files written and CLI state advanced
- [ ] **Implement `phase2RefineArchitecture()`**: Run `/refine-architecture`, verify state reaches `architecture-refined`
- [ ] **Implement `phase2Slices()`**: Run `/create-slices` + `/refine-slices`, verify slices created via `slice:list --json`
- [ ] **Implement `phase2Activate()`**: Add verification via `epic:add-verification`, run `epic:activate`, verify `activeEpic` set
- [ ] **Implement `phase2SliceCycle(name)`**: For each slice: `slice:plan` → `/create-plan` → `/refine-plan` → `/implement-plan` → `/complete`. Check state transitions at each step.
- [ ] **Implement `phase2EpicComplete()`**: Run `/complete` for the epic, verify `status === "completed"`
- [ ] **Add state recovery**: After each skill run, check if state transitioned. If not, attempt manual CLI transition and log friction.
- [ ] **Run full Phase 2**: Reset → `bun tools/dogfood/harness.ts 2`. Fix skill/CLI issues discovered during execution. Update friction log.

### Verification

1. Full pipeline completes without manual intervention
2. nondet-eval has actual TypeScript code (even if Haiku-quality — doesn't need to compile)
3. All CLI state transitions exercised: created → exploring → explored → architecture-defined → architecture-refined → slices-defined → slices-refined → activated → (per-slice planning/implementing/completing) → completed
4. Friction log has entries for any issues
5. `bun test` passes in goodplan

## Phase 3: Phases 3-4 + Full Execution

Add quest lifecycle (dogfooding Phase 3) and second epic lifecycle (dogfooding Phase 4). Run all phases end-to-end building on Phase 2's state.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/harness.ts 3` — prints "Phase 3 not yet implemented"
- [ ] `bun tools/dogfood/harness.ts 4` — prints "Phase 4 not yet implemented"

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/harness.ts 3` — completes quest lifecycle (create → plan → implement → complete)
- [ ] `bun tools/dogfood/harness.ts 4` — completes second epic lifecycle (create → explore → architecture proposal → activate → slices → complete)
- [ ] `goodplan quest:list --json` (in nondet-eval) — at least 1 completed quest
- [ ] Both epics show `status === "completed"` via `epic:show --json`
- [ ] Comprehensive friction log covers all phases

### Tasks

- [ ] **Implement Phase 3** (`runPhase3()`):
  - Create a deliberate quest via `quest:create` (e.g., "add-readme")
  - Run quest lifecycle: `quest:plan` → `/create-plan` → `/implement-plan` → `/complete`
  - Skip `/refine-plan` for the quest (tests direct plan-to-implement path)
  - Verify quest completed via `quest:show --json`

- [ ] **Implement Phase 4** (`runPhase4()`):
  - Create second epic "llm-judge" via `epic:create`
  - Run explore → architecture (proposal path, not direct write)
  - Manual approval: copy `architecture-proposal/` to `architecture/`, write `approved.md`
  - Run `/refine-architecture`
  - Create slices, activate, run per-slice cycles, complete epic
  - Verify second epic completed

- [ ] **Add `all` command**: `bun tools/dogfood/harness.ts all` runs reset → Phase 2 → Phase 3 → Phase 4

- [ ] **Run full execution**: `bun tools/dogfood/harness.ts all`. Fix issues. Update friction log with comprehensive findings.

- [ ] **Produce friction summary**: After full run, print a summary of all friction items discovered, categorized by skill and severity.

### Verification

1. `bun tools/dogfood/harness.ts all` completes (reset through Phase 4)
2. nondet-eval has two completed epics and at least one completed quest
3. Friction log is comprehensive — captures CLI gaps, skill issues, convention doc mismatches
4. Harness logs provide enough detail to reproduce and debug any issues
5. `bun test` passes in goodplan
