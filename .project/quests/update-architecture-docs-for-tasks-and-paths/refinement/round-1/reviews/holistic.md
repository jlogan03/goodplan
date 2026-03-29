# Holistic Review — update-architecture-docs-for-tasks-and-paths

## Issues

**[IMPORTANT]** Finding 12 (context module architecture doc) silently dropped from plan

The audit report lists 13 findings. Finding 12 ("Context module has no dedicated architecture doc") is acknowledged as MINOR in the audit but is not addressed anywhere in the plan. The plan overview says "three categories of drift were identified" but Finding 12 doesn't fit any of those three categories. The plan should either include a task to create `context-api.md` or explicitly note that Finding 12 is deferred with rationale.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 "before" check for schema registry paths greps wrong file

The Expected Behavior before-check `grep 'slices\/\[' .project/architecture/data-layer-api.md` uses an escaped bracket that won't match the actual content. The actual text in `data-layer-api.md` line 122 is `slices\/overview\.json` and `slices\/[^/]+\/slice\.json` — the grep pattern needs to match the literal regex text in the markdown code block. A more reliable before-check would be: `grep 'slices/overview' .project/architecture/data-layer-api.md` (matches the flat `slices/overview.json` that should become `epics/.../slices/overview.json` or be removed).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `COMPLETE_SLICE` type name discrepancy not fully specified in Phase 2

The plan task "Fix `COMPLETE_QUEST`/`COMPLETE_SLICE` event type names" says to replace `Learning[]` with `LearningEventEntry[]` and `ArchitectureDelta[]` with `ArchitectureDeltaInput[]`. Codebase verification confirms:
- `COMPLETE_SLICE` in docs uses `LearningInput[]` (not `Learning[]`) and `ArchitectureDeltaInput[]` (already correct for arch delta). The actual code uses `LearningEventEntry[]`. So the slice fix is `LearningInput[]` -> `LearningEventEntry[]`.
- `COMPLETE_QUEST` in docs uses `Learning[]` and `ArchitectureDelta[]`. The actual code uses `LearningEventEntry[]` and `ArchitectureDeltaInput[]`. Both need fixing.

The plan's description is imprecise about which event has which wrong type name. The implementer could miss the `COMPLETE_SLICE` `LearningInput[]` -> `LearningEventEntry[]` fix if they only look for `Learning[]`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 after-check for fitness functions is fragile

The after-check `grep -c 'candidate' .project/architecture/state-machine-api.md` returning 0 could false-positive if "candidate" appears in a non-fitness-function context (e.g., in prose text). A more precise check would grep for the exact phrase "candidate — not yet written" to avoid false matches.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `data-layer-api.md` schema registry is also missing JSONL record patterns for tasks

The actual `schema-registry.ts` doesn't have task-specific JSONL patterns (tasks don't have learnings or architecture-deltas), but the plan's Phase 2 task "Fix schema registry paths in `data-layer-api.md`" says to "add any missing patterns (tasks)." The plan should clarify that for `data-layer-api.md`, this means adding `tasks/overview.json` and `tasks/[^/]+/task.json` to the entity JSON section, and also removing the stale flat `slices/overview.json` and `slices/[^/]+/slice.json` entries (replacing with `epics/[^/]+/slices/overview.json` if that pattern exists in code, or just removing if not).

Checking the actual code: there is no `slices/overview.json` pattern at all — slices don't have their own overview. The `epics/[^/]+/slices/` path pattern doesn't have an overview entry in the schema registry. The doc's `slices/overview.json` line should be removed entirely, not replaced.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 before-check references `docs/primer.md` with `slices/01-auth` but actual text is different

The before-check `grep 'slices/01-auth' docs/primer.md` — the actual primer text at line 119-121 shows `slices/` with `01-auth/` on the next line (indented as a tree). The grep pattern may not match depending on how the tree formatting works. A safer before-check: `grep 'slices/' docs/primer.md` to confirm the flat (non-nested) slices path exists.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 task for `data-model.md` references `task:drop` coverage but the plan should also check `task:convert` and `task:list`/`task:show`

The task says "Verify the existing task entity section in data-model.md is complete (it documents `task.json` but check for `task:drop` coverage)." This is oddly specific — `task:drop` is no more important than `task:convert`, `task:list`, or `task:show`. The instruction should say "check that the task entity section documents all task lifecycle states and operations."

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phases that logically group related work, and it correctly identifies all the major doc gaps from the audit. The phasing is sensible (entity docs first, per-API corrections second, user-facing docs third). Expected Behavior sections exist for all phases with before/after checks.

To reach 9+: (1) Address Finding 12 explicitly (include or defer with rationale), (2) fix the imprecise `COMPLETE_SLICE`/`COMPLETE_QUEST` type name descriptions so an implementer knows exactly which type names to change in which event, (3) tighten before-check grep patterns to match actual file content.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
