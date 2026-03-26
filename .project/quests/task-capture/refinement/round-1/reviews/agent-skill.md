# Agent Skill Review: Task Capture Plan

## Issues

**[IMPORTANT]** /capture skill description is too vague for reliable triggering

The plan says the skill triggers on "/capture", "capture this", "note this", "remember to", "task:", "todo:". But the plan doesn't define a proper SKILL.md `description` field in the frontmatter. The `description` is what actually drives skill triggering — it must include both what the skill does AND when to use it, written in third person. Triggers like "todo:" and "remember to" are extremely common in normal conversation and will cause false triggers. The description also needs to be specific enough to distinguish from adjacent skills (e.g., `/explore` for research, `/create-epic` for larger work items).

The plan should specify the exact `description` frontmatter text. It should be specific to "quick capture of a bug, idea, or thought noticed during work" and distinguish from quests/epics. Drop overly generic triggers like "todo:" and "remember to" which will false-trigger on natural language.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** /capture skill missing version check step and CLI interaction reference loading

Every existing skill (project-status, create-epic, complete, explore, etc.) starts with a version check step that runs `goodplan --version --json` and compares against the `requires` constraint. The plan's Phase 3 task for `skills/capture/SKILL.md` does not include this step. It also doesn't specify a step to load `../_shared/references/cli-interaction.md` — only a reference to "Follow cli-interaction.md conventions." Existing skills explicitly load this reference as a step (e.g., project-status Step 2, explore Step 0).

Add a Step 0/Step 1 to the /capture skill spec: (1) version check with `goodplan --version --json`, (2) load `../_shared/references/cli-interaction.md`. Include the `requires: goodplan >= 1.0.0` frontmatter field.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** /capture skill uses AskUserQuestion but doesn't specify it as the interaction pattern

The plan says the skill should "ask 'What did you notice?' via AskUserQuestion" in the smart judgment flow. This is the correct Claude Code pattern, but the plan doesn't account for the fact that this is a single-variant skill (Claude Code only). If this skill will later need Codex or Cursor variants, the interaction pattern differs significantly (Codex: output question directly in chat; Cursor: output question directly). The plan should either: (a) explicitly state this is Claude-Code-only and document that variant files would be needed for other agents, or (b) abstract the "ask user" pattern into a reference so it can be swapped per-agent later.

Given the project only has single-variant SKILL.md files currently, option (a) is fine — just note it in the plan so future multi-agent work knows to create variants.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** init.ts needs `tasks/overview.json` creation for new projects

The plan's Phase 1 tasks mention adding schema registry entries for `tasks/overview.json` and creating task handlers, but there is no task to update `src/core/state/transitions/init.ts` to create `tasks/overview.json` during project initialization. The codebase context (gotcha #8) calls this out: "Init handler creates overview files... Must also create `tasks/overview.json` for newly initialized projects." Without this, `task:create` on a freshly-initialized project will fail with "tasks/overview.json not found — is the project initialized?" (same guard pattern as quest-create.ts line 29-35).

The plan also needs a migration story for existing projects that don't have `tasks/overview.json`. Either: (a) CREATE_TASK handler creates it lazily if missing (diverges from quest/epic pattern which guards on it), or (b) add a task to Phase 1 to update init.ts AND add a note about existing projects needing the overview created on first use.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** CONVERT_TASK atomicity not fully specified in the plan

The plan says CONVERT_TASK "creates the quest/epic entity (reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic)." The codebase context (gotcha #4) correctly identifies this as the hardest part, but the plan leaves the implementation approach ambiguous with "or." Option (b) — dispatching sub-events via recursive `reduce()` — violates purity assumptions per codebase context. The plan should commit to option (a) or (c): inline entity creation using `setEntry()` and helper functions from `helpers.ts`. This is architecturally significant because getting it wrong breaks INV-003 (state machine purity).

Additionally, CONVERT_TASK needs to handle the `tasks/overview.json` update (mark task as converted) AND the `quests/overview.json` or `epics/overview.json` update (add new entity) AND create the quest/epic JSON file — all in a single reducer pass. The plan should enumerate these state tree mutations explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 Expected Behavior verification is insufficient for the /capture skill

Phase 3's Expected Behavior checks are limited to `ls` for file existence and `grep` for content mentions. For an agent skill, the most direct verification is to actually invoke the skill and verify it works end-to-end. The plan should include:
1. Install the skill (`bun run install:skills`)
2. Create a test task via `/capture` or directly via CLI
3. Verify `goodplan task:list --json` shows the task
4. Verify `goodplan status --json` includes `openTasks` count

The current verification for Phase 3 partially covers this ("Run `goodplan status --json` on a project with tasks") but doesn't test the skill itself.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** /capture skill output format not specified

The plan says "Show what was captured in a brief summary (title, key context). Don't interrupt the user's flow." But it doesn't specify the exact output format. Existing skills have well-defined output templates (project-status has Format A/B). For a skill this simple, a one-liner example in the plan would suffice — e.g., "Captured: **Fix error handling** (while working on migrate slice, branch: feat/migrate)".

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** project-status update doesn't specify where in the output template the task count appears

The plan says "add a 'Tasks' line showing open task count (e.g., 'Tasks: 3 open'). Only show if openTasks > 0." But it doesn't specify where in the Format A/B templates this line should appear. Looking at the existing project-status SKILL.md, there are specific template positions for each line. The plan should specify placement — likely after "Decisions" and before "Next" in both Format A and Format B.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Overview schema reuse for task list display

The plan's Phase 2 says `task:list` shows "name, title, status, created" but the shared `overviewSchema` only has `{ name, status, epic?, created, completed }` — no `title` field. The codebase context (gotcha #6) flags this. The plan's `task:list` bypasses RPC and reads overview.json directly, so it would only see `name` (the slug), not `title`. Either: (a) extend `overviewItemSchema` to include an optional `title`, (b) have `task:list` also read each `task.json` to get the title (slower), or (c) accept name-only listing. The plan should pick one approach. Option (a) is cleanest since it's backward-compatible (optional field).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** BeginPhase union needs "drop" and "convert" additions not fully traced

The plan mentions adding RPC handling for task operations in `begin.ts` but doesn't explicitly list the new `BeginPhase` values needed. Looking at the existing `BeginPhase` type, "abandon" exists for quests but "drop" and "convert" do not. The plan should specify: add `"drop"` and `"convert"` to `BeginPhase`, add corresponding entries to `BeginPayloadMap`, and add cases to `buildBeginEvent()`. The exhaustive `satisfies` pattern means missing any of these causes a compile error, so it will be caught — but specifying it in the plan avoids implementation confusion.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers the three layers well at a structural level (entity, CLI, skill) and correctly identifies the key patterns to follow. However, the /capture skill specification is undercooked — it's missing standard skill scaffolding (version check, reference loading, frontmatter description), the triggering description that drives skill activation is unspecified, and the verification approach doesn't test the skill end-to-end. The CONVERT_TASK atomicity is left ambiguous despite being the hardest implementation challenge. The init.ts gap would cause immediate failures on new projects. Fixing the 5 IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 6
- Minor: 4
