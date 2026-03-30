# Software Architecture Review — Round 3

## Issues

**[MINOR]** Phase 3 refine-architecture editor guardrails update lacks specificity on what "evidence annotation" means

Phase 3's refine-architecture task says the editor guardrails should require "maturity level changes require evidence annotation explaining the justification." The term "evidence annotation" is not defined anywhere in the plan or existing guardrails. The existing editor guardrails in `sub-agent-prompts.md` use concrete patterns: "FLAGGED: Change to {subsystem} may affect decision {decision-file}." The maturity guardrail should follow this established pattern — e.g., specify that the editor must add a note like "MATURITY CHANGE: {subsystem} from {old} to {new} — justification: {evidence}" in the edit summary. Without a concrete format, implementers will invent ad-hoc annotations that the orchestrator can't reliably detect.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 SW Architecture reviewer criterion 12 does not address the "Experimental to Developing" transition

Criterion 12 (maturity awareness) says to check for justification when plans modify "a maturing or foundational subsystem." This matches the design spec's intent for high-maturity subsystems but skips the Developing level. The design spec's change protocol table (line 150) says Developing subsystems need "deliberate" changes. The criterion as written would not flag plans that casually modify Developing subsystems. This is a minor gap because Developing is lower-stakes, but for consistency with the design spec's four-level model, the criterion could say "developing, maturing, or foundational" with escalating scrutiny (light check for developing, full justification for maturing+).

Resolution: DIRECTLY_ACTIONABLE

---

No other issues found.

## Score: 9/10

All 9 round-2 issues have been properly addressed. The step numbering collision is resolved (8f/8g/8h). The `<subsystem>-api.md` template now includes `## Fitness Functions`. Graceful stop cases cover new steps. The Holistic reviewer criteria use conditional language for plan vs architecture contexts. The implement-plan shared-preamble has its own dedicated update task. Fitness function finding categories are defined in audit-architecture guidance. The plan is architecturally sound — module boundaries are clear (Phase 1 defines conventions, Phase 2 produces artifacts, Phase 3 evaluates/audits them, Phase 4 checks plans against them), dependency direction flows correctly (convention file is read-only for consuming skills), and the additive approach preserves all existing behavior. The two remaining MINOR issues are polish items that would not cause structural problems.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
