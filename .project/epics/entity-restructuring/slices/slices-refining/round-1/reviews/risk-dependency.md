# Risk/Dependency Analysis Review

## Issues

**[CRITICAL]** `goal-refining.md [01-schema-and-state-machine]`: Schema registry update ordering creates silent data loss risk

The affected-apis.md research explicitly warns: "The registry update to `epics/overview.json` -> `epicOverviewSchema` **must happen before any data migration**. Without it, `slices` arrays are silently stripped by Zod on every `getJson` call." However, slice 01 does not include the schema registry update in its scope — it lists schemas, Target type, state events, transitions, helpers, and init, but `src/core/data/schema-registry.ts` is not mentioned. The current schema registry (`schema-registry.ts` line 23) maps `epics/overview.json` to `overviewSchema`, which lacks a `slices` field. If slice 01 introduces `epicOverviewSchema` and writes overview items with `slices: []` but does not update the registry, every round-trip through `getJson` will silently strip the `slices` array. This must be explicitly in slice 01's scope, not deferred to slice 02.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [02-rpc-and-commands]`: Implicit dependency on `epicOverviewSchema` existence not stated

Slice 02 lists the schema registry update (`epicOverviewSchema`) in its Behavior section (item 4), but this schema must already exist from slice 01. The dependency is on slice 01 having created and exported `epicOverviewSchema` from the schemas package. The sequencing doc says slice 02 depends on 01, which covers this — but the slice 02 goal should clarify it is *consuming* the schema (updating the registry entry), not *creating* it. Currently both slices mention schema registry changes in slightly different ways, creating ambiguity about which slice owns the registry file.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [03-context-and-learnings]`: Dependency on slice 02 may be unnecessary — slice 01 would suffice

Slice 03 declares dependency on slice 02, but its actual work (context layer path updates + `/complete` skill learnings removal) only requires the state machine types and path conventions from slice 01. The context layer (`priorities.ts`, `learnings.ts`, `resolveScope`) reads from the state tree using string paths — it does not call RPC or CLI commands. The `/complete` skill change is a content edit removing `learnings.md` writes. Neither requires RPC or commands to be updated first. Relaxing this to depend only on slice 01 would improve ordering robustness — if slice 02 hits unexpected issues, slices 03 and 04 could still proceed in parallel.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [04-skills-update]`: Dependency on slices 01-03 is overly broad

Slice 04 is pure content changes to 11 skill files (no TypeScript). The skill path references just need to know the new convention (`epics/<epic>/slices/<name>/`), which is established conceptually in slice 01. The skills don't import TypeScript modules or call functions from slices 01-03. Declaring dependency on all three creates a strict serial chain where parallel execution would be safe. At minimum, slice 04 could proceed after slice 01 (for path convention) with slice 03's `/complete` skill change carved out as its own item or left in slice 03.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [05-tests-and-migration]`: Self-migration is a high-risk unknown bundled with routine test updates

Slice 05 combines three distinct risk levels: (a) test fixture updates (low risk, mechanical), (b) migration code changes (medium risk, logic changes), and (c) self-migration of this repo (high risk, irreversible data transformation on the real project). If the migration code has bugs, running it on the real `.project/` directory could corrupt project state. The slice mentions `.project-old/` backup but does not specify rollback steps. The verification section says "verify all epics, quests, tasks, and learnings are intact" but this is post-hoc — if something is silently lost, the check may not catch it. Consider: explicitly call out the rollback procedure, or split self-migration into a separate final step with its own verification gate.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `sequencing-refining.md`: No explicit mention of what happens if slice 01 schema changes invalidate existing test fixtures mid-flight

Slice 01 changes `epicSchema` (removes `sliceSequence`) and introduces `epicOverviewSchema`. The 4 test fixture files with `sliceSequence` and 8+ test files referencing `slices/overview.json` are deferred to slice 05. Between slices 01 and 05, the test suite will have failures from schema mismatches unless slice 01's scope includes updating the fixture files it directly breaks. The slice 01 goal says "All existing unit tests pass (with updated fixture data)" and mentions fitness test fixtures, but the sequencing doc doesn't call out this cross-slice concern.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [01-schema-and-state-machine]`: `epicOverviewSchema` is a new schema type — no prototype or spike to validate the design

The architecture introduces a new `epicOverviewSchema` that diverges from the shared `overviewSchema` pattern used by all other entity types. This is the first schema that embeds child entities (slices inside epic overview items). If the schema design doesn't work well with the existing `getJson`/`setJson` round-trip patterns, it could require rework. This is a moderate unknown that is appropriately front-loaded in slice 01, but worth noting as a risk.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The slices are well-ordered for the happy path and the biggest unknown (schema + state machine) is correctly front-loaded in slice 01. However, there are two significant issues: (1) the schema registry update ordering gap in slice 01 creates a silent data loss risk that could be hard to diagnose, and (2) the dependency chain is unnecessarily strict — slices 03 and 04 could run with fewer prerequisites, improving robustness against delays. To reach 9+: explicitly include schema registry in slice 01 scope, relax slice 03/04 dependencies, and add rollback procedure for self-migration in slice 05.

## Summary
- Critical: 1
- Important: 4
- Minor: 2
