# Merged Feedback: Consistent Skill Output (Round 2)

Reviewers: holistic (9/10), agent-skill (8/10)
Critical: 0 | Important: 1 | Minor: 3

---

## Issues

**[IMPORTANT] No negative verification for inline template removal** *(agent-skill)*

Expected Behavior checks confirm file existence and reference presence but do not verify that inline templates were actually removed. A skill could end up with both an inline template AND a reference to the shared one.

Add "After implementation" negative checks confirming inline markers are absent. Examples:
- Context Load: `grep -c '^\*\*Loaded\*\*:' skills/create-slices/SKILL.md` returns 0
- Completion Summary: `grep -c '### Score Progression' skills/refine-plan/SKILL.md` returns 0
- Done Summary: `grep -c '## Slices Defined' skills/create-slices/SKILL.md` returns 0

Optionally pair with "Before implementation" checks that confirm the same markers are present (establishing baseline).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Naming overlap between complete's "Completion Summary" and the shared "Completion Summary Template"** *(holistic)*

`complete/SKILL.md` has a `## Completion Summary` section that is structurally a Done Summary (scope, artifacts written, recommended next step), not a refinement-style Completion Summary (score progression, issues resolved). The plan correctly excludes `complete` from the Completion Summary Template consumer list, but the naming collision could confuse an implementer.

Add a brief clarifying note in task 2 (Completion Summary Template extraction) stating that `complete`'s identically-named section belongs to the Done Summary group, not this template group.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] explore and create-architecture Done Summary extraction strategy is vague** *(agent-skill)*

The plan acknowledges that `explore` and `create-architecture` are prose-oriented and "may need a slightly different variant or looser conformance," but does not specify the concrete strategy: will the shared skeleton be a loose checklist, or will a fenced template be added to these two skills? This affects how "replace inline template with reference" is interpreted for them.

Specify the extraction strategy explicitly: e.g., the shared Done Summary skeleton will be a loose checklist (fields to include) for prose-oriented skills, while other skills get a strict fenced template.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Verification task 8 uses prose instead of a runnable command** *(holistic)*

Task 8 says "Grep all SKILL.md files for references to output-templates.md and verify each referenced section heading exists in the file," but does not provide a runnable command. The Expected Behavior section already has excellent concrete `grep -c` checks that cover this. Either provide an explicit one-liner in task 8 or have it reference the Expected Behavior verification items rather than restating them in prose.

Resolution: DIRECTLY_ACTIONABLE

---

## Consensus Summary

Both reviewers agree round 1 issues were substantively addressed: `explore` and `create-architecture` are now in scope for Done Summary, the Completion Summary base skeleton is defined as an intersection with extension points, the README update task was added, and before-checks are correct. The one remaining gap is the lack of negative verification for inline template removal (IMPORTANT). The three MINOR items are polish-level and do not affect implementability.

## Scores
- holistic: 9/10
- agent-skill: 8/10
- Consensus: 8–9/10 (one IMPORTANT fix closes the gap to 9+)
