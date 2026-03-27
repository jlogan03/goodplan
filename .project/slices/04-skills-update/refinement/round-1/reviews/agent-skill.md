# Agent Skill Review: 04-skills-update

## Issues

**[IMPORTANT]** Plan does not distinguish intentional fallback references from references that must change

The plan's task list says to update all `.project/slices/` references in each file, but the research file identifies several references that are **intentional fallbacks** for non-epic projects (e.g., `create-slices/SKILL.md` lines 50, 52; `refine-slices/SKILL.md` lines 33, 37; `project-status/SKILL.md` line 256). The plan lists `create-slices/SKILL.md`, `create-slices/references/guidance.md`, `refine-slices/SKILL.md`, and `project-status/SKILL.md` as files to update with path changes, but does not explicitly call out which references within those files should be preserved. An implementor following the plan literally would break the no-active-epic fallback paths.

**Fix:** For each file that contains both stale and intentional flat references, add explicit guidance: "Update lines X, Y (stale epic-slice paths) but preserve lines A, B (intentional no-active-epic fallbacks)." The research file already has this mapping — inline it into the task descriptions.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Verification is grep-only; no behavioral smoke test

The plan's verification section relies entirely on `grep` counts (flat references = 0, nested references > 0). Per the evaluation criteria for verification approach appropriateness, skill changes should be verified by invoking the skill and checking behavior end-to-end, or at minimum by reading the updated skill files and confirming the instructions are coherent post-edit. A mechanical find-and-replace can produce syntactically correct but semantically broken instructions (e.g., a conditional that now has two epic-path branches and no flat-path branch).

**Fix:** Add a verification task: "Read each updated SKILL.md's scope resolution section end-to-end. Confirm: (1) epic-slice scope resolves to `.project/epics/<epic>/slices/<name>/`, (2) no-active-epic fallback still resolves to `.project/slices/`, (3) no dangling references to removed patterns."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `explore/SKILL.md` line 69 needs conditional, not simple replacement

Line 69 currently says `use .project/slices/<activeSlice.name>/ as scope`. The plan says to "update scope resolution" but this is not a simple find-and-replace. The explore skill's scope resolution at line 69 handles the **active slice without argument** case, where the code needs to branch: if `.activeEpic` exists, use `.project/epics/<epicName>/slices/<activeSlice.name>/`; otherwise use `.project/slices/<activeSlice.name>/`. Currently it has no epic awareness. The plan should specify this as a conditional insertion, not a path replacement, since the explore skill (unlike complete/create-plan) does not already have `$SLICES_DIR` or `$EPIC_DIR` variables.

**Fix:** Update the `explore/SKILL.md` task to explicitly describe the conditional logic needed: "Add epic-awareness to active slice resolution (line 69): if `.activeEpic` is present, derive scope as `.project/epics/<activeEpic.name>/slices/<activeSlice.name>/`; otherwise `.project/slices/<activeSlice.name>/`." Same pattern for `explore/SKILL.md` line 87 (the `ls` fallback scan) and line 52 (the short-name search).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `explore/references/explore-logic.md` Slice row needs epic-slice row, not replacement

Line 9 of `explore-logic.md` has a Slice row in the Scope Path Mapping table that uses `.project/slices/<name>/...` paths. The plan says to "update scope directory examples" but this is a table that maps scope types to paths. Top-level slices still use `.project/slices/<name>/...`. The correct fix is to add a new **Epic Slice** row (or rename the existing row to "Top-Level Slice" and add an "Epic Slice" row) with `epics/<epic>/slices/<name>/...` paths. Simply replacing the Slice row would break non-epic projects.

**Fix:** Specify: "In `explore-logic.md`, rename 'Slice' row to 'Top-Level Slice' and add a new 'Epic Slice' row with `.project/epics/<epic>/slices/<name>/...` paths. Keep the existing Slice paths for the Top-Level Slice row."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan does not address `complete/SKILL.md` line 277 (slices-refining note)

Line 277 references `.project/slices/slices-refining/` in a Note about refinement metrics. This is a specific scope name reference (the `slices-refining` directory under `.project/slices/`), not a generic pattern. The plan's task for `complete/SKILL.md` does not mention this line. Under the epic structure, this would be `.project/epics/<epic>/slices/slices-refining/` or may need to reference the refine-slices working directory differently.

**Fix:** Add this reference to the `complete/SKILL.md` task list. Determine whether `slices-refining` is an actual slice name (in which case it moves to epic path) or a conceptual reference (in which case the note needs rewording).

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** `complete/references/guidance.md` line 111 glob pattern needs epic path expansion

Line 111 globs for `completion/learnings.md` under `.project/slices/*/`. The plan's task for this file mentions "update glob pattern for completion scanning" but does not specify whether to **replace** the flat path glob or **add** an epic path glob alongside it. Since completed slices from pre-epic projects may still exist at `.project/slices/*/`, the glob should expand to include both patterns: `.project/slices/*/completion/learnings.md` AND `.project/epics/*/slices/*/completion/learnings.md`.

**Fix:** Specify: "Expand the glob to include epic-nested paths alongside existing flat paths (both may contain completed scopes)."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `_shared/references/state-and-activity-formats.md` already has correct scope format

The plan lists this file for path updates, but reading the file shows lines 48-52 already document the correct scope formats including `epics/<name>/slices/<name>`. The only flat reference is line 48 (`slices/<name>` for pre-epic scope) which is correct documentation of valid scope values. The plan should either remove this file from the task list or clarify what specifically needs changing.

**Fix:** Remove `state-and-activity-formats.md` from the task list, or verify and specify what exactly needs changing (the file already documents both old and new scope formats correctly).

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan correctly identifies the 12 files in scope and the two categories of changes (path updates + learnings removal). The research file is thorough and identifies gotchas well. However, the plan treats a nuanced migration as a simple find-and-replace without distinguishing intentional fallbacks from stale references, without specifying the conditional logic needed for files that lack epic-awareness variables, and without adequate behavioral verification. Four of the IMPORTANT issues could cause broken skill behavior in non-epic projects if the implementor follows the plan literally. To reach 9+: inline the research file's intentional-vs-stale distinction into each task, specify the conditional logic for explore skill, add the missing line 277 reference, and add a semantic coherence check to verification.

## Summary
- Critical: 0
- Important: 5
- Minor: 2
