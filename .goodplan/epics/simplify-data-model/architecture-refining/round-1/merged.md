# Merged Architecture Review — Simplify Data Model Epic (Round 1)

## Reviewer Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| software-architecture | 7/10 | 0 | 5 | 5 |
| holistic | 6/10 | 1 | 5 | 4 |
| agent-skill | 6/10 | 2 | 4 | 4 |

**Merged: 6/10** (floor of individual scores — critical issues unresolved)

---

## CRITICAL Issues

### C-1: Build script does not package `agents/` directory
**Source:** agent-skill
**Resolution:** DIRECTLY_ACTIONABLE

The architecture introduces `agents/` at the plugin root but `scripts/build-plugin.sh` only copies `skills/`. No `mkdir -p "$PLUGIN_DIR/agents"`, no rsync, no `"agents"` field in `plugin.json`. Without updating the build script and manifest, agent definitions will not be included in the distributed plugin and the orchestrator pattern fails entirely.

**Action:** Update architecture docs to specify that `build-plugin.sh` must copy `agents/`, add `"agents"` to `plugin.json`, and add verification steps for agent definitions.

---

### C-2: `skills:` frontmatter on agents loads full skill content, not arbitrary reference files
**Sources:** agent-skill (CRITICAL), holistic (IMPORTANT) — elevated to CRITICAL per domain specialist (agent-skill)
**Resolution:** DIRECTLY_ACTIONABLE

The architecture repeatedly says `skills:` frontmatter "injects shared reference content" (review preamble, output format, CLI conventions). But per research (`sub-agent-prompt-files.md`), `skills:` injects full SKILL.md bodies from named skills, not arbitrary reference files. Each injectable reference must become a standalone skill directory. This changes the skill count and the migration plan for `skills/_shared/references/`.

**Action:** Clarify in `_overview.md` and `conventions.md` that:
1. `skills:` injects full SKILL.md bodies from named skills
2. Shared content must each become a skill with `user-invocable: false` or equivalent
3. Enumerate which `_shared/references/` files become injectable skills vs. Read-accessed references
4. Update skill count to reflect non-user-invocable skills

---

### C-3: Phase detection contradicts itself across documents
**Sources:** holistic (CRITICAL), software-architecture (IMPORTANT) — elevated to CRITICAL per holistic reviewer
**Resolution:** DIRECTLY_ACTIONABLE

`_overview.md` (lines 149-155) says phase detection uses "CLI status + filesystem artifact existence" with specific file-existence checks. `conventions.md` (line 77) says "Phase detection uses the CLI exclusively — no filesystem artifact checks." Additionally, `_overview.md` line 62 says "based on status + filesystem artifacts." These are mutually exclusive. The conventions.md version (CLI-only) is the better design — single source of truth, no filesystem coupling, consistent with "orchestrator never reads file contents."

**Action:** Update `_overview.md` lines 62 and 149-155 to match the CLI-only approach in `conventions.md`.

---

## IMPORTANT Issues

### I-1: Overview consolidation presents two options with no decision
**Sources:** software-architecture, holistic
**Resolution:** DIRECTLY_ACTIONABLE

`data-model-changes.md` section 3 presents Option A and Option B for overview consolidation but defers to implementation. Architecture docs should make the structural decision. Option A (single `overview.json` at root) is architecturally cleaner — eliminates path coupling, aligns with consolidation goal, simplifies schema registry.

**Action:** Pick Option A and document the rationale.

---

### I-2: `reconsiderWhen` and `validUntil` evaluation mechanism not specified
**Sources:** software-architecture, holistic
**Resolution:** DIRECTLY_ACTIONABLE

Both fields introduce judgment-heavy evaluation ("check conditions against current work context") but don't specify: (1) Who evaluates — CLI deterministically or LLM during skill execution? (2) Where — orchestrator (violating "no content reading") or sub-agent? (3) What is "current work context"? LLM evaluation means non-deterministic triggering; CLI evaluation means structured condition formats. The answer affects schema design.

**Action:** Specify explicitly: LLM evaluation in a sub-agent (not orchestrator), with the evaluation context being the current epic/slice goal text. Document that triggering is advisory, not deterministic.

---

### I-3: Orchestrator "never reads file contents" constraint too absolute / unenforced
**Sources:** software-architecture (enforcement), agent-skill (practicality)
**Resolution:** DIRECTLY_ACTIONABLE

Two related concerns: (a) No architectural mechanism prevents violation — enforced only by prompt instruction, despite the dogfood harness already checking for `.project/` direct access. (b) Practical scenarios need lightweight content (re-entry summaries, error details from failed sub-agents).

**Action:** (a) Relax the constraint: "Orchestrator relies primarily on CLI status and sub-agent return summaries. When user-facing context is needed (re-entry summaries, error details), it may read lightweight summary files but never full artifact content (architecture files, plans, code)." (b) Add a fitness function to the dogfood harness: "orchestrator context should contain only CLI output, sub-agent return values, user Q&A, and lightweight summary files — no Read calls on full artifact files."

---

### I-4: `explore` listed as both standalone and shared module — relationship to agent unspecified
**Source:** software-architecture
**Resolution:** DIRECTLY_ACTIONABLE

`_overview.md` says `/gp:explore` is "also invoked internally by pipeline skills as a shared module." `skill-model-api.md` shows `explore-phase.md` used by multiple pipelines. But neither explains whether `/gp:explore` wraps the agent (spawning it as a sub-agent) or contains duplicate logic.

**Action:** Document that `/gp:explore` is a thin wrapper that spawns `explore-phase.md` as a sub-agent, and pipeline skills also spawn `explore-phase.md` directly.

---

### I-5: No triggering/description guidance for the 12 user-facing skills
**Source:** agent-skill
**Resolution:** DIRECTLY_ACTIONABLE

The skill-model-api.md lists 12 skills but provides no guidance on `description` field content. The description is the primary trigger mechanism. Merged skills risk under-triggering (e.g., `/gp:audit` must trigger for architecture, docs, AND test audit queries; `/gp:plan-slice` must trigger for both "create a plan" and "refine the plan").

**Action:** Add description field guidelines with required trigger phrases for each consolidated skill, especially `plan-slice`, `audit`, `init`, and `task`.

---

### I-6: `implement` pipeline has no interactive phase — not documented as intentional
**Sources:** holistic (IMPORTANT), agent-skill (MINOR) — kept at IMPORTANT
**Resolution:** DIRECTLY_ACTIONABLE

`/gp:implement` shows "None" for interactive phases. The front-loaded interaction principle says approval gates should exist at phase boundaries. Implementation is the highest-stakes phase. This is by design (plan was already approved during `plan-slice`), but the architecture should state this explicitly rather than leaving it as an exception.

**Action:** Add note to `/gp:implement`: "No interactive phases — user interaction was front-loaded by `/gp:plan-slice`. The plan is the user's approved intent."

---

### I-7: Agent model defaults all set to opus — no cost/latency consideration
**Source:** agent-skill
**Resolution:** DIRECTLY_ACTIONABLE

A 6-phase pipeline with refinement loops could mean 15-25 opus invocations per run ($5-15+). The research and test harness already establish tiered models. The architecture should provide baseline model recommendations per agent type.

**Action:** Update conventions.md with recommended defaults: opus for phase agents (complex reasoning), sonnet for reviewers/synthesis/editors, haiku or sonnet for coordinators. Keep as recommendations, not hard constraints.

---

### I-8: No explicit cleanup plan for deleted skills' shared references
**Source:** holistic
**Resolution:** DIRECTLY_ACTIONABLE

`skill-model-api.md` "What Gets Deleted" section says "shared references consumed by agent definitions move to skill-format files injectable via `skills:` frontmatter" but doesn't enumerate which references are shared vs. deleted, or specify the new structure.

**Action:** Add a migration table: for each `_shared/references/` file, specify whether it becomes an injectable skill, stays as a Read-accessed file, or gets deleted.

---

### I-9: Sub-agent flat hierarchy constraint — clarify coordinator tool access
**Source:** agent-skill
**Resolution:** DIRECTLY_ACTIONABLE

The flat hierarchy constraint ("sub-agents cannot spawn sub-agents") combined with "Do not restrict tools" is correct but the coordinator pattern is non-obvious — it reads artifacts and returns structured decisions to the orchestrator without spawning anything.

**Action:** Add brief note to refinement-coordinator description: "Uses Read, Grep, Glob to analyze artifacts and determine reviewer selection. Returns structured spawn plan to orchestrator but does not spawn reviewers itself."

---

## MINOR Issues

### M-1: Model references may be placeholder names
**Source:** holistic
**Resolution:** CODEBASE_EXPLORATION

`test-harness-api.md` references `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6`. If aspirational, test scripts will fail.

**Action:** Verify these are valid API model IDs; if not, note them as placeholders.

---

### M-2: Default model "opus for all agents" vs haiku for structural tests
**Source:** software-architecture
**Resolution:** DIRECTLY_ACTIONABLE

Blanket "opus for all agents" in conventions.md could be misread to include test harness model selection. Add clarifying note that opus default applies to agent definitions, not test harness simulated responses. (Partially subsumed by I-7.)

---

### M-3: Agent `tools` field restriction as valid optimization
**Source:** software-architecture
**Resolution:** DIRECTLY_ACTIONABLE

Convention says "Do not restrict tools" but MCP tools add 10-20K tokens per sub-agent turn. For reviewer agents that only need Read/Grep/Glob/Write, restricting tools saves significant context. Acknowledge tool restriction as a valid optimization for agents with known tool needs.

---

### M-4: `implement` skill description says "slice completion" but doesn't mention quest completion
**Source:** software-architecture
**Resolution:** DIRECTLY_ACTIONABLE

Current `implement-plan` handles both slices and quests. The consolidated skill description should cover both.

---

### M-5: `simulateUserResponse` has no error handling specification
**Source:** software-architecture
**Resolution:** DIRECTLY_ACTIONABLE

No fallback for API error, timeout, or empty response during test simulation. Add fallback (e.g., first-option selection with warning log).

---

### M-6: No continuation file size constraint
**Source:** software-architecture
**Resolution:** DIRECTLY_ACTIONABLE

Continuation files can grow unboundedly if sub-agents are re-spawned multiple times. Add size target or suggest summarizing prior content on re-spawn.

---

### M-7: `complete-epic` classified as standalone but has multi-phase behavior
**Source:** holistic
**Resolution:** DIRECTLY_ACTIONABLE

Involves learnings synthesis, architecture reconciliation, artifact promotion. Clarify the classification criteria (standalone = no interactive phases? no pipeline coordination?).

---

### M-8: Sub-agent cap of 5-7 stated without justification
**Source:** holistic
**Resolution:** DIRECTLY_ACTIONABLE

Document rationale (Claude Code limitation, context budget, or empirical finding) so maintainers know whether to adjust.

---

### M-9: No documentation update tasks mentioned
**Source:** holistic
**Resolution:** DIRECTLY_ACTIONABLE

Architecture doesn't mention updating `.goodplan/architecture/` or `CLAUDE.md` to reflect the new skill model. These will drift if not addressed.

---

### M-10: `review_context` values not enumerated as closed set
**Source:** agent-skill
**Resolution:** DIRECTLY_ACTIONABLE

Values appear only in narrative. Add explicit enum table to conventions.md with exact strings and what each means for reviewer behavior.

---

### M-11: No progressive disclosure / size guidance for agent definition files
**Source:** agent-skill
**Resolution:** DIRECTLY_ACTIONABLE

Agent definitions could get large. Add guidance: bodies under ~500 lines, stable reference content in injectable skills, dynamic content stays in body.

---

### M-12: Continuation file format has no versioning
**Source:** agent-skill
**Resolution:** DIRECTLY_ACTIONABLE

Add YAML frontmatter: `type: continuation`, `version: 1`, `phase: <phase-name>`, `agent: <agent-name>`.

---

## Contradictions Resolved

| Topic | Reviewers | Resolution |
|---|---|---|
| Phase detection severity | software-architecture (IMPORTANT) vs holistic (CRITICAL) | Elevated to CRITICAL — mutual exclusivity between documents warrants critical severity |
| `skills:` frontmatter severity | holistic (IMPORTANT) vs agent-skill (CRITICAL) | Elevated to CRITICAL — agent-skill is domain specialist, and this blocks the core agent pattern |
| "Never reads" constraint | software-architecture (enforcement focus) vs agent-skill (practicality focus) | Merged — both concerns are valid, address with relaxed constraint + fitness function |
| `implement` no-interactive-phase severity | holistic (IMPORTANT) vs agent-skill (MINOR) | Kept at IMPORTANT — the design rationale should be documented, not just the fact |

## USER_INPUT Items

None — all issues are directly addressable by the architecture author.

## Counts

- **CRITICAL:** 3
- **IMPORTANT:** 9
- **MINOR:** 12
- **DIRECTLY_ACTIONABLE:** 23
- **RESEARCH_NEEDED:** 1 (M-1: verify model IDs)
- **USER_INPUT:** 0
