# Holistic Review — Task Capture Plan

## Issues

**[CRITICAL]** INIT_PROJECT must create `tasks/overview.json`
The plan's Phase 1 does not mention updating `src/core/state/transitions/init.ts` to create `tasks/overview.json` during project initialization. The current `handleInitProject` creates `epics/overview.json`, `slices/overview.json`, and `quests/overview.json` but has no task equivalent. Without this, newly initialized projects will have no `tasks/overview.json`, causing `task:list` and `task:create` to fail (the overview file won't exist for reading or updating). The research file (gotcha #8) identifies this gap but the plan does not address it.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** CONVERT_TASK atomicity: plan is vague on quest/epic creation mechanism
The plan says CONVERT_TASK "also creates the quest/epic entity (reuse existing CREATE_QUEST/CREATE_EPIC event dispatch or inline the creation logic)" but does not commit to one approach. The research file (gotcha #4) identifies this as the hardest part and recommends option (a) — inlining creation using helpers — as cleanest. The plan must specify the chosen approach because recursive `reduce()` calls (option b) would violate INV-003 purity assumptions, and option (c) requires different helper usage. An implementer left to choose could pick the wrong approach.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Task transition table missing from `transition-tables.md`
The current `transition-tables.md` documents transitions for Project, Epic, Slice, Quest, and Decision. Adding a new entity type (task) requires updating this source-of-truth document with the task transition table. The plan has no task for this. Without it, the transition table diverges from the implementation, making it unreliable as spec.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** BeginPhase/BeginPayloadMap not updated for `drop` and `convert`
Phase 2 says "Add RPC handling for task operations in `src/core/rpc/begin.ts`" but does not specify adding `"drop"` and `"convert"` to the `BeginPhase` union or `BeginPayloadMap` in `src/core/rpc/types.ts`. The existing `buildBeginEvent` uses an exhaustive switch on `BeginPhase` with a `never` default — adding new phases without updating the type will not compile. The plan needs explicit tasks for: (1) adding `"drop"` and `"convert"` to `BeginPhase`, (2) adding corresponding payloads to `BeginPayloadMap`, (3) adding cases to `buildBeginEvent`, (4) adding task cases to `buildBeginResult`, (5) adding task to `resolveEntityName`/`resolveEntityJsonPath` in types.ts.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Overview schema does not include `title` — plan does not address this
The shared `overviewSchema` has `{ name, status, epic?, created, completed }` with no `title` field. Tasks use `title` for display (unlike quests/epics which use `name`). The plan's `task:list` command says it outputs "table with name, title, created date, status" but does not specify how `title` gets into overview items. Either: (a) extend `overviewItemSchema` with an optional `title` field, or (b) have `task:list` load individual task.json files for titles (defeating the overview pattern's purpose). The plan must pick an approach.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `task:create` uses `begin("create", ...)` but Phase 1 schema has `title` not `goal`
The quest `create` command passes `{ name, goal }` via `BeginPayloadMap["create"]`. Task create needs `{ name, title, description?, context? }` — this doesn't match the existing `create` payload shape (`{ name: string; goal?: string; epic?: string }`). The plan should either: (a) add task-specific fields to the create payload, or (b) use a separate `"create-task"` phase (like `"create-decision"` exists separately). The current plan glosses over this mismatch.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No task for updating `architecture/transition-tables.md` or `architecture/data-model.md`
Adding a new entity type is a significant architectural change. The plan has no documentation update tasks for: the transition tables (source of truth per file header), the data model doc, or the architecture overview's subsystem notes. This violates the plan's own research context which says these docs are fresh and should be kept current.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 verification is weak — no before/after for `/capture` skill behavior
Phase 3's Expected Behavior checks only file existence (`ls skills/capture/SKILL.md`) and grep for keywords. There's no verification that the skill actually works end-to-end: running `/capture` with inline text should create a task, and `/capture` without text should prompt. Since skills are prompt files (not executable code), verification should at minimum include: create a task via the CLI manually, then verify `/project-status` shows the count. The "Skill auto-captures context" and "Skill uses judgment" items are not falsifiable checks.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Expected Behavior "before" checks use `grep` on specific paths that may not exist
The before-checks like `grep -r "taskSchema\|task\.json" src/schemas/` assume `src/schemas/` exists as a flat search target. These are fine but could produce false positives if any existing file happens to contain "task" as a substring. Consider making the patterns more specific (e.g., `taskSchema` is probably unique enough, but `task.json` might appear in comments).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 says `task:drop` reads stdin but quest:abandon uses flags
The research file notes "Flag-based commands (quest:abandon): Simple scalars use flags (not stdin). Task drop could use --reason flag (like quest abandon) or stdin." The plan chose stdin for `task:drop` (`taskDropInputSchema`), which is inconsistent with the existing pattern where simple scalar inputs use flags. This isn't wrong but breaks consistency. Consider using `--reason` flag to match quest:abandon pattern.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No task for updating the `schema` command output
INV-006 requires that the `schema` command reflects actual command signatures. Adding 5 new `task:*` commands means the schema output will automatically include them (since it's generated from citty definitions), but the plan should verify this explicitly in Phase 2's verification section.
Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan demonstrates good understanding of the codebase patterns and covers the three layers (schema, CLI, skill) in a logical phase order. However, it has three critical gaps: missing init handler update, unresolved CONVERT_TASK design decision, and missing transition table update. It also has several important gaps around RPC type updates and overview schema mismatches that would block implementation. The plan needs to be more precise about the exact files and types that must change — the research file identified most of these issues but the plan didn't incorporate all the findings.

To reach 9+: resolve the 3 critical issues, add explicit tasks for all exhaustive-switch touch points (BeginPhase, BeginPayloadMap, Target, buildBeginEvent, buildBeginResult, resolveEntityName, resolveEntityJsonPath), decide on overview schema extension vs. alternative for title display, add transition table documentation, and strengthen Phase 3 verification.

## Summary
- Critical: 3
- Important: 4
- Minor: 3
