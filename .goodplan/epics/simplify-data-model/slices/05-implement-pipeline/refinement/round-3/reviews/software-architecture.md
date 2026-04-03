# Software Architecture Review — Round 3

## Issues

**[IMPORTANT] `implementationPhase` data model change lacks update mechanism specification**
The plan (Phase 2, task 4) proposes adding `implementationPhase` to the slice schema and mentions adding a CLI command `slice:update --implementation-phase N`, a new state machine event `UPDATE_IMPLEMENTATION_PHASE`, and a schema field. However, the plan does not specify: (a) what status the slice must be in for this event to be valid (presumably `implementing` only), (b) whether the transition guard should enforce monotonic incrementing (preventing setting a lower phase than current), or (c) how the field interacts with existing transitions (does `BEGIN_IMPLEMENTATION` reset it to 0? does `COMPLETE_IMPLEMENTATION` clear it?). This crosses all four layers per INV-001 and INV-005, so the transition guard semantics must be explicit. The existing transition tables in `transition-tables.md` have no row for this event. Without these guards, the orchestrator could set an invalid phase index, and the re-entry logic (Step 2) would resume from the wrong phase.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a sub-task to Phase 2 task 4 specifying: (1) guard: slice status must be `implementing`, (2) guard: value must be >= current `implementationPhase`, (3) `BEGIN_IMPLEMENTATION` initializes to 0, (4) `COMPLETE_IMPLEMENTATION` does not clear (field is historical). Add the transition row to the plan.

**[IMPORTANT] `completion-phase.md` split contradicts `skill-model-api.md` without migration step**
The plan (Phase 1, task 4) correctly identifies the need to update `skill-model-api.md` to replace `completion-phase.md` with `completion-slice.md` and `completion-epic.md`. However, `conventions.md` line 58 also lists `completion-phase` as a `reconsiderWhen` evaluator, and `skill-model-api.md` line 119 defines `completion-phase.md` as a dual-mode agent used by both `implement` and `complete-epic`. The plan adds the doc update task but does not address whether any existing code or skill files reference `completion-phase.md` by name. A grep shows 28 files reference the string. If any orchestrator SKILL.md or agent definition references `completion-phase` by name at implementation time, spawning it will fail silently (agent not found). The plan should include a verification step to confirm no remaining references to the old name after the split.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a verification sub-task to Phase 1: `grep -r "completion-phase" agents/ skills/ | grep -v ".md:" | wc -l` should return 0 after the rename. Note that the 28 grep hits are in `.goodplan/` state files (refinement reviews, architecture docs), not in executable code -- but the verification should explicitly check `agents/` and `skills/` directories.

**[MINOR] Phase 3 reviewer-registry porting is ambiguous about shared vs skill-specific**
Phase 3 says to "port relevant reference files from `skills/implement-plan/references/` -- `reviewer-registry.md` only" and then references shared files via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/`. The existing `skills/implement-plan/references/reviewer-registry.md` is a skill-specific file. The plan should clarify whether this file is copied into `skills/implement/references/` (creating a new skill-specific reference) or whether `iteration-loop.md`'s "Read the skill's `references/reviewer-registry.md`" pattern already handles this. Currently `iteration-loop.md` line 46 says "Read the skill's `references/reviewer-registry.md`" -- so the implement skill needs its own `references/` directory with at minimum `reviewer-registry.md`.
Resolution: DIRECTLY_ACTIONABLE
Fix: Explicitly state in Phase 3 tasks: "Create `skills/implement/references/` directory and copy `reviewer-registry.md` from `skills/implement-plan/references/`."

**[MINOR] Phase 5 `complete-epic` Step 6 artifact promotion uses `cp` without dedup check**
The plan says "the orchestrator copies them" for artifact promotion from epic to project level. If the same file was already promoted (e.g., from a prior partial run), this would overwrite without warning. Since the plan includes re-entry detection (Step 3), the promotion step should be idempotent -- either skip existing files or use `cp -n` (no-clobber).
Resolution: DIRECTLY_ACTIONABLE
Fix: Add note to Phase 5 Step 6: "Use `cp -n` (no-clobber) for artifact promotion to ensure idempotency on re-entry."

**[MINOR] Phase 6 re-entry test fixture relies on unverified CLI command**
The test fixture setup step (c) says "set `implementationPhase` to 1 via the CLI command added in Phase 2." This is the `slice:update --implementation-phase N` command. If Phase 2's implementation of this command has any issues, the test fixture setup will fail, making the re-entry test useless as a regression detector. The plan should note this dependency explicitly and ensure Phase 7 runs the re-entry test only after verifying the CLI command works in isolation.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a note to Phase 6 re-entry test: "Depends on Phase 2 CLI command. Test fixture setup should verify `slice:update --implementation-phase` succeeds before proceeding."

## Score: 8/10

The plan is architecturally sound overall. Module boundaries are clear (orchestrator/agent/CLI split), dependency direction is correct (orchestrator depends on CLI and agent returns, never artifact content), and the layered data model change follows INV-001. The split of `completion-phase` into two agents is a good design decision with cleaner I/O boundaries. The two IMPORTANT issues are both about missing specificity in cross-layer changes rather than fundamental design problems. Fixing the `implementationPhase` guard semantics and adding the `completion-phase` reference cleanup verification would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
