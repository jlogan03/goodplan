# Holistic Review — Simplify Data Model Epic (Round 2)

## Issues

**[IMPORTANT]** Learning schema diverges between architecture doc and actual codebase

`data-model-changes.md` section 2 shows the current learning schema with fields `title`, `category`, `summary`, `detail`, `tags`, `source`, `rollupTo`. The actual schema in `src/schemas/records/learning.ts` uses `file` (not `detail`), `rollup: boolean` (not present in the doc), and has no `title` field. The doc's "Current Schema" is stale — it reflects a pre-migration format. This means the `validUntil` addition is described against the wrong base schema, which could mislead implementers into adding the field to a schema that doesn't match what's in code.

Additionally, the `learningInputSchema` (what skills actually pass) has different fields again (`detail` in input, mapped to `file` by the RPC layer). The architecture should reference the actual current schemas or at minimum note that the "Current Schema" is simplified and the implementer should verify against the real Zod definitions.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Overview consolidation impact estimate of ~50 files likely understated

The `_overview.md` says "~50 files affected" for overview consolidation. The schema registry (`src/core/data/schema-registry.ts`) has three separate overview patterns (`epics/overview.json`, `quests/overview.json`, `tasks/overview.json`). Grepping the codebase shows at least 8 source files directly referencing `quests/overview.json` or `tasks/overview.json`, plus state machine transitions (quest-create, task-create, init, helpers), commands (quest/list, task/list, status), and context priorities. The test fixture count alone could be 30+ files. Combined with schema registry, assemble/commit logic, state machine transitions, commands, and tests, the real number may be 60-80+. An underestimate here risks scope surprises during implementation.

`data-model-changes.md` section 3 says "~30+ test files" but the _overview says "~50 files affected" total. These should be reconciled — either the 50 is too low or the 30+ test count is too high relative to it.

Resolution: CODEBASE_EXPLORATION
Research: Count all files referencing `quests/overview.json`, `tasks/overview.json`, or the overview schema patterns to get an accurate impact estimate before implementation begins.

---

**[IMPORTANT]** `reconsiderWhen` evaluation lacks integration point specification

The `reconsiderWhen` mechanism says sub-agents evaluate conditions "during architecture, planning, and completion phases." But the architecture doesn't specify which agent definitions receive the decisions + conditions as input. The orchestrator can't do it (constraint against reading content). The explore-phase, architecture-phase, plan-phase, and completion-phase agents aren't mentioned as receiving decision context. Without specifying the integration point, implementers will need to design this from scratch.

Similarly, `validUntil` on learnings says "when skills load learnings for context" but doesn't specify which phase agents receive the learning conditions or how they report back (is it part of the standard sub-agent return format? A separate field?).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `create-side-quest` status transitions use slice statuses, not quest-specific ones

`skill-model-api.md` shows `create-side-quest` using statuses like `created`, `exploring`, `explored`, `planning`, `plan-created`, `plan-refined`. The phase detection table in `conventions.md` only covers epic statuses (`created` through `activated`). Quest entities likely have their own status field and transitions. The architecture should either include a quest status-to-phase table or note that quests share the same status vocabulary as epics.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No rollback or error recovery for overview consolidation migration

`data-model-changes.md` section 3 describes the `/gp:upgrade` migration as: read old files, merge, write new, remove old, update HMAC. If step 3 succeeds but step 4 fails (e.g., permission error on removing old files), the project is left with both old and new overview files. The schema registry would match the old patterns too, creating ambiguity. A note about atomic migration (write new first, verify, then remove old) or rollback behavior would strengthen the migration design.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness function for orchestrator context discipline not connected to test harness

The `_overview.md` and `conventions.md` both define a fitness function: "orchestrator context should contain only CLI output, sub-agent return values, user Q&A, and lightweight summary files." The test harness API (`test-harness-api.md`) doesn't mention this fitness function or how it would be verified in structural/pipeline tests. The existing dogfood harness already checks for `.project/` access violations — the orchestrator fitness function should be connected to the same infrastructure.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `complete-epic` classification rationale could be more precise

The `skill-model-api.md` note explains complete-epic is standalone because it "has no interactive phases and no multi-phase orchestration." But it "spawns sub-agents for heavy work" across learnings synthesis, architecture reconciliation, and artifact promotion — which sounds like multi-phase orchestration. The distinguishing factor seems to be that these are independent tasks (parallelizable), not a sequential pipeline. Clarifying this distinction (sequential pipeline = pipeline skill, parallel delegation = standalone) would help future skill classification decisions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `plan-slice` re-entry for `plan-refined` status not addressed

`skill-model-api.md` says plan-slice transitions through `planning` -> `plan-created` -> `plan-refined`. If a user invokes `/gp:plan-slice` on a slice already at `plan-refined`, what happens? The re-entry protocol should specify: error ("plan already refined"), offer re-refinement, or offer to start fresh. This edge case matters because users may want to re-refine after implementation reveals issues.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

Significant improvement from R1 (6/10). All R1 critical issues are resolved: build pipeline now documents `agents/` copying, phase detection is consistently CLI-only, `skills:` frontmatter mechanism is correctly documented, and overview consolidation has a clear decision (Option A). The R1 important issues (description guidelines, implement no-interactive rationale, model tiers, reference migration table, etc.) are all addressed.

The remaining issues are primarily about accuracy of the architecture docs relative to the actual codebase (learning schema drift, overview impact estimate) and integration point gaps for the new `reconsiderWhen`/`validUntil` features. None block implementation but the learning schema divergence could cause real confusion during the data model slices.

To reach 9+: fix the learning schema representation to match the actual codebase, specify which agents evaluate `reconsiderWhen`/`validUntil` conditions, and add the quest status-to-phase table.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
