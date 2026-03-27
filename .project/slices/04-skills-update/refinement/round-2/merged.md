# Merged Review Feedback: 04-skills-update — Round 2

## Scores
- holistic: 9/10
- agent-skill: 8/10

## Issues

### IMPORTANT

**[IMP-1] `complete/SKILL.md` line 154 has an actively misleading "NOT" comment that the plan should explicitly call out**
Source: holistic

Line 154 says `Slices: .project/slices/<name>/ (NOT .project/epics/<epic>/slices/<name>/)` — this explicitly tells implementers to use the wrong path, contradicting the migration target. The plan's `complete/SKILL.md` task mentions "scope dir derivation" which implicitly covers this area, but an implementer doing mechanical replacements could see this comment and skip it. Add an explicit note (like existing ones for lines 109, 135, 185, 189, 233) — e.g., "Line 154: remove or invert the 'NOT .project/epics/<epic>/slices/<name>/' comment — it contradicts the target architecture."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMP-2] `complete/references/guidance.md` line 53 "update rollup" is an implicit `.project/learnings.md` write instruction not covered by plan**
Source: agent-skill

Line 53 says "append to `completion/learnings.md` + update rollup." The phrase "update rollup" is an implicit instruction to write to `.project/learnings.md`. The plan's learnings removal task targets lines 15, 34, and 38 but not line 53. After removing the explicit write instructions, this implicit reference would remain as the last path to `.project/learnings.md` writes — undermining the goal of making learnings rollup handled solely via CLI payload.

Fix: Add line 53 to the `complete/references/guidance.md` learnings removal task. Change to just "append to `completion/learnings.md`".

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR

**[MIN-1] After-check for flat path references is qualitative rather than quantitative**
Source: holistic

The after-check for `.project/slices/` references is descriptive but not falsifiable. The intentional fallback references are enumerable (~10-12 across create-slices, refine-slices, project-status, explore). Providing an expected count range would make verification faster. Mitigated by the semantic coherence check in the Verification section.

Resolution: DIRECTLY_ACTIONABLE

---

**[MIN-2] `create-slices/references/guidance.md` sequencing.md references need conceptual update, not just path update**
Source: holistic

Lines 28-37 instruct the skill to add `sequencing.md` to CLAUDE.md's Project Context, but `sequencing.md` no longer exists — sequencing is now embedded in `epics/overview.json` slice array ordering. The plan says "update stale path references" which could be interpreted as just changing the path prefix, but the whole concept needs updating. A clarifying note would prevent wasted investigation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MIN-3] `complete/references/guidance.md` line 124 references `slices/slices-refining/` without the dual-path treatment**
Source: agent-skill

Line 124 mirrors the `complete/SKILL.md` line 277 reference that the plan now correctly addresses with dual-path treatment. However, the `guidance.md` counterpart is not mentioned. Both files should be updated consistently with the same dual-path approach.

Resolution: DIRECTLY_ACTIONABLE

---

**[MIN-4] Verification "Expected Behavior" before-count of 36 may drift before implementation**
Source: agent-skill

The exact count of 36 is currently accurate but files are actively changing. Change the "before" check from an exact count to a floor ("36 or more") or add a note to re-establish the baseline during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

## Deduplication Notes
No duplicates found across reviewers — all six issues target distinct locations/concerns.

## Contradiction Notes
No contradictions found. Reviewers are aligned on plan quality and remaining gaps.
