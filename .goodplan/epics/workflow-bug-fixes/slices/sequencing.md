# Slice Sequencing -- workflow-bug-fixes

> **Note:** The original epic goal described "targeted improvements, not a rewrite." Through exploration and architecture design, the scope evolved to a full v2 rewrite -- an event-sourced system replacing the mutable state machine. The architecture documents (8 files) and delta document (11-delta.md) capture this evolution. The slices below implement the v2 architecture.

## Decomposition Strategy

This epic replaces the mutable-state-machine CLI with an event-sourced system. The 14 slices (including the retired 07) follow the 4-layer architecture strictly: engine foundation first, then trust substrate, then entity commands, then skills, then migration. Within each layer, slices are ordered so each builds on verified primitives from the previous slice. The critical path runs through event engine -> derived state -> refinement loop -> entity commands -> skills. Every slice produces runnable, testable code -- no "design only" slices.

## Slice Ordering

| Order | Slice | Purpose | Dependencies | Key Risk | Sessions |
|---|---|---|---|---|---|
| 1 | `01-event-engine` | Event log writer/reader, envelope schema, ~80 event type schemas, `gp verify`, hook updates for `events.jsonl`/spine protection | None | Event schema explosion (~80 types); mitigated by discriminated unions | 3-4 |
| 2 | `02-invariant-engine` | Invariant framework, 24 core invariants, check-before-append | 01 | Manual extraction from transition guards is error-prone | 2 |
| 3 | `03-derived-state-core-commands` | Derived state computer, `gp init`, `gp status --json`, `gp schema`, `gp migrate` skeleton | 01, 02 | Derived state performance on large event logs (defer optimization) | 1-2 |
| 4 | `04-refinement-loop-extractors` | `gp refine:*` commands, convergence evaluator, circuit breaker, 10 extractors, bootstrap rubric | 01, 02, 03 | Rubric bootstrapping chicken-and-egg (resolved by bootstrap rubric) | 2-3 |
| 5 | `05-epic-lifecycle-commands` | ~20 `gp epic:*` commands, Context Bundler module (owning slice) | 01-04 | Densest slice — internal split point: bundler → core lifecycle → phase commands. Split at core/phase boundary if overflows. | 3-4 |
| 6 | `06-slice-lifecycle-commands` | ~14 `gp slice:*` commands, chunk lifecycle (7 commands) | 01-05 | Chunk lifecycle complexity (7 sub-commands) | 2-3 |
| 7a | `07a-reviewer-registry-rubrics` | Full reviewer registry (YAML frontmatter, routing, relevance weighting), full rubric set, `gp reviewer:*`, `gp rubric:*` | 01-04 (partial parallel with 05-06) | Rubric extraction from prose to YAML is tedious and error-prone | 1-2 |
| 7b | `07b-supporting-entity-commands` | `gp side-quest:*`, `gp finding:*`, `gp briefing:*`, `gp subsystem:*`, `gp invariant:*`, `gp decision:*`, `gp learning:*`, `gp events:*`, `gp project:*` | 01-04, 07a | ~25 commands across 9 namespaces | 2-3 |
| -- | `07-supporting-commands-trust` | RETIRED -- split into 07a + 07b | -- | -- | -- |
| 8 | `08-core-skills` | `workflow-guide`, `status`, `init`, `upgrade`, `task` skills | 05, 06, 07a, 07b | Skill patterns must be consistent across all 5 skills | 1-2 |
| 9 | `09-epic-creation-skills` | `create-epic`, `start-epic`, `explore` skills | 08 | Design-tree interviewing complexity in create-epic | 1-2 |
| 10 | `10-slice-execution-skills` | `plan-slice`, `implement-slice`, `land-slice` skills + agent contracts | 08, 09 (recommended) | implement/land split requires clear P11->P12 boundary | 2-3 |
| 11 | `11-supporting-skills` | `create-side-quest`, `implement-side-quest`, `land-side-quest`, `audit` skills | 08 | Side-quest lifecycle is new (implement + land are new skills) | 1-2 |
| 12 | `12-migration-dogfood` | `gp migrate` full implementation, test harness updates, real epic dogfood | 01-11 | Migration against live `.goodplan/` state; git checkout is rollback | 2-3 |

**Total estimated sessions: 24-33**

## Dependency Graph

```
01-event-engine
  -> 02-invariant-engine
       -> 03-derived-state-core-commands
            -> 04-refinement-loop-extractors
                 |-> 05-epic-lifecycle-commands
                 |     -> 06-slice-lifecycle-commands
                 |-> 07a-reviewer-registry-rubrics
                 |     -> 07b-supporting-entity-commands
                 |
                 [05, 06, 07a, 07b all merge into:]
                 |
                 08-core-skills
                      |-> 09-epic-creation-skills
                      |     -> 10-slice-execution-skills (09 is recommended, not hard dep)
                      |-> 11-supporting-skills
                      |
                      [09, 10, 11 all merge into:]
                      |
                      12-migration-dogfood
```

Notes on the dependency graph:
- Slices 05-06 and 07a-07b can proceed in parallel after slice 04.
- Slice 08 requires all of 05, 06, 07a, and 07b (skills call CLI commands from all namespaces).
- Slice 10 depends on 09 as "recommended order" not hard dependency -- skills can be developed using CLI commands directly.
- Slices 09 and 11 are parallelizable after slice 08.
- Slice 12 depends on ALL slices 01-11.

## Ordering Rationale

1. **Layer 0 (slices 1-3):** Engine foundation must exist before anything else. Each slice is independently testable with unit tests against in-memory event logs. Slice 01 includes hook updates to protect `events.jsonl` and spine files immediately -- the architecture requires Layer 0 hook protection, not deferred to Layer 3.

2. **Layer 1 (slice 4):** Refinement loop and extractors are on the critical path because commit commands (e.g., `gp epic:goal-commit`) run extractors to produce structured event payloads. Bootstrap rubric resolves the chicken-and-egg with full reviewer registry.

3. **Layer 2 (slices 5-7b):** Entity commands follow happy-path order: epic commands first (slice 5), then slice commands that depend on epic existence (slice 6). The trust substrate is split: reviewer registry and rubrics (7a) are a focused trust-layer deliverable, while supporting entity commands (7b) are a separate command-layer deliverable that depends on 7a. Slice 5 also owns the Context Bundler module -- slices 06+ consume the bundler, they don't build it.

4. **Layer 3 (slices 8-11):** Skills depend on all CLI commands being available. Core skills (8) establish patterns, epic creation (9) uses them, slice execution (10) extends them, supporting skills (11) complete the set. Slices 09 and 11 can be developed in parallel. Slice 10's dependency on 09 is recommended (for testing flow) but not hard (skills can use CLI commands directly).

5. **Layer 4 (slice 12):** Migration and dogfood come last because they exercise the entire system end-to-end. Migration is tested against a fixture directory first, then against the live repo.
