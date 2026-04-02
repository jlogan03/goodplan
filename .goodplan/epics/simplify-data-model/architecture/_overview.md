# Architecture Overview — Simplify Data Model Epic

## Summary of Changes

This epic consolidates 19 workflow skills into 12 by merging sequentially-used skills into pipeline skills that run multiple phases autonomously. It also makes targeted data model improvements (decision provenance, overview consolidation) and upgrades the test harness for the new skill model.

The existing four-layer CLI stack (Commands → RPC → State Machine → Data Layer) is unchanged. Changes are:
- **Skills layer**: 19 → 12 skills. Three pipeline skills (`create-epic`, `plan-slice`, `create-side-quest`) use an orchestrator pattern that spawns sub-agents per phase. Four standalone skills merge pairs (`audit`, `implement`, `complete-epic`, `explore` standalone).
- **Data Layer**: `entityPath` provenance field on decisions. Overview file consolidation (quests + tasks into existing structure).
- **Test harness**: LLM-simulated user responses, per-test model selection, phase artifact verification.

## What Changes

### Skill Consolidation (19 → 12)

Three categories of change:

**Pipeline skills** (new orchestrator pattern):
- `/gp:create-epic` — replaces create-epic + explore + create-architecture + refine-architecture + create-slices + refine-slices. Lightweight orchestrator that checks CLI status, spawns sub-agents per phase, passes file paths between them. Orchestrator relies on CLI status and sub-agent return summaries — never reads full artifact content.
- `/gp:plan-slice` — replaces create-plan + refine-plan. Creates and refines a slice plan in one invocation.
- `/gp:create-side-quest` — replaces quest creation + explore + create-plan + refine-plan for quests.

**Merged standalone skills**:
- `/gp:audit` — replaces audit-architecture + audit-docs + audit-tests. Mode selection at invocation.
- `/gp:implement` — replaces implement-plan + complete (slice level). Implements then completes the slice.
- `/gp:complete-epic` — standalone epic completion skill (learnings synthesis, architecture reconciliation, artifact promotion). Separated from `/gp:implement` because the user may want to add slices or verify before closing the epic.

**Unchanged skills** (renamed):
- `/gp:start-epic` (was start-epic)
- `/gp:explore` (was explore) — thin wrapper that spawns `explore-phase.md` as a sub-agent. Pipeline skills (`create-epic`, `create-side-quest`) also spawn `explore-phase.md` directly — they do not invoke `/gp:explore`.
- `/gp:task` (was capture) — creates lightweight tasks
- `/gp:upgrade` (was migrate) — upgrades `.goodplan/` state format between versions
- `/gp:init` (was onboard-repo + create-epic Mode A) — handles both empty repos and pre-existing repos
- `/gp:status` (was project-status)

### Shared Internal Modules

Two distribution mechanisms:

**Agent definitions** (`agents/` directory) — for phase-level sub-agents that need full instruction sets. Content loaded by Claude Code at spawn time. Shared content is composed into agents via `@${CLAUDE_PLUGIN_ROOT}/path` references in the agent's markdown body — this injects file content at load time, bypassing Read permission issues. **Verified via prototype: `@` references in agent `.md` files work correctly in plugin context.**

Note: `skills:` frontmatter injection from plugin agents → plugin skills is broken (issue #25834, silent failure). Do NOT use `skills:` for plugin-to-plugin injection. Use `@` references instead.

**Skill-level shared content** (`skills/_shared/references/`) — shared reference files consumed by agent definitions via `@` references. These stay as regular `.md` files (no need to convert to skill directories). Also injected into orchestrator skills via `@` references at SKILL.md load time — kept minimal in orchestrators to avoid bloating context.

Key shared agents:
- **explore-phase** — research/brainstorm/prototype loop. Spawned by `/gp:create-epic` (phase 2), `/gp:create-side-quest` (phase 2), and `/gp:explore` (standalone wraps the same agent).
- **refinement-coordinator** — reads an artifact, selects relevant reviewers, returns spawn plan. Spawned before each refinement round by any orchestrator running a review loop.
- **reviewer-*** — one agent per reviewer domain (holistic, software-architecture, typescript, ci-github-workflows, backend, frontend, etc.). Each agent's markdown body contains domain-specific review criteria + shared review preamble (output format, severity levels, score rubric) composed via `@` references. Defined once, used by all skills that run reviews: `/gp:create-epic` (architecture + slices), `/gp:plan-slice`, `/gp:implement`, `/gp:create-side-quest`, and `/gp:audit`.
- **synthesis** — merges multiple reviewer outputs, deduplicates, resolves contradictions.
- **editor** — applies review feedback to an artifact (plan, architecture, slices).
- **implement-phase** — implements a plan phase, reports changed files and status.

### Orchestrator Pattern

Pipeline skills have two types of phases:

**Interactive phases** (run in orchestrator context) — goal capture, architecture Q&A, design tree exploration, approval gates. The orchestrator asks the user questions directly via AskUserQuestion (sub-agents cannot use this tool). Q&A history stays in orchestrator context (~10-20K tokens for deep interactions like design tree, well within the 1M budget).

**Autonomous phases** (delegated to sub-agents) — research, drafting, refinement loops, implementation, completion. The orchestrator spawns named agents from the `agents/` directory, passing dynamic context (file paths, prior Q&A summaries) in the task prompt.

The orchestrator flow:
1. Check entity status via CLI (`gp status --json`, `gp epic:show --json`, etc.)
2. Determine which phase to run next based on CLI status
3. If interactive phase: run Q&A directly, write structured output to disk
4. If autonomous phase: spawn a named agent, receive compact summary
5. Advance to next phase or exit

**Agent definitions** live in `agents/` at the plugin root. Each `.md` file's body becomes the sub-agent's system prompt, loaded by Claude Code at spawn time — no Read permission needed. Shared content (review preamble, output format, CLI conventions) is injected via `@${CLAUDE_PLUGIN_ROOT}/path` references in the agent's markdown body. These references are resolved at agent load time by Claude Code, replacing the `@` line with the referenced file's content. This avoids the need for a separate `skills:` frontmatter injection mechanism (see issue #25834).

```
goodplan-plugin/
  skills/
    create-epic/SKILL.md           # lightweight orchestrator
    ...
  agents/
    explore-phase.md               # explore phase agent
    architecture-phase.md          # architecture phase agent
    refine-phase.md                # shared refinement loop agent
    slices-phase.md                # slice definition agent
    plan-phase.md                  # plan creation agent
    implement-phase.md             # implementation agent
    reviewer.md                    # code/plan reviewer agent
    ...
```

**Refinement loop pattern** — for phases that run iterative review cycles (architecture, slices, plans):
1. Orchestrator spawns **refinement-coordinator** agent — reads the artifact, selects relevant reviewers, returns a structured spawn plan (which reviewers, file paths, confirmed goal)
2. Orchestrator spawns **reviewer agents** in parallel as coordinator specified
3. Orchestrator spawns **synthesis agent** — merges reviews, returns scores + severity counts
4. If scores don't pass: orchestrator spawns **editor agent**, then re-spawns coordinator to re-evaluate
5. Orchestrator decides to loop or exit based on synthesis return values (numbers, not content)

The orchestrator never reads full artifact contents or decides which reviewers to use — it follows the coordinator's instructions.

**Reviewer context passing** — reviewer agents are domain specialists (one per domain, defined in `agents/`). The orchestrator passes a `review_context` in the task prompt that tells the reviewer what it's reviewing: `architecture proposal`, `slice definitions`, `implementation plan`, `code implementation`, or `audit findings`. The reviewer adapts its focus accordingly (e.g., structural soundness for architecture, implementability for plans, code quality for implementations). Same agent definition, different task framing.

**Front-loaded interaction principle** — pipeline skills front-load all user interaction before entering autonomous execution:
1. **Upfront Q&A block** — ask all anticipatable questions at the start (goal, approach, constraints, preferences). The user sets direction and provides context.
2. **Autonomous execution** — sub-agents run, review loops iterate, files get written. No user interruption unless something genuinely unexpected arises.
3. **Approval gate** — present results at the end or at natural phase boundaries.

Pause during autonomous execution ONLY for:
- Decisions with consequences outside the current scope (affects other epics, quests, or project direction)
- Ambiguity that can't be resolved after the full resolution ladder (see below)
- Architecture changes that weren't anticipated in the upfront Q&A

**Ambiguity resolution** — sub-agents should use judgment about the fastest path to an answer:
- **Codebase** (Grep, Read, Glob) — when the answer is likely in existing code or config
- **Existing research** — when prior exploration covered the topic
- **Web research** (WebSearch, Context7 MCP tools) — when the question is about external APIs, library behavior, platform constraints, or anything outside the codebase
- **Ask the user** — when the question is about intent, preferences, business context, or domain knowledge that research can't answer

Skip steps that clearly won't help. If it's a product decision, ask the user directly rather than searching the codebase first. If it's an API compatibility question, go straight to web research. The goal is resolving ambiguity efficiently, not following a checklist.

**Sub-agent yield and resume protocol** — when a sub-agent needs user input or research:
1. Sub-agent writes a **continuation file** to the working directory (e.g., `working/<phase>-continuation.md`) containing: what was accomplished, decisions made and reasoning, what's needed and why, what to do next once the answer/research is available.
2. Sub-agent returns: `{ status: "NEEDS_INPUT"|"NEEDS_RESEARCH", question: "...", continuationFile: "<path>" }` (or `{ status: "NEEDS_RESEARCH", topic: "...", continuationFile: "<path>" }`)
3. Orchestrator handles the request: asks the user via AskUserQuestion, or spawns a research agent that writes results to a file.
4. Orchestrator re-spawns the original sub-agent with: the original task prompt + path to the continuation file + path to the user's answer or research output.
5. New sub-agent instance reads the continuation file and resumes where the prior instance left off.

This preserves context across re-spawns without requiring experimental features (agent teams / SendMessage). The continuation file IS the sub-agent's memory.

This enables the user to start a skill, step away, and return to completed work — maximizing autonomous runtime without sacrificing quality on decisions that genuinely need human judgment.

**Critical constraints**:
- Orchestrator relies primarily on CLI status and sub-agent return summaries. When user-facing context is needed (re-entry summaries, error details from failed sub-agents), it may read lightweight summary files but never full artifact content (architecture files, plans, code). Fitness function: orchestrator context should contain only CLI output, sub-agent return values, user Q&A, and lightweight summary files — no Read calls on full artifact files.
- Sub-agents cannot spawn sub-agents (flat hierarchy)
- Sub-agents cannot use AskUserQuestion — all user interaction happens in the orchestrator
- Cap parallel sub-agents at 5-7 (empirical finding from dogfood harness testing — beyond 7, Claude Code's parallel agent management becomes unreliable and context budget per agent degrades)
- Each phase must write its output to disk before the orchestrator advances (crash recovery)
- Budget: ~25K tokens typical orchestrator context (Q&A + summaries). Worst-case estimate for `create-epic` (longest pipeline): ~15K Q&A (deep design tree) + ~5K CLI status calls + ~30K sub-agent return summaries (30 spawns x ~1K avg) + ~60K spawn overhead (tool definitions, system prompt injection at ~2-3K per spawn) = **~110K total session context** (~11% of 1M window). Shorter pipelines (`plan-slice`, `create-side-quest`) stay well under 50K. The key constraint is that orchestrator-owned context (Q&A + summaries + CLI output, excluding spawn overhead) should stay under ~50K to leave ample budget for sub-agent work.
- Use Agent tool directly to spawn named agents (not `context: fork` + `agent:` which has open bug #16803)
- Agent definitions solve the plugin file permission issue: shared references are injected via `@${CLAUDE_PLUGIN_ROOT}/path` references in the agent's markdown body at load time, not Read tool calls (see note above re: `skills:` frontmatter being broken — issue #25834)

### Re-entry Protocol

When a pipeline skill is invoked on an entity with in-progress state:

```
Epic "simplify-data-model" is in progress.

Completed: create ✓, explore ✓, architecture ✓
Next: refine-architecture

→ Continue from refine-architecture
→ Go back to an earlier phase
```

Phase detection uses the CLI exclusively — no filesystem artifact checks. The orchestrator queries `gp epic:show --json` (or `slice:show`, `quest:show`) and maps the `status` field to the corresponding pipeline phase (see the status-to-phase table in conventions.md).

"Go back" re-enters a phase with existing artifacts preserved (adds to them, doesn't restart from scratch).

**Exception:** For `/gp:implement`, re-entry resumes from the last incomplete plan phase (detected via commit history or CLI status). There is no "go back" option since all phases are autonomous.

### Data Model Changes

**Decision provenance** (lightweight):
- Add optional `entityPath` field to the decision JSONL schema (e.g., `"entityPath": "epics/simplify-data-model/slices/01-test-harness"`)
- No new state machine events or rollup handlers
- Skills pass the current scope when creating decisions; the field is informational only
- Existing decisions without `entityPath` remain valid (field is optional)

**Overview consolidation**:
- Embed quests and tasks into a single root overview structure alongside existing epic-embedded-slices
- Remove separate `quests/overview.json` and `tasks/overview.json`
- Schema registry and assembleState/commitState adapt via the existing schema-registry pattern
- ~30 files affected (~20 source files: schemas, transitions, commands, fixtures; ~10 test files updating paths and assertions)

### Test Harness Improvements

- **LLM-simulated user responses**: Replace auto-first-option in `canUseTool` interceptor with an LLM call that reads the question + options and picks contextually. Haiku for structural tests, sonnet for quality tests.
- **Per-test model selection**: Expose `--model` parameter to all test harness scripts. Document tier mapping (structural = haiku, pipeline = haiku, quality = opus).
- **Phase artifact verification**: Formalized `verifyPhaseArtifacts(phase, expectedFiles)` function called after each skill run in pipeline tests.
- **Final quality validation**: Epic's last slice runs full workflow with opus against a realistic fixture.

## Implementation Sequencing Priorities

The orchestrator pattern (agents/ directory, interactive/autonomous phases, refinement-coordinator) is the highest-risk architectural bet. **Slice 02 should validate the full pattern** by building `/gp:plan-slice` as a proof-of-concept before the remaining skills are consolidated. `plan-slice` is the simplest pipeline (2 phases: create-plan → refine-plan) but exercises all the key mechanisms: interactive Q&A in orchestrator, agent spawning, refinement-coordinator → reviewers → synthesis → editor loop.

If the pattern doesn't work well for `plan-slice`, we adjust before committing to the more complex pipelines (`create-epic` with 6 phases, `create-side-quest` with 4 phases).

Recommended slice order:
1. Test harness improvements (prerequisite tooling)
2. `plan-slice` pipeline proof-of-concept (pattern validation)
3. Remaining skill consolidation (builds on proven pattern)

### Plugin Build Pipeline Changes

`build-plugin.sh` and `plugin.json` must be updated to support the new `agents/` directory:
- **`build-plugin.sh`**: add a step to copy `agents/` alongside `skills/` into the dist. Add build verification that all referenced agent `.md` files exist in the dist.
- **`plugin.json`**: add an `"agents"` field pointing to the agent definitions directory (format: `"agents": "agents/"` — a single directory path; Claude Code discovers all `.md` files within it).
- Research validation in `.goodplan/epics/simplify-data-model/research/sub-agent-prompt-files.md` confirmed that plugin `agents/` directories are discovered at priority 4.

## What Doesn't Change

- Four-layer CLI stack (Commands → RPC → State Machine → Data Layer)
- Plugin packaging and distribution CI workflow (unchanged — build-plugin.sh runs in the same CI job)
- HMAC state integrity
- State protection hooks
- Goal files remain as markdown (migration deferred)
- Learnings rollup system
- `nextCommands` feature

## Subsystem Maturity

| Subsystem | Maturity | Notes |
|---|---|---|
| Skills | Experimental | New orchestrator pattern, major restructure |
| Data Layer | Developing (modified) | Decision provenance field, overview consolidation |
| State Machine | Developing (modified) | Decision schema change, overview schema change |
| Commands | Developing (modified) | Decision create accepts entityPath |
| Test Harness | Experimental | New simulated responses, artifact verification |

All other subsystems (RPC Layer, Context, Plugin) are unchanged by this epic.

## Post-Migration Documentation Updates

After skill consolidation is complete, the following docs must be updated to reflect the new skill model:
- `.goodplan/architecture/_overview.md` — update skill references, subsystem maturity
- `CLAUDE.md` — update any skill invocation references
- `skills/` README or index (if present) — update skill inventory
- These updates should be tracked as a task in the final implementation slice.
