# Holistic Architecture Review — Round 3

**Reviewer**: Holistic
**Iteration**: 3
**Scope**: All 10 architecture files
**Confirmed goal**: Ensure the recursive tree state model is well integrated. Verify round 2 fixes.

---

## Round 2 Fix Verification

Both IMPORTANT items from round 2 have been addressed:

- **I1 (Guards mismatch):** FIXED. `state-machine-api.md` "Directory-Based Guards" section now lists only the two guards that exist in transition-tables.md (`COMPLETE_PLAN` and `BEGIN_IMPLEMENTATION`). The two spurious guards for `COMPLETE_EXPLORE` and `COMPLETE_ARCHITECTURE` are removed. The section closes with: "These guards are defined in transition-tables.md (source of truth). Only guards listed there are implemented." — clear and authoritative.

- **I2 (Learnings mismatch):** FIXED. `SubmitInput` no longer offers `learnings?` on any intermediate phase. All eight phase variants carry only operational payload (scores for refinement phases, nothing for pure-trigger phases). A clear explanatory comment is added: "Learnings are captured only at entity completion (via CompleteInput), not during intermediate submit phases. This keeps all learning persistence within the state machine per INV-001." This resolves the INV-001 tension cleanly.

Both MINOR items from round 2 are also addressed:

- **M1 (5 undefined types):** FIXED. `PathReferences`, `DecisionSummary`, `LearningSummary`, `StatusOptions`, and `ContextResult` are all defined in the Supporting Types section of `rpc-layer-api.md`.

- **M2 (Example state tree missing project-level architecture):** FIXED. The example state tree now includes `"architecture": { type: "directory", contents: { ... } }` at the root level with an explanatory comment.

---

## Issues

**[IMPORTANT]** `--override` is documented as applicable to `BEGIN_*` commands that cannot use it

The Common Workflow Flags table in `commands-api.md` lists `--override` as applicable to:
- `submit-refinement`, `submit-refine-architecture`, `submit-refine-slices` — these are correct (`COMPLETE_*` events carry `override`)
- `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, `quest:refine-plan` — these map to `BEGIN_*` events

The `BEGIN_*` state events do not carry an `override` field:
- `BEGIN_REFINE_ARCHITECTURE: { type; epic }` — no override
- `BEGIN_REFINE_SLICES: { type; epic }` — no override
- `BEGIN_REFINEMENT: { type; slice }` — no override
- `BEGIN_QUEST_REFINEMENT: { type; quest }` — no override

If `--override` is passed to one of these begin commands, `WorkflowOptions.override` would be set to `true`, but the resulting `BEGIN_*` event has no field to carry it — the flag is silently dropped. The `[--override]` annotation on those four commands in the command reference is also incorrect for the same reason.

The fix: remove `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, `quest:refine-plan` from the `--override` applicable-commands list, and remove the `[--override]` annotation from those four command definitions. `--override` should only appear on the `submit-*` completion commands.

Files: `commands-api.md` (the four `[--override]` annotations and the applicable-commands list in the Common Workflow Flags table)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `activeSlice` and `activeQuest` fields in `project.json` have no documented lifecycle

`project.json` defines `activeSlice` and `activeQuest` fields (shown in data-model.md and used in `StatusResult` in rpc-layer-api.md). The transition tables document `activeEpic` lifecycle explicitly:
- Set by `ACTIVATE_EPIC` ("Sets project.json activeEpic")
- Cleared by `COMPLETE_EPIC` ("Clears project.json activeEpic")
- Cleared by `ABANDON_EPIC` (via the implicit transition note: "Clear active pointer in project.json")

No equivalent documentation exists for `activeSlice` or `activeQuest`. An implementer can't determine from the architecture: which event sets `activeSlice` (presumably `BEGIN_PLAN`?), which event clears it (presumably `COMPLETE_SLICE` or `ABANDON_SLICE`?), and whether `activeSlice` needs to be cleared when the parent epic is abandoned.

Fix options: (a) add lifecycle notes to the relevant transition table rows — e.g., "Sets project.json activeSlice" on the `BEGIN_PLAN` row, "Clears project.json activeSlice" on `COMPLETE_SLICE`/`ABANDON_SLICE` rows; or (b) remove `activeSlice`/`activeQuest` from `project.json` if they are derived fields not worth persisting (the StatusResult can compute them from overview.json at read time).

Files: `data-model.md` (project.json schema), `transition-tables.md` (Slice and Quest Lifecycle tables), `state-machine-api.md` (State Key Dependencies table)
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

The round-2 fixes were thorough and well-executed. All four round-2 issues (2 IMPORTANT, 2 MINOR) are resolved, as are all issues from the previous stale round-3 reviews (submit-slices/submit-implementation in mapping table, quest.json refinement field, architecture-deltas in state key deps, schema in conventions). The architecture is internally consistent across all 10 files: the recursive tree state model is properly integrated throughout, the _derived pattern is eliminated, all types in public APIs are defined, the state machine guards precisely match transition-tables.md (source of truth), and learnings flow correctly through CompleteInput only.

The remaining IMPORTANT item (`--override` on `BEGIN_*` commands) is a clean documentation error with an unambiguous fix. The MINOR item (`activeSlice`/`activeQuest` lifecycle) is a small but real documentation gap that would cause implementer confusion.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
