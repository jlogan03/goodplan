# Agent Skill Review — Remaining Skills + Cleanup (Round 2)

## Issues

**[IMPORTANT]** Phase 5: Reviewer count still wrong — plan says 12 new / 18 total, actual is 14 new / 20 total
This issue was flagged in round 1 and has not been corrected. The Phase 5 task list enumerates 14 new reviewer agents (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). The architecture spec (`skill-model-api.md`) lists 20 reviewer domains total. 6 exist, 14 need creating. Three places need updating:
- Phase 5 description line: "12 remaining" should be "14 remaining", "18-domain" should be "20-domain"
- Phase 5 Expected Behavior: `wc -l` assertions should say 20, not 18
- Overview Phase 5 row: "12 remaining" should be "14 remaining"
- Overview paragraph: "Twelve new reviewer agent definitions complete the reviewer infrastructure (matching the 18-domain architecture spec)" should say "Fourteen" and "20-domain"
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5: Reviewer registry update task underspecified — must migrate from section-based to agent-based lookup
The task says "Update the reviewer registry in `skills/implement/references/reviewer-registry.md` to reference the new agent-based reviewer infrastructure." This is a significant structural change — the current registry uses `Prompt File` + `Section` columns pointing to monolithic files like `reviewers-cross-cutting.md`, `reviewers-language.md`, `reviewers-web.md`, `reviewers-scientific.md`, `reviewers-ai-tooling.md` with section-based lookups (`## Software Architecture Reviewer`). The new registry must reference individual `agents/reviewer-*.md` agent files and separate criteria in `review-*.md`. The task should specify:
1. New table format: replace `Prompt File` + `Section` columns with an `Agent` column (e.g., `agents/reviewer-software-architecture.md`)
2. Remove C++ reviewer row (no `reviewer-cpp.md` in the architecture spec or Phase 5 task list, and no C++ reviewer agent exists or is planned)
3. Remove "Background Jobs & Task Processing" row (no corresponding agent in the spec)
4. Add rows for the new domains (api-contract, ux-ia) that are in Phase 5's list
5. Note that `skills/refine-plan/SKILL.md` also references the old monolithic files directly — its deletion in Phase 6 resolves that, but verify no other remaining skill references them
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6: Orphaned shared reference file `reviewers-cross-cutting.md` not addressed
After Phase 5 migrates the reviewer registry and Phase 6 deletes `skills/refine-plan/` and `skills/refine-slices/`, the file `skills/_shared/references/reviewers-cross-cutting.md` (31KB) will be orphaned. Currently it is referenced by `skills/implement/references/reviewer-registry.md` and `skills/refine-slices/SKILL.md`. After the registry update (Phase 5) and skill deletions (Phase 6), no remaining file will reference it. The Phase 6 audit task ("Audit `skills/_shared/references/` for files that are only referenced by deleted skills") should catch this, but should explicitly list `reviewers-cross-cutting.md` as a known candidate for deletion.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1: Sub-phase A needs transition table updates in addition to schema/CLI changes
The plan says "Add quest transitions for `exploring`/`explored` in the state machine (transition tables)" but does not specify the exact transition rows. For implementability, the task should include the expected rows:
- `created -> BEGIN_EXPLORE -> exploring` (mirrors epic transition at line 18 of transition-tables.md)
- `created -> COMPLETE_EXPLORE -> explored` (skip-explore path, mirrors epic line 19)
- `exploring -> COMPLETE_EXPLORE -> explored` (mirrors epic line 20)
- `explored -> BEGIN_QUEST_PLAN -> planning` (replaces the current `created -> BEGIN_QUEST_PLAN -> planning` guard)
Additionally, the existing guard `activeQuest == null` on `BEGIN_QUEST_PLAN` needs updating — currently it only allows `from: created`. If quests can now be in `explored` status when planning begins, the guard must allow `from: explored` as well, or the transition table needs two rows for `BEGIN_QUEST_PLAN` (one from `created` for skip-explore, one from `explored` for normal flow).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1: `submit-explore` quest support missing from task details
Sub-phase A says "Extend `submit-explore` CLI command to support quest exploration submission" but provides no detail. The `submit-explore` command currently accepts `--epic` only (same pattern as `start-explore`). The task should specify: add `--quest <name>` flag, update the `target` parameter to use `{ type: "quest", name }`, and define which state event is dispatched (`COMPLETE_EXPLORE` on the quest). This is symmetrical with the `start-explore` extension but needs to be explicit to avoid ambiguity during implementation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2: Audit skill orchestrator uses positional argument parsing but skills receive args differently
The plan says "Parse mode from first positional argument: `/gp:audit architecture`". In Claude Code skills, the text after the skill invocation becomes part of the user's message, not a parsed positional argument. The orchestrator should extract the mode from the user's message text (e.g., "audit architecture" or "audit docs"), not from a formal positional argument. This is how existing skills like `/gp:explore` handle scoping — they parse the user's intent from the conversation, not CLI-style args. The plan should clarify this is message-text parsing, not citty-style argument parsing.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: Init skill auto-detection heuristic may false-positive on `.goodplan/` directory contents
The auto-detection checks for source code files (`src/`, `lib/`, `app/`, `*.ts`, etc.) to distinguish empty vs populated repos. But after `gp init`, the `.goodplan/` directory itself contains `.ts`-like paths if we're not careful with the glob. The heuristic should explicitly exclude `.goodplan/` from the source code scan, or the plan should note that `gp init` runs before auto-detection (the "New project path" does run `gp init` first, but auto-detection runs before that to decide which path to take).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: No end-to-end test for reviewer agents
Phases 1-4 each include a dogfood test harness script that invokes the skill and verifies behavior. Phase 5 only verifies file existence and build-time validation (`bun run build:plugin`). While reviewer agents are consumed by other skills (implement, plan-slice, create-epic) rather than invoked standalone, it would strengthen verification to add a lightweight test that spawns a single reviewer agent via the Agent SDK with a small fixture artifact and verifies it returns a valid review JSON. This would catch prompt/reference resolution issues that build-time checks cannot.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: Reference files for init skill copied from onboard-repo should be listed explicitly
The task says "copy the 5 reference files from `skills/onboard-repo/references/` to `skills/init/references/`" but doesn't name them. For implementability, list them: `architecture-extraction.md`, `convention-heuristics.md`, `expertise-profiling.md`, `migration-detection.md`, `repo-scanning.md`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1's two critical issues (missing quest explore support, reviewer count) have been partially addressed. The quest explore prerequisite is now properly scoped as Sub-phase A with CLI and state machine work. However, the reviewer count discrepancy (12/18 vs 14/20) persists unchanged. The remaining important issues are about implementability — transition table rows, submit-explore details, and registry migration specifics. These are tractable edits, not structural redesigns. Fixing the reviewer count and adding transition table specifics would bring this to 8. Addressing all important issues would reach 9.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
