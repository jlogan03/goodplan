## Issues

**[IMPORTANT]** Phase 3 complete-slice reconciliation instruction is vague — risk of two competing decision mechanisms

Phase 3 says: "Update `complete-slice/SKILL.md` — update the existing decision file writing in `complete-slice/references/guidance.md` to use the format from `decisions-format.md` (don't add a second mechanism — reconcile with the existing one)." The existing `guidance.md` already has a "Decision File Format" section with its own format spec (Filename, Sections: Decision, Rationale, Date, Status, Context/Source). The plan's `decisions-format.md` (Phase 1) defines a similar but not identical format — it adds Domain, Consequences, decision threshold, loading protocol, and extension policy. The reconciliation instruction doesn't specify *what* reconciliation means: replace the guidance.md section with a reference to `decisions-format.md`? Merge the two formats? Keep both? The implementing agent needs a concrete directive. The most architecturally clean approach: replace complete-slice's inline Decision File Format section in `guidance.md` with a single reference to `decisions-format.md`, since the whole point of Phase 1 was to define the canonical format once. The existing `Source: complete-slice for <scope>` metadata maps to the new format's `Context` field.

Change the Phase 3 task for complete-slice to: "Replace the 'Decision File Format' section in `complete-slice/references/guidance.md` with a reference to `~/.claude/skills/_shared/references/decisions-format.md`. Map the existing `Source:` metadata to the `Context:` field in the new format. Remove any inline format duplication."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 doesn't update `create-plan/references/guidance.md` Context Loading list to include decisions

Phase 3 has a separate task "Update `create-plan/references/guidance.md` — add `.project/decisions/` to the Context Loading list." This is good, but the current `guidance.md` Context Loading section reads: "Read (skip missing): `.project/idea.md`, `conventions.md`, `architecture/` (...), `learnings.md`, `vertical-slices/sequencing.md`, other slice `goal.md` files, `.project/research/` + scope's `research/`, scope's `brainstorm/`." The plan adds decisions to the SKILL.md context step for all 9 reader skills, but only explicitly calls out updating the guidance.md Context Loading list for create-plan. The complete-slice `guidance.md` already has `decisions/` in its artifact loading section (line 14: "Project-level: `.project/architecture/`, `decisions/`, `learnings.md`...") — so complete-slice is already covered. But for any other skill that has a separate guidance/reference file describing context loading, the same update is needed. Verify no other skill has a guidance file with a context loading list that would need updating.

Add a verification step to Phase 3: "Grep all skill reference files for context loading lists and confirm `.project/decisions/` is present where architecture files are referenced."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 calibration depth note is duplicated across 6 skills without consolidation

Phase 4 adds a calibration depth note to 6 skills: "Calibrate explanation depth to user expertise..." This is the same kind of duplication that Phase 0 was created to eliminate. The expertise-tracking.md reference file (Phase 2) already includes "Calibration depth" guidance. Each skill could simply reference that section rather than inlining the note. This is minor because the note is short and unlikely to drift, but it's architecturally inconsistent with the consolidation-first philosophy the plan itself establishes.

Consider referencing the calibration depth section in `expertise-tracking.md` rather than inlining the note in each SKILL.md — or accept the duplication as intentional for a one-line note and document why.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 doesn't specify where in workflow.md's file structure tree `decisions/` should appear

Phase 5 says "Add `.project/decisions/` to the file structure tree with a brief description of its purpose." The current file structure tree has a specific ordering: state.md, flow-log.jsonl, flow-log/, idea.md, learnings.md, conventions.md, research/, prototypes/, architecture/, explore markers, side-quests/, retrospectives/, brainstorm/, vertical-slices/. Decisions are closely related to architecture (they capture the reasoning behind architectural and other durable choices). The plan should specify placement — after `architecture/` is the natural spot, maintaining the pattern of "structural files first, then per-scope directories."

Add placement guidance: "Insert `.project/decisions/` after `architecture/` in the file structure tree."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No verification that downstream quests' dependency expectations are actually met

The overview states "Cross-cutting guidance (referenced by downstream quests as a dependency) is satisfied by decisions loading (Phase 3) + expertise calibration (Phase 4)." The architecture-quality goal.md says "Dependencies: decisions-and-expertise side quest must be complete (decisions/ convention, expertise tracking, cross-cutting guidance)." The slice-quality-and-health goal.md says the same. But neither the plan's Phase 5 nor any verification step confirms that the downstream quests' specific expectations are met. For example, architecture-quality expects "Load context + decisions" in define-architecture (Phase 3 covers this), and slice-quality-and-health expects decision writing from complete-slice (Phase 3 covers this). A final verification step confirming each downstream dependency point is satisfied would prevent gaps.

Add a final verification to Phase 5 (or as a plan-level verification): "Confirm downstream quest dependencies are satisfied: architecture-quality expects decisions loading in define-architecture and expertise calibration. slice-quality-and-health expects decision writing from complete-slice. Verify these are covered by Phases 3-4."

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues were well-resolved: the loading protocol abstraction, extension policies, codebase-context-discovery consolidation, and refine-plan/implement-plan as decision readers all address the major architectural concerns. The remaining issues are lower severity. The complete-slice reconciliation (first IMPORTANT) is the most significant — it risks the implementing agent creating a muddled hybrid of two format specs rather than cleanly consolidating. The create-plan guidance.md verification gap (second IMPORTANT) is a concrete miss. The remaining MINOR items are about consistency and completeness rather than structural problems. Addressing the two IMPORTANT items and at least the calibration depth consolidation MINOR would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
