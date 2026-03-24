## Issues

**[CRITICAL]** start-epic skill cannot use `epic:activate` -- fundamental lifecycle mismatch

The plan maps the current `start-epic` skill to `goodplan epic:activate`. However, the transition table shows `ACTIVATE_EPIC` requires `slices-refined` status (the very end of the epic pipeline), while the current `start-epic` skill operates at the architecture-proposal stage (reviewing proposals, writing `approved.md`, renaming to `__active__`). These are completely different points in the lifecycle.

The current `start-epic` skill handles:
1. Proposal review (architecture-proposal/ exists, no approved.md)
2. Writing approved.md
3. Creating the epic's architecture/ directory (merging proposal with top-level)
4. Renaming `<name>` -> `__active__<name>`

The CLI's `epic:activate` fires `ACTIVATE_EPIC` which transitions from `slices-refined -> activated` and sets `project.json.activeEpic`. This is a late-lifecycle operation that happens after slicing and slice refinement are complete.

The plan's Phase 1 task for start-epic says "Replace state.md/activity-log.jsonl writes -- CLI handles via `epic:activate`" and the verification trace says "start-epic: status -> show -> activate -> verify". This is wrong. The skill's core workflow (proposal review, approval gate, directory merge, rename) has no single CLI command equivalent.

Options to resolve:
- The start-epic skill may need to be fundamentally redesigned to align with the CLI lifecycle (where "activate" means something different)
- Or the start-epic skill's current workflow maps to a sequence of CLI phase transitions that don't exist yet
- Or start-epic is out of scope for this slice and needs its own investigation

Resolution: USER_INPUT

---

**[CRITICAL]** Phase 3 "Before" checks miss `state\.md` in refine-architecture SKILL.md -- false confidence

Phase 3's "Before implementation" checks only grep for `activity-log\.jsonl`, not for `state\.md`. The current `refine-architecture/SKILL.md` references `state-and-activity-formats.md` (line 212, 320) which contains both state.md and activity-log.jsonl patterns. The "Before" check appears designed to demonstrate current state, but by only checking `activity-log.jsonl`, it creates false confidence that state.md patterns don't exist. More importantly, the SKILL.md itself doesn't directly reference `state.md` (it references the format doc which references it), so the "Before" check for `state.md` would also return zero hits -- which means the "Before" and "After" would be identical for `state.md`, providing no signal.

The real pattern to check is `state-and-activity-formats` references, which the phase verification (step 1) does correctly. The Expected Behavior section should be consistent with this.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** start-epic skill does far more than "a single mutation" -- complexity underestimated

Phase 1 description says "start-epic uses a single mutation (epic:activate)" and groups it with "simple migrations." The current start-epic skill is 334 lines with 7 major steps: epic resolution, active epic check, re-entry detection, context loading, state validation, proposal review (interactive with file-by-file review option), architecture directory creation (merging proposals with top-level), directory rename, and state updates. This is one of the most complex skills in the batch, not one of the simplest. Grouping it in Phase 1 as "simple" will lead to schedule surprises.

Even setting aside the CRITICAL epic:activate mapping issue, the non-state aspects (proposal review, architecture merge, directory rename) need careful thought about how they map to CLI commands.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan does not address `create-architecture/references/guidance.md` state.md patterns

The plan's Phase 2 task says "Update reference files for both skills if they contain eliminated patterns." However, `create-architecture/references/guidance.md` contains 6 references to `state.md` and `activity-log.jsonl` (lines 56-63 describing graceful stop behavior). The plan should explicitly list this file and describe how graceful stop state updates will change (from direct state.md writes to CLI-based or artifact-only stops per slice 03 patterns).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan does not address `explore/references/explore-logic.md` state format reference

`explore/references/explore-logic.md` line 3 references `state-and-activity-formats.md`. This is a reference file that the plan's Phase 2 "Update reference files" task should explicitly call out, not leave to discovery during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 `decision:create` claim for explore skill needs verification

Phase 2 task for explore says "Replace `mkdir -p .project/decisions/` with `decision:create --json` (established in slice 03)." The current `explore/SKILL.md` loads decisions format and may create decisions during exploration. But `decision:create` takes structured JSON input. The plan should verify that the explore skill's decision-recording flow (which may be interactive/free-form) can map cleanly to the `decision:create` stdin JSON format. If the current skill writes decision markdown directly, this is a non-trivial transformation.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** Phase 4 smoke test sequence has a gap -- no verification criteria added before activate

The end-to-end smoke test (Phase 4, steps 1-9) jumps from `submit-refine-architecture` to `epic:activate` without adding verification criteria. The transition table shows `ACTIVATE_EPIC` has a guard: `epic.verifications.length > 0`. The smoke test will fail at step 9 without an intermediate `goodplan epic:add-verification --epic smoke` step. Missing steps: `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, and `epic:add-verification`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior "Before" check for audit-architecture misses reference files

The "Before" check greps `skills/audit-architecture/SKILL.md skills/audit-architecture/references/` for `state\.md|activity-log\.jsonl`. However, the references files (`sub-agent-prompts.md`, `guidance.md`) contain zero matches for these patterns (confirmed via grep). The `SKILL.md` itself has the hits. The check will work but the pattern including `references/` is misleading about where hits come from.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No documentation update tasks mentioned

The plan has no explicit tasks for updating CLAUDE.md or any project documentation to reflect the migration. Phase 4 mentions "Update convention doc if any gaps discovered" but this is reactive. If the 5 skills change their interaction patterns fundamentally, the project's `CLAUDE.md` "Project Context" section may need updating to reflect that these skills now use CLI commands.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 audit-architecture `state --json --query` may not match current activity-log reading

Phase 1 task for audit-architecture says "Replace `activity-log.jsonl` reads with `goodplan state --json --query '.["activity-log.jsonl"] | .[-20:]'`". The current skill reads "the last 20 lines of `.project/activity-log.jsonl`". The jq query `.["activity-log.jsonl"] | .[-20:]` assumes the state tree keys include `activity-log.jsonl` at the top level. This should be verified against the actual `assembleState()` output shape. If the key is nested differently, the query will silently return null.

Resolution: CODEBASE_EXPLORATION

## Score: 4/10

Two critical issues severely undermine the plan's viability. The start-epic/epic:activate mapping is fundamentally wrong -- the skill and CLI command operate at completely different points in the epic lifecycle. This alone invalidates Phase 1's start-epic migration and the Phase 4 smoke test. The complexity underestimate compounds this: start-epic is grouped as "simple" when it's one of the most complex skills. Several reference files with state patterns are not explicitly called out. To reach 9+: resolve the start-epic lifecycle mapping (may require descoping start-epic or identifying the correct CLI command sequence), fix the smoke test to include missing lifecycle steps, explicitly enumerate all reference files needing updates, and align Phase 3 before/after checks.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
