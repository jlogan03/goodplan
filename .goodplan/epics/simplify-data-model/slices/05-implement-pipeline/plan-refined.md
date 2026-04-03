# Plan: Implement Pipeline + Complete-Epic

## Overview

Build the `/gp:implement` pipeline skill (autonomous implementation + review loops + slice completion) and the `/gp:complete-epic` standalone skill (epic-level learnings synthesis, architecture reconciliation, artifact promotion). This produces two new agent definitions (`implement-phase.md`, `completion-slice.md`, `completion-epic.md`), two new skill directories, and two dogfood test harness scripts.

The implement orchestrator takes over the role of the current `implement-plan` skill, managing the same sub-agent coordination (implementation → reviewers → synthesis → feedback loop) but as a lightweight orchestrator that follows context discipline. Completion is handled by two separate agents: `completion-slice.md` for slice-level learnings/recommendations and `completion-epic.md` for cross-slice synthesis and architecture reconciliation.

Key design decisions:
- **Orchestrator commits**: One git commit per plan phase, made by the orchestrator after the review loop passes. The implement-phase agent focuses purely on implementation.
- **Agent runs red-green checks**: The implement-phase agent handles all RED/GREEN Expected Behavior check execution and reports pass/fail in its return. The orchestrator reads only pass/fail status, never Expected Behavior content directly.
- **Split completion agents**: `completion-slice.md` and `completion-epic.md` are separate agents with distinct inputs, outputs, and responsibilities — no dual-mode pattern.
- **Re-entry via CLI state**: Orchestrator queries `$GP slice:show --slice <name> --json` for an `implementationPhase` field to track the current phase index and resume from there. This requires a data model change to add the field to the slice schema.
- **State transitions**: The orchestrator calls `$GP slice:implement --slice <name>` to transition from `plan-refined` to `implementing`, and `$GP submit-implementation --slice <name>` after all phases complete before `slice:complete`.
- **Full feature parity**: The orchestrator carries over all current implement-plan features (red-green cycle, research, stall detection, iteration cap, maturity context).

## Phase 1: Agent Definitions

Create `implement-phase.md`, `completion-slice.md`, and `completion-epic.md` agent definitions in `agents/`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls agents/implement-phase.md agents/completion-slice.md agents/completion-epic.md` — all files not found
- [ ] `rm -rf dist && bun run build:plugin && ls dist/gp-plugin/agents/implement-phase.md` — file not found in dist

**After implementation** (should pass / show presence):
- [ ] `ls agents/implement-phase.md agents/completion-slice.md agents/completion-epic.md` — all files exist
- [ ] All files have valid frontmatter (`name`, `description`, `model: opus`)
- [ ] All files use `@${CLAUDE_PLUGIN_ROOT}/` references for shared content injection (not `skills:` frontmatter)
- [ ] `rm -rf dist && bun run build:plugin && ls dist/gp-plugin/agents/implement-phase.md dist/gp-plugin/agents/completion-slice.md dist/gp-plugin/agents/completion-epic.md` — all present in dist
- [ ] `@` references in agent bodies point to files that exist in the repo
- [ ] All agent `description` fields are under 1024 characters per the agentskills.io spec

### Tasks

- [x] Create `agents/implement-phase.md`:
  - Frontmatter: `name: implement-phase`, `description: Implements a single plan phase...`, `model: opus`
  - Body: instructions for implementing a plan phase, running red-green Expected Behavior checks, handling research needs, reporting changed files
  - Inject shared content via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/` for review output format, CLI interaction conventions
  - Return format: `{ status: "SUCCESS" | "PARTIAL" | "FAILED", summary, filesChanged: [...], redGreenResults: { passed: boolean, details: string } }`
  - Agent receives in task prompt: phase content path, iteration number, merged feedback path (if any), plan slug, scope directory, architecture `_overview.md` path (for maturity extraction)
  - Agent handles: reading the plan phase, running before-checks (RED), implementing code, running after-checks (GREEN), reporting pass/fail results — but does NOT commit
- [x] Create `agents/completion-slice.md`:
  - Frontmatter: `name: completion-slice`, `description: Synthesizes slice-level learnings and reviews architecture delta...`, `model: opus`
  - Input: slice path, plan path, changed files list
  - Output: learnings, architecture delta recommendations, side quest proposals, project-health updates
  - Agent evaluates `reconsiderWhen` and `validUntil` conditions when provided in task prompt
  - Return format: `{ status: "SUCCESS" | "PARTIAL" | "FAILED", summary, filesWritten: [...], recommendations: [...], triggeredConditions: [...] }`
- [x] Create `agents/completion-epic.md`:
  - Frontmatter: `name: completion-epic`, `description: Synthesizes cross-slice learnings and reconciles architecture...`, `model: opus`
  - Input: epic path, all slice learnings paths, cross-slice summary
  - Output: consolidated learnings, architecture reconciliation recommendations, promoted artifact list
  - Agent evaluates `reconsiderWhen` and `validUntil` conditions when provided in task prompt
  - Return format: `{ status: "SUCCESS" | "PARTIAL" | "FAILED", summary, filesWritten: [...], recommendations: [...], triggeredConditions: [...] }`
- [x] Update all doc references from `completion-phase` to `completion-slice` + `completion-epic`:
  - `skill-model-api.md` line 24: Agent Definitions table — replace the `completion-phase.md` row with `completion-slice.md` and `completion-epic.md`
  - `skill-model-api.md` line 119: any prose reference to `completion-phase` — update to `completion-slice`/`completion-epic`
  - `conventions.md` line 58: `reconsiderWhen` ownership list — replace `completion-phase` with `completion-slice` and `completion-epic`
  - Document the justification: different I/O shapes, no shared callers, cleaner boundaries
  - Verification: run `grep -r "completion-phase" agents/ skills/ .goodplan/epics/simplify-data-model/architecture/` and confirm 0 hits after the rename. State files in `.goodplan/` do not need updating.
- [x] Verify `build-plugin.sh` already copies `agents/` to dist (added in slice 02) — no changes needed

### Verification

Run `rm -rf dist && bun run build:plugin` and inspect the dist to confirm all three new agent files are present alongside existing agents. Verify the total agent count increased by 3.

## Phase 2: Implement Orchestrator — Core Skeleton

Build the core `skills/implement/SKILL.md` with scope resolution, state transitions, re-entry via CLI state, plan loading, and a single-pass implementation loop (no review loop yet).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/implement/SKILL.md` — file not found
- [ ] `rm -rf dist && bun run build:plugin && ls dist/gp-plugin/skills/implement/SKILL.md` — not in dist

**After implementation** (should pass / show presence):
- [ ] `ls skills/implement/SKILL.md` — file exists
- [ ] Skill has valid frontmatter (`name: implement`, `description`, `requires: gp >= 1.0.0`, `user-invocable: true`)
- [ ] Frontmatter `description` field includes trigger phrases: "implement", "execute plan", "build slice", "complete slice" (embedded in the description value, not as separate frontmatter)
- [ ] `rm -rf dist && bun run build:plugin && ls dist/gp-plugin/skills/implement/SKILL.md` — present in dist

### Tasks

- [x] Create `skills/implement/` directory
- [x] Create `skills/implement/SKILL.md` with orchestrator structure following plan-slice and create-epic patterns:
  - **Frontmatter**: `name: implement`, `description: <include trigger phrases "implement", "execute plan", "build slice", "complete slice" inside the description field value, matching the plan-slice pattern>`, `requires: gp >= 1.0.0`, `user-invocable: true`.
  - **Context discipline section**: orchestrator rules (no Read on artifacts, only CLI output + sub-agent returns + user Q&A)
  - **Step 0 — Setup**: Version check via `$GP --version --json`. Define `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"`.
  - **Step 1 — Scope resolution**: Accept slice name or auto-detect via `$GP status --json` → `.activeSlice`. For quests: accept quest name or check `.activeQuest`.
  - **Step 2 — State transition and re-entry**: Query `$GP slice:show --slice <name> --json`.
    - If status is `plan-refined`: transition to `implementing` via `$GP slice:implement --slice <name>`.
    - If status is `implementing`: read the `implementationPhase` field from the slice JSON to determine the current phase index and resume from there. Present: "Implementation in progress. Resuming from Phase N."
  - **Step 3 — Plan loading**: Orchestrator reads the plan overview itself (this is a structural parse of phase names and paths, not content reading — analogous to reading a table of contents). Returns phase list for iteration. No sub-agent needed for this structural operation.
  - **Step 4 — Pre-implementation**: Check `git status --porcelain` for clean state. Pass architecture `_overview.md` path to implement-phase agent (for maturity extraction by the agent itself).
  - **Step 5 — Implementation loop** (per plan phase, single-pass — review loop added in Phase 3):
    1. Spawn `implement-phase` agent — pass: phase content path, iteration number (1), plan slug, scope dir, architecture `_overview.md` path
    2. Parse agent return — check `status` and `redGreenResults.passed` (boolean). The orchestrator reads only pass/fail status from the agent return, never Expected Behavior content directly.
    3. If RED checks have UNEXPECTED-PASS: surface to user via AskUserQuestion
    4. Orchestrator commits: `git add <filesChanged> && git commit -m "[slug] Phase N: <phase-name>"`
    5. Verify commit via `git log --oneline -1`
    6. Update `implementationPhase` via `$GP submit-implementation --slice <name> --phase <N>` to track progress
    7. Advance to next phase
- [ ] Add `implementationPhase` field to the slice data model — this spans multiple layers per INV-001 and INV-005:
  1. **Schema**: Add optional field to `src/schemas/entities/slice.ts` (e.g., `implementationPhase: z.number().int().min(0).nullable()`). Must be backward-compatible with existing slice.json files.
  2. **State machine event**: Add a new event `UPDATE_IMPLEMENTATION_PHASE` with a transition handler and the following guard semantics:
     - Event is valid only when slice status is `implementing` (reject otherwise)
     - Value must be >= current `implementationPhase` (monotonic — never decrements)
     - `BEGIN_IMPLEMENTATION` initializes `implementationPhase` to 0
     - `COMPLETE_IMPLEMENTATION` does not clear the field (it is historical)
     - Add a transition row to the transition table for this event
  3. **CLI command**: Extend the existing `submit-implementation` command (in `src/commands/subagent/`) with a `--phase` flag: `$GP submit-implementation --slice <name> --phase <N>`. This reuses the existing subagent namespace rather than creating a new top-level command.
     - Update `submitImplementationInputSchema` in `src/schemas/commands/submit.ts` to add an optional `phase` integer field
     - Add `{ type: 'UPDATE_IMPLEMENTATION_PHASE'; epic: string; slice: string; phase: number; ts: string }` to the `StateEvent` union in `src/schemas/state-events.ts`
     - Add the `--phase` flag to `src/commands/subagent/submit-implementation.ts`
     - Register the flag in the command's argument parser
     - When `--phase` is provided, emit `UPDATE_IMPLEMENTATION_PHASE` instead of `COMPLETE_IMPLEMENTATION`
  4. **CLI surface**: Update `slice:show` output to include the `implementationPhase` field.

### Verification

Verify the skill file is well-formed: has all required sections, references valid agent names, CLI commands match the current API surface. Build the plugin and confirm the skill is included. Verify the single-pass loop works end-to-end before adding review complexity.

## Phase 3: Implement Orchestrator — Review Loop

Add the review loop to the implementation loop in `skills/implement/SKILL.md`, following the same mechanical pattern as plan-slice.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] The implement skill has no review/feedback cycle — single-pass only

**After implementation** (should pass / show presence):
- [ ] Step 5 includes full review loop: coordinator → reviewers → synthesis → feedback → re-implementation
- [ ] Iteration safeguards are present (max 12, early exit, stall detection)
- [ ] Review loop follows the same mechanical pattern as plan-slice (coordinator returns spawn plan, orchestrator follows it)

### Tasks

- [x] Update Step 5 in `skills/implement/SKILL.md` to add review loop after implementation:
  - After parsing implement-phase agent return (sub-step 2), add review cycle:
    3. Spawn `refinement-coordinator` — pass list of changed file paths (from `git diff --name-only`), `review_context: "code-implementation"`
    4. Spawn reviewer agents in parallel per coordinator's spawn plan
    5. Spawn `synthesis` — merge reviewer output, return scores
    6. If scores don't pass (< 9, or CRITICAL/IMPORTANT issues): spawn `implement-phase` again with merged feedback path, increment iteration, loop to sub-step 2
    7. If scores pass: run post-phase checks (lint/build/test via bash)
  - Follow the same mechanical review loop pattern as plan-slice — reference `skills/_shared/references/iteration-loop.md` for the loop structure. Do NOT describe the full loop inline in SKILL.md.
- [x] Add Step 5b — Iteration safeguards: Max 12 iterations per phase. Early exit at 5+ iterations if all scores >= 8 and no CRITICAL/IMPORTANT. Stall detection at iteration 3+ if no score improvement. Research handling when synthesis flags RESEARCH_NEEDED.
- [x] Define a **Loop Parameters** section in `skills/implement/SKILL.md` filling all 11 slots required by `iteration-loop.md`:
  1. `reviewer_list`: determined dynamically by refinement-coordinator per phase
  2. `exit_criteria`: all scores >= 9, no CRITICAL/IMPORTANT issues
  3. `early_exit`: iteration >= 5 AND all scores >= 8 AND no CRITICAL/IMPORTANT
  4. `max_iterations`: 12
  5. `editor_prompt_path`: `agents/implement-phase.md` — note: `implement-phase` doubles as the editor agent for implementation loops. Unlike `plan-slice` (which uses a dedicated `editor.md` to apply diffs), here `implement-phase` is re-spawned directly with merged feedback and produces a revised implementation. No separate editor agent is needed.
  6. `score_thresholds`: { pass: 9, early_exit: 8 }
  7. `scope_constraints`: slice scope directory
  8. `working_directory`: repo root
  9. `run_directory`: `<epic>/slices/<slice>/implementation/`
  10. `backup_directory`: not applicable (git provides history)
  11. `review_context`: `"code-implementation"`
- [x] Verify/adapt `refinement-coordinator` agent for `review_context: "code-implementation"` — this is the first skill to exercise this context type. The coordinator already accepts `review_context: "code-implementation"` as a defined input value. Clarify the input format: the orchestrator writes changed file paths (from `git diff --name-only`) to a summary file and passes that file as the "artifact" to the coordinator. The coordinator reads it and selects reviewers by file extensions/paths. No structural change to the coordinator is needed. No changes needed to `reviewer-registry.md` — reviewers are domain-based, not review-context-based.
- [x] Port relevant reference files from `skills/implement-plan/references/` — create `skills/implement/references/` and copy `reviewer-registry.md` into it. Do NOT port `sub-agent-prompts.md` (architecturally regressive — use named agent definitions instead). Reference `dependency-research.md` and `codebase-context-discovery.md` via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/` injection.
- [x] Add verification step for `review_context: "code-implementation"` string — confirm the coordinator handles it correctly since this is the first usage.

### Verification

Verify the review loop integrates cleanly with the single-pass skeleton from Phase 2. Confirm the coordinator selects appropriate reviewers for code-implementation context. Run a manual trace through the loop logic to verify iteration counting and exit conditions.

## Phase 4: Implement Orchestrator — Completion Integration

Add slice completion to `skills/implement/SKILL.md`: spawn `completion-slice` agent, surface recommendations, run CLI state transitions.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] The implement skill has no completion step after the implementation loop

**After implementation** (should pass / show presence):
- [ ] Step 6 spawns `completion-slice` agent and surfaces recommendations
- [ ] Step 7 calls `$GP submit-implementation --slice <name>` then `$GP slice:complete --slice <name> --json`
- [ ] Both state transitions are explicit and in the correct order

### Tasks

- [x] Add Step 6 — Slice completion: After all phases complete, spawn `completion-slice` agent with slice path, plan path, changed files from all phases. Changed files are accumulated by concatenating the `filesChanged` arrays from each implement-phase agent return across all phase iterations into a running list (deduplicated). Alternatively, the orchestrator can use `git diff --name-only <pre-implementation-commit>..HEAD` to capture the full set — prefer the git approach as it captures any files the agent missed reporting. Parse return — surface recommendations to user via AskUserQuestion (architecture updates, debt classification, side quest proposals). Write completion artifacts.
- [x] Add Step 7 — CLI submit: First call `$GP submit-implementation --slice <name>` to transition from `implementing` to `implementation-complete`. Then call `$GP slice:complete --slice <name> --json` with the full JSON payload: `{ verificationPassed: true, learnings: [...], architectureDelta: [...], deferred: [...] }` — where `verificationPassed` comes from the completion-slice agent's evaluation, and the remaining fields are populated from the agent's return. If this is the last slice in the epic, present: "All slices complete. Run `/gp:complete-epic` when ready."
- [x] Add Step 8 — Done summary

### Verification

Verify the full state transition chain: `plan-refined` → `implementing` (Phase 2) → `implementation-complete` (submit-implementation) → `completed` (slice:complete). Confirm the orchestrator surfaces completion-slice recommendations before running CLI transitions.

## Phase 5: Complete-Epic Skill

Build `skills/complete-epic/SKILL.md` — a standalone skill for epic-level completion.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/complete-epic/SKILL.md` — file not found

**After implementation** (should pass / show presence):
- [ ] `ls skills/complete-epic/SKILL.md` — file exists
- [ ] Skill has valid frontmatter (`name: complete-epic`, `description`, `requires: gp >= 1.0.0`, `user-invocable: true`)
- [ ] `rm -rf dist && bun run build:plugin && ls dist/gp-plugin/skills/complete-epic/SKILL.md` — present in dist

### Tasks

- [x] Create `skills/complete-epic/` directory
- [x] Create `skills/complete-epic/SKILL.md`:
  - **Frontmatter**: `name: complete-epic`, `description: <include trigger phrases "complete epic", "finish epic", "epic completion", "close epic", "wrap up epic" inside the description field value, matching the plan-slice pattern>`, `requires: gp >= 1.0.0`, `user-invocable: true`
  - **Step 0 — Setup**: Version check via `$GP --version --json`. Define `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"`.
  - **Step 1 — Scope resolution**: Accept epic name or auto-detect via `$GP status --json` → `.activeEpic`
  - **Step 2 — Guardrail**: Verify all slices are completed/abandoned via `$GP slice:list --json`, filtering for non-terminal statuses (any slice not in `completed` or `abandoned`). If any non-terminal slices remain, list them with their current status and stop.
  - **Step 3 — Re-entry detection**: Check for existing `completion/learnings.md` and `completion/architecture-updates.md` in the epic directory. Offer resume from where it stopped.
  - **Step 4 — Spawn completion-epic agent**: Pass epic path, all slice learnings paths (gathered via `$GP slice:list --json` to discover slice names, then construct paths deterministically), all slice architecture-updates paths. Include `reconsiderWhen`/`validUntil` conditions from `$GP decision:list --json` and `$GP learning:list --json`. Forward-compat gate: run each command with `--json` and inspect the output schema before relying on these fields. If entries lack `reconsiderWhen` or `validUntil` fields, skip condition evaluation in Step 4c entirely — do not error. Follow the same forward-compat pattern established in `plan-slice` SKILL.md as the precedent.
  - **Step 5 — Surface recommendations**: Parse agent return. For architecture reconciliation items, use AskUserQuestion: "Update top-level architecture? / Mark as incomplete work (side quest) / Document as intentional scope reduction / Skip". Apply approved updates.
  - **Step 6 — Artifact promotion**: Promote research, brainstorm, prototype files from epic to project level. These are LLM-owned markdown files outside `.goodplan/` JSON state, so `cp -n` (no-clobber) is appropriate for idempotent promotion — re-entry won't overwrite previously promoted artifacts. The agent identifies which files to promote, the orchestrator copies them.
  - **Step 7 — CLI submit**: `$GP epic:complete --epic <name> --json` with learnings payload.
  - **Step 8 — Done summary**

### Verification

Verify the skill is well-formed and references the correct agent name (`completion-epic`) and CLI commands. Build plugin and confirm inclusion.

## Phase 6: Test Harness

Create `test-implement.ts` and `test-complete-epic.ts` dogfood scripts following established patterns.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tools/dogfood/test-implement.ts tools/dogfood/test-complete-epic.ts` — both files not found

**After implementation** (should pass / show presence):
- [ ] `ls tools/dogfood/test-implement.ts tools/dogfood/test-complete-epic.ts` — both files exist
- [ ] `bun tools/dogfood/test-implement.ts --help` or initial parse succeeds (no syntax errors)
- [ ] `bun tools/dogfood/test-complete-epic.ts --help` or initial parse succeeds

### Tasks

- [x] Create `tools/dogfood/test-implement.ts`:
  - Follow patterns from `test-plan-slice.ts` and `test-create-epic.ts`
  - **Fixture setup**: Create a temp project with a slice in `plan-refined` status, containing a 2-phase minimal plan (phase 1: create a utility function, phase 2: add tests for it)
  - **Main test**: Invoke `/gp:implement` skill via Agent SDK `query()` with `plugins: [{ type: "local", path: PLUGIN_DIR }]`
  - **Assertions**: All plan phases implemented with review loops, `gp slice:show` returns `completed`, git log shows `[implement-pipeline] Phase 1:` and `Phase 2:` commits, `completion/learnings.md` exists, architecture review ran
  - **Re-entry test fixture setup**: (a) create slice via CLI, (b) advance to `implementing` status via `$GP slice:implement --slice <name>`, (c) set `implementationPhase` to 1 via `$GP submit-implementation --slice <name> --phase 1` (the command added in Phase 2), verify the command succeeds before proceeding, (d) make file changes and commit with `[slug] Phase 1: <description>` format, (e) invoke the skill, (f) assert resume from phase 2 (doesn't re-implement phase 1)
  - **Orchestrator discipline**: Run `verifyNoArtifactReads()` (from `tools/dogfood/utils.ts`) on the transcript
  - Accept `--model` parameter for model selection (default haiku for structural)
- [ ] Create `tools/dogfood/test-complete-epic.ts`:
  - **Fixture setup**: Create a temp project with an epic where all slices are `completed`, each with `completion/learnings.md`
  - **Main test**: Invoke `/gp:complete-epic` skill
  - **Assertions**: `gp epic:show` returns `completed`, cross-slice learnings synthesized, architecture reconciliation ran, artifacts promoted
  - Accept `--model` parameter
- [x] Add mode-isolation test (in `test-implement.ts` or separate):
  - Spawn `completion-slice` agent with slice-level inputs → assert return JSON has no `consolidatedLearnings` field, summary does not mention "cross-slice" or "epic-level"
  - Spawn `completion-epic` agent with epic-level inputs → assert return contains `consolidatedLearnings` and architecture reconciliation recommendations
- [x] Add integration test for `review_context: "code-implementation"` — confirm the refinement-coordinator selects appropriate code reviewers (not plan/architecture reviewers)

### Verification

Both test scripts should parse without errors. Fixture creation should work against a fresh temp directory.

## Phase 7: Integration Verification

Run all tests end-to-end and verify the complete system works together.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/test-implement.ts` — exits with non-zero (assertions fail on missing implementation). Note: this script is created in Phase 6. The before-check validates that the test correctly detects incomplete integration (i.e., assertion failures), not that the script doesn't exist.
- [ ] `bun tools/dogfood/test-complete-epic.ts` — exits with non-zero (assertions fail on missing implementation). Same note as above.

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/test-implement.ts` — full pipeline completes: all phases implemented, review loops run, slice completed
- [ ] `bun tools/dogfood/test-complete-epic.ts` — epic completion runs: learnings synthesized, architecture reconciled
- [ ] `bun test` — all existing tests still pass
- [ ] `rm -rf dist && bun run build:plugin` — dist includes all new files (3 agents, 2 skills)

### Tasks

- [x] Run `rm -rf dist && bun run build:plugin` and verify dist contains: `agents/implement-phase.md`, `agents/completion-slice.md`, `agents/completion-epic.md`, `skills/implement/SKILL.md`, `skills/complete-epic/SKILL.md`
- [ ] Run `bun tools/dogfood/test-implement.ts` — iterate until all checks pass (exit criterion: zero exit code with all assertions green)
- [ ] Run `bun tools/dogfood/test-complete-epic.ts` — iterate until all checks pass (exit criterion: zero exit code with all assertions green)
- [ ] Verify re-entry test passes (fixture with `implementationPhase` set, skill resumes from correct phase)
- [ ] Verify mode-isolation test passes (completion-slice vs completion-epic agent outputs)
- [ ] Verify orchestrator discipline — no Read calls on architecture/plan/source files in implement orchestrator transcript
- [x] Run `bun test` to confirm no regressions
- [x] Note: documentation updates to CLAUDE.md for the new implement and complete-epic skills are out of scope for this slice — capture via `$GP task:create` if needed

### Verification

All dogfood tests pass. All existing tests pass. Build includes all new artifacts. Orchestrator discipline verified. The implement pipeline successfully takes a slice from `plan-refined` to `completed`.
