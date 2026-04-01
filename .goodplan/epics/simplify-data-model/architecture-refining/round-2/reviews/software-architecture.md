# Software Architecture Review — Simplify Data Model Epic (Round 2)

## R1 Resolutions Verified

All 5 IMPORTANT issues from R1 are addressed:
- **Phase detection** (C-3/I-1): `_overview.md` now consistently uses CLI-only phase detection (lines 149-150). Conventions.md status-to-phase table is the single source of truth. Verified no remaining filesystem artifact checks in orchestrator context.
- **Orchestrator constraint relaxed** (I-3): `_overview.md` line 126 and `conventions.md` lines 9-14 now say "relies primarily on CLI status and sub-agent return summaries" with explicit allowance for lightweight summary files. Fitness function specified.
- **`skills:` frontmatter clarified** (C-2): `_overview.md` lines 40-41 and 67 now explicitly state that `skills:` injects full SKILL.md bodies from named skills, each injectable reference must be a skill directory with SKILL.md. Migration table added to `skill-model-api.md`.
- **`explore` documented as thin wrapper** (I-4): `_overview.md` line 30 clarifies `/gp:explore` is a thin wrapper spawning `explore-phase.md`, pipeline skills spawn the agent directly.
- **Model tiers specified** (I-7): `conventions.md` lines 141-146 now provide recommended defaults by agent type (opus for phase agents, sonnet for reviewers/synthesis/editor/coordinator) with cost rationale.

## Issues

**[IMPORTANT]** Overview consolidation migration step 4 ("removes old files") needs HMAC recalculation ordering specified
`data-model-changes.md` section 3 migration steps (lines 184-189) specify: read old files, merge, write consolidated overview, remove old files, update HMAC signature. The ordering matters for crash safety: if the process crashes between removing old files (step 4) and updating HMAC (step 5), the state is unrecoverable — old files are gone and the HMAC doesn't match the new structure. The migration should compute and write the new HMAC atomically with the file operations, or at minimum: write new file first, update HMAC, then remove old files. This aligns with the existing `commitState` atomic write pattern in the Data Layer.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `reconsiderWhen` / `validUntil` evaluation crosses the skill/data-layer boundary without clear ownership (2x weight: module depth)
The R1 fix specified "LLM evaluation in a sub-agent" for both `reconsiderWhen` (decisions) and `validUntil` (learnings). `data-model-changes.md` now describes this (lines 60-62 for decisions, lines 128-129 for learnings). However, the evaluation mechanism creates a new cross-cutting concern: every sub-agent running architecture, planning, or completion phases must receive the relevant decisions/learnings with their conditions, evaluate them, and include triggered conditions in their return summary. This is a responsibility spread across many agents without a single owner. Consider: (a) a dedicated "decision-review" step the orchestrator runs once per pipeline (spawn a small agent that reads all active decisions + current goal, returns any triggered conditions) rather than burdening every phase agent, or (b) explicitly assign this to the refinement-coordinator since it already reads artifacts and returns structured analysis. Without consolidation, the checking will be implemented inconsistently across agents.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `_shared/references/` migration table lacks disposition for reviewer domain prompts (2x weight: module depth)
`skill-model-api.md` adds a migration table for `_shared/references/` (lines 202-212) covering review preamble, CLI conventions, output format templates, skill-specific references, and large reference docs. But the current `skills/_shared/references/` directory contains `reviewers-cross-cutting.md` and likely other reviewer prompt files (the R1 architecture specifies reviewer agents whose markdown body "contains domain-specific review instructions"). The migration table doesn't specify where these reviewer domain prompts go. They are too large for injectable skills (some are 100+ lines of evaluation criteria per reviewer) but they ARE the agent body content. Clarify: reviewer domain prompts become the markdown body of each `agents/reviewer-*.md` file during migration, they are NOT `_shared/references/` files that need a separate disposition.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `complete-epic` spawns sub-agents for heavy work but is classified as standalone — classification criteria still implicit
R1 M-7 asked for classification criteria. The current text (`skill-model-api.md` line 24) adds a parenthetical: "Classified as standalone (not pipeline) because it has no interactive phases and no multi-phase orchestration." This is a step forward but the distinction remains fuzzy — `/gp:implement` also has no interactive phases and IS a pipeline. The real distinction seems to be: pipeline skills have ordered phases with status transitions between them; standalone skills run a single logical step (possibly with sub-agents). Consider adding this one-sentence definition to `conventions.md` standalone skill section.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `verifyPhaseStatus` in `conventions.md` vs `verifyEntityStatus` in `test-harness-api.md` — naming inconsistency
`conventions.md` line 225 shows `verifyPhaseStatus(epicName, expectedStatus)` while `test-harness-api.md` line 107 shows `verifyEntityStatus(gpBin, entityType, entityName, expectedStatus)`. The test harness version is more general (handles epic/slice/quest) and has a better signature. The conventions.md version should either be removed (it's a test convention, not an architectural convention) or aligned with the test harness name.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Budget estimate ("~96K max for longest pipeline, ~10% of 1M window") may undercount reviewer agents
`_overview.md` line 131 estimates ~96K max orchestrator context for the longest pipeline. But a 6-phase `create-epic` with 2 refinement loops (architecture + slices), each spawning 3-5 reviewer agents, a synthesis agent, and an editor agent, means 6 phase agents + 2*(5 reviewers + 1 synthesis + 1 editor) = 20 agent spawns. Even with sonnet for reviewers, each spawn adds context to the orchestrator's window (spawn prompt + return summary). At ~2-3K per spawn cycle, that's 40-60K just for spawn overhead, plus Q&A tokens. The estimate should note it covers orchestrator context only (not total API cost across all agents), or be revised upward.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `plugin.json` `"agents"` field referenced but no schema or format specified
`_overview.md` line 188 says `plugin.json` includes an `"agents"` field listing agent definitions, and build verification confirms all referenced agent `.md` files exist. But the architecture doesn't show the `plugin.json` schema with this field or specify whether it's a list of file paths, a glob, or a directory reference. Since this is a new field on an existing manifest, the expected format should be specified (even if briefly).
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Significant improvement from R1 (7/10). The phase detection contradiction is resolved, the orchestrator constraint is sensibly relaxed with a fitness function, the `skills:` frontmatter mechanism is now precise, and model tier recommendations add cost awareness. The architecture is sound and well-layered.

To reach 9+: consolidate `reconsiderWhen`/`validUntil` evaluation into a single architectural owner rather than spreading it across all phase agents; specify crash-safe ordering for the overview migration; and clarify that reviewer domain prompts become agent body content (not a `_shared/references/` migration concern).

## Summary
- Critical: 0
- Important: 3
- Minor: 4
