## Issues

**[CRITICAL]** `/refine-slices` duplicates shared infrastructure instead of reusing it

The plan creates a new `shared-preamble.md` for refine-slices (Phase 2, task 5) that "follows the same structure as refine-plan's preamble." The existing `~/.claude/skills/refine-plan/references/shared-preamble.md` is already a shared, parameterized template — it lives in refine-plan but is designed to be reusable (it uses `{placeholders}` throughout). Creating a second copy in refine-slices introduces two files that must stay in sync. The same shared preamble is already used by refine-architecture (which references `~/.claude/skills/refine-plan/references/shared-preamble.md`). refine-slices should reference the same file.

Similarly, the `sub-agent-prompts.md` task says to "reference/adapt refine-plan's templates." If these are adapted copies rather than the same file with different placeholder values, this creates a second template that drifts over time. The reviewer bootstrap prompt in refine-plan's `sub-agent-prompts.md` is already fully parameterized — it works for any review context. Only the editor prompt needs customization.

**Recommendation**: Delete the shared-preamble.md task. Reference `~/.claude/skills/refine-plan/references/shared-preamble.md` directly. For sub-agent-prompts.md, reuse the reviewer bootstrap and synthesis templates from refine-plan and only write a custom editor section specific to slice goals.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `system-profile.md` ownership is split across three skills with no clear authority

The plan has three skills writing to `.project/system-profile.md`: `/complete-slice` (Phase 3, Step 6b — creates or updates), `/audit-architecture` (Phase 4, Step 5b — creates or updates), and implicitly the format is defined in the goal.md convention. There is no designated owner of the file's schema or canonical sections. When two skills both "create if missing" with potentially different initial content structures, the result depends on which runs first. When both "update sections," there is no merge protocol for conflicting updates to the same section (e.g., both updating Health after different analyses).

**Recommendation**: Designate `/complete-slice` as the primary owner (it writes after every slice — highest frequency). Define the canonical section structure in a shared reference file (e.g., `_shared/references/system-profile-format.md`). Both skills reference that format. `/audit-architecture` updates specific sections but defers to the canonical format. Add a brief conflict note: "If a section was recently updated by another skill, append rather than overwrite."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Signal tracking in Step 6d couples `/complete-slice` to internal implementation details of other skills' flow-log entries

Step 6d reads flow-log entries from `refine-plan` and `implement-plan` to extract iteration counts and deviation metrics. But flow-log.jsonl entries are freeform JSON with a `summary` field — there is no structured schema guaranteeing these fields exist. The plan says to "read `refine-plan` flow-log entries for iteration counts" and "read `implement-plan` flow-log entries" but doesn't specify what fields to look for or what to do when the entries don't contain structured metrics.

Currently, flow-log entries look like: `{"ts":"...","phase":"refine-plan","scope":"...","status":"complete","summary":"one-sentence summary"}`. The summary is prose, not structured data. Extracting "iteration counts" from prose summaries is fragile and unreliable.

**Recommendation**: Either (a) define a structured `metrics` field in flow-log entries that refine-plan and implement-plan write (e.g., `"metrics":{"iterations":3,"issues_found":5}`), requiring updates to those skills' state write-back steps, or (b) have signal tracking read the run directory structure directly (count `round-N/` directories in `refinement/` for iteration count, count issues in last `merged.md` for deviation metric). Option (b) is more robust because it reads actual artifacts rather than depending on summary prose.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 creates a new skill with 5 new files but doesn't address the dependency on `iteration-loop.md` parameters that don't fit slice review

The iteration loop reference defines parameters like "Working directory" (where edits happen), "Backup directory," and "Scope constraints." The plan fills in "Working directory: Working copies — sequencing-refining.md and goal-refining.md per slice" but the iteration loop is designed for a single file or directory being refined. refine-slices edits *multiple independent files* (one sequencing.md + N goal.md files). The editor sub-agent prompt needs to know how to coordinate edits across these files — the existing editor pattern in refine-plan operates on a single plan file/directory.

The plan doesn't address: How does the editor know which goal.md file a reviewer issue refers to? Reviewer prompts evaluate "slice goal definitions and sequencing" holistically, but edits need to target specific files. The existing editor pattern receives one merged feedback file and one plan path. Here it needs one merged feedback file and N+1 file paths.

**Recommendation**: Add a task to Phase 2 that explicitly defines the editor's multi-file coordination strategy. Options: (a) the editor receives a manifest of all working copy paths and the merged feedback references files by name, or (b) reviewers tag issues with the specific file they apply to (add this to reviewer prompt instructions). Either way, the editor prompt in `sub-agent-prompts.md` must handle multi-file editing.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 three-lens evaluation adds an unbounded internal iteration loop without exit criteria

Step 4b says the agent "iterates internally: if any lens is weak, try alternative orderings (reorder, merge, split) until either all lenses pass or reasonable alternatives are exhausted." This is an unstructured loop with no defined iteration limit, no scoring rubric for what "pass" means per lens, and the exit condition "reasonable alternatives are exhausted" is subjective.

Without concrete pass/fail criteria per lens, different agent runs will produce wildly different numbers of internal iterations. Some may loop extensively trying to satisfy all three lenses simultaneously (which may be impossible for certain projects where risk and observability front-loading conflict).

**Recommendation**: Define concrete pass/fail criteria for each lens (e.g., "Tracer bullet: every slice has at least one verification step that runs actual code" / "Risk: the first 50% of slices cover all items tagged as high-risk in architecture" / "Observability: at least one of the first 2 slices includes logging or debug infrastructure"). Cap internal iterations at 3. If all three lenses can't be satisfied simultaneously, present the trade-off to the user rather than continuing to iterate.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Refine-slices reviewer count inconsistency between goal.md and plan

The goal.md says "2-3 reviewers" for refine-slices. The plan says 4 reviewers (Software Architecture always-on + 3 slice-specific). The key decisions section says "4 reviewers for refine-slices: Software Architecture (always-on) + 3 slice-specific." This inconsistency should be resolved — the plan's 4-reviewer design is more specific and should be treated as authoritative, but the mismatch suggests the goal wasn't updated after the planning conversation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 references a specific line number for a TODO comment

The task "Remove the TODO comment on line 147 of audit-architecture SKILL.md" is fragile — line numbers change when files are edited. The TODO comment currently exists at line 147 but could move if earlier phases or other side quests modify the file first.

**Recommendation**: Reference the TODO by its content marker (`<!-- TODO: When system-profile.md is implemented...`) rather than line number.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No verification that `/refine-slices` integrates with the workflow state machine

The plan creates the skill and its files but doesn't address how it fits into the workflow state machine (workflow.md's "File Existence as State Machine"). After refine-slices runs, what state files change? What does state.md say? The plan's SKILL.md task mentions "State write-back + flow-log" in the skill flow but doesn't define the state.md values or flow-log entry format.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a solid conceptual design — tracer bullet framing, three-lens evaluation, system health tracking, and signal detection are all well-motivated. However, several architectural issues undermine the execution: infrastructure duplication instead of reuse (shared-preamble, sub-agent-prompts), unclear ownership of system-profile.md, fragile coupling to flow-log prose for signal tracking, and an under-specified multi-file editing pattern for refine-slices. These would cause real problems during implementation. Addressing the CRITICAL and IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
