# Merged Feedback — Round 2 — Skill Workflow Bugs & Output Consistency

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1: Bug 1 consolidation task lacks target format for merged Verification section**
*Flagged by: Holistic, Software Architecture, Agent Skill (all three)*

The plan says "consolidate into a single `## Verification` section in `guidance.md`" but doesn't specify what the merged section looks like. In the current template, `## Success Criteria` uses a checklist format (`- [ ] <What to run> — <expected outcome>`) while `## Verification` uses narrative prose for live end-to-end testing. These serve different purposes. Without guidance, the implementer may lose the structured checklist format.

Additionally, the SKILL.md Step 6 sub-step 3 (line ~132) gives separate authoring guidance for each section ("Each success criterion must specify..." and "The Verification section must describe..."). The plan says "update to reference only Verification" but doesn't specify how to merge these two guidance paragraphs.

Fix: (a) Specify the consolidated `## Verification` section format — e.g., "include both checkable assertions (checklist format) and narrative live-testing instructions." (b) Specify how to merge the two SKILL.md guidance paragraphs into one that covers both formats.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-2: Bug 1 Expected Behavior before/after grep checks will produce false results**
*Flagged by: Holistic*

The before-check `grep -c "Success Criteria" guidance.md` returns a count of ALL matching lines (at least 3: lines 11, 15, 92). The after-check expects "0" — but even after consolidating the template sections (lines 92-100), "Success Criteria" still appears in the quality bar section (lines 11, 15) unless those are also changed. Either: (a) target the specific heading with `grep -n "^## Success Criteria$"` to match only the standalone heading, or (b) expand the task scope to include the quality bar section, or (c) adjust the expected after-count.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-3: Phase 3b lacks per-skill verification checklists and refine-slices Completion Summary has no design guidance**
*Flagged by: Agent Skill (both issues), Holistic (step number staleness)*

Phase 3b touches 6 skills with heterogeneous template needs. The verification says "grep for structured output points" but doesn't define what constitutes a structured output point per skill. Additionally, the refine-slices Completion Summary task says "Refinement-style" but this is ambiguous — refine-plan and refine-architecture have different completion summary formats. The plan should specify: (a) a per-skill checklist of output points that must have rigid templates after Phase 3b, (b) what sections the refine-slices Completion Summary should include (Score Progression? Issues Resolved? Slices Modified?).

Separately, Phase 3b references step numbers (Step 2, Step 4, Step 6) in create-slices that may be stale. Reference content descriptions instead of step numbers.

Resolution: DIRECTLY_ACTIONABLE (per-skill checklists, refine-slices template design) + CODEBASE_EXPLORATION (verify step numbers in create-slices SKILL.md Steps 2, 4, 6, 10)

---

### MINOR Issues

**MIN-1: Phase 2 task 3 — drop "(or equivalent index)" hedge**
*Flagged by: Holistic, Software Architecture, Agent Skill (all three)*

`skills/_shared/references/README.md` exists with a pipe-separated `| File | Purpose |` table. Remove the "(or equivalent index)" hedge and specify adding a row to the existing table.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-2: Phase 3a verification should check OLD inline template was removed**
*Flagged by: Holistic, Agent Skill*

Verification says "confirm Iteration Summary references shared template" but doesn't verify the ~30-line inline fenced code block (lines 251-278) was removed. The implementer could add a reference AND leave the old template. Add: "Confirm the inline Iteration Summary fenced code block is removed."

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-3: Phase 3b "All 8 skills" count needs enumeration/correction**
*Flagged by: Holistic, Software Architecture*

The Expected Behavior says "All 8 skills" but doesn't enumerate them. project-status is implied but has no task in Phase 3b (it already has rigid templates). Either enumerate all 8 and add a verification-only task for project-status, or change the count to 7 (skills actually touched) and list them.

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE

1. **IMP-1**: Add target format description for merged Verification section + SKILL.md guidance paragraph merge instructions
2. **IMP-2**: Fix grep pattern in Bug 1 Expected Behavior to target specific heading, not all occurrences
3. **IMP-3**: Add per-skill output point checklists to Phase 3b verification; specify refine-slices Completion Summary sections; use content descriptions instead of step numbers
4. **MIN-1**: Remove "(or equivalent index)" from Phase 2 task 3
5. **MIN-2**: Add "confirm inline template removed" to Phase 3a verification
6. **MIN-3**: Enumerate the 8 skills or correct the count to 7

### RESEARCH_NEEDED

1. **IMP-3 (partial)**: Read `skills/create-slices/SKILL.md` Steps 2, 4, 6, and 10 to confirm: (a) Is there a context load summary at Step 2? (b) Is there a slice list proposal at Step 4? (c) Is there a progress indicator at Step 6? (d) What does the Done Summary at Step 10 look like? Map actual prose output points to the plan's task descriptions.

### Contradictions Resolved

**Bug 1 duplication characterization**: Holistic said "the research confirms real goal.md files restate the same content" (implying true redundancy). Software Architecture and Agent Skill both noted the two sections serve structurally different purposes (checklist vs narrative). Trusting the domain specialists (SA + Agent Skill): the sections are NOT purely redundant — they use different formats for different purposes. The consolidation task must preserve both formats within the merged section.

### Available Research

**create-slices SKILL.md step verification** (codebase exploration):
- Step 2 "Load Context" (line 60) — context loading step
- Step 4 "Propose Slices" (line 90) — slice list proposal
- Step 6 "Define Each Slice" (line 124) — per-slice definition with progress
- Step 10 "Done Summary" (line 220) — done summary
- Step numbering matches the plan's references (Steps 2, 4, 6, 10 are correct)

### Unresolved (USER_INPUT required)

None. All issues are either directly actionable or resolvable via codebase exploration.
