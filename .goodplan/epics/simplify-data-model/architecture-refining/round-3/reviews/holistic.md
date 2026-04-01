# Holistic Review — Simplify Data Model Epic (Round 3)

## Issues

**[IMPORTANT]** `build-plugin.sh` does not copy `agents/` directory, but architecture claims it does

`_overview.md` line 188 states under "What Doesn't Change": "Plugin packaging and distribution (build-plugin.sh copies `agents/` alongside `skills/`, CI workflow). `plugin.json` includes an `"agents"` field..." This is incorrect on two counts: (1) the current `build-plugin.sh` has no `agents/` copy step (confirmed by reading the script — it copies skills, hooks, CLAUDE.md, and binary only), and (2) the current `plugin.json` template has no `"agents"` field. These are changes that *will need to happen* as part of this epic, not things that already exist. They should be listed under "What Changes" with an explicit implementation task in the skill consolidation slices, not hidden under "What Doesn't Change."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Overview consolidation file count estimates still unreconciled after R2 flag

R2 flagged that the "~50 files affected" estimate in `_overview.md` and the "~30+ test files" in `data-model-changes.md` appeared inconsistent. Codebase exploration confirms: 8 source files (28 occurrences) + 11 test files (34 occurrences) reference `quests/overview.json` or `tasks/overview.json` directly. Adding schema registry, fixture files, and any indirect references, the actual count is likely 25-30 files. The "~50 files affected" in the overview is plausible as a rough upper bound but the "~30+ test files" in data-model-changes.md is overstated (11 test files, not 30+). Reconcile these numbers so implementers have an accurate scope picture.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `complete-epic` spawns `completion-phase` agent but agent table shows `completion-phase` used by both `implement` and `complete-epic`

The skill-model-api.md notes that `complete-epic` "spawns `completion-phase` agent for learnings synthesis and architecture reconciliation (parallel sub-agents for cross-slice analysis)." But `completion-phase` is also used by `/gp:implement` for slice-level completion. The `complete-epic` description says "Does not use the refinement loop" — this is a useful distinction, but it would help to clarify whether `completion-phase` adapts its behavior based on context (epic-level vs. slice-level) or whether there should be separate agents. If it adapts, the agent definition needs to handle both modes; if separate, the agent table needs updating.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No explicit mention of `_shared/references/` inventory timing

The `_shared/references/` migration table in `skill-model-api.md` ends with: "Enumerate the exact set during implementation when `_shared/references/` contents are inventoried." This is a reasonable deferral, but there is no slice or task tracking this inventory step. If it falls through the cracks, orphaned references could accumulate in the plugin distribution. Consider noting which implementation slice should perform this inventory.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

Strong improvement from R2 (8/10). All three R2 IMPORTANT issues are addressed: learning schema now matches the actual codebase (both `learningEntrySchema` and `learningInputSchema` representations are accurate), `reconsiderWhen`/`validUntil` evaluation ownership is clearly specified in conventions.md (architecture-phase, plan-phase, and completion-phase agents evaluate; orchestrator loads conditions via CLI and passes them in task prompts), and quest status-to-phase table is present. The R2 MINOR issues are also addressed: migration ordering has crash-safe semantics with idempotent re-run, orchestrator context discipline verification is documented in test-harness-api.md section 6, `complete-epic` classification rationale is improved, and `plan-slice` re-entry for `plan-refined` status is specified.

The remaining issues are a miscategorization of build-pipeline changes (listed as unchanged when they need implementation), a still-unreconciled file count estimate, and two minor clarity items. None block implementation — the build-pipeline issue will be caught naturally when `agents/` directories are implemented, and the file count affects scope estimation rather than correctness.

To reach 10: move the `agents/` build-pipeline changes to "What Changes" and reconcile the overview consolidation file counts.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
