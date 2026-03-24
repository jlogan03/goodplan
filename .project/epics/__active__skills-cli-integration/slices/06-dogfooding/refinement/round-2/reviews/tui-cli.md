## Issues

**[CRITICAL]** Phase 4 invokes `epic:activate` before slicing — state machine requires `slices-refined` status

Phase 4's "Exploration & Architecture Proposal" section places `goodplan epic:activate --epic llm-judge --json` immediately after `/create-architecture`. The state machine in `src/core/state/transitions/epic-lifecycle.ts:28` guards `epic:activate` with `guardEpicStatus(..., "slices-refined", "ACTIVATE_EPIC")`. The full transition path is: `created -> exploring -> explored -> defining-architecture -> architecture-defined -> ... -> slices-refined -> activated`. The plan must run `/create-slices` and `/refine-slices` (or their skip paths) before `epic:activate` can succeed. The current task ordering would produce exit code 3 (`STATE_INVALID_TRANSITION`).

Additionally, `epic:activate` has a second guard: `epic.verifications.length === 0` returns `STATE_MISSING_VERIFICATIONS`. The plan never mentions adding verifications (`epic:add-verification`) before activation. Both guards must be satisfied.

Fix: Move `epic:activate` to after the "Slicing, Planning, Implementation" section. Add an explicit task to add verifications (`echo '{"description":"...","criteria":"..."}' | goodplan epic:add-verification --epic llm-judge --json`) before calling `epic:activate`. Update the section title from "Exploration & Architecture Proposal" to just "Exploration & Architecture" and create a new "Activation" subsection between slicing and implementation that handles verifications + activation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `/start-epic` skill is fully un-migrated — plan understates the gap

Phase 4 says: "Note: the `/start-epic` skill has NOT been migrated to CLI commands and still uses direct filesystem access (`mv` for `__active__` prefix, direct `state.md` writes). Log this as friction." This understates the issue significantly. The full `/start-epic` SKILL.md (`skills/start-epic/SKILL.md`) uses: `ls -d` for epic resolution, `__active__` prefix via `mv`, `state.md` writes, direct `activity-log.jsonl` appends, file-existence checks for state detection, and `mkdir`/`cp` for directory management. Every step violates CLI interaction conventions.

The plan's current phrasing implies `/start-epic` can be exercised during dogfooding with some friction logging. In reality, running `/start-epic` would create `__active__`-prefixed directories that the CLI cannot resolve (CLI uses `epics/<name>/`, not `epics/__active__<name>/`), corrupt state by writing `state.md` that the CLI ignores, and skip the CLI state machine entirely. The plan should either:
1. Explicitly skip `/start-epic` and perform the activation manually via CLI commands (`epic:add-verification` + `epic:activate`), noting the skill migration as out-of-scope for this slice, or
2. Call out that `/start-epic` must be migrated first (but this conflicts with the dogfooding scope).

Option 1 is correct for this dogfooding slice. The "Handle skill-layer operations separately" task partially addresses this but is ambiguous about the recommended path.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 quest lifecycle does not use `quest:plan` to begin planning

Phase 3's "Execute organic quests" task says: "Run through full lifecycle: `/create-plan` -> `/refine-plan` -> `/implement-plan` -> `/complete`". But before `/create-plan` can work, the quest must be transitioned from `created` to `planning` status via `stdin: "" | goodplan quest:plan --quest <name> --json`. This is analogous to `slice:plan` for slices. Without this transition, the `start-plan` sub-agent command (invoked by `/create-plan`) will fail because the quest is not in `planning` status.

The same issue applies to the "Deliberate Quest" section which also jumps from `quest:create` directly to `/create-plan`.

Fix: After each `quest:create`, add a task: `stdin: "" | goodplan quest:plan --quest <name> --json` to transition the quest to planning status before running `/create-plan`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 does not mention `slice:plan` transition before `/create-plan`

Phase 2's "Planning & Implementation (per slice)" section says: "Run `/create-plan`: Create implementation plan for the slice". But the slice lifecycle requires `stdin: "" | goodplan slice:plan --slice <name> --json` to transition from `created` to `planning` before the `/create-plan` skill (which internally calls `start-plan`) can execute. The transition table shows: `created -> BEGIN_PLAN -> planning`. Without this CLI command, `/create-plan` will fail on the `start-plan` call because the slice is in `created` status, not `planning`.

Fix: Add a task before "Run `/create-plan`": `stdin: "" | goodplan slice:plan --slice <name> --json` to begin the planning phase.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 1 "Before implementation" checks use `ls` instead of asserting non-existence via CLI

Phase 1's Expected Behavior "Before implementation" section uses `ls ~/Repos/nondet-eval` and `ls ~/Repos/nondet-eval/.claude/skills/` to verify absence. Since the project does not exist yet, these cannot use CLI commands (there is no project to query). These `ls` checks are actually appropriate for this specific case — verifying a directory does not exist on the host filesystem is inherently a filesystem operation. However, the comment says "should fail / show absence" without specifying the expected behavior (exit code 2 from `ls`). Consider making this explicit: "should return non-zero exit" to match the error contract focus of the dogfooding.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Expected Behavior references `architectureDefined` field — verify this exists in `epic:show` response

Phase 2's "Before implementation" section checks `goodplan epic:show --epic core-provider --json` for `architectureDefined === false` and `slicesDefined === false`. These boolean fields are not standard entity JSON fields — the standard fields are `status` (a string enum) and `artifacts` (an object). If `epic:show --json` returns the enriched format with artifact booleans, the field names need to match the actual response shape. The convention doc (section 7) shows slice artifact shape with fields like `exploreComplete`, `plan`, `planRefined` — not `architectureDefined`. Verify the actual `epic:show` response shape and use the correct field names.

Resolution: CODEBASE_EXPLORATION

## Score: 6/10

The round-1 critical issues (path conventions, `__active__`, `~~archived~~`) were fixed. The plan now uses correct entity paths and CLI-based verification in most places. However, a new critical issue emerged: `epic:activate` is sequenced before slicing, which will fail at the state machine level. The plan also misses required state transitions (`quest:plan`, `slice:plan`) before planning skills can execute — these are not optional steps but required CLI commands. The `/start-epic` gap description needs to be more prescriptive about what to do instead of the un-migrated skill. Fixing the `epic:activate` sequencing, adding the missing transition commands, and clarifying the `/start-epic` workaround would bring this to 9+.

## Summary
- Critical: 1
- Important: 3
- Minor: 2
