# Repo & Tooling Review — Phase 1: Shared References & Agent Definitions

## Issues

**[IMPORTANT]** Build pipeline does not validate agent definitions or declare them in plugin.json
The `scripts/build-plugin.sh` currently copies the `agents/` directory (lines 48-51) but performs no validation of agent frontmatter (`name:`, `description:`, `model:` fields). Skill directories get full frontmatter validation (lines 88-145), but agents get nothing. Additionally, `plugin.json` (lines 31-41) has no `"agents"` field. The plan explicitly defers this to Phase 2, so this is by design for now — but the current state means Phase 1 output ships agents that are silently unvalidated. If Phase 2 slips or is skipped, broken agents could reach users. Worth noting as a risk but not blocking since Phase 2 is the next immediate phase.
File: scripts/build-plugin.sh:31
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `review-preamble.md` return format includes `filesWritten: []` but reviewer agents write files
The review preamble's Return Format section (line 87) shows `"filesWritten": []` with an empty array in the example JSON. However, each reviewer agent's own return format correctly shows `"filesWritten": ["<review-output-path>"]`. The preamble's example contradicts the agents. Since the preamble is injected via `@` reference into every reviewer agent, an LLM might follow the preamble's empty-array example instead of the agent-specific instruction, leading to the orchestrator not knowing where the review file was written. The preamble example should show `["<review-output-path>"]` to match the agent definitions.
File: skills/_shared/references/review-preamble.md:87
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `plan-format.md` is an exact duplicate with no single-source mechanism
`skills/_shared/references/plan-format.md` is byte-identical to `skills/create-plan/references/plan-format.md`. The plan acknowledges this ("Original stays in place for backward compatibility with existing create-plan skill. Future slice migrates create-plan to use the shared copy."). This is acceptable as a temporary state, but there is no guard against the two copies diverging. Consider adding a comment at the top of each file noting the relationship, or a build-time check that they match.
File: skills/_shared/references/plan-format.md:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No `.gitattributes` or README for the new `agents/` directory
The `agents/` directory is a new top-level directory (alongside `skills/`, `src/`, `tools/`). There is no `agents/README.md` or entry in any project-level documentation (CLAUDE.md, `.goodplan/conventions.md`) explaining what this directory contains, the frontmatter contract, or how agents relate to skills. The plan's Phase 1 tasks don't include documenting this. New contributors encountering `agents/` would have no orientation. A brief README or a line in CLAUDE.md pointing to the epic architecture would help discoverability.
File: agents/plan-phase.md:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Agent file line counts are well within budget
All agent files are well under the 500-line pre-`@`-expansion limit specified in the plan (largest is `plan-phase.md` at 72 lines, total across all 7 agents is 373 lines). This is fine — just confirming the constraint is satisfied.
File: agents/plan-phase.md:1
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation. The 7 agent definitions and 5 shared reference files are well-structured, follow consistent patterns, and use `@` references correctly. The `review-preamble.md` return format inconsistency is the most actionable issue — it could cause runtime confusion when reviewer agents follow the preamble's empty `filesWritten` example instead of their own. The build pipeline gap is acknowledged as Phase 2 work. To reach 9+: fix the preamble return format example and add a minimal orientation comment/doc for the `agents/` directory.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
