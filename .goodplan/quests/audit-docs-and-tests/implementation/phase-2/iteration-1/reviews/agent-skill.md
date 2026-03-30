# Agent Skill Review: Phase 2 — `/audit-tests` Skill

## Issues

**[IMPORTANT]** Side quest creation uses both CLI and filesystem conventions inconsistently

The audit-architecture skill (the oldest audit pattern) creates side quests via `mkdir -p ".project/side-quests/<name>"` + write `goal.md` (pre-CLI convention). The audit-docs skill (Phase 1, the pattern to follow) uses the CLI: `echo '...' | goodplan quest:create --json`. The audit-tests skill correctly follows audit-docs and uses the CLI approach in Step 6. However, the research file at `.project/quests/audit-docs-and-tests/research/_codebase-context.md` (line 151-155) documents this inconsistency but it hasn't been resolved. The audit-tests skill is correct here, but worth noting for the broader quest: audit-architecture still uses the old pattern.

File: skills/audit-tests/SKILL.md:134
Resolution: DIRECTLY_ACTIONABLE

This is actually fine for audit-tests itself (it uses the correct CLI approach). Downgrading to INFO since the skill under review is correct. The audit-architecture skill inconsistency is out of scope for this phase.

**Revised: [INFO]** — audit-tests correctly uses `goodplan quest:create --json`. No action needed for this phase.

---

**[IMPORTANT]** Missing "Overall Assessment" framing in report format vs audit-docs pattern

The audit-tests report format (Step 7, line 165) includes an `## Overall Assessment` section that audit-docs does not have. This is actually a good addition for tests (health summary matters more for test audits). However, the audit-docs skill's report format starts with `## Findings Summary` directly. This is a minor structural divergence that is justified — not an issue.

**Revised: [INFO]** — Intentional and justified divergence. No action needed.

---

**[MINOR]** Sub-agent prompts have nested markdown code fences that could confuse agents

In `references/sub-agent-prompts.md`, each reviewer prompt is wrapped in a top-level ` ``` ` code fence, but inside each prompt there are output format sections that also use ` ``` ` markdown fences (e.g., lines 37-58 in the Coverage Gap Reviewer). The inner fences are properly indented as part of the prompt template content, so they are distinguished from the outer fence. However, some LLMs may struggle with nested fence parsing. The audit-docs skill has the same pattern, so this is consistent with the established convention.

File: skills/audit-tests/references/sub-agent-prompts.md:37
Resolution: DIRECTLY_ACTIONABLE

**Revised: [INFO]** — Consistent with audit-docs pattern. No action needed.

---

**[MINOR]** Step 3 coverage mapping is purely static but Step 4 reviewers may need to read source files

Step 3 builds a static source-to-test file mapping. But the Coverage Gap reviewer prompt (sub-agent-prompts.md, line 22) says "For uncovered source files, read them to assess what they export and how critical they are." This means sub-agents need read access to source files. The placeholder mapping in Step 4 (line 113) provides `{source_file_list}` which is just a file inventory, not file contents. The sub-agents will need to use Read/Glob tools to explore the source files themselves — which they can do since they're spawned as agents with tool access.

This is actually fine — sub-agents have tool access and the prompts correctly instruct them to read files. The `{source_file_list}` serves as a roadmap for what to explore, not a content dump.

File: skills/audit-tests/SKILL.md:106
Resolution: DIRECTLY_ACTIONABLE

**Revised: [INFO]** — Design is correct. Sub-agents read files as needed.

---

**[IMPORTANT]** Verification approach: skill was not invoked end-to-end

The evaluation criteria for agent skill review include: "Skill phases should invoke the skill and verify behavior end-to-end, not just check file existence." There is no evidence in the diff that the audit-tests skill was tested by actually running `/audit-tests` on a real or fixture codebase. The skill files were created but the implementation plan should include end-to-end invocation as verification.

File: skills/audit-tests/SKILL.md:1
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Description could be more "pushy" about triggering

The description field (line 2-8) includes trigger phrases like 'audit tests', 'check test coverage', etc. Per the agent skill reviewer criteria: "Be 'pushy' to avoid under-triggering." The description currently focuses on what the skill does but could also mention related scenarios that should trigger it, such as "before writing new tests", "after major refactoring", or "are my tests sufficient". Comparing to audit-docs which has similar trigger density, this is adequate but could be slightly improved.

File: skills/audit-tests/SKILL.md:2
Resolution: DIRECTLY_ACTIONABLE

---

No further issues found. The skill is well-structured and follows the audit-docs pattern closely.

## Score: 8/10

The audit-tests skill is a strong implementation that closely follows the audit-docs pattern established in Phase 1. The SKILL.md structure (version check, context loading, discovery, sub-agent spawning, synthesis, side quest creation, report writing, project health refresh, graceful stop, expertise check) mirrors audit-docs faithfully. The four reviewer sub-agents are well-scoped with clear prompts. The guidance.md file has well-calibrated severity definitions specific to test concerns. The install script is correctly updated.

To reach 9+: (1) Add end-to-end verification by actually running the skill on a test codebase. (2) Slightly expand trigger phrases in the description to cover adjacent scenarios.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
