# Merged Feedback: 04-skills-update (Round 1)

## Scores
- holistic: 8/10
- software-architecture: 8/10
- agent-skill: 5/10

## Contradictions Resolved

1. **`state-and-activity-formats.md` resolution tag** -- holistic says DIRECTLY_ACTIONABLE (remove the task), software-architecture says CODEBASE_EXPLORATION (re-read to confirm). Agent-skill agrees it's already correct. Trusting the convergence of all three: the file is already correct. Resolved as DIRECTLY_ACTIONABLE -- remove from task list.

2. **Completion glob replacement vs expansion** -- software-architecture says replace with epic glob pattern; agent-skill says expand to include both flat and epic globs. Trusting agent-skill (domain specialist): pre-epic completed slices may still exist at flat paths. Resolved: expand globs to cover both.

## Merged Issues

### IMPORTANT (7 unique issues)

**I1. `state-and-activity-formats.md` task is a no-op -- remove from task list**
*Sources: holistic, software-architecture, agent-skill*
The file already documents both flat (`slices/<name>`) and nested (`epics/<name>/slices/<name>`) scope formats correctly. The plan task "update scope format examples" has nothing to change. Remove it from the task list. Update the file count from 12 to 11.
Resolution: DIRECTLY_ACTIONABLE

**I2. Learnings.md removal scope incomplete -- misses Step 4 artifact loading references**
*Sources: holistic, software-architecture*
The plan's learnings removal task only covers Step 5 direct-write instructions. It also needs to remove Step 4 artifact loading lines in `complete/SKILL.md` (lines 109, 135) where `.project/learnings.md` is loaded for deduplication. The research file (Gotcha #4) already flags this. Additionally, inline the full set of line references (109, 135, 185, 189, 233 in SKILL.md; 15, 34, 38 in guidance.md) into the task description so implementors don't need to re-discover them.
Resolution: DIRECTLY_ACTIONABLE

**I3. `complete/references/guidance.md` line 15 has stale `sequencing.md` flat path**
*Source: holistic*
Line 15 references `slices/sequencing.md` which was eliminated by the consolidated overview (sequencing is now embedded in `epics/overview.json` slice array ordering). The plan's path-updates task for `guidance.md` should explicitly call out updating or removing this reference.
Resolution: DIRECTLY_ACTIONABLE

**I4. Completion glob patterns need dual-path support, not simple replacement**
*Sources: software-architecture, agent-skill*
`complete/SKILL.md` lines 266-267 and `complete/references/guidance.md` line 111 scan `.project/slices/*/completion/learnings.md`. The plan should specify expanding the glob to cover both flat and epic-nested paths: `.project/slices/*/completion/learnings.md` AND `.project/epics/*/slices/*/completion/learnings.md`. Simply replacing the flat glob with an epic glob would break discovery of pre-epic completed slices.
Resolution: DIRECTLY_ACTIONABLE

**I5. Plan does not distinguish intentional fallback references from stale references**
*Source: agent-skill*
Several files contain flat `.project/slices/` references that are intentional no-active-epic fallbacks (e.g., `create-slices/SKILL.md` lines 50, 52; `refine-slices/SKILL.md` lines 33, 37; `project-status/SKILL.md` line 256). The plan says to update all `.project/slices/` references without distinguishing these. An implementor following literally would break the fallback paths. For each file with both stale and intentional references, add explicit guidance: "Update lines X, Y (stale) but preserve lines A, B (intentional fallbacks)."
Resolution: DIRECTLY_ACTIONABLE

**I6. `explore/SKILL.md` needs conditional epic-awareness, not simple path replacement**
*Source: agent-skill*
Line 69 (`use .project/slices/<activeSlice.name>/ as scope`) needs a conditional: if `.activeEpic` exists, use `.project/epics/<epicName>/slices/<activeSlice.name>/`; otherwise use `.project/slices/<activeSlice.name>/`. The explore skill lacks `$SLICES_DIR` or `$EPIC_DIR` variables that other skills use. Same pattern applies to lines 52 and 87. The plan should describe the conditional insertion, not a find-and-replace.
Resolution: DIRECTLY_ACTIONABLE

**I7. `explore/references/explore-logic.md` Slice row needs epic-slice row addition, not replacement**
*Source: agent-skill*
The Scope Path Mapping table has a Slice row with `.project/slices/<name>/...` paths. Top-level slices still use this path. The fix is to rename to "Top-Level Slice" and add a new "Epic Slice" row with `epics/<epic>/slices/<name>/...` paths, not to replace the existing row.
Resolution: DIRECTLY_ACTIONABLE

### RESEARCH / EXPLORATION NEEDED (1 issue)

**R1. `complete/SKILL.md` line 277 references `.project/slices/slices-refining/` -- not captured in plan**
*Source: agent-skill*
Line 277 references a specific scope name (`slices-refining`) under `.project/slices/`. Determine whether this is an actual slice name (moves to epic path) or a conceptual reference (needs rewording). Add to the task list once resolved.
Resolution: CODEBASE_EXPLORATION

### MINOR (3 issues)

**M1. Verification needs semantic coherence check, not just grep counts**
*Source: agent-skill*
Add a verification task: read each updated SKILL.md's scope resolution section end-to-end and confirm: (1) epic-slice scope resolves correctly, (2) no-active-epic fallback still works, (3) no dangling references.
Resolution: DIRECTLY_ACTIONABLE

**M2. Pre-implementation grep pattern too narrow**
*Source: holistic*
The "Before" check `grep -c 'edit.*learnings\.md\|write.*learnings\.md'` returns 2 but misses loading references. Use `grep -c '\.project/learnings\.md'` (returns 5) for comprehensive before/after verification.
Resolution: DIRECTLY_ACTIONABLE

**M3. CLAUDE.md references `.project/slices/` paths that may be stale**
*Source: holistic*
CLAUDE.md's "Also check if relevant" section references `.project/epics/entity-restructuring/slices/sequencing.md`. May be out of scope for this slice but worth noting.
Resolution: DIRECTLY_ACTIONABLE

## Severity Summary
- Critical: 0
- Important: 7 (after dedup from 10 raw)
- Minor: 3 (after dedup from 6 raw)

## Resolution Summary
- DIRECTLY_ACTIONABLE: 9
- CODEBASE_EXPLORATION: 1
- RESEARCH_NEEDED: 0
- USER_INPUT: 0
