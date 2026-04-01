# Agent Skill Review — Simplify Data Model Epic Architecture

Reviewer: agent-skill
Iteration: 1
Scope: All architecture files

## Issues

**[CRITICAL]** Build script does not package `agents/` directory

The architecture introduces `agents/` at the plugin root as the home for all sub-agent definitions (phase agents, reviewers, coordination agents). However, the existing `scripts/build-plugin.sh` only copies `skills/` into the plugin distribution (`rsync -a ... "$REPO_ROOT/skills/" "$PLUGIN_DIR/skills/"`). There is no `mkdir -p "$PLUGIN_DIR/agents"` or rsync for the `agents/` directory. The `plugin.json` manifest also has no `"agents"` field — only `"skills": "./skills"`. Without updating the build script and manifest, agent definitions will not be included in the distributed plugin and the orchestrator pattern will fail entirely.

Resolution: DIRECTLY_ACTIONABLE

The architecture files (specifically `_overview.md` and `conventions.md`) should specify that `build-plugin.sh` must be updated to:
1. Copy `agents/` into the plugin distribution
2. Add `"agents": "./agents"` to `plugin.json` if required by the plugin spec
3. Add verification steps (analogous to the existing skill packaging checks) for agent definitions
4. Apply any namespace prefixing rules to agent names if needed

---

**[CRITICAL]** `skills:` frontmatter on agents loads full skill content, not reference file content

The architecture repeatedly states that `skills:` frontmatter on agent definitions "injects shared reference content" (conventions.md line 123, _overview.md line 40, 67, 133). But per the research doc (`sub-agent-prompt-files.md`), `skills:` injects **full skill content** — the entire SKILL.md body — not individual reference files. If you list `shared-preamble` as a skill, Claude Code would look for a skill named `shared-preamble` with its own SKILL.md, not a reference file within a skill.

The architecture says "Shared references consumed by agent definitions move to skill-format files injectable via `skills:` frontmatter" (skill-model-api.md line 180) which is the right direction, but the architecture files elsewhere describe this as if `skills:` can inject arbitrary reference files. The distinction matters because:
- Each injectable reference must become a standalone skill directory with its own SKILL.md
- This changes the skill count (more than 12 skills in the plugin, some being "reference skills" not user-invocable)
- The `skills/_shared/references/` pattern would partially migrate to standalone skill directories

Resolution: DIRECTLY_ACTIONABLE

Clarify in `_overview.md` and `conventions.md` that:
1. `skills:` on agent definitions injects full SKILL.md bodies from named skills, not arbitrary reference files
2. Shared content that agents need (review preamble, output format, CLI conventions) must each become a standalone skill with `user-invocable: false` (or equivalent) in frontmatter
3. Enumerate which current `_shared/references/` files become injectable skills vs. which stay as Read-accessed references
4. Update the skill count to reflect these non-user-invocable skills

---

**[IMPORTANT]** No triggering/description guidance for the 12 user-facing skills

The skill-model-api.md lists 12 skills with names and brief descriptions but provides no guidance on `description` field content for SKILL.md frontmatter. The description field is the primary trigger mechanism — it must include both what the skill does AND when to use it. The existing skills (e.g., `create-epic`, `explore`, `refine-plan`) have detailed, carefully crafted descriptions with common trigger phrases. The architecture should specify description conventions for the consolidated skills to ensure:
- Pipeline skills trigger correctly (e.g., `/gp:plan-slice` must trigger when users say "create a plan" OR "refine the plan", since it absorbs both)
- Merged skills don't under-trigger (e.g., `/gp:audit` must trigger for architecture audit, docs audit, AND test audit queries)
- Renamed skills don't break triggering (e.g., `/gp:task` replacing `capture` must still trigger on "capture a task" and "note this bug")

Resolution: DIRECTLY_ACTIONABLE

Add a section to skill-model-api.md or conventions.md that specifies description field guidelines for each consolidated skill, including trigger phrases that must be covered. This is especially important for `plan-slice` (absorbs two distinct user intents), `audit` (absorbs three), and `init` (absorbs two very different flows).

---

**[IMPORTANT]** Orchestrator "never reads file contents" constraint conflicts with practical needs

The conventions state the orchestrator "must never read artifact file contents" and operates only on CLI status, sub-agent return summaries, and user Q&A. However, several practical scenarios require the orchestrator to read lightweight content:
- Re-entry: the orchestrator needs to present what's already been done to the user. The architecture says to use CLI status for this, but CLI status only returns a status string (e.g., `explored`), not a summary of what the explore phase found.
- Phase transitions: deciding which phase to run next based on status is fine, but the re-entry UI ("Go back to an earlier phase") needs enough context to help the user choose.
- Error recovery: if a sub-agent returns FAILED, the orchestrator needs more than just the status code to present useful options.

The constraint is well-intentioned (keep orchestrator context lean) but stated too absolutely. Current skills (e.g., `refine-plan`) read reference files and reviewer output to make decisions.

Resolution: DIRECTLY_ACTIONABLE

Relax the constraint to: "The orchestrator should minimize reading file contents. It relies primarily on CLI status and sub-agent return summaries for control flow decisions. When user-facing context is needed (re-entry summaries, error details), the orchestrator may read lightweight summary files but should never read full artifact content (architecture files, plans, code)."

---

**[IMPORTANT]** Sub-agent flat hierarchy constraint blocks refinement-coordinator from reading artifacts

The architecture states "Sub-agents cannot spawn sub-agents (flat hierarchy)" (_overview.md line 128). Yet the refinement-coordinator agent must "read the artifact, select relevant reviewers, return spawn plan." In the current codebase, reviewer selection is done inline by the orchestrator (it reads the artifact and decides). The flat hierarchy constraint means the refinement-coordinator agent can read artifacts and make decisions, but if it needed deeper analysis (e.g., reading multiple reference files to understand the domain), it's limited to its own context window.

This isn't necessarily a problem — the coordinator has full Read/Grep/Glob access. But the architecture should be explicit that while sub-agents can't spawn further sub-agents, they CAN use all file-access tools. The conventions say "Do not restrict tools" but this should be reaffirmed specifically for the coordinator use case, since it's a non-obvious pattern (agent that reads and decides but delegates execution back to the orchestrator).

Resolution: DIRECTLY_ACTIONABLE

Add a brief note in the refinement-coordinator description (skill-model-api.md or conventions.md) clarifying: "The refinement-coordinator uses Read, Grep, Glob to analyze artifacts and determine reviewer selection. It returns a structured spawn plan to the orchestrator but does not spawn reviewers itself."

---

**[IMPORTANT]** Agent definition model defaults all set to opus — no cost/latency consideration

The conventions specify "Default model is `opus` for all agents" with a note about downgrading later. For a 6-phase pipeline like `create-epic` with a refinement loop (coordinator + N reviewers + synthesis + editor per round, potentially 2-3 rounds), this means potentially 15-25 opus sub-agent invocations per pipeline run. At current pricing, this could cost $5-15+ per `create-epic` invocation.

The research doc and test harness architecture already establish a tier model (haiku for structural, sonnet for quality simulation). The agent architecture should establish similar baseline model recommendations per agent type, at least as documented defaults that can be tuned:
- Reviewers: sonnet (reading + structured output, doesn't need opus reasoning)
- Synthesis: sonnet (merging, deduplication)
- Editor: sonnet (applying feedback to files)
- Coordinator: haiku or sonnet (classification + structured output)
- Phase agents (explore, architecture, implementation): opus (complex reasoning)

Resolution: DIRECTLY_ACTIONABLE

Update conventions.md to provide recommended model defaults per agent type with justification, rather than blanket opus. Keep opus as the recommended starting point for phase agents only, with sonnet for coordination/review/editing agents.

---

**[MINOR]** `review_context` values not enumerated as a closed set

The architecture mentions the orchestrator passes a `review_context` that tells reviewers what they're reviewing, with examples: "architecture proposal", "slice definitions", "implementation plan", "code implementation", "audit findings". But this list appears only in a narrative paragraph in _overview.md. It should be an explicit enumeration in conventions.md since reviewers must adapt their evaluation criteria based on this value. If new review contexts are added later, all reviewer agent definitions need to handle them.

Resolution: DIRECTLY_ACTIONABLE

Add a `review_context` enum table to conventions.md with the exact string values and what each means for reviewer behavior.

---

**[MINOR]** No progressive disclosure strategy for agent definition files

Some agent definitions will be large — reviewer agents need domain expertise, evaluation criteria, codebase exploration focus, and context adaptation instructions. The current reviewer prompt files (e.g., `reviewers-ai-tooling.md` at 13KB) contain multiple reviewers in one file, but the new model puts each reviewer in its own agent `.md` file. The architecture doesn't address what happens when an agent definition exceeds a reasonable size — there's no equivalent of the skill's `references/` directory for agents.

Since `skills:` on agents injects full skill content, large reference material should be in injectable skills. But the architecture doesn't establish a size guideline for agent markdown bodies or when to split content into injectable skills vs. keeping it inline.

Resolution: DIRECTLY_ACTIONABLE

Add guidance to conventions.md: agent markdown bodies should stay under ~500 lines (matching the skill guidance). Stable reference content (evaluation criteria, output formats) should be in injectable skills. Dynamic, agent-specific content (persona, domain expertise, codebase exploration focus) stays in the agent body.

---

**[MINOR]** Continuation file format has no versioning or type field

The continuation file format in conventions.md defines markdown sections (Completed, Artifacts Written, Learnings, Pending, Resume Instructions) but no structured metadata. If the format evolves, there's no way to distinguish v1 continuations from v2. A simple `type: continuation` and `version: 1` in YAML frontmatter would make this future-proof.

Resolution: DIRECTLY_ACTIONABLE

Add YAML frontmatter to the continuation file format: `type: continuation`, `version: 1`, `phase: <phase-name>`, `agent: <agent-name>`.

---

**[MINOR]** `implement` pipeline has no interactive phase but other pipelines assume front-loaded interaction

The conventions say "Interactive phases come first in the pipeline wherever possible." The `implement` pipeline has zero interactive phases — it goes straight to autonomous implementation. The conventions should acknowledge this explicitly rather than having it be an exception to discover. The `plan-slice` pipeline front-loads the interaction that `implement` needs, so this is by design, but it should be stated.

Resolution: DIRECTLY_ACTIONABLE

Add a note to the `implement` pipeline description in skill-model-api.md: "No interactive phases — user interaction was front-loaded by `/gp:plan-slice`. The plan is the user's approved intent."

## Score: 6/10

The architecture is ambitious and well-structured with clear separation of concerns (orchestrator vs. sub-agents, interactive vs. autonomous phases, continuation protocol). The skill consolidation from 19 to 12 is well-reasoned and the migration table is clear. However, two critical issues could block implementation: the build script gap for `agents/` and the misunderstanding about what `skills:` frontmatter actually injects. These need resolution before implementation begins. The cost concern with blanket opus defaults is also significant for practical adoption. To reach 9+: fix the two critical issues, add triggering guidance, relax the "never reads" constraint to be practical, and establish model tier defaults.

## Summary
- Critical: 2
- Important: 4
- Minor: 4
