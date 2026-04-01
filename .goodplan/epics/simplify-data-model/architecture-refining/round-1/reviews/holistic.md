# Holistic Review — Simplify Data Model Epic Architecture

## Issues

**[CRITICAL]** Phase detection contradicts itself across documents
The `_overview.md` Re-entry Protocol section (lines 149-155) says phase detection uses "CLI status + filesystem artifact existence" and gives specific file-existence checks (`explore-complete.md` exists, `architecture/_overview.md` exists, `round-N/` directories). The `conventions.md` Phase Detection section (line 77) says "Phase detection uses the CLI exclusively — no filesystem artifact checks" and provides a clean CLI status → pipeline phase mapping table. These are mutually exclusive approaches. The conventions.md version is the better design (single source of truth, no filesystem coupling), but the _overview.md must be updated to match. Additionally, the orchestrator flow in _overview.md line 62 says "based on status + filesystem artifacts" — this also contradicts conventions.md.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `skills:` frontmatter on agent definitions is not a documented mechanism for injecting arbitrary content
The architecture repeatedly claims that `skills:` frontmatter on agent definitions "injects shared reference content" (e.g., shared review preamble, output format). The research doc (`sub-agent-prompt-files.md`) confirms `skills:` exists but clarifies it injects **full skill content** — meaning the referenced items must each be a valid skill directory with a `SKILL.md`. The architecture documents don't acknowledge this constraint. Shared references like "review preamble" and "maturity legend" would need to be restructured as skills (not arbitrary files) for `skills:` injection to work. The conventions.md (line 123) says "skills: injects shared reference content (review preamble, output format, CLI conventions) at spawn time without Read permissions" without noting this skill-format requirement. Either restructure references as skills or document the workaround explicitly.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No explicit cleanup plan for deleted skills' shared references
The skill-model-api.md "What Gets Deleted" section (lines 168-180) lists 15 skill directories to remove and mentions that references consumed only by deleted skills should be removed, while "shared references consumed by agent definitions move to skill-format files injectable via `skills:` frontmatter." This is vague — it doesn't enumerate which references are shared vs. deleted, or specify the new skill-format structure for the migrated references. This will cause ambiguity during implementation.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Overview consolidation presents two options without a decision
The data-model-changes.md section 3 (lines 158-170) presents Option A and Option B for overview consolidation but says "Two options to evaluate during implementation." Architecture documents should make the structural decision — deferring it to implementation means the implementer makes an architectural call without review. The architecture should pick one (Option A is cleaner — single file, clear schema) and explain why.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `implement` pipeline skill has "None" for interactive phases — no approval gate
The skill-model-api.md `/gp:implement` table shows "None (front-loaded by plan-slice)" for interactive phases. But the architecture's own "Front-loaded interaction principle" says approval gates should exist at "natural phase boundaries." Implementation is the highest-stakes phase — starting it without any confirmation seems risky. At minimum, the architecture should document why no approval gate is appropriate here (e.g., the plan was already approved during plan-slice), rather than leaving it implicit.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `reconsiderWhen` and `validUntil` introduce judgment-heavy evaluation with no specification of who evaluates
The data-model-changes.md describes `reconsiderWhen` (decisions) and `validUntil` (learnings) as conditions that skills check "against the current work context" or "current project state." But these are natural-language strings (e.g., "Binary size exceeds 100MB"). Who evaluates them — the CLI deterministically, or the LLM during skill execution? The architecture implies LLM evaluation (skills check them), but this is a significant design choice that should be stated explicitly. LLM evaluation means non-deterministic triggering. CLI evaluation means structured condition formats. The answer affects schema design.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test harness model references use placeholder names that may not be real
The test-harness-api.md and conventions.md reference `claude-haiku-4-5`, `claude-sonnet-4-6`, and `claude-opus-4-6` as model identifiers. If these are aspirational model names rather than actual API model IDs, the test scripts will fail. The architecture should either use current model IDs or note that these are placeholders to be updated.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** `complete-epic` not listed in pipeline skills but has multi-phase behavior
The `complete-epic` skill is classified as "standalone" in skill-model-api.md, but it involves learnings synthesis, architecture reconciliation, and artifact promotion — multiple autonomous phases. The distinction between "standalone" and "pipeline" seems to be about whether there are interactive phases, but this isn't stated explicitly. Clarify the classification criteria.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Sub-agent cap of 5-7 is stated without justification
The _overview.md (line 129) says "Cap parallel sub-agents at 5-7" without explaining why this range was chosen. Is it a Claude Code limitation, a context budget constraint, or empirical? Documenting the rationale helps future maintainers know whether to adjust it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update tasks mentioned
The architecture doesn't mention updating the project-level architecture docs (`.goodplan/architecture/`) to reflect the new skill model, nor updating `CLAUDE.md` references to skills. These will drift if not addressed during implementation.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The architecture is ambitious and well-thought-out in its core patterns (orchestrator, agent definitions, front-loaded interaction, continuation files). The skill consolidation mapping is clear and the data model changes are sensibly scoped. However, internal contradictions (phase detection), unresolved design decisions (overview consolidation Option A vs B), and under-specified mechanisms (`skills:` frontmatter constraints, `reconsiderWhen`/`validUntil` evaluation model) mean an implementer would need to make architectural calls that should have been made here. Fixing the CRITICAL and IMPORTANT issues would bring this to 8-9.

## Summary
- Critical: 1
- Important: 5
- Minor: 4
