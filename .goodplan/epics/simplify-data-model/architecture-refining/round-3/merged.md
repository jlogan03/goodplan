# Round 3 — Merged Reviewer Feedback

Reviewers: agent-skill, holistic, software-architecture
Scores: 9/10, 9/10, 9/10

## IMPORTANT Issues

### I-1: `build-plugin.sh` does not copy `agents/` directory — miscategorized as "What Doesn't Change"
Source: holistic

`_overview.md` line 188 states `build-plugin.sh` copies `agents/` alongside `skills/` and that `plugin.json` includes an `"agents"` field. Both are false today — `build-plugin.sh` copies skills, hooks, CLAUDE.md, and binary only; `plugin.json` has no `"agents"` field. These are changes required by this epic, not existing behavior. Move to "What Changes" with an explicit implementation task.

Resolution: Move the `agents/` packaging sentences from "What Doesn't Change" to "What Changes" (or a new subsection). Leave the remaining bullets (CI workflow, plugin discovery research validation) under "What Doesn't Change" only if they are truly unchanged.

### I-2: Overview consolidation file count estimates still unreconciled
Source: holistic, software-architecture (both flagged)

`_overview.md` says "~50 files affected (schemas, transitions, commands, tests, fixtures)." `data-model-changes.md` says "~30+ test files update fixture paths and assertions." Codebase exploration found ~8 source files + ~11 test files referencing overview paths directly, totaling ~25-30 files. The "~50" is a plausible upper bound but "~30+ test files" overstates the test file count. Reconcile to give implementers an accurate scope picture.

Resolution: Update `_overview.md` to "~30 files affected" or add a breakdown (e.g., "~20 source files + ~10 test files"). Update `data-model-changes.md` from "~30+ test files" to "~10-15 test files" (reflecting the actual count).

### I-3: Orchestrator token budget estimate may undercount the longest pipeline
Source: agent-skill

The budget note says "~96K max for longest pipeline." A worst-case `create-epic` with deep design tree Q&A (~15K) + 2 refinement loops x 3 iterations x (coordinator + 5 reviewers + synthesis + editor returns) + spawn overhead could exceed this. The estimate should be validated or adjusted with a worked example.

Resolution: Add a worked breakdown to the budget note in `_overview.md`, e.g.: "Worst-case create-epic: ~15K Q&A + ~5K CLI calls + ~30K sub-agent returns (30 spawns x 1K avg) + ~60K spawn overhead = ~110K." Adjust the 96K figure if the breakdown shows it's low, or document the assumptions that keep it at 96K.

## MINOR Issues

### M-1: `explore-phase` invocation pattern unclear in agent table
Source: agent-skill

`skill-model-api.md` agent table lists `explore-phase.md` as "Used by: create-epic, create-side-quest, explore" without distinguishing that pipeline skills spawn it directly while `/gp:explore` is a skill wrapper. An implementer might mistakenly have pipelines invoke the skill instead of the agent.

Resolution: Update the "Used by" column to: "create-epic (direct spawn), create-side-quest (direct spawn), explore (skill wrapper)".

### M-2: `implement` skill has no "go-back" option but re-entry protocol doesn't acknowledge this
Source: agent-skill

The re-entry protocol in `_overview.md` describes continue/go-back for all pipeline skills. But `/gp:implement` has zero interactive phases — there's nothing to go back to. The variant should be acknowledged.

Resolution: Add a note to the re-entry protocol section: "For `/gp:implement`, re-entry resumes from the last incomplete plan phase (detected via commit history or CLI status). There is no 'go back' option since all phases are autonomous."

### M-3: `completion-phase` agent shared between implement and complete-epic without mode clarification
Source: holistic

`completion-phase.md` is used by both `/gp:implement` (slice-level) and `/gp:complete-epic` (epic-level). The architecture should clarify whether the agent adapts behavior based on context or whether separate agents are needed.

Resolution: Add a note to the `completion-phase` row in the agent table: "Adapts scope based on task prompt context: slice-level (learnings + arch review for one slice) vs. epic-level (cross-slice synthesis + artifact promotion)."

### M-4: `_shared/references/` inventory not tracked by any slice
Source: holistic

The migration table says "Enumerate the exact set during implementation when `_shared/references/` contents are inventoried" but no slice or task tracks this step. It could fall through the cracks.

Resolution: Add a note indicating which implementation slice should perform the inventory (likely the skill consolidation slice that first creates injectable skills).

### M-5: `validUntil` RPC pass-through not documented
Source: software-architecture

`data-model-changes.md` adds `validUntil` to both `learningInputSchema` and `learningEntrySchema` but doesn't note that the RPC layer must map the input field to the persisted field (analogous to `rollupTo`). Implementers may add the schema field but forget the wiring.

Resolution: Add a note to the `validUntil` impact section: "RPC layer: completion handler passes `validUntil` through from `LearningInput` to `LearningEntry` (same pattern as `rollupTo`)."

### M-6: Overview consolidation file count (duplicate of I-2)
Source: software-architecture

Same issue as I-2 above. Covered there.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Important | 3 |
| Minor | 6 (5 unique + 1 duplicate of I-2) |
