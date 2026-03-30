# Merged Feedback — Round 2

## Scores
| Reviewer | Score |
|---|---|
| Holistic | 8/10 |
| Software Architecture | 7/10 |
| Agent Skill | 8/10 |

All reviewers confirmed Round 1 issues are addressed.

---

## IMPORTANT Issues

### I1. Phase 4 iteration-loop.md extraction is underspecified
**Sources:** Holistic, Software Architecture, Agent Skill (all three flagged this)

The plan says to extract the shared iteration loop skeleton from refine-plan into `_shared/references/iteration-loop.md` but never defines:
- **What the file contains** — prose reference? numbered protocol? parameterized template with placeholders?
- **What the parameter interface looks like** — reviewer selection, exit criteria, editor prompt, working directory naming, scope constraints are listed in the overview but not in the Phase 4 tasks
- **How skills "fill in" parameters** — inline substitution? separate config? SKILL.md describes its own values and says "follow the loop"?
- **Whether refine-plan's SKILL.md gets refactored** in this plan to reference the shared file, or that's a separate task

Given how other shared references work in this codebase (e.g., `decisions-format.md` is a "read and follow" reference), clarify that `iteration-loop.md` is a structural reference document that skills read for the orchestration pattern, with each skill's SKILL.md specifying its own concrete values. Add a bullet list of what the shared file covers (e.g., run directory structure, reviewer spawn pattern, synthesis prompt skeleton, exit criteria evaluation) and what remains skill-specific (editor prompt, reviewer selection, score thresholds, scope constraints).

Resolution: DIRECTLY_ACTIONABLE

### I2. Phase 1 consolidation ignores framing differences between reviewer files
**Sources:** Holistic, Software Architecture

The two `reviewers-cross-cutting.md` files differ intentionally — refine-plan's says "for an implementation plan" while implement-plan's says "for a code implementation." The `_shared/references/README.md` explicitly warns against consolidating files likely to diverge. Simply replacing both with one shared file breaks one framing or the other.

Options: (a) make the framing a bootstrap-time injection via a `{review_context}` placeholder, or (b) consolidate only the criteria text (items 1-11) into a shared fragment while keeping per-skill framing separate. The plan must pick one and specify it.

Resolution: DIRECTLY_ACTIONABLE

### I3. Phase 4 refine-architecture SKILL.md will likely exceed 500 lines even with iteration-loop.md extracted
**Source:** Agent Skill

The refinement loop (Step 2) has 6+ substeps including editor guardrails specification. The guardrails and detailed reviewer weighting preamble are specified inline in SKILL.md. Move the editor guardrails specification and the reviewer weighting preamble to `references/sub-agent-prompts.md`, keeping only a one-line reference in SKILL.md Step 2.

Resolution: DIRECTLY_ACTIONABLE

### I4. Phase 4 working copy pattern (`architecture-refining/`) creates reference ambiguity
**Source:** Software Architecture

Architecture files are referenced by CLAUDE.md, decisions, and in-progress plans — unlike plans, which aren't referenced by other skills during refinement. The plan needs to specify: (a) whether `architecture/` is deleted or preserved during refinement, (b) how concurrent skill invocations should behave if they read architecture files mid-refinement, and (c) whether CLAUDE.md should point to the working copy during refinement.

Resolution: DIRECTLY_ACTIONABLE

### I5. Phase 2 design tree reference file split between SKILL.md and reference is unspecified
**Source:** Holistic

Steps 5 and 7 contain detailed content (7 substeps each). The implementer must decide what stays in SKILL.md as the "concise summary" vs what moves to `design-tree.md`. Specify the split: e.g., "SKILL.md keeps numbered substep titles and one-line descriptions; the reference file contains the detailed interaction protocol, progress display format, and stopping criteria."

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1. Phase 5 Step 4 conflates gap quests and improvement quests without distinguishing scope
**Source:** Holistic

Gap quests are implementation-only; improvement quests involve architecture changes first. Consider adding a `type: gap | improvement` field to `goal.md` so the implementer knows whether to run `/refine-architecture` first or go straight to `/create-plan`.

### M2. Phase 4 Step 3 goal drift verification has no specified mechanism
**Source:** Holistic

"Compare refined architecture against original to check for goal drift" — but how? Specify at minimum: present a summary of what changed and ask the user to confirm.

### M3. No graceful stop handling for Phase 5 (audit-architecture)
**Source:** Holistic

Phases 2-4 address graceful stop. Phase 5 does not. Add a graceful stop task or justify why audit-architecture runs to completion.

### M4. Phase 2 broad pass stopping criteria are subjective
**Source:** Holistic

"Enough structure exists for design-it-twice" is vague beyond the minimum list. Make criteria more concrete: "Stop when subsystem boundaries, communication patterns, key constraints, and data ownership are all resolved."

### M5. Phase 4 editor guardrails reference decisions without specifying lookup mechanism
**Source:** Software Architecture

"Check `.project/decisions/` for references" — but decisions reference architecture concepts by description, not by path or anchor. Specify a practical heuristic (e.g., string-match on subsystem/module names; if found, flag for user review).

### M6. Phase 5 gap analysis dimensions overlap with reviewer criteria without referencing them
**Source:** Software Architecture

Audit defines its own evaluation dimensions that parallel Software Architecture reviewer criteria 8 and 2. Reference the reviewer criteria directly to avoid divergence.

### M7. Phase 2 decision writing lacks deduplication with existing decisions
**Source:** Software Architecture

Before writing a decision during design tree, the skill should check existing decisions for overlap and either supersede or skip.

### M8. No specification of how refine-architecture and audit-architecture interact in sequence
**Source:** Software Architecture

Audit may update architecture files and propose side quests. Should refine-architecture run before or after those quests? Sequencing ambiguity could lead to refine-architecture optimizing files about to be invalidated.

### M9. Phase 4 and Phase 5 descriptions could be more triggering-specific
**Source:** Agent Skill

Phase 4 description leads with mechanism rather than user intent. Phase 5 description misses "when to use" signal. Suggested rewrites provided in Agent Skill review.

### M10. Phase 2 reference loading doesn't mention conditional/on-demand loading
**Source:** Agent Skill

Adding `design-tree.md` and `design-it-twice.md` to Step 1 means 6 reference files loaded unconditionally. Consider a note that these are only needed during Steps 5-7 for future maintainability.

### M11. Phase 3 design-it-twice sub-agent model hardcoded as opus
**Source:** Agent Skill

Design generation is a well-scoped task; sonnet may suffice when the broad pass has already narrowed the design space. Worth noting for cost-consciousness consistency with refine-plan's model selection policy.
