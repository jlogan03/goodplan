# Agent Skill Review: audit-docs-and-tests (Round 2)

## Issues

**[IMPORTANT]** Sub-agent prompt reference file naming inconsistency between plan text and task list
The plan tasks for both Phase 1 and Phase 2 reference the file as `sub-agent-prompts.md` (matching the audit-architecture convention — good). However, the plan should also specify the structure within that file more concretely. The audit-architecture `sub-agent-prompts.md` has a single template with clear `{placeholders}` and a defined output format (structured markdown with Dimension, Severity, Evidence, Description, Suggested Action fields). The plan says "fully self-contained templates" but doesn't define the output schema each reviewer should produce. For 3 reviewers (docs) and 4 reviewers (tests), the output format should be specified so findings can be synthesized by the orchestrator. Consider adding a brief output format spec to each reviewer's entry in the plan (or state that `guidance.md` defines the shared output format).
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `guidance.md` content scope not specified for either skill
Both skills list `guidance.md` as a reference file with "severity levels (matching audit-architecture convention) and side quest proposal format." But audit-architecture's `guidance.md` is 329 lines covering exploration strategy, severity definitions, severity assignment rules, fitness function audit strategy, invariant compliance checking, maturity promotion/demotion criteria, finding categories (6 types), side quest templates (2 types), and project health refresh mappings. The docs and tests skills need much simpler guidance files — they don't have fitness functions, invariants, or maturity checks. The plan should specify what goes in each skill's `guidance.md`: severity levels, the reviewer output format, and the side quest proposal format. Without this, the implementer will either copy audit-architecture's guidance verbatim (inappropriate) or guess at scope (inconsistent).
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Graceful stop markers lack step-specific detail for docs skill
The plan specifies graceful stop with `<!-- partial — interrupted during <step>` markers for both skills, matching audit-architecture's pattern. However, audit-architecture provides step-specific marker templates for each interruption point (during gap analysis, during reassessment, during quest proposal, etc. — each with a different marker listing what was completed and what remains). The `/audit-docs` skill has 6 domain steps where interruption could happen (discover sources, read codebase, spawn reviewers, classify findings, write report, refresh health). The plan should include at least a note that step-specific resume markers are needed for each interruptible step, so the implementer knows to define them rather than using a single generic marker. The `/audit-tests` skill has the same issue with its steps.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 step numbering has a gap: Step 0, Step 1, Step 2, Step 3, Step 4, Step 5, Step 6, Step 7, Step 8, Step 9, Step 10
Phase 2 (`/audit-tests`) has 11 steps numbered 0-10, while Phase 1 (`/audit-docs`) has 10 steps numbered 0-9. The numbering is consistent within each skill, but the difference is slightly surprising since both follow the same lifecycle pattern. The extra step in Phase 2 comes from "Step 5 — Synthesize and Prioritize" being a separate step before "Step 6 — Propose Side Quest," whereas Phase 1 combines classification and action into a single "Step 5 — Classify and Act on Findings." This is fine architecturally — Phase 2's synthesis step makes sense as distinct from quest proposal — but documenting the reason for the asymmetry would help implementers.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Description field character count should be verified against 1024-char limit
Both skills have draft descriptions specified in the plan. The audit-docs description is approximately 390 characters and audit-tests is approximately 370 characters. Both are well within the 1024-char agentskills.io limit but notably longer than audit-architecture's ~270 chars. The trigger phrases are comprehensive and well-chosen. The descriptions are in third-person imperative as expected. This is a minor observation — the descriptions will work, but trimming them closer to audit-architecture's length would be more consistent. Not blocking.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 plan addresses all CRITICAL and most IMPORTANT issues from round 1 effectively. The full audit-architecture lifecycle is now present in both skills (version check, context loading, graceful stop, audit report, project health refresh, expertise check). The install script registration is an explicit task. Sub-agent prompts use the correct naming convention and specify self-containment. Model specification (`"opus"`) is included. The auto-fix issue is resolved with batch approval via `AskUserQuestion`. End-to-end verification is present. Side quest creation uses `goodplan quest:create` with clear rationale for diverging from audit-architecture's filesystem approach. The remaining IMPORTANT issues are about specifying output formats and guidance file scope more concretely — addressing these would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
