# Architecture Alignment Review — Round 2

Reviewer: architecture-alignment
Iteration: 2
Goal: Restructure slice storage, consolidate overview, fix learnings, self-migrate.

Round 1 had 5 IMPORTANT items all marked as fixed. This review verifies alignment and checks for any residual or newly introduced issues.

---

## Issues

**[IMPORTANT]** `goal-refining.md [04-skills-update]`: Skill file list contains non-existent files

The slice 04 goal lists these files to update:
- `skills/iteration-loop/SKILL.md`
- `skills/onboard-repo/SKILL.md`
- `skills/shared/references/cli-interaction.md`
- `skills/shared/references/context-api.md`

None of these paths exist. The repo has `skills/_shared/` (not `skills/shared/`), and neither `skills/iteration-loop/` nor `skills/onboard-repo/` exist as directories. The actual files requiring updates are `skills/_shared/references/cli-interaction.md` (confirmed: contains `.project/slices/` references at lines 188–189) and `skills/_shared/references/state-and-activity-formats.md` (contains `slices/03-explore` scope example). There is no `skills/shared/references/context-api.md` — this file does not exist.

Additionally, the actual files with `slices/` references that ARE in the repo but not in slice 04's list include:
- `skills/create-slices/SKILL.md` and `skills/create-slices/references/guidance.md` — multiple flat path references including `slices/overview.json`
- `skills/project-status/SKILL.md` — references `.project/slices/` and `slices/sequencing.md`
- `skills/project-status/references/status-logic.md` — `slices/sequencing.md` references
- `skills/_shared/references/epic-conventions.md` — `slices/` directory references in structure diagrams and status table
- `skills/_shared/references/state-and-activity-formats.md` — `slices/03-explore` scope example
- `skills/complete/references/guidance.md` — confirmed has `slices/` references
- `skills/explore/references/explore-logic.md` — confirmed has `slices/` references

The slice says "11 skill files" but lists files that don't exist and omits files that do. An implementer following this goal will miss real files and waste time on phantom ones.

Resolution: DIRECTLY_ACTIONABLE

Fix: Replace the file list with paths that exist in the repo. Grep `skills/` for `slices/` before finalizing. Remove phantom paths (`iteration-loop`, `onboard-repo`, `shared/`) and replace with correct paths (`_shared/references/cli-interaction.md`, `_shared/references/epic-conventions.md`, etc.). Re-count to confirm the "11 files" claim matches reality.

---

**[IMPORTANT]** `goal-refining.md [03-context-and-learnings]`: `priorities.ts` has two additional stale path literals not listed in Behavior

The slice 03 Behavior items cover `entityDir()`, `resolveScope()`, and `learnings.ts`. However, the actual `priorities.ts` file has two more stale paths that require updates:

1. `"slices/overview.json"` (line 66 in `completeSources`) — hardcoded path used by the `complete` phase priority table. After restructuring, slices live in `epics/overview.json` embedded arrays, not a flat `slices/overview.json`. If left unchanged, context bundling for the `complete` phase loads a nonexistent file.
2. `"slices"` (line 110 in `refineSlicesSources`) — the `refine-slices` phase loads `slices` as a directory source for slice definitions. After restructuring, slice definitions live at `epics/<epic>/slices/`, not `slices/`. This is a silent context degradation in the `refine-slices` workflow.

These are distinct from `entityDir()` (covered in Behavior item 3) — they are in other priority table objects (`completeSources` and `refineSlicesSources`), not in the shared helper. The affected-apis.md explicitly calls them out as "silent string literal changes TypeScript won't catch" but slice 03's Behavior section only references the three items from affected-apis.md's "Three string literals" note, missing these two additional occurrences.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add Behavior items for the `completeSources` `slices/overview.json` path (→ navigate `epics/overview.json` `items[].slices[]` for the target epic) and the `refineSlicesSources` `slices` directory path (→ `epics/${target.epic}/slices` or derived from active epic). Add corresponding grep verification steps.

---

**[MINOR]** `goal-refining.md [01-schema-and-state-machine]`: `slice-create.ts` still uses flat `hasChild(state, "slices", event.name)` guard — not covered by scope

The current `slice-create.ts` guard checks `hasChild(state, "slices", event.name)` (line 22) which uses the flat top-level `slices/` directory. After restructuring, slice uniqueness is per-epic (`hasChild(state, \`epics/${event.epic}/slices\`, event.name)`) as specified in `affected-apis.md`. This guard is in `src/core/state/transitions/slice-create.ts`, which is within slice 01's scope (state machine transitions). However, the Behavior and Verification sections don't explicitly call out this guard change. An implementer updating the handler path strings might overlook the guard logic.

The verification item `grep -r "slices/overview.json" src/core/state/` would not catch this since the guard doesn't reference `slices/overview.json`.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a Behavior note stating "Slice name uniqueness guard changes from `hasChild(state, 'slices', event.name)` to `hasChild(state, \`epics/${event.epic}/slices\`, event.name)` — per-epic scope, not global." Add a verification item: `grep -r '"slices"' src/core/state/transitions/` — should have no matches for the flat `slices` directory as a child lookup target.

---

**[MINOR]** `goal-refining.md [04-skills-update]`: `skills/create-slices/` contains `slices/overview.json` registration logic in its goal description

`skills/create-slices/SKILL.md` line 188 states: "This creates the slice entity at `.project/slices/<name>/slice.json` and registers it in `slices/overview.json`." This is an explanation of what the CLI does, not a path reference in skill orchestration logic. After the restructuring, this description will be wrong — it should say "registers it in `epics/overview.json` (embedded slices array)." The `create-slices` skill is not in slice 04's file list (only 11 files are listed, and it's not among them) despite having multiple `slices/` references.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add `skills/create-slices/SKILL.md` and `skills/create-slices/references/guidance.md` to slice 04's file list. Update the verification grep to include these files.

---

**[MINOR]** `sequencing-refining.md`: Sequencing description for slice 01 doesn't mention the `hasChild` guard changes

The sequencing description for slice 01 lists many items but omits guard path changes in slice transition handlers. This is a minor documentation gap — the goal file covers it implicitly via "all `src/core/state/transitions/` handler files" but the sequencing summary omits it. Low impact since the goal file is more authoritative.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add "guard path changes (`hasChild` calls use epic-scoped paths)" to the slice 01 Description in the sequencing table.

---

## Score: 7/10

Round 1 fixes were correctly applied: `buildInitialEpicJson` is now listed in scope, dependencies are appropriately loosened (slices 03 and 04 depend only on 01), `DeferredItem.targetEpic` is listed in Behavior, architecture doc updates are distributed per-slice, and activity log scope strings are explicit in slice 01.

Two IMPORTANT issues remain: the slice 04 file list contains phantom files and omits real ones (implementers will miss `create-slices`, `epic-conventions.md`, and other files with real `slices/` references), and slice 03 misses two stale `priorities.ts` path literals that will cause silent context degradation. These are directly fixable but would cause real bugs if missed. Reaching 9/10 requires correcting the file list in slice 04 and adding the missing `priorities.ts` path items to slice 03.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
