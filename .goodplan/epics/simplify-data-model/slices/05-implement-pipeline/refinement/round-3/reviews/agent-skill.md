# Agent Skill Review — Round 3

Plan: `/Users/iwhite/Repos/goodplan/.goodplan/epics/simplify-data-model/slices/05-implement-pipeline/plan-refining.md`

## Issues

**[IMPORTANT] Architecture spec still references single `completion-phase.md` agent — update task may be insufficient**
Phase 1 includes a task to "Update `skill-model-api.md` Agent Definitions table: replace the single `completion-phase.md` entry with `completion-slice.md` and `completion-epic.md`." However, `conventions.md` line 58 also references `completion-phase` in the `reconsiderWhen` ownership list: "Three phase agents evaluate conditions — `architecture-phase`, `plan-phase`, and `completion-phase`." The Phase 1 task mentions updating `conventions.md` but only for the `reconsiderWhen` ownership list — it should explicitly list all files that reference `completion-phase` to ensure nothing is missed. Currently `skill-model-api.md` has two references (line 24 in the standalone table description, and line 119 in the agent definitions table), and `conventions.md` has one. The task should enumerate all three locations to avoid partial updates.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `implementationPhase` data model change is underspecified for the full INV-001 path**
Phase 2 correctly identifies the need for schema, state machine event, CLI command, and CLI surface changes for `implementationPhase`. However, the plan says "Add a new event (e.g., `UPDATE_IMPLEMENTATION_PHASE`)" without specifying which status(es) this event is valid in. Per INV-001, the state machine enforces transition validity. The event should only be valid when the slice is in `implementing` status — the plan should state this guard explicitly. Additionally, the plan references `slice:update --implementation-phase N` as the CLI command, but the existing CLI surface uses `slice:implement` for the status transition. The plan should clarify whether this is a new top-level command (`slice:update`) or a flag on an existing command, and which command group it belongs to (slice vs subagent namespace). The existing `start-implementation` and `submit-implementation` commands live in `src/commands/subagent/`, suggesting `slice:update` might also belong there if it's orchestrator-only.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 references `skills/implement-plan/references/` for porting `reviewer-registry.md` but the new skill path is `skills/implement/`**
The task says "Port relevant reference files from `skills/implement-plan/references/` — `reviewer-registry.md` only." This is clear about the source, but the plan doesn't specify the destination. Since the new skill is `skills/implement/`, the registry should go to `skills/implement/references/reviewer-registry.md`. The plan should make this explicit to avoid the implementer creating a flat file or a shared reference.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 complete-epic skill description field trigger phrases could under-trigger**
The plan specifies trigger phrases "complete epic", "finish epic", "epic completion" for the `complete-epic` skill. The existing `complete` skill (being replaced) also triggers on "wrap up", "we're done with", "close out the epic". The architecture spec's Description Field Guidelines table says `complete-epic` must trigger for "complete epic", "finish epic", "close epic", "wrap up epic". The plan's trigger list is missing "close epic" and "wrap up epic" from the architecture spec. Since descriptions are the primary trigger mechanism and Claude tends to under-trigger, the plan should include all specified triggers.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6 re-entry test fixture depends on Phase 2's `slice:update --implementation-phase` command but doesn't note the dependency explicitly**
The test script for re-entry (Phase 6, task 1) says it will "(c) set `implementationPhase` to 1 via the CLI command added in Phase 2 (I1 dependency)". The "I1 dependency" label is noted inline, which is good, but the plan has no dependency tracking section or cross-reference system. If Phase 2's CLI command name or interface changes during implementation, Phase 6 fixtures will break silently. Consider adding the exact CLI invocation to the re-entry fixture setup (e.g., `$GP slice:update --slice <name> --implementation-phase 1`) so the dependency is concrete rather than referential.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured and demonstrates strong understanding of the established skill patterns (orchestrator context discipline, agent frontmatter conventions, `@` reference injection, `$GP` CLI interaction, test harness patterns). The split completion agents (slice vs epic) are well-justified with distinct I/O shapes. The Loop Parameters section correctly fills all 11 slots from `iteration-loop.md`. Agent return formats follow the established `{ status, summary, filesWritten }` convention.

The two IMPORTANT issues prevent a 9: (1) the architecture spec update task risks partial updates because it doesn't enumerate all `completion-phase` references, and (2) the `implementationPhase` data model change needs explicit state guards and CLI namespace placement to satisfy INV-001. The three MINOR issues are straightforward clarifications that reduce implementation ambiguity.

To reach 9+: enumerate all `completion-phase` references in the architecture update task, specify the `implementing`-only guard on the new state machine event, clarify CLI namespace for `slice:update`, add missing trigger phrases from the architecture spec, and make the re-entry fixture CLI invocation concrete.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
