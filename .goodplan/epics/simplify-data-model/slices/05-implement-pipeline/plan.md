# Plan: Implement Pipeline + Complete-Epic

## Overview

Build the `/gp:implement` pipeline skill (autonomous implementation + review loops + slice completion) and the `/gp:complete-epic` standalone skill (epic-level learnings synthesis, architecture reconciliation, artifact promotion). This produces two new agent definitions (`implement-phase.md`, `completion-phase.md`), two new skill directories, and two dogfood test harness scripts.

The implement orchestrator takes over the role of the current `implement-plan` skill, managing the same sub-agent coordination (implementation → reviewers → synthesis → feedback loop) but as a lightweight orchestrator that follows context discipline. The completion-phase agent has two explicit modes (`slice` and `epic`) selected via the task prompt.

Key design decisions:
- **Orchestrator commits**: One git commit per plan phase, made by the orchestrator after the review loop passes. The implement-phase agent focuses purely on implementation.
- **Agent runs red-green checks**: The implement-phase agent handles Expected Behavior before/after checks as part of its work.
- **Explicit mode field**: completion-phase agent receives `{ mode: "slice" | "epic" }` in the task prompt — no inference from input shape.
- **Re-entry via git log**: Orchestrator checks git log for `[slug] Phase N:` commits to find the last completed phase and resumes from the next.
- **Full feature parity**: The orchestrator carries over all current implement-plan features (red-green cycle, research, stall detection, iteration cap, maturity context).

## Phase 1: Agent Definitions

Create `implement-phase.md` and `completion-phase.md` agent definitions in `agents/`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls agents/implement-phase.md agents/completion-phase.md` — both files not found
- [ ] `bun run build:plugin && ls dist/gp-plugin/agents/implement-phase.md` — file not found in dist

**After implementation** (should pass / show presence):
- [ ] `ls agents/implement-phase.md agents/completion-phase.md` — both files exist
- [ ] Both files have valid frontmatter (`name`, `description`, `model: opus`)
- [ ] Both files use `@${CLAUDE_PLUGIN_ROOT}/` references for shared content injection (not `skills:` frontmatter)
- [ ] `bun run build:plugin && ls dist/gp-plugin/agents/implement-phase.md dist/gp-plugin/agents/completion-phase.md` — both present in dist
- [ ] `@` references in agent bodies point to files that exist in the repo

### Tasks

- [ ] Create `agents/implement-phase.md`:
  - Frontmatter: `name: implement-phase`, `description: Implements a single plan phase...`, `model: opus`
  - Body: instructions for implementing a plan phase, running red-green Expected Behavior checks, handling research needs, reporting changed files
  - Inject shared content via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/` for review output format, CLI interaction conventions
  - Return format: `{ status: "SUCCESS" | "PARTIAL" | "FAILED", summary, filesChanged: [...], redGreenResults: {...} }`
  - Agent receives in task prompt: phase content path, iteration number, merged feedback path (if any), plan slug, scope directory, maturity context
  - Agent handles: reading the plan phase, running before-checks (RED), implementing code, running after-checks (GREEN), reporting results — but does NOT commit
- [ ] Create `agents/completion-phase.md`:
  - Frontmatter: `name: completion-phase`, `description: Synthesizes learnings and reviews architecture...`, `model: opus`
  - Body: two explicit mode sections — `## Slice Mode` and `## Epic Mode`
  - **Slice mode** input: slice path, plan path, changed files list. Output: learnings, architecture delta recommendations, side quest proposals, project-health updates
  - **Epic mode** input: epic path, all slice learnings paths, cross-slice summary. Output: consolidated learnings, architecture reconciliation recommendations, promoted artifact list
  - Agent evaluates `reconsiderWhen` and `validUntil` conditions when provided in task prompt
  - Return format: `{ status: "SUCCESS" | "PARTIAL" | "FAILED", summary, filesWritten: [...], recommendations: [...], triggeredConditions: [...] }`
- [ ] Verify `build-plugin.sh` already copies `agents/` to dist (added in slice 02) — no changes needed

### Verification

Run `bun run build:plugin` and inspect the dist to confirm both new agent files are present alongside existing agents. Verify the total agent count increased by 2.

## Phase 2: Implement Orchestrator

Build `skills/implement/SKILL.md` — a pipeline skill that replaces the current `implement-plan` + `complete` (slice-level).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/implement/SKILL.md` — file not found
- [ ] `bun run build:plugin && ls dist/gp-plugin/skills/implement/SKILL.md` — not in dist

**After implementation** (should pass / show presence):
- [ ] `ls skills/implement/SKILL.md` — file exists
- [ ] Skill has valid frontmatter (`name: implement`, `description`, `requires: gp >= 1.0.0`)
- [ ] `bun run build:plugin && ls dist/gp-plugin/skills/implement/SKILL.md` — present in dist

### Tasks

- [ ] Create `skills/implement/` directory
- [ ] Create `skills/implement/SKILL.md` with orchestrator structure following plan-slice and create-epic patterns:
  - **Frontmatter**: `name: implement`, `description: ...`, `requires: gp >= 1.0.0`
  - **Context discipline section**: orchestrator rules (no Read on artifacts, only CLI output + sub-agent returns + user Q&A)
  - **Phase table**: Phase 1 (autonomous: implementation loop), Phase 2 (autonomous: slice completion)
  - **Step 0 — Version check**: `$GP --version --json`
  - **Step 1 — Scope resolution**: Accept slice name or auto-detect via `$GP status --json` → `.activeSlice`. For quests: accept quest name or check `.activeQuest`.
  - **Step 2 — Re-entry detection**: Query `$GP slice:show --slice <name> --json`. If status is `implementing`, check git log for `[slug] Phase N:` commits. Present: "Implementation in progress. Last completed: Phase N. Resume from Phase N+1?" If status is `plan-refined`, start fresh via `$GP slice:implement --slice <name>`.
  - **Step 3 — Plan loading**: Orchestrator spawns a sub-agent to parse the plan and return the phase list (phase names, file paths). Orchestrator receives structured list, not plan content.
  - **Step 4 — Pre-implementation**: Check `git status --porcelain` for clean state. Load maturity context via `$GP` CLI.
  - **Step 5 — Implementation loop** (per plan phase):
    1. Spawn `implement-phase` agent — pass: phase content path, iteration number (starting at 1), merged feedback path (none for first iteration), plan slug, scope dir, maturity context
    2. Parse agent return — check status, filesChanged, redGreenResults
    3. If RED checks have UNEXPECTED-PASS: surface to user via AskUserQuestion
    4. Spawn `refinement-coordinator` — pass artifact path (the changed files), `review_context: "code-implementation"`
    5. Spawn reviewer agents in parallel per coordinator's spawn plan
    6. Spawn `synthesis` — merge reviewer output, return scores
    7. If scores don't pass (< 9, or CRITICAL/IMPORTANT issues): spawn `implement-phase` again with merged feedback path, increment iteration, loop to sub-step 3
    8. If scores pass: run post-phase checks (lint/build/test via bash), run GREEN checks via one more implement-phase spawn if needed
    9. Orchestrator commits: `git add <filesChanged> && git commit -m "[slug] Phase N: <phase-name>"`
    10. Verify commit via `git log --oneline -1`
    11. Advance to next phase
  - **Step 5b — Iteration safeguards**: Max 12 iterations per phase. Early exit at 5+ iterations if all scores ≥ 8 and no CRITICAL/IMPORTANT. Stall detection at iteration 3+ if no score improvement. Research handling when synthesis flags RESEARCH_NEEDED.
  - **Step 6 — Slice completion**: After all phases complete, spawn `completion-phase` agent with `mode: "slice"`, slice path, plan path, changed files from all phases. Parse return — surface recommendations to user via AskUserQuestion (architecture updates, debt classification, side quest proposals). Write completion artifacts.
  - **Step 7 — CLI submit**: `$GP slice:complete --slice <name> --json` with learnings payload from completion-phase return. If this is the last slice in the epic, present: "All slices complete. Run `/gp:complete-epic` when ready."
  - **Step 8 — Done summary**
- [ ] Create `skills/implement/references/` directory if needed for any skill-specific reference files (reviewer registry, sub-agent prompt templates)
- [ ] Port relevant reference files from `skills/implement-plan/references/` — reviewer-registry.md, sub-agent-prompts.md, dependency-research.md, codebase-context-discovery.md — adapting paths for the new skill location

### Verification

Verify the skill file is well-formed: has all required sections, references valid agent names, CLI commands match the current API surface. Build the plugin and confirm the skill is included.

## Phase 3: Complete-Epic Skill

Build `skills/complete-epic/SKILL.md` — a standalone skill for epic-level completion.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/complete-epic/SKILL.md` — file not found

**After implementation** (should pass / show presence):
- [ ] `ls skills/complete-epic/SKILL.md` — file exists
- [ ] Skill has valid frontmatter (`name: complete-epic`, `description`, `requires: gp >= 1.0.0`)
- [ ] `bun run build:plugin && ls dist/gp-plugin/skills/complete-epic/SKILL.md` — present in dist

### Tasks

- [ ] Create `skills/complete-epic/` directory
- [ ] Create `skills/complete-epic/SKILL.md`:
  - **Frontmatter**: `name: complete-epic`, `description: ...`, `requires: gp >= 1.0.0`
  - **Step 0 — Version check**
  - **Step 1 — Scope resolution**: Accept epic name or auto-detect via `$GP status --json` → `.activeEpic`
  - **Step 2 — Guardrail**: Verify all slices are completed/abandoned via `$GP slice:list --json`. If any non-terminal slices remain, list them and stop.
  - **Step 3 — Re-entry detection**: Check for existing `completion/learnings.md` and `completion/architecture-updates.md` in the epic directory. Offer resume from where it stopped.
  - **Step 4 — Spawn completion-phase agent**: Pass `mode: "epic"`, epic path, all slice learnings paths (gathered via `ls` on `<epic>/slices/*/completion/learnings.md`), all slice architecture-updates paths. Include `reconsiderWhen`/`validUntil` conditions from `$GP decision:list --json` and `$GP learning:list --json`.
  - **Step 5 — Surface recommendations**: Parse agent return. For architecture reconciliation items, use AskUserQuestion: "Update top-level architecture? / Mark as incomplete work (side quest) / Document as intentional scope reduction / Skip". Apply approved updates.
  - **Step 6 — Artifact promotion**: Promote research, brainstorm, prototype files from epic to project level (agent identifies which ones, orchestrator copies via `cp`).
  - **Step 7 — CLI submit**: `$GP epic:complete --epic <name> --json` with learnings payload.
  - **Step 8 — Done summary**

### Verification

Verify the skill is well-formed and references the correct agent name and CLI commands. Build plugin and confirm inclusion.

## Phase 4: Test Harness

Create `test-implement.ts` and `test-complete-epic.ts` dogfood scripts following established patterns.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tools/dogfood/test-implement.ts tools/dogfood/test-complete-epic.ts` — both files not found

**After implementation** (should pass / show presence):
- [ ] `ls tools/dogfood/test-implement.ts tools/dogfood/test-complete-epic.ts` — both files exist
- [ ] `bun tools/dogfood/test-implement.ts --help` or initial parse succeeds (no syntax errors)
- [ ] `bun tools/dogfood/test-complete-epic.ts --help` or initial parse succeeds

### Tasks

- [ ] Create `tools/dogfood/test-implement.ts`:
  - Follow patterns from `test-plan-slice.ts` and `test-create-epic.ts`
  - **Fixture setup**: Create a temp project with a slice in `plan-refined` status, containing a 2-phase minimal plan (phase 1: create a utility function, phase 2: add tests for it)
  - **Main test**: Invoke `/gp:implement` skill via Agent SDK `query()` with `plugins: [{ type: "local", path: PLUGIN_DIR }]`
  - **Assertions**: All plan phases implemented with review loops, `gp slice:show` returns `completed`, git log shows `[implement-pipeline] Phase 1:` and `Phase 2:` commits, `completion/learnings.md` exists, architecture review ran
  - **Re-entry test**: Create a fixture with phase 1 commits already present, invoke skill, verify it resumes from phase 2 (doesn't re-implement phase 1)
  - **Orchestrator discipline**: Run `verifyOrchestratorDiscipline()` on the transcript
  - Accept `--model` parameter for model selection (default haiku for structural)
- [ ] Create `tools/dogfood/test-complete-epic.ts`:
  - **Fixture setup**: Create a temp project with an epic where all slices are `completed`, each with `completion/learnings.md`
  - **Main test**: Invoke `/gp:complete-epic` skill
  - **Assertions**: `gp epic:show` returns `completed`, cross-slice learnings synthesized, architecture reconciliation ran, artifacts promoted
  - Accept `--model` parameter
- [ ] Add mode-isolation test (can be in `test-implement.ts` or separate):
  - Run completion-phase with slice-level prompt → assert output does NOT contain cross-slice synthesis
  - Run completion-phase with epic-level prompt → assert output contains consolidated learnings + architecture reconciliation

### Verification

Both test scripts should parse without errors. Fixture creation should work against a fresh temp directory.

## Phase 5: Integration Verification

Run all tests end-to-end and verify the complete system works together.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/test-implement.ts` — test not yet validated end-to-end
- [ ] `bun tools/dogfood/test-complete-epic.ts` — test not yet validated end-to-end

**After implementation** (should pass / show presence):
- [ ] `bun tools/dogfood/test-implement.ts` — full pipeline completes: all phases implemented, review loops run, slice completed
- [ ] `bun tools/dogfood/test-complete-epic.ts` — epic completion runs: learnings synthesized, architecture reconciled
- [ ] `bun test` — all existing tests still pass
- [ ] `bun run build:plugin` — dist includes all new files (2 agents, 2 skills)

### Tasks

- [ ] Run `bun run build:plugin` and verify dist contains: `agents/implement-phase.md`, `agents/completion-phase.md`, `skills/implement/SKILL.md`, `skills/complete-epic/SKILL.md`
- [ ] Run `bun tools/dogfood/test-implement.ts` — fix any issues found
- [ ] Run `bun tools/dogfood/test-complete-epic.ts` — fix any issues found
- [ ] Verify re-entry test passes (fixture with phase 1 commits, skill resumes from phase 2)
- [ ] Verify mode-isolation test passes (slice-level vs epic-level completion-phase outputs)
- [ ] Verify orchestrator discipline — no Read calls on architecture/plan/source files in implement orchestrator transcript
- [ ] Run `bun test` to confirm no regressions
- [ ] Fix any issues discovered during testing — iterate until all checks pass

### Verification

All dogfood tests pass. All existing tests pass. Build includes all new artifacts. Orchestrator discipline verified. The implement pipeline successfully takes a slice from `plan-refined` to `completed`.
