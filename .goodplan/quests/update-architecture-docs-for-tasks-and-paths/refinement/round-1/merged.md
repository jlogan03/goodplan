# Merged Feedback — update-architecture-docs-for-tasks-and-paths

Reviewers: holistic (7/10), repo-tooling-docs (7/10)
Merged score: 7/10 | Critical: 0, Important: 5, Minor: 5

---

## Important Issues

**[IMPORTANT-1]** Finding 12 (context module architecture doc) silently dropped from plan
_(holistic)_

The audit report lists 13 findings. Finding 12 ("Context module has no dedicated architecture doc") is not addressed anywhere in the plan. The plan overview says "three categories of drift were identified" but Finding 12 fits none of them. The plan must either include a task to create `context-api.md` or explicitly defer it with rationale.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2]** Phase 2 before-check for schema registry paths greps wrong file content
_(holistic)_

The Expected Behavior before-check `grep 'slices\/\[' .project/architecture/data-layer-api.md` uses an escaped bracket that won't match actual content. A reliable alternative: `grep 'slices/overview' .project/architecture/data-layer-api.md` — this matches the flat `slices/overview.json` entry that needs to be removed. Also note: the `slices/overview.json` entry in the doc should be removed entirely (no replacement pattern exists in the schema registry for slice overviews).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3]** `COMPLETE_QUEST`/`COMPLETE_SLICE` type name fixes are imprecisely described in Phase 2
_(holistic)_

The plan says to replace `Learning[]` with `LearningEventEntry[]` and `ArchitectureDelta[]` with `ArchitectureDeltaInput[]`, but the actual required changes are:
- `COMPLETE_SLICE`: `LearningInput[]` → `LearningEventEntry[]` (plan only mentions `Learning[]`, missing this)
- `COMPLETE_QUEST`: `Learning[]` → `LearningEventEntry[]` and `ArchitectureDelta[]` → `ArchitectureDeltaInput[]`

An implementer looking only for `Learning[]` will miss the `COMPLETE_SLICE` fix. The plan must specify exact before/after type names per event.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4]** Phase 3 `conventions.md` update omits `src/commands/task/` from repo structure
_(repo-tooling-docs)_

The plan removes `src/core/workflow/` and `src/commands/activity/` from the `conventions.md` repo structure, but does not add `src/commands/task/` which exists on disk with 5 command files (create, list, show, drop, convert). Since the entire quest goal is to bring docs in line with Task entity reality, this is a direct gap.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5]** Phase 3 `conventions.md` update omits task transitions and task schemas
_(repo-tooling-docs)_

`conventions.md` transition handler listing is missing `task-create` and `task-lifecycle` (both exist at `src/core/state/transitions/`). The entity schemas list omits `task`, and the command schemas list omits `task.ts` and `artifacts.ts`. These should be added in the same Phase 3 task or a sibling task.

Resolution: DIRECTLY_ACTIONABLE

---

## Minor Issues

**[MINOR-1]** Phase 2 after-check for fitness functions is fragile
_(holistic)_

`grep -c 'candidate' .project/architecture/state-machine-api.md` returning 0 could false-positive if "candidate" appears in prose. Use `grep 'candidate — not yet written'` for an exact match.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2]** `data-layer-api.md` schema registry fix needs explicit removal of stale flat slice entries
_(holistic)_

The plan says to "add missing task patterns" but should also state that `slices/overview.json` and `slices/[^/]+/slice.json` entries must be removed entirely — there is no replacement pattern in the schema registry for slice overviews.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3]** Phase 3 before-check for `docs/primer.md` may not match actual tree formatting
_(holistic)_

`grep 'slices/01-auth' docs/primer.md` may not match because the tree shows `slices/` and `01-auth/` on separate indented lines. Safer: `grep 'slices/' docs/primer.md`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4]** `epicOverviewSchema` discrepancy not addressed in Phase 2 schema registry fixes
_(repo-tooling-docs; also applies to data-layer-api.md per same reviewer)_

`data-model.md` line 358 and `data-layer-api.md` line 120 both show `overviewSchema` for `epics/overview.json`, but the actual code uses `epicOverviewSchema`. The Phase 2 fix tasks for both files should correct this schema name.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5]** Phase 3 `conventions.md` skills count check should exclude `_shared/`
_(repo-tooling-docs)_

The verification "skills listing count matches `ls skills/ | wc -l`" will be off-by-one because `_shared/` is not a skill. The check should use `ls skills/ | grep -v _shared | wc -l` or explicitly note the exclusion.

Resolution: DIRECTLY_ACTIONABLE

---

## Deduplicated / Collapsed

- The grep fragility concern raised by repo-tooling-docs (naive patterns may false-positive) is the same class of issue as holistic's MINOR-1 and MINOR-3. Both reviewers agree on the pattern — addressed above in MINOR-1 and MINOR-3 rather than as a separate item.
- Phase 1 `data-model.md` `task:drop`-specific instruction (holistic MINOR) is superseded by the more general framing: "check that the task entity section documents all task lifecycle states and operations." This is a wording improvement, not a structural gap; absorbed into plan prose guidance.
