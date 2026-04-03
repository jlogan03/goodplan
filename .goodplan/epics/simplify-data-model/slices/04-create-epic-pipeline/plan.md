# Plan: Create-Epic Pipeline

## Overview

Build `/gp:create-epic` as a 6-phase pipeline orchestrator — the most complex pipeline in the epic. Produces 3 new phase agents (explore-phase, architecture-phase, slices-phase), 3 new reviewer agents, and a comprehensive test harness. The orchestrator pattern was validated in slice 02 with plan-slice (2 phases); this slice applies the proven pattern to a multi-phase pipeline with interleaved interactive and autonomous phases.

**Slug**: `create-epic-pipeline`

**Key decisions from planning Q&A**:
- Explore-phase uses user-controlled exit (orchestrator presents findings, asks user if more needed)
- Architecture-phase receives structured summary from Q&A (not raw transcript)
- Start with 3 new reviewers (typescript, tui-cli, repo-tooling) — full ~20 set built across slices 05-06
- Epic creation only (assumes project initialized) — /gp:init handles new-project flow (slice 06)
- Single SKILL.md file — agents do the heavy lifting, orchestrator stays thin
- One full e2e test run + focused re-entry test

**Dependencies**: Slices 02 (orchestrator pattern, agents/) and 03 (reconsiderWhen/validUntil fields) — both complete.

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Phase Agents | Create explore-phase, architecture-phase, slices-phase agent definitions |
| 02 | Additional Reviewers | Create reviewer-typescript, reviewer-tui-cli, reviewer-repo-tooling + shared refs |
| 03 | Create-Epic Orchestrator | Build the 6-phase pipeline SKILL.md with re-entry and condition evaluation |
| 04 | Build Pipeline Update | Verify new agents pass validation, dist includes updated skill |
| 05 | Test Harness | Create test-create-epic.ts with full pipeline + re-entry + condition tests |


## Phase 1: Phase Agents

Create the 3 phase agent definitions that the create-epic orchestrator will spawn for autonomous phases.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls agents/explore-phase.md` → "No such file or directory"
- [ ] `ls agents/architecture-phase.md` → "No such file or directory"
- [ ] `ls agents/slices-phase.md` → "No such file or directory"

**After implementation** (should pass / show presence):
- [ ] `ls agents/explore-phase.md agents/architecture-phase.md agents/slices-phase.md` → all 3 exist
- [ ] Each has valid frontmatter: `name:`, `description:`, `model: opus`
- [ ] Each references shared content via `@${CLAUDE_PLUGIN_ROOT}/...` (not `skills:` frontmatter)
- [ ] `explore-phase.md` describes the research/brainstorm/prototype loop with user-controlled exit via PARTIAL status
- [ ] `architecture-phase.md` describes drafting architecture files from a structured Q&A summary
- [ ] `slices-phase.md` describes drafting slice definitions (sequencing.md + per-slice goal.md) from Q&A summary

### Tasks

- [ ] Create `agents/explore-phase.md`:
  - Frontmatter: `name: explore-phase`, `description: Research, brainstorm, and prototype loop...`, `model: opus`
  - Receives: epic goal path, existing research paths, conventions path, temp working directory
  - Behavior: runs research (WebSearch, Context7, codebase exploration), brainstorm (interactive synthesis), optional prototype. Each cycle writes findings to temp dir (`research/<topic>.md`, `brainstorm/<topic>.md`)
  - Exit: returns PARTIAL after each cycle with a summary of findings. Orchestrator presents to user and asks if more exploration needed. When user says enough, orchestrator re-spawns with "finalize" instruction — agent writes explore-complete summary and returns SUCCESS.
  - Evaluates `reconsiderWhen`/`validUntil` conditions when provided in task prompt (per architecture conventions). Include conditions in return `triggeredConditions` field.
  - Inject shared content via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md`
  - Tool note: "This agent has full tool access (Read, Grep, Glob, Write, WebSearch). No sub-agent spawning (disallowedTools: Agent)."

- [ ] Create `agents/architecture-phase.md`:
  - Frontmatter: `name: architecture-phase`, `description: Drafts architecture files from Q&A output...`, `model: opus`
  - Receives: structured Q&A summary path, epic goal path, conventions path, research file paths, temp working directory
  - Behavior: reads Q&A summary, reads referenced research, drafts architecture files (`_overview.md`, subsystem API files, `conventions.md`, `invariants.md` as appropriate). Writes to temp dir.
  - Evaluates `reconsiderWhen`/`validUntil` conditions when provided.
  - Returns: SUCCESS with `filesWritten` listing all architecture files created.
  - Tool note: "Read, Grep, Glob, Write. No sub-agent spawning."
  - Inject `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md`

- [ ] Create `agents/slices-phase.md`:
  - Frontmatter: `name: slices-phase`, `description: Drafts slice definitions from Q&A output...`, `model: opus`
  - Receives: structured Q&A summary path, architecture file paths, epic goal path, conventions path, temp working directory
  - Behavior: reads Q&A summary and architecture, produces `sequencing.md` and per-slice `goal.md` files. Writes to temp dir.
  - Returns: SUCCESS with `filesWritten` listing sequencing.md and all goal.md paths.
  - Tool note: "Read, Grep, Glob, Write. No sub-agent spawning."
  - Inject `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md`

### Verification

- Each agent body under ~500 lines (pre-expansion)
- `@` reference paths resolve to existing files
- All 3 agents follow the return format from `sub-agent-return-format.md`
- Explore-phase correctly uses PARTIAL for user-controlled cycles

## Phase 2: Additional Reviewers

Create 3 new reviewer agents for domains relevant to create-epic's review contexts (architecture proposals, slice definitions). Same pattern as the 3 reviewers from slice 02.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls agents/reviewer-typescript.md agents/reviewer-tui-cli.md agents/reviewer-repo-tooling.md` → none exist
- [ ] `ls skills/_shared/references/review-typescript.md` → "No such file or directory"

**After implementation** (should pass / show presence):
- [ ] All 3 reviewer agents exist with valid frontmatter
- [ ] 3 new shared reference files: `review-typescript.md`, `review-tui-cli.md`, `review-repo-tooling.md`
- [ ] Each reviewer agent composes `review-preamble.md` + domain-specific reference via `@` references
- [ ] Each adapts focus based on `review_context` (architecture-proposal, slice-definitions, implementation-plan, code-implementation)
- [ ] Total agents in `agents/`: 13 (7 from slice 02 + 3 phase agents from Phase 1 + 3 reviewers here)

### Tasks

- [ ] Create `skills/_shared/references/review-typescript.md` — TypeScript-specific review criteria: type safety, module design, strict mode compliance, runtime correctness, framework patterns, bundling, Node.js/Bun specifics. Source: adapt from existing `reviewers-language.md` § "TypeScript and JavaScript Reviewer" in the installed refine-plan skill.
- [ ] Create `skills/_shared/references/review-tui-cli.md` — TUI/CLI review criteria: terminal UI layout, CLI argument design, input handling, output formatting, cross-platform compatibility. Source: adapt from existing `reviewers-cross-cutting.md` § "TUI and CLI Reviewer".
- [ ] Create `skills/_shared/references/review-repo-tooling.md` — Repo/Tooling review criteria: project structure, build configuration, linting, hooks, dependency management, documentation. Source: adapt from existing `reviewers-cross-cutting.md` § "Repo, Tooling, & Docs Reviewer".
- [ ] Create `agents/reviewer-typescript.md` — composes `review-preamble.md` + `review-typescript.md` via `@` references. Same pattern as `reviewer-holistic.md`.
- [ ] Create `agents/reviewer-tui-cli.md` — composes `review-preamble.md` + `review-tui-cli.md` via `@` references.
- [ ] Create `agents/reviewer-repo-tooling.md` — composes `review-preamble.md` + `review-repo-tooling.md` via `@` references.
- [ ] Add tool restriction note to each: "Read-only tools (Read, Grep, Glob). Return review content inline — do not write files."
- [ ] Backward compat note: existing `reviewers-cross-cutting.md` and installed skill reviewer files remain untouched. New `review-*.md` files are canonical for the agent-based pipeline. Full migration deferred.

### Verification

- Each reviewer body under ~50 lines (preamble + domain via `@` injection)
- `@` reference paths resolve to existing files
- Existing reviewers from slice 02 still work (no regressions)

## Phase 3: Create-Epic Orchestrator

Build `skills/create-epic/SKILL.md` as a 6-phase pipeline orchestrator, replacing the existing skill. This is the largest and most complex phase.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Current `skills/create-epic/SKILL.md` is the old single-phase skill (~7.3KB, no pipeline)
- [ ] `grep "explore-phase" skills/create-epic/SKILL.md` → no match (old skill doesn't spawn agents)

**After implementation** (should pass / show presence):
- [ ] `skills/create-epic/SKILL.md` is a pipeline orchestrator with 6 phases
- [ ] SKILL.md has valid frontmatter: `name: create-epic`, description covering trigger phrases
- [ ] Contains phase table mapping interactive/autonomous phases to CLI statuses
- [ ] Contains re-entry protocol using `gp epic:show --epic <name> --json` status field
- [ ] Phase 1 (goal capture) uses AskUserQuestion
- [ ] Phase 2 (explore) spawns `explore-phase` agent, handles PARTIAL returns
- [ ] Phase 3 (architecture Q&A) runs design tree with broad + deep passes via AskUserQuestion
- [ ] Phase 4 (architecture draft+refine) spawns `architecture-phase` then refinement loop
- [ ] Phase 5 (slices Q&A) discusses scope/ordering via AskUserQuestion
- [ ] Phase 6 (slices draft+refine) spawns `slices-phase` then refinement loop
- [ ] Orchestrator never reads full artifact files (context discipline)
- [ ] `bun run build:plugin` succeeds with updated skill

### Tasks

- [ ] Replace `skills/create-epic/SKILL.md` with the new pipeline orchestrator. Frontmatter: `name: create-epic`, description covering triggers ("create epic", "new epic", "start project", "new project"), `user-invocable: true`
- [ ] Implement phase table and CLI status mapping:
  | Phase | Type | CLI Status Transition |
  |-------|------|----------------------|
  | 1. Goal capture | Interactive | `created` |
  | 2. Explore | Autonomous | `created` → `exploring` → `explored` |
  | 3. Architecture Q&A | Interactive | `explored` → `defining-architecture` |
  | 4. Architecture draft + refinement | Autonomous | `defining-architecture` → `architecture-defined` → (refine loop) → `architecture-refined` |
  | 5. Slices Q&A | Interactive | `architecture-refined` → `defining-slices` |
  | 6. Slices draft + refinement | Autonomous | `defining-slices` → `slices-defined` → (refine loop) → `slices-refined` |

- [ ] Implement re-entry protocol:
  - Query `gp epic:show --epic <name> --json`, read `status` field
  - Map status to pipeline phase (see conventions.md phase detection table)
  - Present: "Epic [name] is in progress. Completed: [phases]. Next: [phase]. → Continue / Go back"
  - "Go back" re-enters a phase with existing artifacts preserved

- [ ] Implement Phase 1 (interactive — goal capture):
  - Create temp working directory: `/tmp/gp-create-epic-<name>-<timestamp>/`
  - If epic doesn't exist yet: ask user about epic goal via AskUserQuestion
  - Write goal to `<tmpdir>/goal.md`, then create epic via `gp epic:create --json` with stdin `{"name":"<name>","goal":"<goal>"}`
  - If epic already exists (re-entry): load existing goal from CLI

- [ ] Implement Phase 2 (autonomous — explore):
  - Transition: `gp epic:explore --epic <name> --json` (`created` → `exploring`)
  - Load `reconsiderWhen`/`validUntil` conditions (forward-compatible: skip if fields absent)
  - Spawn `explore-phase` agent with: epic goal path, research paths, conventions path, temp dir, conditions
  - Handle PARTIAL returns: present findings to user via AskUserQuestion ("Continue exploring? / That's enough")
  - If continue: re-spawn with continuation file. If done: agent writes explore-complete, then `gp submit-explore --epic <name> --json`

- [ ] Implement Phase 3 (interactive — architecture Q&A):
  - Transition: `gp epic:define-architecture --epic <name> --json` (`explored` → `defining-architecture`)
  - Run design tree Q&A:
    - **Broad pass**: Ask about subsystems, their responsibilities, boundaries. Present subsystem map for confirmation.
    - **Deep pass**: For each subsystem, ask about API surfaces, data models, communication patterns.
  - Write structured Q&A summary to `<tmpdir>/architecture-qa.md`

- [ ] Implement Phase 4 (autonomous — architecture draft + refinement):
  - Spawn `architecture-phase` agent with: Q&A summary path, research paths, conventions path, temp dir
  - Parse return, check `filesWritten` for architecture file paths
  - Copy architecture files from temp dir to `.goodplan/epics/<name>/architecture/` via agent or orchestrator (orchestrator may Write here since architecture files are the primary artifact)
  - `gp submit-architecture --epic <name> --json` (`defining-architecture` → `architecture-defined`)
  - Begin refinement: `gp epic:refine-architecture --epic <name> --json` (`architecture-defined` → `refining-architecture`)
  - Refinement loop: coordinator → reviewers → synthesis → editor (same pattern as plan-slice)
  - Per-round: `gp submit-refine-architecture --epic <name> --json` with scores
  - Exit when all ≥ 9 AND no CRITICAL/IMPORTANT, or stagnation/cap (same exit conditions as plan-slice)

- [ ] Implement Phase 5 (interactive — slices Q&A):
  - Transition: `gp epic:define-slices --epic <name> --json` (`architecture-refined` → `defining-slices`)
  - Discuss: slice scope, ordering, dependencies, size guidance
  - Write structured Q&A summary to `<tmpdir>/slices-qa.md`

- [ ] Implement Phase 6 (autonomous — slices draft + refinement):
  - Spawn `slices-phase` agent with: Q&A summary path, architecture paths, epic goal path, conventions path, temp dir
  - Parse return, check `filesWritten` for sequencing.md + goal.md paths
  - Copy slice artifacts to `.goodplan/epics/<name>/slices/`
  - Create slices via CLI: `gp slice:create --epic <name> --json` for each slice with stdin `{"name":"<name>","goal":"<goal>"}`
  - `gp submit-slices --epic <name> --json` (`defining-slices` → `slices-defined`)
  - Begin refinement: `gp epic:refine-slices --epic <name> --json`
  - Refinement loop (same pattern)
  - Per-round: `gp submit-refine-slices --epic <name> --json` with scores

- [ ] Implement context discipline: orchestrator uses only CLI queries, Agent tool spawns, AskUserQuestion, and lightweight summaries. No Read calls on architecture files, research files, or goal content directly.

- [ ] Implement PARTIAL status handling for all autonomous phases:
  - If sub-agent returns PARTIAL with `questions`: present to user via AskUserQuestion
  - If PARTIAL with `researchTopics`: spawn research agents in parallel
  - Re-spawn original agent with continuation file path + resolved inputs
  - If PARTIAL with both: handle questions and research in parallel, then re-spawn

- [ ] Implement `reconsiderWhen`/`validUntil` condition loading and passing:
  - Before spawning phase agents (explore, architecture): load conditions via `gp decision:list --json` and `gp learning:list --json`
  - Filter for entries with non-empty `reconsiderWhen`/`validUntil` (gate: skip if fields absent — forward compat)
  - Include conditions in agent's task prompt
  - Handle `triggeredConditions` in agent return: surface to user

- [ ] Implement temp directory cleanup: clean on successful pipeline completion, preserve on error

- [ ] Log agent spawn sequence, scores per refinement round, and phase transitions to stderr

### Verification

- Read through SKILL.md, trace the orchestrator flow — verify no Read calls on full artifacts
- Verify all agent names match definitions from Phases 1-2
- Verify CLI commands match the actual `gp` command surface (epic:create, epic:explore, submit-explore, etc.)
- Verify phase status mapping matches transition tables
- `bun run build:plugin` succeeds with updated skill

## Phase 4: Build Pipeline Update

Verify the build pipeline handles the new agents and updated skill correctly.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run build:plugin 2>&1 | grep "Packaged"` → shows old agent count (10 from previous slices)

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin` succeeds with "Packaged 13 agents" (7 from slice 02 + 3 phase agents + 3 reviewers)
- [ ] `ls dist/gp-plugin/agents/*.md | wc -l` → 13
- [ ] `ls dist/gp-plugin/skills/create-epic/SKILL.md` → exists with `name: gp:create-epic`
- [ ] Agent frontmatter validation passes for all 13 agents
- [ ] `@` reference validation passes for all new agents

### Tasks

- [ ] Run `bun run build:plugin` — verify all 13 agents are copied, validated, and @ references resolve
- [ ] Verify the updated `create-epic` skill is namespaced correctly (`gp:create-epic` in dist)
- [ ] Fix any build failures introduced by new agents or updated skill
- [ ] Verify existing agents from slice 02 still pass validation (no regressions)

### Verification

- `bun run build:plugin` completes without errors
- Intentionally break one new agent's frontmatter, verify build fails with clear error

## Phase 5: Test Harness

Create `test-create-epic.ts` — the end-to-end test for the create-epic pipeline.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls tools/dogfood/test-create-epic.ts` → "No such file or directory"

**After implementation** (should pass / show presence):
- [ ] `ls tools/dogfood/test-create-epic.ts` → exists
- [ ] `bun tools/dogfood/test-create-epic.ts --model claude-haiku-4-5 --max-iterations 1` → pipeline completes through all 6 phases
- [ ] After test run: `gp epic:show --epic <name> --json` returns status `slices-refined` (or equivalent)
- [ ] Re-entry test: fixture at `explored` status, skill resumes from architecture Q&A
- [ ] `reconsiderWhen` positive test: agent output references matching condition
- [ ] Orchestrator discipline check passes (verifyNoArtifactReads)
- [ ] CLAUDE.md test harness table updated with `test-create-epic.ts` row

### Tasks

- [ ] Create `tools/dogfood/test-create-epic.ts` following `test-plan-slice.ts` pattern:
  - Setup: `createMinimalFixture()` with `activateEpic: false` (we're creating a NEW epic in this test, not planning a slice)
  - Actually: create a bare project via `gp init`, no epic yet — the skill creates the epic
  - Build plugin: `bun run build:plugin`
  - Inject SKILL.md into system prompt (Agent SDK Skill tool doesn't discover new skills dynamically — learned from slice 02)
  - Simulated user with domain-specific persona (suggests subsystems, architecture decisions, slice ordering)
  - `--model` flag (default: `claude-haiku-4-5`)
  - `--max-iterations` flag (default: 1) for cost control
  - `GP_CREATE_EPIC_MAX_ITERATIONS` env var support in SKILL.md

- [ ] Implement full pipeline test:
  - Invoke create-epic skill with epic name and goal
  - Simulated user answers Q&A questions (goal details, architecture subsystems, slice ordering)
  - Verify post-run: `gp epic:show --epic <name> --json` returns terminal pipeline status
  - Verify artifacts: goal.md, architecture files, slice goal.md files exist
  - Verify discipline: `verifyNoArtifactReads(toolCalls)` passes
  - Verify scores: refinement loop ran for architecture and slices

- [ ] Implement re-entry test:
  - Create fixture with epic at `explored` status (use `createMinimalFixture` + fast-track to `explored`)
  - Invoke skill — should detect status and resume from Phase 3 (architecture Q&A)
  - Verify it doesn't re-run explore

- [ ] Implement `reconsiderWhen` condition evaluation tests:
  - Positive: create fixture decision with `reconsiderWhen: ["New subsystem added that affects auth"]`, set epic goal to mention auth restructuring. Verify agent output includes `triggeredConditions`.
  - Negative: same fixture but epic goal is about documentation. Verify no conditions triggered.

- [ ] Update CLAUDE.md Agent SDK Test Harness table with `test-create-epic.ts` row

- [ ] Run existing test suite (`bun test`) to verify no regressions from skill changes

### Verification

- Run `bun tools/dogfood/test-create-epic.ts --model claude-haiku-4-5 --max-iterations 1` — pipeline completes
- Check test log for: simulated user responses, agent spawn sequence, phase transitions, score values
- Run `bun test` — all existing tests pass
