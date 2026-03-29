# Agent Skill Review: audit-docs (Phase 1, Iteration 1)

## Issues

**[IMPORTANT]** Inconsistent side quest creation pattern between audit-docs and audit-architecture
The audit-docs skill correctly uses `goodplan quest:create --json` (the CLI-managed approach), while audit-architecture still uses the old filesystem pattern (`mkdir -p .project/side-quests/<name>` + write `goal.md`). This is not a bug in audit-docs -- it's the right pattern -- but it creates an inconsistency across the two sibling audit skills. The research file explicitly noted this discrepancy. Since audit-docs is correct, this is informational for this review but worth noting for a future audit-architecture update.
File: skills/audit-docs/SKILL.md:129
Resolution: DIRECTLY_ACTIONABLE

Note: The fix here is to leave audit-docs as-is (it's correct) and update audit-architecture in a separate task. Flag as side quest candidate if not already tracked.

---

**[IMPORTANT]** Trivial fixes described as "batch approval" but actually require AskUserQuestion per the instructions
Step 5 says "Batch all trivial fixes and present them via AskUserQuestion" with the prompt "Found N trivial documentation fixes. Apply all?" -- this is good batch-approval UX. However, the plan says "auto-fix, present summary after" which implies fixes first, then summary. The SKILL.md correctly asks first, then applies -- this is the right behavior. But the phrase "Apply all?" implies all-or-nothing. Consider offering partial approval ("Apply all, or review individually?") for cases where one "trivial" fix is actually wrong.
File: skills/audit-docs/SKILL.md:111
Resolution: MINOR

---

**[IMPORTANT]** Sub-agent reviewer findings return inline but SKILL.md step numbering shifted from plan
The plan numbered steps as: 0-Version, 1-Discover, 2-Read Codebase, 3-Spawn Reviewers, 4-Classify, 5-Summary. The SKILL.md numbers them: 0-Version, 1-Load Context, 2-Discover, 3-Read Codebase, 4-Spawn Reviewers, 5-Classify, 6-Report, 7-Health, 8-Graceful Stop, 9-Expertise. The additions (Load Context, Project Health, Graceful Stop, Expertise Check) are all correct and follow the audit-architecture pattern. This is good -- the implementation improved on the plan by including standard lifecycle steps the plan omitted.
File: skills/audit-docs/SKILL.md:38
Resolution: DIRECTLY_ACTIONABLE

Note: No action needed -- this is a positive observation, not an issue. Documenting for completeness.

---

**[MINOR]** Plan specified reference file name `reviewer-prompts.md` but implementation uses `sub-agent-prompts.md`
The plan suggested `reviewer-prompts.md` and `doc-discovery-patterns.md`. The implementation uses `guidance.md` and `sub-agent-prompts.md`, which matches the audit-architecture pattern exactly. This is the right choice -- consistency with existing skills over plan naming suggestions.
File: skills/audit-docs/references/sub-agent-prompts.md:1
Resolution: DIRECTLY_ACTIONABLE

Note: No action needed -- the implementation made the right call.

---

**[MINOR]** Plan mentioned `doc-discovery-patterns.md` reference file but content was folded into SKILL.md
The plan suggested a separate reference file for glob patterns and heuristics for finding documentation sources. The implementation folded this into SKILL.md Step 2 directly. Given Step 2 is about 20 lines, this is fine -- splitting into a separate reference would be over-engineering for this amount of content.
File: skills/audit-docs/SKILL.md:64
Resolution: DIRECTLY_ACTIONABLE

Note: No action needed.

---

**[MINOR]** Sub-agent prompts use `{placeholders}` but no explicit instructions on how to fill them
The sub-agent-prompts.md file uses `{documentation_sources_list}` and `{codebase_reality_summary}` placeholders, and the header says "Fill `{placeholders}` before spawning." However, the SKILL.md Step 4 says "Read `references/sub-agent-prompts.md` for self-contained reviewer templates" without explicitly instructing the orchestrating agent on what to substitute for each placeholder. The audit-architecture skill has the same pattern and it works in practice because the orchestrating agent can infer the substitutions from context. Still, being explicit about what each placeholder maps to (e.g., "Fill `{documentation_sources_list}` with the list from Step 2, `{codebase_reality_summary}` with the map from Step 3") would reduce ambiguity.
File: skills/audit-docs/SKILL.md:93
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** SKILL.md body is 224 lines -- well under the 500-line threshold
Progressive disclosure is good. The main skill file is concise, with domain-specific detail properly split into `guidance.md` (107 lines) and `sub-agent-prompts.md` (221 lines). Total across all files is 552 lines, which is reasonable for a skill of this complexity.
File: skills/audit-docs/SKILL.md:1
Resolution: DIRECTLY_ACTIONABLE

Note: No action needed -- positive observation.

---

**[MINOR]** Dashes in SKILL.md use `--` while audit-architecture uses `---` (em-dash style)
audit-docs uses `--` throughout (e.g., "Staleness detection -- docs referencing...") while audit-architecture uses ` --- ` (em-dash). This is a cosmetic inconsistency. Both are valid markdown, but visual consistency across sibling skills would be nice.
File: skills/audit-docs/SKILL.md:16
Resolution: DIRECTLY_ACTIONABLE

Note: Actually, looking more carefully, audit-architecture uses `---` as a markdown em dash while audit-docs uses `--`. Very minor.

## Score: 8/10

The audit-docs skill is well-structured, follows the audit-architecture pattern closely, and makes smart improvements (CLI-based quest creation, standard lifecycle steps, proper batch-approval flow). The reference files are well-organized with clear severity definitions and self-contained sub-agent prompts.

What would bring it to 9+:
1. Add explicit placeholder-to-step mapping in Step 4 (tells the agent exactly what to substitute in sub-agent prompts)
2. Verification was not performed end-to-end -- the plan's verification section says "Run `/audit-docs` on the goodplan repo to verify it discovers sources, finds issues, and the fix/propose flow works." There's no evidence this was done. For a skill phase, invoking the skill and verifying behavior is the appropriate verification, not just checking file existence.

## Summary
- Critical: 0
- Important: 1
- Minor: 5
