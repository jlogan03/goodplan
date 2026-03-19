# Merged Review Feedback — Round 1

## CRITICAL Issues

1. **Flow-log backward compatibility: signal tracking filter must query both old and new phase values**
   - Files: `SKILL.md` (Step 6d), `references/guidance.md`
   - The flow-log contains 12+ entries with `"phase":"complete-slice"`. After rename, new entries write `"phase":"complete"`. Step 6d's signal tracking algorithm filters on `phase: "complete-slice"` — without updating this to match BOTH values, all historical completion data is invisible to trend detection.
   - Flagged by: Software Architecture (CRITICAL), Holistic (IMPORTANT), Agent Skill (IMPORTANT)
   - Resolution: DIRECTLY_ACTIONABLE

## IMPORTANT Issues

2. **Initiative completion flow-log entry format unspecified**
   - Files: `SKILL.md` (Step 10)
   - The plan extends Step 10 for initiative completion but doesn't specify: (a) scope value should be `initiatives/<name>` (not `__active__` form), per `state-and-flow-formats.md`; (b) phase should be `"complete"`; (c) the `Current Phase` string `complete complete` reads awkwardly — consider restructuring (e.g., `complete done`).
   - Flagged by: Software Architecture, Agent Skill
   - Resolution: DIRECTLY_ACTIONABLE

3. **Missing state.md field values for initiative completion**
   - Files: `SKILL.md` (Step 10)
   - Step 10 writes Active Slice and Next Step — for initiative completion, Active Slice should be "none" (the initiative is about to be archived), and Next Step should point to `/project-status` or `/create-initiative`, not the next slice. The plan doesn't specify these values.
   - Flagged by: Agent Skill, Software Architecture (archive-then-reference ordering)
   - Resolution: DIRECTLY_ACTIONABLE

4. **Intermediate steps not addressed for initiative scope (6b, 6c, 6d, 7, 9, 9b)**
   - Files: `SKILL.md`, `references/guidance.md`
   - The plan extends ~8 steps for initiative scope but silently skips others. Each needs an explicit decision:
     - Step 6b (system-profile update): What goes in Health/Performance/Extensibility for a meta-operation?
     - Step 6c (debt evaluation): Skip for initiatives? It's a reconciliation step, not an implementation step.
     - Step 7 (CLAUDE.md update): Architecture reconciliation may trigger this — state explicitly.
     - Step 9 (cleanup pass): "Next slice" framing makes no sense for initiative scope — skip or adapt.
     - Step 9b (expertise check): Confirm it applies to initiative scope.
   - Flagged by: Software Architecture
   - Resolution: DIRECTLY_ACTIONABLE

5. **Historical references in `.project/learnings.md` and `.project/system-profile.md` need explicit decision**
   - Files: `.project/learnings.md` (4 occurrences including `_Source: 07-complete-slice_` tags), `.project/system-profile.md` (~8 occurrences including recency markers)
   - These are historical provenance markers. Updating them would falsify history. The plan should explicitly state: "Leave historical `_Source:` tags and recency markers unchanged — they record which skill version produced the output."
   - Flagged by: Holistic, Software Architecture, Agent Skill (all three agree: leave as-is with documented rationale)
   - Resolution: DIRECTLY_ACTIONABLE

6. **Side quest goal files with `complete-slice` references not addressed**
   - Files: `onboard-repo/goal.md` (1), `refactor-intelligence/goal.md` (3), `maturity-context-loading/goal.md` (1)
   - Active side quests referencing old name. Either update or explicitly mark as leave-as-is.
   - Flagged by: Holistic
   - Resolution: DIRECTLY_ACTIONABLE

7. **SKILL.md description must distinguish initiative-level completion from initiative-scoped slice completion**
   - Files: `SKILL.md` (frontmatter description, 1024 char max)
   - Adding "initiative completion" is meaningfully different from "initiative-scoped slices" (already handled). Plan should specify exact new description text to avoid under-triggering or confusion.
   - Flagged by: Agent Skill
   - Resolution: DIRECTLY_ACTIONABLE

8. **Step 6 Context field still says "complete-slice"**
   - Files: `SKILL.md` (Step 6, line ~106: `Use Context: complete-slice for <scope>`)
   - This is in the SKILL.md body, not guidance.md. The Phase 1 rename may miss it if it only targets frontmatter and guidance.md references.
   - Flagged by: Agent Skill
   - Resolution: DIRECTLY_ACTIONABLE

9. **Archive-then-reference ordering risk in Step 10 → 10b**
   - Files: `SKILL.md` (Steps 10, 10b)
   - Step 10 writes state.md referencing `__active__<name>`, then Step 10b renames it. State.md briefly points to a nonexistent path. For initiative scope, Step 10 should write "none" for Active Slice since the initiative is being archived.
   - Flagged by: Software Architecture (subsumed by issue #3 above, but the ordering risk is a separate concern)
   - Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

10. **Phase 3 tasks for `initiative-conventions.md` are no-ops**
    - Files: Phase 3 task list
    - Research explicitly confirms this file already uses `/complete` with no `complete-slice` references. Remove both Phase 3 tasks targeting this file (transition tables and Consumer Guide cleanup). The Consumer Guide task may still be valid if *new* initiative-completion entries need adding — but that's a different task.
    - Flagged by: Holistic, Software Architecture, Agent Skill (unanimous)
    - Resolution: DIRECTLY_ACTIONABLE

11. **Phase 2 verification lacks runtime/behavioral verification**
    - Current verification only checks file contents. Should include a trace-through of each scope type (top-level-slice, initiative-slice, side-quest, initiative) against the updated SKILL.md to confirm no regressions.
    - Flagged by: Holistic, Agent Skill
    - Resolution: DIRECTLY_ACTIONABLE

12. **Phase 2 Step 0 / Step 2 overlap on initiative detection**
    - Step 0 says "Add initiative detection" and Step 2 also says "Add initiative to scope resolution." Follow existing pattern: Step 2 detects scope, Step 0 resolves variables after detection.
    - Flagged by: Holistic
    - Resolution: DIRECTLY_ACTIONABLE

13. **`system-profile-format.md` recency marker backward compatibility**
    - After rename, new markers say `complete` but old markers say `complete-slice`. If the skill overwrites its own previous entries, the new marker won't match old ones by name.
    - Flagged by: Holistic
    - Resolution: DIRECTLY_ACTIONABLE

14. **Step 6e ordering contradiction**
    - Plan says "after debt evaluation" (= after 6c) but names it "6e" (= after 6d). The 6e position (after signal tracking) is correct — fix the description.
    - Flagged by: Software Architecture
    - Resolution: DIRECTLY_ACTIONABLE

15. **`$SLICES_DIR` variable not set for initiative scope**
    - Step 0 doesn't define `$SLICES_DIR` for initiative scope, but Step 2 references `$INITIATIVE_DIR/vertical-slices/`. Either set it or note it's derived.
    - Flagged by: Software Architecture
    - Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

All 15 issues are directly actionable. Key fixes:

1. **Flow-log dual-query** (Issue #1): In Phase 2, add a task to Step 6d: update the signal tracking flow-log filter to match entries where `phase` is either `"complete-slice"` or `"complete"`. In Phase 1, update Step 10's flow-log append to write `"phase":"complete"`.

2. **Initiative flow-log format** (Issue #2): Add to Phase 2's Step 10 extension: for initiative scope, write `"scope":"initiatives/<name>"` (no `__active__`), `"phase":"complete"`. Change the Current Phase string from `complete complete` to something like `complete done`.

3. **State.md for initiative completion** (Issue #3): In Phase 2's Step 10 extension, specify: Active Slice = "none", Next Step = `/project-status` or project-level guidance.

4. **Address all intermediate steps** (Issue #4): Add a section to Phase 2 with explicit decisions for Steps 6b, 6c, 7, 9, 9b under initiative scope (skip with rationale, or adapt).

5. **Historical references decision** (Issue #5): Add a note to Phase 1: "Leave historical `_Source:` tags in learnings.md and recency markers in system-profile.md unchanged — they are provenance records."

6. **Side quest goal files** (Issue #6): Add to Phase 1's repo-files task: update `complete-slice` → `/complete` in the three side quest goal.md files, or add explicit leave-as-is rationale.

7. **SKILL.md description** (Issue #7): In Phase 1, specify exact new description text that distinguishes "completing a slice/quest" from "completing an entire initiative."

8. **Step 6 Context field** (Issue #8): Ensure Phase 1 rename covers `Context: complete-slice for <scope>` → `Context: complete for <scope>` in SKILL.md body.

9. **Archive ordering** (Issue #9): Addressed by Issue #3 — Step 10 for initiative scope writes Active Slice = "none" before Step 10b archives.

10. **Remove Phase 3 no-op tasks** (Issue #10): Delete the two tasks targeting `initiative-conventions.md` transition tables and Consumer Guide cleanup.

11. **Verification improvement** (Issue #11): Add a verification step: trace through each scope type in the final SKILL.md to confirm no regressions.

12. **Step 0/Step 2 boundary** (Issue #12): Clarify that Step 2 detects initiative scope, Step 0 only sets variables.

13. **Recency marker compat** (Issue #13): Add a note or task: when overwriting system-profile recency markers, match on both `complete-slice` and `complete` patterns.

14. **Step 6e description** (Issue #14): Change "after debt evaluation" to "after signal tracking" in the 6e description.

15. **$SLICES_DIR** (Issue #15): Add to Phase 2's Step 0 extension: set `$SLICES_DIR = $INITIATIVE_DIR/vertical-slices/` for initiative scope, or note it's derived.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **Phase 3 initiative-conventions.md tasks**: All three reviewers agree the research shows these are no-ops. Resolution: remove the tasks. No contradiction.

2. **Historical references (learnings.md, system-profile.md)**: All three reviewers agree these should be left as-is with documented rationale. No contradiction — the plan simply omitted the decision.

3. **Step 6e ordering ("after debt evaluation" vs "6e")**: Software Architecture identified the internal contradiction in the plan itself. Resolution: the 6e numbering is correct (after 6d/signal tracking); the description text is wrong.

## Unresolved (USER_INPUT required)

None. All issues have clear resolutions agreed across reviewers.
