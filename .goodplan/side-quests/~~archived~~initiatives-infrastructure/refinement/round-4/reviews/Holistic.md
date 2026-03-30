# Holistic Review — Initiatives Infrastructure (Round 4)

## Round 3 Fix Verification

The Round 3 IMPORTANT issue has been addressed:

**`/refine-architecture` and `/audit-architecture` now appear in Phase 5.** Both skills have explicit tasks:
- `/refine-architecture`: detect active initiative, operate on `initiatives/__active__<name>/architecture/` instead of top-level, fall back to `.project/architecture/` when no active initiative.
- `/audit-architecture`: detect active initiative, glob `initiatives/__active__<name>/architecture/**/*.md` instead of `.project/architecture/`, fall back when no active initiative.

The verification step in Phase 5 correctly checks both skills.

The Round 3 MINOR issues are also resolved:
- Phase 1 consumer guide now lists `/refine-architecture` (reads/updates) and `/audit-architecture` (reads) — confirmed in the task bullet.
- Phase 8 manifest construction task is now explicit (separate bullet for glob pattern and working copy path updates).
- Phase 2 smoke test includes `initiatives/` directory presence (implicitly covered by `initiatives/__active__initial/goal.md` existing, which requires `initiatives/` to exist).

---

## Issues

**[MINOR]** `/refine-architecture` path resolution: "no active initiative" fallback may be ambiguous for projects mid-migration

Phase 5 says `/refine-architecture` should "fall back to `.project/architecture/` for side quests and project-level work (no active initiative)." But after this quest ships, a project that has just run `/create-initiative` (Mode A) will have initiative architecture at `initiatives/__active__initial/architecture/` and the top-level `.project/architecture/` will be a scaffold. If `/refine-architecture` is called while the active initiative's architecture is being developed, the skill correctly targets the initiative architecture. However, if someone calls `/refine-architecture` *before* `/define-architecture` has run for the initiative (so `initiatives/__active__initial/architecture/` is empty), the detection logic may fall back to the scaffold top-level, giving a misleading "architecture files found" result when no meaningful architecture exists. The scaffold `_overview.md` contains a `<!-- scaffold -->` marker and a note pointing to the initiative — the skill should detect this marker and either redirect the user to run `/define-architecture` first, or at minimum warn that top-level architecture is a scaffold. This is consistent with how Phase 7 stale detection skips scaffold files.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 verification does not test the "no active initiative" fallback

The Phase 5 verification checklist says "All four skills fall back to top-level `.project/architecture/` when no active initiative." This is a statement to confirm, not a concrete test. There is no smoke test for the fallback path (only for the initiative-scoped paths). A developer could implement the initiative path correctly while breaking the fallback — especially since this is a new conditional branch in currently working skills. Add a verification task: "Smoke test fallback: with no `initiatives/__active__*/` directory present, confirm `/refine-architecture` reads `.project/architecture/` and `/audit-architecture` globs `.project/architecture/**/*.md`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `/audit-architecture` flow-log scope value not updated

`/audit-architecture` Step 7 writes to `flow-log.jsonl` with `"scope":"project"` hardcoded. Phase 5 adds initiative path resolution to the glob in Step 1, but the flow-log entry in Step 7 would still say `"scope":"project"` even when operating on an initiative's architecture. The flow-log entry should say `"scope":"initiatives/<name>"` when the skill ran against initiative architecture. This is a small inconsistency but matters for traceability — `/project-status` (Phase 4) reads the flow-log to detect interrupted work. `state-and-flow-formats.md` needs the new `initiatives/<name>` scope value anyway (Phase 1 adds it). Phase 5 should include a task to update the flow-log write in Step 7 of `/audit-architecture` to use the detected initiative scope.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `/refine-architecture` flow-log scope value not updated

Same issue as above: `/refine-architecture` Step 4 writes `"scope":"project"` hardcoded. When operating on an initiative's architecture, this should be `"scope":"initiatives/<name>"`. Phase 5 should include a task to update this.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

The plan is well-structured and all critical issues from prior rounds have been resolved. The Round 3 IMPORTANT issue (missing `/refine-architecture` and `/audit-architecture`) is correctly fixed in Phase 5. The four remaining issues are all MINOR: two are about flow-log scope values being hardcoded to `"project"` in both updated skills (an easy add to Phase 5), one is about detecting the scaffold marker in `/refine-architecture` before falling back to top-level, and one is about adding a concrete smoke test for the fallback path. None of these would block implementation, but the flow-log issues create traceability inconsistencies visible to `/project-status`. To reach 10: add flow-log scope updates for both skills and the scaffold detection note to Phase 5 tasks.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
