# Merged Feedback — Round 2

Reviewers: Holistic (9/10), Software Architecture (8/10), Agent Skill (9/10)

---

## IMPORTANT

### 1. Phase 3: complete-slice reconciliation instruction is vague — risk of two competing decision mechanisms

Sources: Software Architecture (IMPORTANT), Holistic (MINOR)

The complete-slice `guidance.md` has its own "Decision File Format" section that differs from the new canonical `decisions-format.md` (missing Domain, uses "Context/Source" instead of separate "Context", no Consequences). The plan says "reconcile" but doesn't specify what that means concretely.

**Resolution:** DIRECTLY_ACTIONABLE — Replace the Phase 3 complete-slice task with: "Replace the 'Decision File Format' section in `complete-slice/references/guidance.md` with a reference to `~/.claude/skills/_shared/references/decisions-format.md`. Map the existing `Source:` metadata to the `Context:` field. Remove inline format duplication. Keep only the `Source: complete-slice for <scope>` convention as a skill-specific note."

### 2. Phase 3: verify all skill reference files include decisions in context loading lists

Source: Software Architecture (IMPORTANT)

The plan adds `.project/decisions/` to SKILL.md context steps for 9 reader skills and explicitly updates `create-plan/references/guidance.md`, but doesn't verify other skills' reference files that may have their own context loading lists.

**Resolution:** DIRECTLY_ACTIONABLE — Add a Phase 3 verification step: "Grep all skill reference files for context loading lists and confirm `.project/decisions/` is present wherever architecture files are referenced."

---

## MINOR

### 3. Phase 0: README for `_shared/references/` is mentioned but has no task, content, or verification

Sources: Holistic (MINOR), Agent Skill (MINOR)

Phase 0 says the directory "should include a brief README" but there's no task to create it, no content guidance, and no verification step.

**Resolution:** DIRECTLY_ACTIONABLE — Either add a task with content spec (purpose, path convention, how to add new shared references) and verification, or drop the mention.

### 4. Phase 4: calibration depth note duplicated across 6 skills instead of referencing expertise-tracking.md

Sources: Software Architecture (MINOR), Agent Skill (MINOR)

Phase 4 inlines the same calibration depth note in 6 SKILL.md files. The `expertise-tracking.md` reference already contains this guidance. This creates a second source of truth and is inconsistent with the consolidation philosophy established in Phase 0.

**Resolution:** DIRECTLY_ACTIONABLE — Have each SKILL.md note say "Follow calibration depth guidance in `expertise-tracking.md`" rather than repeating the substance. Or accept the duplication for a one-line note and document why.

### 5. Phase 4: expertise-tracking.md extension policy appears after the verification section

Source: Holistic (MINOR)

In `02-expertise-convention.md`, the "Extension policy" paragraph comes after the "Verification" section. This content should be part of the tasks section (inside the file content specification).

**Resolution:** DIRECTLY_ACTIONABLE — Move the extension policy into the task list as part of the file content specification.

### 6. Phase 3: create-plan guidance.md vs SKILL.md overlap is unclear

Source: Agent Skill (MINOR)

Phase 3 has separate tasks for updating `create-plan/SKILL.md` and `create-plan/references/guidance.md` for decisions loading. The guidance file is the canonical context loading list for create-plan; the SKILL.md delegates to it. An implementer might add decisions loading in both places. The SKILL.md task should clarify its update is only the `decisions-format.md` Read instruction.

**Resolution:** DIRECTLY_ACTIONABLE — Clarify the create-plan SKILL.md task scope: the decisions context loading change goes in the guidance file; the SKILL.md update is for the `decisions-format.md` Read instruction only.

### 7. Phase 5: no placement guidance for `decisions/` in workflow.md file structure tree

Source: Software Architecture (MINOR)

The plan says to add `.project/decisions/` to the file structure tree but doesn't specify where. Decisions relate closely to architecture.

**Resolution:** DIRECTLY_ACTIONABLE — Add: "Insert `.project/decisions/` after `architecture/` in the file structure tree."

### 8. Phase 5: no verification that downstream quest dependency expectations are met

Source: Software Architecture (MINOR)

The plan claims downstream quests' dependencies are satisfied but has no verification step confirming this. Architecture-quality expects decisions loading in define-architecture + expertise calibration; slice-quality-and-health expects decision writing from complete-slice.

**Resolution:** DIRECTLY_ACTIONABLE — Add a final verification: "Confirm downstream quest dependencies are satisfied: architecture-quality expects decisions loading in define-architecture and expertise calibration; slice-quality-and-health expects decision writing from complete-slice. Verify covered by Phases 3-4."

---

## Contradictions Resolved

None. All reviewers were aligned. Where multiple reviewers flagged the same issue, the domain specialist (Software Architecture) provided the most specific resolution, which was adopted. The Agent Skill reviewer noted the calibration duplication is defensible for a one-line note — this perspective is preserved as an alternative in issue #4.

---

## Summary

- Critical: 0
- Important: 2
- Minor: 6 (deduplicated from 9 raw across reviewers)
- All items: DIRECTLY_ACTIONABLE
- USER_INPUT items: 0
- RESEARCH_NEEDED items: 0
