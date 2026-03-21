# Holistic Review — Round 2

## Overall Assessment

The architecture tells a coherent, well-structured story after round 1 edits. The four-layer stack is consistently described across all files, dependency directions are clear, and the state machine purity constraint is enforced throughout. The files read as a unified design rather than separately authored documents. Decision alignment is strong — every active decision is reflected accurately in the architecture.

**Score: 8/10**

---

## Coherence Across Files

**Strong points:**
- The _overview.md summary accurately reflects the detail in each subsystem file. No contradictions found between the overview and the individual API documents.
- The data-model.md directory structure matches the paths referenced in state-machine-api.md's key dependency table and flows.md's concrete examples.
- The conventions.md file is a faithful distillation of patterns described in detail across the other files — no drift.
- The invariants.md file captures the six most important rules, and each is verifiable from the architecture as described.

**No cross-file contradictions detected.** This is a significant improvement if round 1 had consistency issues.

---

## Decision Alignment

All 12 decisions checked. Alignment is accurate:

| Decision | Alignment |
|---|---|
| entity-namespaced-commands | Fully reflected in commands-api.md |
| no-work-stack | Three active pointers in data-model.md project.json |
| layered-architecture | Consistently described in _overview.md and all subsystem files |
| inline-flag-replaces-depth | `--inline` throughout, no `--depth` references |
| roll-your-own-state-machine | Reducer + transition table pattern in state-machine-api.md |
| orchestrator-subagent-split | start-*/submit-* commands in commands-api.md, context budget in rpc-layer-api.md |
| epic-verification-at-activation | Activation guard in state-machine-api.md and flows.md |
| incremental-architecture-updates | Architecture path returns in rpc-layer-api.md CompleteResult |
| skills-versioned-in-repo | Deployment model in _overview.md |
| skill-cli-integration | `goodplan schema` command in commands-api.md |
| cli-as-workflow-engine | RPC layer responsibilities in rpc-layer-api.md |
| typescript-first-go-later | Bun dependency in _overview.md |
| simplicity-as-default | Architecture is genuinely simple — four layers, clear boundaries, no gratuitous abstractions |

---

## Findings

### Critical (0)

None.

### Important (3)

**IMP-1: Design spec capabilities not fully covered — quest lifecycle gaps**

The design spec lists quest commands with `start`, `update` verbs. The architecture's commands-api.md has quest lifecycle commands but the state-machine-api.md `StateEvent` union is missing events for quest planning and refinement phases. There is `BEGIN_QUEST` but no `BEGIN_PLAN` (quest variant) or `BEGIN_REFINEMENT` (quest variant) in the union despite commands-api.md listing `quest:plan` and `quest:refine-plan`. The command-to-event mapping table says "BEGIN_PLAN (quest variant)" but the StateEvent union only has a slice-scoped `BEGIN_PLAN`. Either the events need a target discriminator (e.g., `BEGIN_PLAN` carries `{ slice?: string; quest?: string }`) or quest-specific events need to be added.

**IMP-2: `submit-*` command write path is under-specified**

commands-api.md says `submit-*` commands "write lifecycle-bound markdown through the Data Layer with state validation." But the data-layer-api.md interface has no function for this. The existing functions are `writeEntity` (JSON), `appendRecord` (JSONL), and `readContent`/`createDirectory` (content files). There is no `writeContent(path, content)` function for writing markdown files. Either: (a) `submit-*` commands write markdown through a new Data Layer function, or (b) they use a filesystem write outside the Data Layer, which would violate the architecture's constraint that all filesystem I/O goes through the Data Layer. This needs a concrete answer.

**IMP-3: Epic phase commands lack state machine representation**

commands-api.md lists `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices` as mapping to generic `BEGIN` events with a phase parameter. But the StateEvent union in state-machine-api.md has no generic `BEGIN` event — the closest is entity-specific events like `BEGIN_PLAN`, `BEGIN_IMPLEMENTATION`. The architecture needs to either add a `BEGIN` event with a phase discriminator to the StateEvent union, or add explicit events for each epic phase. The current gap means the state machine API doesn't cover the epic pre-activation workflow.

### Minor (3)

**MIN-1: `src/commands/build/` in conventions.md doesn't match current command surface**

conventions.md repo structure shows `src/commands/build/` but the command surface uses entity namespaces (`epic:`, `slice:`, `quest:`), not a `build:` namespace. The `build/` directory appears to be a holdover. Should probably be `src/commands/slice/` and `src/commands/quest/` to match the entity namespace pattern, or the directory naming convention should be documented as intentionally different from command namespaces.

**MIN-2: `architecture-deltas.jsonl` status field divergence from design spec**

The design spec has architecture update proposals with a `status` field (`proposed | approved | applied`) and a `rationale` field. The architecture's data-model.md `architecture-deltas.jsonl` has neither — it's a simpler record (`subsystem`, `type`, `description`, `ts`). This is arguably a simplification (good), but the design spec's richer model served a purpose: the LLM proposes changes, the user approves, then the LLM applies. If the approval step is gone, the architecture should document that explicitly as a simplification decision. If it's still intended, the schema needs updating.

**MIN-3: Fitness functions are all "candidate — not yet written"**

Every fitness function across all files is listed as a candidate. This is fine for the architecture phase, but the architecture should indicate which fitness functions are priority 1 for the first slice. The _overview.md maturity table starts this with "priority 1: state machine, priority 2: data layer" but the individual files don't echo this prioritization in their fitness function sections.

---

## Simplicity Check

The architecture is genuinely simple for what it covers. Four layers, clean boundaries, no unnecessary abstractions. The reducer pattern avoids library overhead. The unified state object is a pragmatic choice that trades some memory for much simpler state machine code.

One area to watch: the `resource:` namespace adds a layer of indirection for read-only commands. The rationale (signals read-only, keeps CRUD separate from workflow) is valid, but `goodplan epic list` (design spec style) is simpler than `goodplan resource:epic list` (architecture style). This is a minor ergonomic concern, not architectural.

---

## Gaps vs Design Spec

1. **`goodplan init` behavior**: The design spec says `/create-epic` calls `goodplan init` internally. The architecture has `init` as a global command but doesn't specify what it creates (which JSON files, what defaults). The data-model.md shows the directory structure but not the bootstrapping sequence.

2. **System profile / project health**: The design spec mentions `project.json` containing "system profile (health/quality metrics)" and `goodplan status` exposing it. The architecture's `project.json` entity in data-model.md has no health or quality fields. This may have been intentionally dropped (simplicity), but it's undocumented.

3. **`--override` flag**: Referenced in the superseded command-surface-conventions decision and in commands-api.md (`epic:refine-architecture --override`, `slice:refine-plan --override`), mentioned in state-machine-api.md's circuit breaker context. But the StateEvent union doesn't carry an `override` field. Either it's a flag the RPC layer interprets before calling reduce (bypassing the guard), or it needs to be in the event payload.

---

## Summary

The architecture is well-integrated and tells a consistent story. The three important findings are all about gaps in coverage — places where the architecture describes a capability in one file but doesn't fully specify it in the subsystem that implements it. These are straightforward to resolve by extending the state machine event union and the data layer interface. No fundamental design issues.
