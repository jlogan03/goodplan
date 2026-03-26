# Holistic Review — Round 3

## Issues

**[IMPORTANT] task:create uses `begin("create-task", ...)` but plan also says to add task to `buildCreateEvent()` switch**

Phase 1 task list says to add `"create-task"` to `BeginPhase` and use it as a dedicated phase (correct), and Phase 2 says `create.ts` calls `begin(projectDir, "create-task", { type: "task", name }, payload)` (correct). However, Phase 1 also lists updating `buildCreateEvent()` in `begin.ts` (item 8, sub-item 5: "buildCreateEvent() in src/core/rpc/begin.ts"). `buildCreateEvent()` handles the `"create"` phase with target-type dispatch — it is NOT the right place for `"create-task"` since that is a separate `BeginPhase`. The plan should NOT add a task case to `buildCreateEvent()` — instead, `buildBeginEvent()` gets a new `case "create-task"` that directly constructs the `CREATE_TASK` event (which Phase 2 already describes correctly). The `buildCreateEvent()` mention in the exhaustive-switch list is misleading and could cause the implementer to add dead code or a confusing branch.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `task:create` accepts `name` from stdin but the `/capture` skill derives it — schema mismatch risk**

The `taskCreateInputSchema` requires `name: string` as a required field. This is fine for direct CLI usage. But the `/capture` skill auto-derives the name by slugifying the title. The plan should specify the slugification logic (e.g., lowercase, replace spaces/special chars with hyphens, truncate to N chars) either in the skill SKILL.md or as a shared utility. Without this, different implementations of `/capture` could produce inconsistent slugs (e.g., "Fix Error Handling" -> "fix-error-handling" vs "fix_error_handling" vs "fixerrorhandling"). Since quests and epics already receive user-provided names, there's likely no existing slugify utility to reuse.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 Expected Behavior says `task:create` returns `paths: {}` but doesn't mention `phase`**

The expected output shows `{ entity, phase: "create-task", previousStatus: null, newStatus: "open", paths: {} }`. `previousStatus` should be `"none"` (string), not `null` — `buildBeginResult()` defaults to `"none"` when the old entity doesn't exist (see line 311 of begin.ts: `previousStatus = "none"`). This is a minor documentation inaccuracy but could confuse verification.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 quest creation fields in CONVERT_TASK step 5 may be incomplete**

Step 5 says quest gets `{ name, goal: task.title + description, status: "created", refinement: null, created: ts, updated: ts }`. The actual `quest.json` schema (visible in `quest-create.ts`) also includes these exact fields. This looks correct. However, the plan should clarify that `goal` concatenation uses a separator (e.g., `task.title + ": " + description` or just `task.title` when description is absent). Without this, the goal could be "Fix error handlingmigrate.ts has wrong error codes" with no separator.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is thorough, well-structured, and demonstrates deep understanding of the codebase patterns. All 22 issues from rounds 1-2 have been properly addressed. The phasing is logical, dependencies are clear, and verification criteria are concrete and falsifiable. The `buildCreateEvent()` confusion in the exhaustive-switch list (IMPORTANT) is the main remaining concern — it could lead to wasted implementation effort or a dead code path. The other issues are minor documentation clarifications.

To reach 10/10: resolve the `buildCreateEvent()` ambiguity and specify slugification logic for the `/capture` skill.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
