# Plan: Plan-Slice Proof of Concept

## Overview

Build the agent infrastructure and plan-slice orchestrator as the core tracer bullet for the orchestrator pattern. This is the simplest pipeline (2 phases: interactive Q&A → autonomous refinement) but exercises all key mechanisms: agent definitions with `@` reference injection, orchestrator context discipline (CLI status + sub-agent returns only), the refinement loop (coordinator → reviewers → synthesis → editor), sub-agent return format parsing, and the temp-dir working artifact pattern that keeps `.goodplan/` clean for HMAC integrity.

**Slug**: `plan-slice-poc`

**Key decisions from planning Q&A**:
- `@${CLAUDE_PLUGIN_ROOT}/path` references for content injection in agent bodies (NOT `skills:` frontmatter — issue #25834)
- Plan-format conventions injected into plan-phase agent via `@` reference (not inline)
- Refinement loop exit: all reviewers ≥ 9/10. Hard cap 10 iterations. Warn if net score doesn't rise between adjacent rounds. Stop after 2 adjacent rounds with no improvement, or 2 rounds (adjacent or not) with net score reduction.
- Synthesis agent uses LLM judgment to resolve reviewer disagreements
- Orchestrator handles all CLI status transitions (sub-agents focus on content)
- Q&A output written as structured markdown
- All working artifacts (Q&A, reviews, synthesis, continuations) written to `/tmp/gp-plan-slice-<name>-<ts>/` — only final plan.md written via `gp submit-plan`
- Build-plugin.sh validates agent frontmatter (name + description), consistent with skill validation

## Phase 1: Shared References & Agent Definitions

Create the `agents/` directory and shared reference files that all pipeline skills will use.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls agents/` → "No such file or directory"
- [ ] `ls skills/_shared/references/review-preamble.md` → "No such file or directory"
- [ ] `grep -r "reviewer-holistic" agents/` → no matches

**After implementation** (should pass / show presence):
- [ ] `ls agents/*.md` → 7 files: `plan-phase.md`, `refinement-coordinator.md`, `synthesis.md`, `editor.md`, `reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-agent-skill.md`
- [ ] `ls skills/_shared/references/review-*.md` → 3 files: `review-holistic.md`, `review-software-architecture.md`, `review-agent-skill.md`
- [ ] `ls skills/_shared/references/review-preamble.md` → exists
- [ ] Each agent `.md` has valid frontmatter with `name:`, `description:`, `model: opus`
- [ ] Each reviewer agent body contains `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md` reference
- [ ] Each reviewer agent body contains its domain-specific `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md` reference
- [ ] `plan-phase.md` body contains `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/plan-format.md` reference (new shared reference extracted from existing create-plan skill)

### Tasks

- [ ] Create `agents/` directory at repo root
- [ ] Create `skills/_shared/references/review-preamble.md` — output format (`## Issues` with severity/resolution tags, `## Score: X/10` with justification, `## Summary` with severity counts), severity levels (CRITICAL, IMPORTANT, SUGGESTION, NITPICK), score rubric (1-10 scale with anchor descriptions)
- [ ] Create `skills/_shared/references/review-holistic.md` — holistic review criteria (goal alignment, completeness, coherence, risks, missing considerations)
- [ ] Create `skills/_shared/references/review-software-architecture.md` — architecture review criteria (subsystem boundaries, API surfaces, dependency direction, coupling, cohesion, SOLID principles)
- [ ] Create `skills/_shared/references/review-agent-skill.md` — agent/skill review criteria (context discipline, prompt clarity, tool usage patterns, sub-agent coordination, error handling, re-entry)
- [ ] Extract plan format conventions from existing `skills/create-plan/references/plan-format.md` into `skills/_shared/references/plan-format.md` (new shared reference for injection into plan-phase agent)
- [ ] Create `agents/plan-phase.md` — drafts implementation plans from Q&A output + architecture file paths. Injects plan-format.md via `@` reference. Returns structured JSON (status, summary, filesWritten). Reads architecture files and Q&A output directly (sub-agent has Read access). Writes plan draft to the temp working directory path provided in task prompt.
- [ ] Create `agents/refinement-coordinator.md` — reads an artifact (plan, architecture, slices), analyzes content, selects relevant reviewers from the available set, returns structured spawn plan (which reviewers to spawn, artifact path, review context). Does NOT spawn reviewers itself.
- [ ] Create `agents/reviewer-holistic.md` — composes review-preamble + review-holistic via `@` references. Adapts focus based on `review_context` passed in task prompt. Returns structured JSON with score, issues, summary.
- [ ] Create `agents/reviewer-software-architecture.md` — composes review-preamble + review-software-architecture via `@` references. Same pattern.
- [ ] Create `agents/reviewer-agent-skill.md` — composes review-preamble + review-agent-skill via `@` references. Same pattern.
- [ ] Create `agents/synthesis.md` — merges multiple reviewer outputs, deduplicates issues, resolves contradictions using LLM judgment, returns aggregate score + merged issues + severity counts.
- [ ] Create `agents/editor.md` — receives artifact path + synthesis output path, applies review feedback to the artifact, returns structured JSON with updated file paths.

### Verification

- Manually inspect each agent `.md` for valid YAML frontmatter and `@` reference syntax
- Verify `@` reference paths match actual file locations in `skills/_shared/references/`
- Check that no agent body exceeds ~500 lines (size guidance from conventions)
- Verify review-preamble.md defines a complete, unambiguous scoring rubric

## Phase 2: Build Pipeline & Plugin Manifest

Update build-plugin.sh to validate agent definitions and declare them in plugin.json.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run build:plugin` succeeds but doesn't validate agent frontmatter — no "Verifying agents..." output
- [ ] `cat dist/gp-plugin/.claude-plugin/plugin.json | grep agents` → no match

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin` outputs "Verifying agents..." and validates name + description frontmatter for each agent `.md`
- [ ] `cat dist/gp-plugin/.claude-plugin/plugin.json | grep agents` → `"agents": "./agents"`
- [ ] `ls dist/gp-plugin/agents/*.md` → all 7 agent files present
- [ ] Remove `name:` from one agent file, run `bun run build:plugin` → build fails with "FAIL: ... missing or incorrect name: field"

### Tasks

- [ ] Add `"agents": "./agents"` to the plugin.json manifest template in `build-plugin.sh`
- [ ] Add agent verification section after skill verification — validate each `.md` in `agents/` has frontmatter with `name:` and `description:` fields
- [ ] Add agent count to the build summary output (e.g., "Packaged 7 agents")
- [ ] Verify the existing `rsync` for agents/ (already in build-plugin.sh lines 48-51) copies all files correctly

### Verification

- Run `bun run build:plugin` end-to-end, confirm agents are copied and validated
- Intentionally break an agent's frontmatter, confirm build fails with a clear error message
- Run `claude plugin validate dist/gp-plugin/` (if available) to confirm the `"agents"` field is accepted

## Phase 3: Plan-Slice Orchestrator Skill

Build the plan-slice pipeline skill as a lightweight orchestrator with 2 phases.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/plan-slice/SKILL.md` → "No such file or directory"
- [ ] Invoking `/gp:plan-slice` in a Claude session → "No matching skill"

**After implementation** (should pass / show presence):
- [ ] `ls skills/plan-slice/SKILL.md` → exists with valid frontmatter (name: plan-slice, description covering "create plan", "plan slice", "refine plan")
- [ ] SKILL.md contains Phase 1 (interactive Q&A) and Phase 2 (autonomous refinement) sections
- [ ] SKILL.md queries CLI status via `gp slice:show --slice <name> --json` for phase detection
- [ ] SKILL.md creates temp working directory at `/tmp/gp-plan-slice-<name>-<ts>/`
- [ ] Phase 1 uses AskUserQuestion for plan Q&A, writes structured markdown to `<tmpdir>/qa/plan-qa.md`
- [ ] Phase 2 spawns agents via Agent tool: plan-phase → refinement-coordinator → reviewers (parallel) → synthesis → editor (if needed) → loop
- [ ] Refinement loop tracks scores per iteration, warns on stagnation, stops after 2 adjacent no-improvement rounds or 2 net-reduction rounds (any position), hard cap 10
- [ ] Orchestrator handles status transitions: `gp start-plan --slice <name>` at Q&A start, `gp submit-plan --slice <name>` after final plan
- [ ] Re-entry: if slice status is `plan-refined`, offers to re-refine or view existing plan
- [ ] No Read calls on architecture files, plan drafts, or source code in the orchestrator body — only CLI queries and Agent tool spawns

### Tasks

- [ ] Create `skills/plan-slice/` directory
- [ ] Write `skills/plan-slice/SKILL.md` with frontmatter: `name: plan-slice`, `description:` covering all trigger phrases (create plan, plan slice, refine plan, improve plan, review plan), `user-invocable: true`
- [ ] Implement scope resolution: accept slice name as argument or auto-detect via `gp status --json` → `.activeSlice` or first slice in `created` status
- [ ] Implement re-entry detection: query `gp slice:show --slice <name> --json`, check status. If `plan-refined`: offer re-refine/view. If `planning` or `plan-created`: resume from appropriate phase.
- [ ] Implement Phase 1 (interactive Q&A):
  - [ ] Create temp working directory: `/tmp/gp-plan-slice-<name>-<timestamp>/`
  - [ ] Transition status: `gp start-plan --slice <name> --json`
  - [ ] Load slice goal via CLI: `gp slice:show --slice <name> --json` (for goal text)
  - [ ] Ask about approach, phasing, expected behavior via AskUserQuestion (multiple rounds as needed)
  - [ ] Write Q&A output to `<tmpdir>/qa/plan-qa.md` as structured markdown
- [ ] Implement Phase 2 (autonomous refinement):
  - [ ] Spawn `plan-phase` agent with task prompt containing: Q&A output path, architecture file paths (from `gp status --json` → `.artifacts.architecture.files`), slice goal, conventions path. Agent writes plan draft to `<tmpdir>/draft/plan.md`.
  - [ ] Parse plan-phase return JSON — check status field
  - [ ] Spawn `refinement-coordinator` agent with: draft plan path, review context `"implementation-plan"`. Parse return for reviewer list.
  - [ ] Spawn selected reviewer agents in parallel (up to 5-7). Each receives: plan path, review context, domain. Each returns JSON with score + issues.
  - [ ] Spawn `synthesis` agent with: all reviewer output paths. Returns aggregate score, merged issues, severity counts.
  - [ ] Evaluate exit conditions:
    - All scores ≥ 9 → exit loop, submit plan
    - Score didn't rise between adjacent rounds → warn in log
    - 2 adjacent rounds with no improvement → stop, submit best version
    - 2 rounds (any position) with net score reduction → stop, submit best version
    - Iteration 10 → stop, submit best version
  - [ ] If scores don't pass: spawn `editor` agent with plan path + synthesis output path. Editor updates plan. Loop back to coordinator.
  - [ ] After loop exit: submit final plan via `gp submit-plan --slice <name> --json`
- [ ] Implement sub-agent return format parsing — expect `{ status, summary, filesWritten, score?, reviewers?, continuationFile? }` from each agent
- [ ] Implement PARTIAL status handling — if any sub-agent returns PARTIAL: handle questions via AskUserQuestion, spawn research agents for research topics, re-spawn original agent with continuation file path + resolved inputs
- [ ] Log agent spawn sequence, scores per iteration, and exit reason to stderr for debugging

### Verification

- Read through the SKILL.md and trace the orchestrator flow manually — verify no Read calls on full artifacts
- Check that all agent names in spawn instructions match the agent `.md` file names from Phase 1
- Verify the refinement loop exit conditions cover all specified cases
- Verify CLI commands used match the actual `gp` command surface (start-plan, submit-plan, slice:show, status)

## Phase 4: Test Harness & Verification

Create the test script and orchestrator discipline verification utility.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tools/dogfood/test-plan-slice.ts` → "No such file or directory"
- [ ] `grep "verifyOrchestratorDiscipline" tools/dogfood/utils.ts` → no match

**After implementation** (should pass / show presence):
- [ ] `ls tools/dogfood/test-plan-slice.ts` → exists
- [ ] `grep "verifyOrchestratorDiscipline" tools/dogfood/utils.ts` → function exported
- [ ] `bun tools/dogfood/test-plan-slice.ts` → pipeline completes: Q&A phase runs (simulated responses in log, not just "Proceed"), plan draft written, refinement loop runs ≥1 iteration, final plan written, `gp slice:show` returns `plan-refined`
- [ ] `bun tools/dogfood/test-plan-slice.ts --model claude-haiku-4-5` → uses specified model
- [ ] `verifyOrchestratorDiscipline()` correctly flags Read calls on `.goodplan/architecture/`, `.goodplan/epics/`, plan files, and source code made by the orchestrator (not sub-agents)
- [ ] Test log shows score progression across iterations and exit reason

### Tasks

- [ ] Add `verifyOrchestratorDiscipline()` to `tools/dogfood/utils.ts`:
  - Accepts a list of tool call records from the session
  - Filters for Read calls targeting known artifact paths (architecture files, plan files, source code under `src/`, `skills/`)
  - Distinguishes orchestrator-level reads from sub-agent reads (sub-agent reads are expected and allowed)
  - Returns `{ ok: boolean, violations: string[] }`
- [ ] Extend `createMinimalFixture()` in `utils.ts` with optional params for richer fixtures (e.g., custom slice goal text, number of slices, pre-existing architecture files) while keeping backward compatibility with existing callers (all new params optional with sensible defaults)
- [ ] Create `tools/dogfood/test-plan-slice.ts`:
  - Setup: create minimal fixture with a slice in `created` status and a meaningful goal
  - Build plugin: run `bun run build:plugin` to get fresh dist with agents
  - Run session: invoke `/gp:plan-slice` via `runSkillSession()` with simulated user, targeting the fixture
  - Verify post-run: `verifyEntityStatus(gpBin, "slice", sliceName, "plan-refined")`
  - Verify discipline: `verifyOrchestratorDiscipline(toolCalls)` returns ok
  - Verify artifacts: plan file exists in the slice directory
  - Verify scores: parse session log for score progression, assert refinement loop ran ≥1 iteration
  - Verify exit conditions: track score deltas between rounds, confirm stagnation detection works (may require a separate test case or assertion on log output)
- [ ] Add `--model` flag support to `test-plan-slice.ts` (default: `claude-haiku-4-5` for structural tier)
- [ ] Verify `@` references resolve correctly by checking the test log — agent bodies should contain injected shared content (review preamble appears in reviewer agent prompts)

### Verification

- Run `bun tools/dogfood/test-plan-slice.ts` end-to-end — must complete without errors
- Check test log for: simulated user responses (not "Proceed"), agent spawn sequence, score values per iteration, exit reason
- Run with `--model claude-haiku-4-5` to confirm model override works
- Manually review `verifyOrchestratorDiscipline()` implementation — confirm it correctly classifies orchestrator vs sub-agent tool calls
