# Software Architecture Review — Round 4

## Issues

**[MINOR]** `/refine-architecture` run and backup directories not moved when operating on initiative architecture

Phase 5 correctly updates `/refine-architecture` to detect the active initiative and operate on `initiatives/__active__<name>/architecture/` instead of `.project/architecture/`. However, the refine-architecture skill also creates a run directory (`.project/architecture-refining/`) and backup directory (`.project/architecture-backup-<timestamp>/`) hardcoded to the project root. When operating on initiative architecture, these should be:
- Run directory: `initiatives/__active__<name>/architecture-refining/`
- Backup directory: `initiatives/__active__<name>/architecture-backup-<timestamp>/`

The current SKILL.md for `/refine-architecture` hardcodes both paths. Phase 5's task for this skill says "operate on `initiatives/__active__<name>/architecture/`" but doesn't mention updating the run or backup directories. Without this, the refinement artifacts for an initiative's architecture land in the project root alongside unrelated artifacts from top-level runs, and the resume detection logic (which looks for `architecture-backup-*` directories) could pick up the wrong backup. This is a MINOR issue because the plan's direction is correct — it's a gap in task completeness rather than a structural error — but an implementer following the plan as written will miss these two paths.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 precedence clarification fix is present but the edge case for state.md fallback scope isn't fully specified

The round-3 MINOR issue raised that when an active initiative exists AND state.md's Active Slice points somewhere, precedence was unclear. Phase 4 now lists the 5-step scope resolution explicitly: file-existence steps (2, 3) before state.md step (4), with step 4 only as a fallback "when no active initiative found in steps 2-3." This is an improvement. However, the fallback still has an underspecified edge: what if no active initiative exists in the file system, but state.md's Active Slice value is `initiatives/__active__initial`? This could occur during a transition (the directory was renamed or deleted but state.md wasn't updated). The existing `status-logic.md` convention is "file-existence overrides state.md" (line 16). Phase 4 inherits this but doesn't explicitly say what happens when the state.md Active Slice value references an initiative path that no longer exists. The plan should add a sentence to the status-logic update task: "If state.md's Active Slice references an initiative path that no longer exists in the file system, treat it as stale and fall through to project level."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Both round-3 IMPORTANT issues are correctly resolved. The state.md Active Slice gap is closed — Phase 2 now explicitly sets Active Slice to `initiatives/__active__initial` so `/define-architecture` has the context it needs to derive the correct output path. The `/refine-architecture` and `/audit-architecture` scope expansion is now in Phase 5 with explicit tasks for both skills. The remaining issues are implementer-guidance gaps (not structural errors): the refine-architecture run/backup directory paths need to follow the architecture path when it moves, and the state.md stale Active Slice edge case deserves a single clarifying sentence. Neither will cause incorrect behavior if the implementer uses good judgment, but both are directly fixable.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
