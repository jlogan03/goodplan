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
  - Exit: returns PARTIAL after each cycle. PARTIAL return fields: `summary` (findings for orchestrator to present), `continuationFile` (path for re-spawn). Does NOT populate `questions` — the orchestrator handles the "Continue exploring? / That's enough" decision via AskUserQuestion. When re-spawned with "finalize" instruction, agent writes explore-complete summary and returns SUCCESS.
  - Evaluates `reconsiderWhen`/`validUntil` conditions when provided in task prompt (per architecture conventions). Include conditions in return `triggeredConditions` field.
  - Inject shared content via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md`
  - Tool note: "This agent has full tool access (Read, Grep, Glob, Write, WebSearch if available — fall back to codebase exploration and Context7 MCP if WebSearch unavailable). No sub-agent spawning (disallowedTools: Agent)."
  - **Known trade-off**: The existing explore skill spawns parallel research sub-agents (cap 5). This agent runs research sequentially because it cannot spawn sub-agents (flat agent hierarchy — agents don't spawn agents). The orchestrator could spawn parallel research agents directly, but that adds orchestrator complexity. Keeping it simple for now. **Future improvement**: orchestrator spawns multiple research agents in parallel, passing topic list from the explore-phase agent's return `researchTopics` field.

- [ ] Create `agents/architecture-phase.md`:
  - Frontmatter: `name: architecture-phase`, `description: Drafts architecture files from Q&A output...`, `model: opus`
  - Receives: structured Q&A summary path, epic goal path, conventions path, research file paths, architecture output directory (convention-derived: `.goodplan/epics/<name>/architecture/`)
  - Behavior: reads Q&A summary, reads referenced research, drafts architecture files (`_overview.md`, subsystem API files, `conventions.md`, `invariants.md` as appropriate). Writes directly to the CLI-managed architecture directory (not temp dir).
  - Evaluates `reconsiderWhen`/`validUntil` conditions when provided.
  - Returns: SUCCESS with `filesWritten` listing all architecture files created.
  - Tool note: "Read, Grep, Glob, Write. No sub-agent spawning."
  - Inject `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md`

- [ ] Create `agents/slices-phase.md`:
  - Frontmatter: `name: slices-phase`, `description: Drafts slice definitions from Q&A output...`, `model: opus`
  - Receives: structured Q&A summary path, architecture file paths, epic goal path, conventions path, temp working directory
  - Behavior: reads Q&A summary and architecture, produces `sequencing.md` and per-slice `goal.md` draft files. Writes to temp dir.
  - Returns: SUCCESS with `filesWritten` listing sequencing.md and all goal.md paths, plus `slices` array of `{name, goal}` objects for each slice (structured metadata so the orchestrator can call `gp slice:create` without parsing file contents).
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

- [ ] Create `skills/_shared/references/review-typescript.md` — TypeScript-specific review criteria: type safety, module design, strict mode compliance, runtime correctness, framework patterns, bundling, Node.js/Bun specifics. Source: read the installed file at `~/.claude/plugins/cache/goodplan-marketplace/goodplan/1.0.3/skills/refine-plan/references/reviewers-language.md`, extract the "TypeScript and JavaScript Reviewer" section, adapt for agent-based format (standalone reference file, not embedded in a multi-reviewer doc), write to `skills/_shared/references/review-typescript.md`.
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

- [ ] Replace `skills/create-epic/SKILL.md` with the new pipeline orchestrator. Frontmatter: `name: create-epic`, description covering triggers ("create epic", "new epic", "start project", "new project"). Note: the build pipeline transforms `name: create-epic` to `name: gp:create-epic` in dist — source uses unprefixed name.
- [ ] Implement Step 0 — Version Check: validate `gp --version --json` returns a compatible CLI version before proceeding (same pattern as plan-slice orchestrator)
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
  - Load context bundle via `gp start-explore --epic <name> --json` → returns `ContextBundle` with prioritized inline content and reference paths (same pattern as plan-slice uses `gp start-plan`)
  - Load `reconsiderWhen`/`validUntil` conditions (forward-compatible: skip if fields absent)
  - Spawn `explore-phase` agent with: context bundle paths, temp dir, conditions
  - Handle PARTIAL returns: present findings to user via AskUserQuestion ("Continue exploring? / That's enough")
  - If continue: re-spawn with continuation file. If done: agent writes explore-complete, then `gp submit-explore --epic <name> --json`

- [ ] Implement Phase 3 (interactive — architecture Q&A):
  - Transition first: `gp epic:define-architecture --epic <name> --json` (`explored` → `defining-architecture`)
  - Then load context: `gp start-architecture --epic <name> --json` → returns `ContextBundle` with explore output, goal, conventions (read-only, does not change status)
  - Run design tree Q&A (reference existing `create-architecture` skill's Q&A structure):
    - **Broad pass** (3-5 questions): Ask about subsystems, their responsibilities, boundaries. Present subsystem map for confirmation. Move to deep pass when user confirms the subsystem map.
    - **Deep pass** (2-3 questions per subsystem, cap at 3 subsystems in detail; remaining get 1 question each; total Q&A under 15 questions): For each subsystem, ask about API surfaces, data models, communication patterns. User can say "that's enough detail" to move on.
  - Write structured Q&A summary to `<tmpdir>/architecture-qa.md`

- [ ] Implement Phase 4 (autonomous — architecture draft + refinement):
  - Derive architecture output path from convention: `.goodplan/epics/<name>/architecture/` (note: `start-architecture` returns a `ContextBundle` with `{ inline, references, decisions, learnings }` — no `paths` field. Architecture dir is derived from epic name convention, not from the response.)
  - Spawn `architecture-phase` agent with: context bundle content (from `start-architecture`), Q&A summary path, architecture output directory (convention-derived). Agent writes directly to this directory (not temp dir).
  - Parse return, check `filesWritten` for architecture file paths
  - Submit architecture: `gp submit-architecture --epic <name> --json` (`defining-architecture` → `architecture-defined`) — content is already at the CLI-managed location
  - Begin refinement: `gp epic:refine-architecture --epic <name> --json` (`architecture-defined` → `refining-architecture`)
  - Refinement loop (follows plan-slice pattern, steps 4f-i through 4f-vi — deviations noted):
    1. Load context bundle: `gp start-refine-architecture --epic <name> --json` → returns `ContextBundle` with architecture paths, prior review output, decisions, learnings
    2. Spawn refinement-coordinator agent with context bundle → returns reviewer list for this round
    3. Spawn reviewer agents in parallel (from coordinator's list), passing `review_context: "architecture-proposal"`
    4. Collect per-reviewer scores from individual reviewer returns (matching plan-slice score source pattern)
    5. Spawn synthesis agent → produces merged feedback
    6. Pre-submit gate: if merged feedback contains CRITICAL/IMPORTANT issues, spawn editor agent to revise artifacts before submitting (the CLI only sees numeric scores, so the orchestrator owns this gate)
    7. Submit round: `echo '{"scores":{...}}' | gp submit-refine-architecture --epic <name> --json` (no `round` field — CLI tracks rounds internally)
    8. Check `response.advanced` (boolean) — if true, refinement complete, exit loop
    9. If `response.advanced` is false and orchestrator detects stagnation (scores plateau for 2 rounds), use `--override` to force exit
    10. Otherwise: loop to step 1
    - **Deviation from plan-slice**: env var `GP_CREATE_EPIC_MAX_ITERATIONS` (default 3, vs plan-slice's 10)

- [ ] Implement Phase 5 (interactive — slices Q&A):
  - Transition: `gp epic:define-slices --epic <name> --json` (`architecture-refined` → `defining-slices`)
  - Load context bundle via `gp start-slices --epic <name> --json` → returns `ContextBundle` with architecture, goal, conventions
  - Discuss: slice scope, ordering, dependencies, size guidance
  - Write structured Q&A summary to `<tmpdir>/slices-qa.md`

- [ ] Implement Phase 6 (autonomous — slices draft + refinement):
  - Spawn `slices-phase` agent with: context bundle paths (from `start-slices`), Q&A summary path, temp dir
  - Parse return: use `slices` array (structured `{name, goal}` pairs) from agent return — do not parse goal.md file contents
  - Create slices via CLI: `gp slice:create --epic <name> --json` for each slice with stdin `{"name":"<name>","goal":"<goal>"}` (using structured metadata from agent return)
  - Copy sequencing.md and goal.md files from temp dir to locations indicated by CLI response paths
  - `gp submit-slices --epic <name> --json` (`defining-slices` → `slices-defined`)
  - Begin refinement: `gp epic:refine-slices --epic <name> --json`
  - Refinement loop (same pattern as architecture refinement — see plan-slice steps 4f-i through 4f-vi):
    1. Load context bundle: `gp start-refine-slices --epic <name> --json` → returns `ContextBundle` with slice paths, prior review output, decisions, learnings
    2. Spawn refinement-coordinator with context bundle → reviewer list
    3. Spawn reviewers in parallel, passing `review_context: "slice-definitions"`
    4. Collect per-reviewer scores from individual reviewer returns
    5. Spawn synthesis → merged feedback
    6. Pre-submit gate: if CRITICAL/IMPORTANT issues remain, spawn editor to revise slice artifacts before submitting
    7. Submit: `echo '{"scores":{...}}' | gp submit-refine-slices --epic <name> --json` (no `round` field)
    8. Check `response.advanced` — if true, refinement complete, exit loop
    9. Stagnation: use `--override` to force exit if scores plateau. Otherwise loop to step 1

- [ ] Implement context discipline: orchestrator uses only CLI queries, Agent tool spawns, AskUserQuestion, and lightweight summaries. No Read calls on architecture files, research files, or goal content directly. For file copying (e.g., agent-produced files to CLI-managed paths), use shell `cp` via Bash tool — not Read+Write, which would pull artifact content into orchestrator context.
- [ ] Handle `slice:create` failures in Phase 6: if any `slice:create` call fails, stop immediately and surface the error. Partial slice creation is acceptable — re-entry will detect existing slices on the next run.

- [ ] Implement PARTIAL status handling for all autonomous phases — same PARTIAL protocol as plan-slice: if sub-agent returns PARTIAL with `questions`, present to user via AskUserQuestion; if with `researchTopics`, spawn research agents; re-spawn with continuation file. Keep it simple — plan-slice's incremental approach is the validated pattern. Do not over-engineer parallel dispatch of questions + research in this slice.

- [ ] Implement `reconsiderWhen`/`validUntil` condition loading and passing:
  - Before spawning phase agents (explore, architecture): load conditions via `gp decision:list --json` and `gp learning:list --json`, then filter client-side by `entityPath` prefix `epics/<name>` (these commands have no `--epic` flag)
  - Filter for entries with non-empty `reconsiderWhen`/`validUntil` (gate: skip if fields absent — forward compat)
  - Include conditions in agent's task prompt
  - Handle `triggeredConditions` in agent return: surface to user

- [ ] Implement temp directory cleanup: clean on successful pipeline completion, preserve on error

- [ ] Update conventions.md phase detection table to include refinement statuses (`refining-architecture`, `architecture-refined`, `refining-slices`, `slices-refined`) — the orchestrator references this table for re-entry
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
- [ ] `bun run build:plugin 2>&1 | grep "Packaged"` → shows old agent count (7 from previous slices)

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin` succeeds and includes all expected agents
- [ ] Verify by name: `dist/gp-plugin/agents/` contains `explore-phase.md`, `architecture-phase.md`, `slices-phase.md`, `reviewer-typescript.md`, `reviewer-tui-cli.md`, `reviewer-repo-tooling.md` (plus the 7 from slice 02)
- [ ] `ls dist/gp-plugin/skills/create-epic/SKILL.md` → exists with `name: gp:create-epic`
- [ ] Agent frontmatter validation passes for all 13 agents
- [ ] `@` reference validation passes for all new agents

### Tasks

- [ ] Run `bun run build:plugin` — verify all 13 agents are copied, validated, and `@` references resolve (explicitly verify the 3 new phase agents' `@` references, not just reviewers)
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
  - Setup: call `gp init` in a temp directory to create a bare project with no epic — the create-epic skill creates the epic itself. Do not use `createMinimalFixture()` (that creates an epic; this test needs a project without one).
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
  - Create fixture with epic at `explored` status: use `createMinimalFixture` with `activateEpic: false` to get a project + epic in `created` status, then advance: `gp epic:explore` → write `explore-complete.md` to the epic directory (required artifact — see `createMinimalFixture` pattern) → `echo '' | gp submit-explore --epic <name> --json` (empty stdin, not JSON — CLI expects no payload). Check `submitExploreInputSchema` if this fails.
  - Invoke skill — should detect status and resume from Phase 3 (architecture Q&A)
  - Verify it doesn't re-run explore

- [ ] Implement `reconsiderWhen` condition evaluation tests:
  - Positive: create fixture decision with `reconsiderWhen: ["New subsystem added that affects auth"]`, set epic goal to mention auth restructuring. Verify agent output includes `triggeredConditions`.
  - Negative: same fixture but epic goal is about documentation. Verify no conditions triggered.

- [ ] Add PARTIAL handling test: mock a sub-agent returning PARTIAL with `questions` — verify orchestrator presents questions to user and re-spawns agent with continuation
- [ ] Add FAILED sub-agent test: mock a sub-agent returning FAILED — verify orchestrator surfaces error and does not proceed to next phase
- [ ] Update CLAUDE.md Agent SDK Test Harness table with `test-create-epic.ts` row

- [ ] Run existing test suite (`bun test`) to verify no regressions from skill changes

### Verification

- Run `bun tools/dogfood/test-create-epic.ts --model claude-haiku-4-5 --max-iterations 1` — pipeline completes
- Check test log for: simulated user responses, agent spawn sequence, phase transitions, score values
- Run `bun test` — all existing tests pass

## Notes

- **Documentation updates**: Full documentation for the create-epic pipeline will be addressed in the epic's final slice (slice 06). This slice updates only CLAUDE.md's test harness table.
- **`gp epic:refine-slices` command**: Confirmed — exists at `src/commands/epic/refine-slices.ts` with precondition `slices-defined`.
