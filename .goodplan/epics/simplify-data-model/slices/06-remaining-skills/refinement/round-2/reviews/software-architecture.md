## Issues

**[IMPORTANT]** Phase 5 reviewer registry update scope is incomplete — only `skills/implement/references/reviewer-registry.md` is mentioned, but three other copies exist

The round-1 fix (I3) added a task to update the reviewer registry in `skills/implement/references/reviewer-registry.md`. However, the same reviewer registry file exists at `skills/refine-plan/references/reviewer-registry.md` and `skills/refine-architecture/references/reviewer-registry.md`. Although both `refine-plan` and `refine-architecture` are scheduled for deletion in Phase 6, the `skills/implement/` registry currently references monolithic files (`reviewers-language.md`, `reviewers-scientific.md`, `reviewers-web.md`, `reviewers-ai-tooling.md`) that do not exist in `skills/_shared/references/`. The registry tables point to these file names as if they were relative paths, but no such files exist anywhere in the repo. This means the current `reviewer-registry.md` is already referencing phantom files — the registry was written anticipating files that were never created, or was copied from a spec document. The Phase 5 task to "update the reviewer registry" must account for the fact that the old-style registry format (section-based lookups into monolithic files) never actually worked at runtime. The update should rewrite the registry to reference individual `agents/reviewer-*.md` agent files, which is the only format that will work with the new agent-based reviewer infrastructure. The current task wording ("reference the new agent-based reviewer infrastructure") is correct but should clarify that this is not an incremental update — it is a full rewrite of the registry format.

Fix: Clarify in Phase 5 that the reviewer registry update is a full rewrite (not an incremental update), since the old format references files that do not exist. The registries in `refine-plan/` and `refine-architecture/` do not need updating since those skills are deleted in Phase 6 — but note this dependency explicitly (Phase 5 registry update only needs to target `skills/implement/references/reviewer-registry.md`).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 quest state machine extension adds 2 new statuses and at least 3 new transitions but no transition table update task or fitness function verification

Phase 1 Sub-phase A adds `exploring` and `explored` to the quest status enum and adds transitions for them. The transition tables document (`architecture/transition-tables.md`) is the source of truth for all state machine transitions (per the architecture overview). The current quest lifecycle has 13 transitions. Adding `exploring`/`explored` requires at least: `created` -> `exploring` (BEGIN_QUEST_EXPLORE), `exploring` -> `explored` (COMPLETE_QUEST_EXPLORE), and potentially `created` -> `explored` (skip path, matching epic pattern). The plan includes tasks for schema changes and CLI commands but does not include:
1. Updating `architecture/transition-tables.md` with the new quest transitions
2. Adding corresponding state machine transition rules in `src/core/state-machine/`
3. Verifying the `transition-completeness` fitness function (`tests/fitness/transition-completeness.test.ts`) still passes after the changes

The existing fitness function tests that every transition in the tables has a corresponding implementation and vice versa. Adding statuses without updating both the tables and the tests would break this fitness function.

Fix: Add explicit tasks to Sub-phase A: (1) update `architecture/transition-tables.md` with new quest explore transitions, (2) add transition rules in the state machine implementation, (3) verify `bun test tests/fitness/transition-completeness.test.ts` passes. Also verify `state-machine-purity.test.ts` still passes (INV-003).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 6 monolithic reviewer reference file cleanup is unresolved

Round 1 flagged (R1) that `skills/_shared/references/reviewers-cross-cutting.md` (31KB) should be deleted after per-domain files are created. The plan now creates individual `review-*.md` files (Phase 5) and the existing 6 reviewer agents already reference individual `review-software-architecture.md`, `review-holistic.md`, etc. However, the plan still does not include an explicit task to delete `reviewers-cross-cutting.md` after Phase 5 is complete. The refine-plan skill (`skills/refine-plan/SKILL.md`) references this file at runtime for domain-specialist assembly. Since `refine-plan` is deleted in Phase 6, the file becomes orphaned. But there is a timing risk: if the build runs after Phase 5 (agents created) but before Phase 6 (old skills deleted), both the monolithic and per-domain files exist, creating two sources of truth.

The plan should include a task in Phase 6 to verify that `reviewers-cross-cutting.md` has no remaining `@` references from any surviving skill or agent, and then delete it. Same treatment for any other monolithic reviewer files if they exist (though `reviewers-cross-cutting.md` is the only one confirmed in `_shared/references/`).

Fix: Add explicit task to Phase 6: grep all surviving skills and agents for `@` references to `reviewers-cross-cutting.md`. If none remain, delete it. If any remain, update them to use per-domain files.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `activeQuest` guard interaction not addressed for explore phase

The quest lifecycle has a cross-cutting guard: `BEGIN_QUEST_PLAN` requires `activeQuest == null`. The new `BEGIN_QUEST_EXPLORE` transition (inserted before `BEGIN_QUEST_PLAN`) needs to clarify whether it also sets `activeQuest` in `project.json`. If it does, then the explore -> plan transition is seamless. If it does not, then `BEGIN_QUEST_PLAN` would need a separate activation step. The epic lifecycle sets `activeEpic` at `ACTIVATE_EPIC` (much later), but the quest lifecycle sets `activeQuest` at `BEGIN_QUEST_PLAN` (the first real transition after `created`). The new explore transitions need to decide: does `BEGIN_QUEST_EXPLORE` set `activeQuest`, or does the quest remain "unactivated" during exploration?

Looking at the epic pattern: `BEGIN_EXPLORE` does NOT set `activeEpic` — that happens at `ACTIVATE_EPIC`. But quest has no separate activation step; `BEGIN_QUEST_PLAN` both activates and starts planning. If `BEGIN_QUEST_EXPLORE` sets `activeQuest`, it would block other quests from starting during a potentially long explore phase. If it doesn't, you can have one quest exploring and another quest planning — which may or may not be desired.

Fix: Phase 1 Sub-phase A should specify whether `BEGIN_QUEST_EXPLORE` sets `project.json activeQuest` and document the rationale.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 audit skill re-entry check pattern is vague

The audit skill tasks say "Implement re-entry handling: if an audit was previously started (check for existing audit artifacts in `.goodplan/`), offer to continue or restart." Unlike the pipeline skills (create-epic, plan-slice, create-side-quest) which use CLI entity status for re-entry detection, the audit skill would be checking for filesystem artifacts directly. This breaks the orchestrator pattern of "phase detection uses the CLI exclusively — no filesystem artifact checks" (from the architecture re-entry protocol). The audit skill is lightweight (not a pipeline), so this may be intentional, but it should be explicit about the departure from the pattern.

Fix: Either specify a CLI-based mechanism for audit re-entry (e.g., a flag or status query) or explicitly note this as an acceptable deviation from the pipeline re-entry pattern since audit is a standalone skill, not a pipeline.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 reviewer agent count includes `reviewer-agent-skill.md` but the agent file already exists

The plan says "6 existing + 14 new = 20". The 6 existing reviewer agents are: `reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-typescript.md`, `reviewer-repo-tooling.md`, `reviewer-tui-cli.md`, and `reviewer-agent-skill.md`. The Phase 5 task list enumerates 14 new ones (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). That totals 20. But the reviewer registry also lists a "Background Jobs & Task Processing Reviewer" in the web specialists section, and a "C++ Reviewer" in language specialists. Neither appears in the Phase 5 task list. The merged round-1 feedback (C2 resolution) says "The extra registry entries are aspirational and not yet planned" which is a reasonable decision — but the reviewer registry update in Phase 5 should not include these aspirational entries. The updated registry should list exactly the 20 agents that will exist after Phase 5, not the aspirational 22.

Fix: When updating the reviewer registry in Phase 5, ensure it references exactly the 20 agents that exist, not the full aspirational set from the old registry.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has significantly improved from round 1. The major structural issues (quest state machine extension, reviewer counts, reference file disposition, test harness coverage) have all been addressed. The remaining issues are:
- The quest state machine extension lacks transition table and fitness function verification tasks (IMPORTANT — could break the build)
- The monolithic reviewer file cleanup is still implicit rather than explicit (IMPORTANT — leaves dead weight and potential confusion)
- The reviewer registry update scope needs clarification that it is a full rewrite (IMPORTANT — the old format never worked)

Fixing the three IMPORTANT items (transition table/fitness updates, monolithic file deletion, registry rewrite clarity) and the minor items would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
