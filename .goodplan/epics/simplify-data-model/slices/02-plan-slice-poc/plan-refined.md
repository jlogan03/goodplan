# Plan: Plan-Slice Proof of Concept

## Overview

Build the agent infrastructure and plan-slice orchestrator as the core tracer bullet for the orchestrator pattern. This slice creates 7 of ~15 agents from the epic architecture; remaining agents are created in subsequent slices. This is the simplest pipeline (2 phases: interactive Q&A → autonomous refinement) but exercises all key mechanisms: agent definitions with `@` reference injection, orchestrator context discipline (CLI status + sub-agent returns only), the refinement loop (coordinator → reviewers → synthesis → editor), sub-agent return format parsing, and the temp-dir working artifact pattern that keeps `.goodplan/` clean for HMAC integrity.

**Slug**: `plan-slice-poc`

**Key decisions from planning Q&A**:
- `@${CLAUDE_PLUGIN_ROOT}/path` references for content injection in agent bodies (NOT `skills:` frontmatter — issue #25834)
- Plan-format conventions injected into plan-phase agent via `@` reference (not inline)
- Refinement loop exit: all reviewers ≥ 9/10 AND no CRITICAL or IMPORTANT issues remain. Hard cap 10 iterations. Warn if net score (= synthesis aggregate score, single number from synthesis agent return) doesn't rise between adjacent rounds. Stop after 2 adjacent rounds with no improvement, or 2 rounds (adjacent or not) with net score reduction.
- Synthesis agent uses LLM judgment to resolve reviewer disagreements
- Orchestrator handles all CLI status transitions (sub-agents focus on content)
- Q&A output written as structured markdown
- All working artifacts (Q&A, reviews, synthesis, continuations) written to `/tmp/gp-plan-slice-<name>-<ts>/` — only final plan.md written via `gp submit-plan`. Temp directory cleaned up only after orchestrator exits successfully (all rounds complete or early-stop); preserved on any error for debugging. Path logged so user knows where artifacts live.
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
- [ ] `ls skills/_shared/references/plan-format.md` → exists
- [ ] Each agent `.md` has valid frontmatter with `name:`, `description:`, `model: opus` (note: `model:` is functional — runtime respects it; test harness `--model` flag overrides via per-invocation parameter)
- [ ] Each reviewer agent body contains `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md` reference
- [ ] Each reviewer agent body contains its domain-specific `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md` reference
- [ ] `plan-phase.md` body contains `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/plan-format.md` reference (new shared copy of existing create-plan skill reference)

### Tasks

- [ ] Update epic architecture `_overview.md`: remove stale `skills:` frontmatter reference at ~line 135 (still references `skills:` frontmatter for shared reference injection) and replace with the `@` reference mechanism (reflects key decision and issue #25834). Note: ~line 69 already correctly describes the `@` reference mechanism — no change needed there.
- [ ] Create `agents/` directory at repo root
- [ ] Create `skills/_shared/references/review-preamble.md` — adapted from existing `skills/_shared/references/shared-preamble.md` for `@`-injection context (not written from scratch). **Note:** New `review-*.md` files are canonical for the agent-based pipeline. Existing `reviewers-cross-cutting.md` and `skills/refine-plan/references/reviewers-*.md` remain untouched for backward compatibility with installed v1.0.3. Full migration deferred to a later slice. Output format (`## Issues` with severity/resolution tags, `## Score: X/10` with justification, `## Summary` with severity counts), severity levels (CRITICAL, IMPORTANT, MINOR), score rubric (1-10 scale with anchor descriptions). Each `@` reference file must start with a self-identifying header (e.g., `# Review Preamble`, `# Holistic Review Criteria`) for spot-checking in test logs that `@` injection resolved correctly.
- [ ] Create `skills/_shared/references/review-holistic.md` — holistic review criteria (goal alignment, completeness, coherence, risks, missing considerations)
- [ ] Create `skills/_shared/references/review-software-architecture.md` — architecture review criteria (subsystem boundaries, API surfaces, dependency direction, coupling, cohesion, SOLID principles)
- [ ] Create `skills/_shared/references/review-agent-skill.md` — agent/skill review criteria (context discipline, prompt clarity, tool usage patterns, sub-agent coordination, error handling, re-entry)
- [ ] Copy plan format conventions from existing `skills/create-plan/references/plan-format.md` into `skills/_shared/references/plan-format.md` (new shared reference for injection into plan-phase agent). Original stays in place for backward compatibility with existing create-plan skill. Future slice migrates create-plan to use the shared copy.
- [ ] Create `agents/plan-phase.md` — drafts implementation plans from Q&A output + architecture file paths. Injects plan-format.md via `@` reference. Returns structured JSON (status, summary, filesWritten). Receives all file paths (architecture files, Q&A output, temp working directory) via the orchestrator's task prompt and reads those specific files (sub-agent has Read access). Writes plan draft to the temp working directory path provided in task prompt.
- [ ] Create `agents/refinement-coordinator.md` — reads an artifact (plan, architecture, slices), analyzes content, selects relevant reviewers from the available set (orchestrator passes available reviewer agent names in the coordinator's task prompt), returns structured spawn plan (which reviewers to spawn, artifact path, review context). Does NOT spawn reviewers itself.
- [ ] Create `agents/reviewer-holistic.md` — composes review-preamble + review-holistic via `@` references. Adapts focus based on `review_context` passed in task prompt. Returns structured JSON with score, issues, summary.
- [ ] Create `agents/reviewer-software-architecture.md` — composes review-preamble + review-software-architecture via `@` references. Same pattern.
- [ ] Create `agents/reviewer-agent-skill.md` — composes review-preamble + review-agent-skill via `@` references. Same pattern.
- [ ] Create `agents/synthesis.md` — merges multiple reviewer outputs, deduplicates issues, resolves contradictions using LLM judgment, returns aggregate score + merged issues + severity counts.
- [ ] Create `agents/editor.md` — receives artifact path + synthesis output path, applies review feedback to the artifact, returns structured JSON with updated file paths.

### Verification

- Manually inspect each agent `.md` for valid YAML frontmatter and `@` reference syntax
- Verify `@` reference paths match actual file locations in `skills/_shared/references/`
- Check that no agent source file (pre-`@`-expansion) exceeds ~500 lines — `@` references ARE progressive disclosure, so the pre-expansion size is the relevant metric
- Verify review-preamble.md defines a complete, unambiguous scoring rubric

## Phase 2: Build Pipeline & Plugin Manifest

Update build-plugin.sh to validate agent definitions and declare them in plugin.json.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run build:plugin` succeeds but doesn't validate agent frontmatter — no "Verifying agents..." output
- [ ] `jq '.agents' dist/gp-plugin/.claude-plugin/plugin.json` → no match

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin` outputs "Verifying agents..." and validates name + description frontmatter for each agent `.md`
- [ ] `jq '.agents' dist/gp-plugin/.claude-plugin/plugin.json` → `"agents": "./agents"`
- [ ] `ls dist/gp-plugin/agents/*.md` → all 7 agent files present
- [ ] Remove `name:` from one agent file, run `bun run build:plugin` → build fails with "FAIL: ... missing or incorrect name: field"

### Tasks

- [ ] Add `"agents": "./agents"` to the plugin.json manifest template in `build-plugin.sh` (place after `"skills"` for deterministic output)
- [ ] Add agent verification section after skill verification — validate each `.md` in `agents/` has frontmatter with `name:` and `description:` fields
- [ ] Add agent count to the build summary output (e.g., "Packaged 7 agents")
- [ ] Add `@` reference path validation: extract `@${CLAUDE_PLUGIN_ROOT}/...` references from agent `.md` bodies using regex `@\$\{CLAUDE_PLUGIN_ROOT\}/[^ )\n]+`, strip the `${CLAUDE_PLUGIN_ROOT}/` prefix, resolve relative to `dist/gp-plugin/`, verify each referenced file exists. Hard-fail on missing references with error naming the agent file and the missing reference path (broken `@` references cause silent prompt corruption). Also warn on bare `@` references (matching `@./` or `@[a-zA-Z]` patterns that don't use the `${CLAUDE_PLUGIN_ROOT}` prefix) — these won't resolve correctly at runtime.
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
- [ ] `ls skills/plan-slice/SKILL.md` → exists with valid frontmatter (name: plan-slice, description using differentiating triggers like "plan and refine a slice end-to-end", "orchestrated plan slice")
- [ ] SKILL.md contains Phase 1 (interactive Q&A) and Phase 2 (autonomous refinement) sections
- [ ] SKILL.md queries CLI status via `gp slice:show --slice <name> --json` for phase detection
- [ ] SKILL.md creates temp working directory at `/tmp/gp-plan-slice-<name>-<ts>/`
- [ ] Phase 1 uses AskUserQuestion for plan Q&A, writes structured markdown to `<tmpdir>/qa/plan-qa.md`
- [ ] Phase 2 spawns agents via Agent tool: plan-phase → refinement-coordinator → reviewers (parallel) → synthesis → editor (if needed) → loop
- [ ] Refinement loop tracks scores per iteration, warns on stagnation, stops after 2 adjacent no-improvement rounds or 2 net-reduction rounds (any position), hard cap 10
- [ ] Orchestrator handles status transitions: `gp slice:plan --slice <name>` at Q&A start (`created` → `planning`), `gp submit-plan --slice <name>` after plan draft (`planning` → `plan-created`), `gp slice:refine-plan --slice <name>` to begin refinement (`plan-created` → `refining`), `echo '{"scores":{...}}' | gp submit-refinement --slice <name>` per refinement round (handles round tracking → eventually `plan-refined`)
- [ ] Re-entry: if slice status is `plan-refined`, offers to view existing plan or proceed to `/gp:implement`. No re-refinement in this PoC — the `plan-refined` → `planning` transition does not exist in the state machine. Re-refinement can be added in a later slice that introduces a `BEGIN_RE_REFINEMENT` event. Users can still manually re-refine via the installed `/gp:refine-plan` skill (v1.0.3).
- [ ] No Read calls on architecture files, plan drafts, or source code in the orchestrator body — only CLI queries and Agent tool spawns

### Tasks

- [ ] Create `skills/plan-slice/` directory
- [ ] Write `skills/plan-slice/SKILL.md` with frontmatter: `name: plan-slice`, `description:` using differentiating trigger phrases that won't conflict with existing `/gp:create-plan` and `/gp:refine-plan` (e.g., "plan and refine a slice end-to-end", "end-to-end plan creation and refinement", "orchestrated plan slice"). Avoid bare "create plan" or "refine plan" triggers. `user-invocable: true`
- [ ] Implement scope resolution: accept slice name as argument or auto-detect via `gp status --json` → `.activeSlice` or first slice in `created` status
- [ ] Implement re-entry detection: query `gp slice:show --slice <name> --json`, check status. If `plan-refined`: offer view plan or proceed to `/gp:implement` (no re-refinement — transition doesn't exist). If `planning` or `plan-created`: resume from appropriate phase.
- [ ] Define sub-agent tool restrictions per agent category. When spawning agents via the Agent tool, restrict tools to enforce flat hierarchy and prevent user interruption:
  - **Reviewer agents** (`reviewer-holistic`, `reviewer-software-architecture`, `reviewer-agent-skill`): `allowedTools: ["Read", "Grep", "Glob"]` — read-only, no output writing (they return JSON via agent return)
  - **Synthesis agent**: `allowedTools: ["Read", "Grep", "Glob", "Write"]` — reads reviewer outputs, writes merged.md
  - **Editor agent**: `allowedTools: ["Read", "Grep", "Glob", "Write"]` — reads and modifies plan files
  - **Plan-phase agent**: `allowedTools: ["Read", "Grep", "Glob", "Write"]` — drafts plans from Q&A output (Q&A is handled by the orchestrator in Phase 1, not this agent)
  - **Refinement-coordinator**: `allowedTools: ["Read", "Grep", "Glob"]` — read-only analysis
  - All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy (no sub-agent spawning)
- [ ] Implement Phase 1 (interactive Q&A):
  - [ ] Create temp working directory: `/tmp/gp-plan-slice-<name>-<timestamp>/`
  - [ ] Transition status: `gp slice:plan --slice <name> --json` (`created` → `planning`)
  - [ ] Load slice goal via CLI: `gp slice:show --slice <name> --json` (for goal text)
  - [ ] Ask about approach, phasing, expected behavior via AskUserQuestion (multiple rounds as needed)
  - [ ] Write Q&A output to `<tmpdir>/qa/plan-qa.md` as structured markdown
- [ ] Implement Phase 2 (autonomous refinement):
  - [ ] Spawn `plan-phase` agent with task prompt containing: Q&A output path, architecture file paths, slice goal, conventions path. Agent writes plan draft to `<tmpdir>/draft/plan.md`.
    - Context assembly: call `gp start-plan --slice <name> --json` (note: `start-plan` assembles context for planning — distinct from `slice:plan` which transitions status). Returns a `ContextBundle`: `{ inline: Record<string, string>, references: string[], decisions: DecisionSummary[], learnings: LearningSummary[] }`. The `inline` map contains key-value pairs of content (e.g., architecture files, conventions) already read and budgeted. The `references` array lists file paths for content that exceeded the inline budget. Pass the `inline` content directly in the plan-phase agent's task prompt; list `references` paths so the agent can Read them as needed.
  - [ ] Parse plan-phase return JSON — check status field
  - [ ] Spawn `refinement-coordinator` agent with: draft plan path, review context `"implementation-plan"`, list of available reviewer agent names (e.g., `["reviewer-holistic", "reviewer-software-architecture", "reviewer-agent-skill"]`). Parse return for reviewer list.
  - [ ] Spawn selected reviewer agents in parallel (up to 5-7). Each receives: plan path, review context, domain. Each returns JSON with score + issues + full review text. Orchestrator writes each reviewer's output to `<tmpdir>/reviews/<domain>.md` (reviewers are read-only — no Write in allowedTools).
  - [ ] Spawn `synthesis` agent with: reviewer output file paths (e.g., `["<tmpdir>/reviews/holistic.md", "<tmpdir>/reviews/software-architecture.md"]`). Returns aggregate score, merged issues, severity counts.
  - [ ] Evaluate exit conditions using per-reviewer scores extracted from each reviewer's return JSON. Compute `netScore` as the minimum of all reviewer scores. The synthesis agent provides aggregate severity counts and merged feedback for the editor — but the per-reviewer min score is the exit gate (more conservative than an aggregate).
    - All scores ≥ 9 AND no CRITICAL or IMPORTANT issues remain → exit loop, submit plan
    - Score didn't rise between adjacent rounds → warn in log
    - 2 adjacent rounds with no improvement → stop, submit best version
    - 2 rounds (any position) with net score reduction → stop, submit best version
    - Iteration 10 → stop, submit best version
  - [ ] If scores don't pass: spawn `editor` agent with plan path + synthesis output path. Editor updates plan. Loop back to coordinator.
  - [ ] After initial plan draft: submit via `gp submit-plan --slice <name> --json` (`planning` → `plan-created`)
  - [ ] Begin refinement: `gp slice:refine-plan --slice <name> --json` (`plan-created` → `refining` via `BEGIN_REFINEMENT`). This is required before `submit-refinement` — without it, a failing score on `submit-refinement` from `plan-created` would trigger `STATE_INVALID_TRANSITION`.
  - [ ] After each refinement round: `echo '{"scores":{"overall":<score>}}' | gp submit-refinement --slice <name> --json` where `<score>` is the synthesis agent's aggregate score mapped to `Record<string, number>` format. Handles round tracking → eventually `plan-refined` when scores pass threshold (or `--override`).
- [ ] Define sub-agent return format in two representations maintained in sync: (a) markdown reference at `skills/_shared/references/sub-agent-return-format.md` for `@` injection into agent definitions, and (b) TypeScript schema (e.g., in `tools/dogfood/schemas/` or `utils.ts`) for test harness validation. Shape: `{ status, summary, filesWritten, score?, reviewers?, continuationFile? }`. Sync mechanism: co-locate changes in the same commit, add a linking comment in the TypeScript schema pointing to the markdown file and vice versa. Future improvement: add a build-time check that extracts field names from both and asserts parity.
- [ ] Implement sub-agent return format parsing using the defined schema
- [ ] *(Optional — defer if time-constrained)* Implement PARTIAL status handling — if any sub-agent returns PARTIAL: handle questions via AskUserQuestion, spawn research agents for research topics, re-spawn original agent with continuation file path + resolved inputs. For PoC, agents should return COMPLETE or ERROR only; PARTIAL support can be added in a subsequent slice.
- [ ] Log agent spawn sequence, scores per iteration, and exit reason to stderr for debugging

### Verification

- Read through the SKILL.md and trace the orchestrator flow manually — verify no Read calls on full artifacts
- Check that all agent names in spawn instructions match the agent `.md` file names from Phase 1
- Verify the refinement loop exit conditions cover all specified cases
- Verify CLI commands used match the actual `gp` command surface (slice:plan, submit-plan, slice:refine-plan, submit-refinement, slice:show, status)
- Run `bun run build:plugin` — confirm it succeeds with the new skill included
- `ls dist/gp-plugin/skills/plan-slice/SKILL.md` — exists
- `grep 'name: plan-slice' dist/gp-plugin/skills/plan-slice/SKILL.md` — matches

## Phase 4: Test Harness & Verification

Create the test script and orchestrator discipline verification utility.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tools/dogfood/test-plan-slice.ts` → "No such file or directory"
- [ ] `grep "verifyNoArtifactReads" tools/dogfood/utils.ts` → no match

**After implementation** (should pass / show presence):
- [ ] `ls tools/dogfood/test-plan-slice.ts` → exists
- [ ] `grep "verifyNoArtifactReads" tools/dogfood/utils.ts` → function exported
- [ ] `bun tools/dogfood/test-plan-slice.ts` → pipeline completes: Q&A phase runs (simulated responses in log, not just "Proceed"), plan draft written, refinement loop runs ≥1 iteration, final plan written, `gp slice:show` returns `plan-refined`
- [ ] `bun tools/dogfood/test-plan-slice.ts --model claude-haiku-4-5` → uses specified model
- [ ] `verifyNoArtifactReads()` correctly flags Read calls on `.goodplan/architecture/`, `.goodplan/epics/`, plan files, `agents/`, and source code captured via `canUseTool` (all are orchestrator-level by definition)
- [ ] Test log shows score progression across iterations and exit reason

### Tasks

- [ ] Add `verifyNoArtifactReads()` to `tools/dogfood/utils.ts`:
  - Accepts a list of tool call records from the session
  - Filters for Read calls targeting known artifact paths (architecture files, plan files, source code under `src/`, `skills/`, `agents/`)
  - Note: `canUseTool` interceptor only fires for orchestrator-level tool calls; sub-agent calls run in independent sessions. No special attribution logic needed — every Read captured is an orchestrator violation by definition.
  - Returns `{ ok: boolean, violations: string[] }`
  - Complements the existing `checkViolation()` in `utils.ts` which protects CLI state integrity (guards `.goodplan/*.json` from direct writes). `verifyNoArtifactReads` guards orchestrator context discipline (no direct reads of artifacts that should flow through sub-agents or CLI). Together they form the two halves of orchestrator discipline: state write integrity + context read discipline.
- [ ] Extend `createMinimalFixture()` in `utils.ts` with optional params for richer fixtures (e.g., custom slice goal text, number of slices, pre-existing architecture files — writes markdown files to disk, does not register via CLI) while keeping backward compatibility with existing callers (all new params optional with sensible defaults)
- [ ] Run existing dogfood tests after modifying `createMinimalFixture()` to confirm no regressions
- [ ] Create `tools/dogfood/test-plan-slice.ts`:
  - Setup: create minimal fixture with a slice in `created` status and a meaningful goal
  - Build plugin: run `bun run build:plugin` to get fresh dist with agents
  - Run session: invoke `/gp:plan-slice` via `runSkillSession()` with simulated user, targeting the fixture
  - Verify post-run: `verifyEntityStatus("slice", sliceName, "plan-refined", { gpBin })`
  - Verify discipline: `verifyNoArtifactReads(toolCalls)` returns ok
  - Verify artifacts: plan file exists in the slice directory
  - Verify scores: parse session log for score progression, assert refinement loop ran ≥1 iteration
  - Verify exit conditions: track score deltas between rounds, confirm stagnation detection works (may require a separate test case or assertion on log output)
- [ ] Add `--model` flag support to `test-plan-slice.ts` (default: `claude-haiku-4-5` for structural tier). Note: haiku-tier tests validate loop mechanics and agent spawn/return parsing, not review quality. Use `--max-iterations 2` for cost control. Verify that `--model` override takes precedence over agent frontmatter `model: opus` — agents should run with the harness-specified model, not the frontmatter default. Override mechanism: use the existing `systemPrompt.append` pattern (per-invocation model parameter passed to Agent tool call overrides the agent definition's `model:` frontmatter).
- [ ] Verify `@` references resolve correctly by checking the test log — agent bodies should contain injected shared content (review preamble appears in reviewer agent prompts)
- [ ] Update CLAUDE.md Agent SDK Test Harness table to include a row for `test-plan-slice.ts`

### Verification

- Run `bun tools/dogfood/test-plan-slice.ts` end-to-end — must complete without errors
- Check test log for: simulated user responses (not "Proceed"), agent spawn sequence, score values per iteration, exit reason
- Run with `--model claude-haiku-4-5` to confirm model override works
- Manually review `verifyNoArtifactReads()` implementation — confirm it checks all artifact path categories (`canUseTool` captures orchestrator calls only)
