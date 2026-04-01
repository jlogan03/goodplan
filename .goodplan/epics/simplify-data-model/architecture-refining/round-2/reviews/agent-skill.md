# Agent Skill Review — Simplify Data Model Epic Architecture

Reviewer: agent-skill
Iteration: 2
Scope: All architecture files

## R1 Issue Disposition

All R1 issues from this reviewer have been addressed:

- **C-1 (build script):** `_overview.md` now specifies `agents/` packaging, `plugin.json` `"agents"` field, and build verification (line 188).
- **C-2 (skills: frontmatter):** Corrected throughout. `_overview.md` and `conventions.md` now accurately describe `skills:` as injecting full SKILL.md bodies. Injectable references must be skill directories with `user-invocable: false`. `_shared/references/` migration table added to `skill-model-api.md`.
- **I-3 (orchestrator reads):** Relaxed to "primarily CLI status and sub-agent return summaries" with lightweight summary files permitted. Fitness function defined.
- **I-5 (triggering guidance):** `skill-model-api.md` now has a "Description Field Guidelines" section with required trigger phrases per skill.
- **I-7 (model defaults):** `conventions.md` now provides tiered model recommendations by agent type (opus for phase agents, sonnet for reviewers/synthesis/editors/coordinators).
- **I-9 (coordinator tool access):** Refinement-coordinator description now explicitly notes Read/Grep/Glob access and "returns spawn plan, does not spawn reviewers."
- **M-10 (review_context enum):** `conventions.md` now has an explicit `review_context` table with exact string values and reviewer focus per value.
- **M-11 (agent size guidance):** `conventions.md` adds ~500 line guidance with injectable skills for stable reference content.
- **M-12 (continuation versioning):** Continuation file format now includes YAML frontmatter with `type`, `version`, `phase`, `agent`.

## Issues

**[IMPORTANT]** Agent definitions directory has no Claude Code specification for loading

The architecture introduces `agents/` at the plugin root and specifies that orchestrator skills spawn named agents from this directory. However, there is no documented mechanism for how Claude Code discovers and loads agent definitions from a plugin's `agents/` directory. The existing Claude Code plugin spec (`plugin.json`) supports `"skills"` and `"hooks"` fields. The architecture adds `"agents"` to `plugin.json` (line 188 of `_overview.md`) but this is a proposed extension — there is no evidence that Claude Code's plugin loader recognizes an `"agents"` field or knows how to make `.md` files from an `agents/` directory available for spawning via the Agent tool.

The `skills:` frontmatter mechanism is well-researched (documented in `sub-agent-prompt-files.md`). But agent definitions as a plugin-level concept (discoverable via `plugin.json`, loadable by name) appears to be an assumption without research backing. If Claude Code requires agents to be defined via `.claude/agents/` or `.cursor/agents/` at the project level rather than within plugins, the entire orchestrator pattern needs a different distribution mechanism.

Resolution: RESEARCH_NEEDED

Research: Verify how Claude Code discovers agent definitions from plugins. Specifically: (1) Does `plugin.json` support an `"agents"` field? (2) Can the Agent tool spawn named agents from a plugin's `agents/` directory? (3) If not, what is the alternative — project-level `.claude/agents/` populated by the install script, or inline agent prompts in the orchestrator SKILL.md? Source: Claude Code plugin documentation, agentskills.io spec, or empirical testing via the dogfood harness with a test plugin containing an `agents/` directory.

---

**[IMPORTANT]** `reconsiderWhen` / `validUntil` evaluation by sub-agents lacks integration spec

The architecture specifies that `reconsiderWhen` (decisions) and `validUntil` (learnings) are evaluated by "LLM sub-agents" during architecture, planning, and completion phases. The evaluation mechanism section (data-model-changes.md lines 60-62) says sub-agents receive conditions alongside current goal text and use judgment. But the architecture does not specify:

1. **Which sub-agents** — does every phase agent check these, or only specific ones (e.g., architecture-phase, plan-phase, completion-phase)? The list of agent definitions in skill-model-api.md does not mention `reconsiderWhen`/`validUntil` evaluation as a responsibility for any specific agent.
2. **How conditions are passed** — the orchestrator must load decisions/learnings with their conditions and include them in the sub-agent's task prompt. This means the orchestrator reads decision/learning JSONL (via CLI `decision:list --json`, `learning:list --json`), extracts conditions, and passes them. This is a non-trivial addition to the orchestrator's responsibilities not reflected in the phase tables.
3. **Return format** — the sub-agent return format in conventions.md does not include a field for triggered conditions. The orchestrator needs to know which conditions were triggered to surface them to the user.

Without this integration spec, implementers will need to design these details ad-hoc, risking inconsistency across the 4+ skills that run relevant phases.

Resolution: DIRECTLY_ACTIONABLE

Add to conventions.md or data-model-changes.md: (1) which agent types check conditions (recommendation: architecture-phase, plan-phase, completion-phase — not reviewers or coordinators), (2) orchestrator loads conditions via CLI and includes them in the task prompt, (3) add optional `triggeredConditions: [{ entityType: "decision"|"learning", title: string, condition: string }]` to the sub-agent return format.

---

**[MINOR]** `complete-epic` classification rationale is clear but spawning pattern is not

The `complete-epic` skill is classified as standalone (not pipeline) with the justification: "no interactive phases and no multi-phase orchestration — it spawns sub-agents for heavy work but runs a single logical step" (skill-model-api.md line 24). This classification is reasonable, but the architecture does not describe what sub-agents `complete-epic` spawns. It uses `completion-phase.md` (per the agent definitions table), but completion involves learnings synthesis, architecture reconciliation, and artifact promotion — are these one sub-agent invocation or multiple? Does it use the refinement loop (coordinator -> reviewers -> synthesis -> editor) for architecture reconciliation?

This is minor because the skill will be implemented after the pipeline pattern is proven, and implementers will have precedent. But documenting the expected spawning pattern now would prevent scope creep during implementation.

Resolution: DIRECTLY_ACTIONABLE

Add a brief "Agent Usage" note to the `complete-epic` entry in skill-model-api.md: e.g., "Spawns completion-phase agent for learnings synthesis and architecture reconciliation. Does not use the refinement loop — architecture changes during completion are advisory (surfaced to user), not iteratively refined."

---

**[MINOR]** Reviewer agent tool restriction optimization lacks guidance on which tools to allow

Conventions.md now acknowledges tool restriction as "a valid optimization to reduce context overhead from MCP tool definitions (~10-20K tokens per agent turn)" for agents with narrow tool needs. However, it doesn't specify which tools reviewer agents actually need. The parenthetical "(e.g., reviewer agents that only need Read/Grep/Glob/Write)" may be incomplete — reviewers also need `gp` CLI access via Bash for status checks (per the shared preamble's "Query `gp status --json`" instruction). Omitting Bash would break the review preamble's codebase exploration instructions.

Resolution: DIRECTLY_ACTIONABLE

Update the tool restriction note to list the minimum tool set for reviewer agents: Read, Grep, Glob, Write (for review output), and Bash (for CLI status queries during codebase exploration).

---

**[MINOR]** `init` skill absorbs two very different flows with no mode detection mechanism

The architecture says `/gp:init` absorbs `onboard-repo` (existing repo with code) and `create-epic Mode A` (empty/new repo). The description field guidelines include trigger phrases for both. But neither skill-model-api.md nor conventions.md describes how `init` detects which mode to run. The current `onboard-repo` does extensive codebase scanning (git history, config files, dependency analysis) while `create-epic Mode A` initializes a blank project. These are fundamentally different workflows that share only a trigger.

This is minor because the detection logic (check for existing source code, package.json, etc.) is straightforward, but documenting the expected detection heuristic prevents the implementer from choosing an approach that conflicts with the architecture's intent.

Resolution: DIRECTLY_ACTIONABLE

Add a brief note to the `init` skill entry: "Mode detection: if the repo has existing source code (non-empty `src/`, `lib/`, or language-specific entry points), run onboard flow. Otherwise, run new-project flow. The user can override via `--mode onboard` or `--mode new`."

## Score: 8/10

Substantial improvement from R1 (6/10). All R1 critical issues are resolved. The `skills:` frontmatter mechanism is now correctly documented, the `_shared/references/` migration table provides clear disposition for each reference, model tier recommendations are sensible, and the continuation file format has proper versioning. The two remaining IMPORTANT issues are: (1) the agent definitions plugin loading mechanism needs research validation — this is the highest-risk unknown remaining, and (2) the `reconsiderWhen`/`validUntil` evaluation lacks integration details that implementers will need. To reach 9+: confirm that Claude Code can load agent definitions from plugins (or document the alternative), and add the integration spec for condition evaluation.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
