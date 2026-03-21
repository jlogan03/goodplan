# Merged Architecture Review — Round 1

## CRITICAL Issues

### CRIT-1: Command surface is fundamentally inconsistent across architecture files, decisions, and flows
**Files:** `commands-api.md`, `flows.md`, `rpc-layer-api.md`, decisions
**Flagged by:** api-contract (CRITICAL-01, CRITICAL-02), tui-cli (CRITICAL-1), software-architecture (IMPORTANT), holistic (IMPORTANT-1, IMPORTANT-2)
**Resolution:** DIRECTLY_ACTIONABLE

Four different command surfaces coexist:
1. **commands-api.md**: entity-namespaced verbs — `slice:plan`, `epic:explore`, `slice:complete`
2. **flows.md**: verb-first — `goodplan begin plan --slice`, `goodplan complete --slice`
3. **Decision (command-surface-conventions)**: colon-namespaced with orchestrator verbs `begin`/`complete` and sub-agent verbs `start-*`/`submit-*`
4. **RPC layer**: generic dispatch — `begin(phase, target)`, `complete(phase, target)`

The RPC layer's generic `begin(phase, target)` API doesn't map to commands-api.md's per-entity verbs. The decision's `start-*`/`submit-*` sub-agent commands appear nowhere in commands-api.md.

Pick one canonical pattern and update all files to match. The RPC layer's generic phase-based dispatch is well-designed; the command surface should reflect it.

### CRIT-2: `--inline-context` vs `--inline` flag naming inconsistent across all files
**Files:** `commands-api.md`, `rpc-layer-api.md`, `conventions.md`, `_overview.md`
**Flagged by:** tui-cli (CRITICAL-2), api-contract (IMPORTANT-02), software-architecture (MINOR)
**Resolution:** DIRECTLY_ACTIONABLE

The decision says `--inline`. Architecture files use `--inline-context`. Additionally, the CLI parsing strategy is unclear: the context command shows `--inline-context[=<bytes>]` (optional-value syntax) while the global flags table says `boolean or number` — these imply different CLI parsing approaches.

Standardize on the decision's `--inline` name. Clarify the parsing strategy (boolean flag with optional numeric override vs string with optional value).

---

## IMPORTANT Issues

### IMP-1: Sub-agent commands (`start-*`/`submit-*`) missing from architecture
**Files:** `commands-api.md`
**Flagged by:** holistic (IMPORTANT-3), tui-cli (via CRITICAL-1), api-contract (via CRITICAL-01), software-architecture (via IMPORTANT naming)
**Resolution:** DIRECTLY_ACTIONABLE

The orchestrator-subagent-split decision and command-surface-conventions decision both define `start-<action>`/`submit-<action>` as the sub-agent vocabulary. No architecture file specifies these commands. This is a key design element — sub-agents writing results directly to the CLI is central to context efficiency.

Add sub-agent commands to commands-api.md or explicitly document they're deferred with rationale.

### IMP-2: `write-<field>` commands missing from architecture
**Files:** `commands-api.md`, `_overview.md`
**Flagged by:** api-contract (IMPORTANT-07), holistic (IMPORTANT-4), software-architecture (MINOR)
**Resolution:** DIRECTLY_ACTIONABLE

The overview says "Lifecycle-bound markdown (goals, plans) is written through CLI `write-<field>` commands with state validation." No `write-*` commands appear in commands-api.md. This may be the `submit-*` pattern from the sub-agent decision, but the mapping is undocumented.

Either add `write-<field>` commands or map this responsibility to `submit-*` commands and document.

### IMP-3: RPC Layer has too much responsibility — context bundling is a distinct concern
**Files:** `rpc-layer-api.md`, `_overview.md`
**Flagged by:** software-architecture (IMPORTANT, 2x weight)
**Resolution:** DIRECTLY_ACTIONABLE

The RPC Layer owns orchestration AND content assembly (budget-based inlining, per-phase priority tables). Context bundling changes for different reasons than state orchestration. The `src/core/context/` directory in conventions.md suggests this boundary was anticipated.

Acknowledge this internal boundary in the architecture. Describe context bundling as a distinct concern within (or adjacent to) the RPC layer.

### IMP-4: `Phase` and `Target` types undefined in RPC layer
**Files:** `rpc-layer-api.md`
**Flagged by:** api-contract (IMPORTANT-03)
**Resolution:** DIRECTLY_ACTIONABLE

`begin(phase: Phase, target: Target, options)` uses types that are never defined. These are load-bearing types — they determine which entity and workflow phase the operation applies to. Define them explicitly.

### IMP-5: Learning schema appears in three different shapes
**Files:** `rpc-layer-api.md`, `data-model.md`, `state-machine-api.md`
**Flagged by:** api-contract (IMPORTANT-06)
**Resolution:** DIRECTLY_ACTIONABLE

- rpc-layer-api.md: `{ category, summary, detail, tags, rollupTo: ('epic' | 'project')[] }`
- data-model.md: `{ category, summary, detail, tags, source, rollup: true }`
- state-machine-api.md: references `Learning[]` without defining it

`rollupTo` (array of targets) vs `rollup` (boolean) are different semantics. `source` only appears in the data model. Define one canonical type and document transformations.

### IMP-6: `complete` input shape differs between RPC layer and state machine
**Files:** `rpc-layer-api.md`, `state-machine-api.md`
**Flagged by:** api-contract (IMPORTANT-05)
**Resolution:** DIRECTLY_ACTIONABLE

RPC `CompleteInput` lacks `architectureDelta` which the `COMPLETE_SLICE` event requires. Document the transformation or align the shapes.

### IMP-7: Commands in commands-api.md don't map to state events
**Files:** `commands-api.md`, `state-machine-api.md`
**Flagged by:** api-contract (IMPORTANT-04)
**Resolution:** DIRECTLY_ACTIONABLE

Several commands have no corresponding StateEvent: `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices`, `quest:start`, `slice:implement`. Either these map to generic events like `BEGIN` with a phase parameter, or the event list is incomplete.

### IMP-8: Unified state object scaling — state machine gets maximally wide input
**Files:** `data-model.md`, `data-layer-api.md`
**Flagged by:** software-architecture (IMPORTANT, 2x weight)
**Resolution:** DIRECTLY_ACTIONABLE

`ProjectState` grows with every entity (~50+ keys for a moderate project). The reducer receives the entire object when most transitions touch 2-3 entities. Document which state keys each event type reads to make the dependency explicit and enable future partial loading.

### IMP-9: Guard mechanism uses error-as-control-flow
**Files:** `state-machine-api.md`
**Flagged by:** software-architecture (IMPORTANT, 2x weight), api-contract (MINOR-02)
**Resolution:** DIRECTLY_ACTIONABLE

Guards return `StateError` with `STATE_GUARD_SKIP` to mean "try next row" — overloading the error type for control flow. Use a discriminated return: `true | 'skip' | StateError`.

### IMP-10: Refinement loop tracking absent from data model
**Files:** `state-machine-api.md`, `data-model.md`
**Flagged by:** holistic (IMPORTANT-5)
**Resolution:** DIRECTLY_ACTIONABLE

The cli-as-workflow-engine decision says the CLI owns refinement loop tracking (round numbers, score history, circuit breakers). `COMPLETE_REFINEMENT_ROUND` exists in the state machine but the data model has no corresponding storage for round counts, score history, or circuit breaker state.

### IMP-11: Architecture delta tracking dropped from data model
**Files:** `data-model.md`, `state-machine-api.md`
**Flagged by:** holistic (IMPORTANT-6)
**Resolution:** DIRECTLY_ACTIONABLE

`COMPLETE_SLICE` accepts `architectureDelta: ArchitectureDelta[]` but the data model doesn't show where deltas are stored. The incremental-architecture-updates decision says project-level architecture is updated on completion.

### IMP-12: `goal.md` missing from data model directory structure
**Files:** `data-model.md`
**Flagged by:** holistic (IMPORTANT-7)
**Resolution:** DIRECTLY_ACTIONABLE

Design spec has `goal.md` per entity. Data model shows `plan.md` but no `goal.md`. Epic.json has a `goal` string field. Decide: goals as JSON fields or markdown files, then be consistent.

### IMP-13: `commitState` atomicity story is inconsistent
**Files:** `data-layer-api.md`, `flows.md`
**Flagged by:** software-architecture (IMPORTANT, 2x weight)
**Resolution:** DIRECTLY_ACTIONABLE

flows.md implies atomicity ("nothing is written" on error, "write only changed files"). data-layer-api.md acknowledges non-transactional multi-file writes with recovery via reassembly. Document write ordering constraints and what happens on partial failure (e.g., slice.json written but activity-log.jsonl not).

### IMP-14: stdin JSON input — blocking behavior undefined for LLM consumers
**Files:** `commands-api.md`
**Flagged by:** tui-cli (IMPORTANT-3)
**Resolution:** DIRECTLY_ACTIONABLE

If the CLI blocks waiting on stdin when no pipe is connected, every mutation command hangs when called without input. Document: TTY detection (`process.stdin.isTTY`), empty-stdin behavior, max stdin size.

### IMP-15: `--no-color` / `NO_COLOR` env var not documented
**Files:** `commands-api.md`
**Flagged by:** tui-cli (IMPORTANT-2)
**Resolution:** DIRECTLY_ACTIONABLE

picocolors handles `NO_COLOR` and TTY detection automatically, but the architecture should document expected behavior so it's intentional. Add to conventions or commands-api.md.

### IMP-16: `--query` flag error behavior undefined
**Files:** `commands-api.md`
**Flagged by:** tui-cli (IMPORTANT-4)
**Resolution:** DIRECTLY_ACTIONABLE

No specification for: invalid jq expression, empty result, multiple results. Define exit codes for each case.

### IMP-17: Windows cross-platform support unaddressed
**Files:** `conventions.md`
**Flagged by:** tui-cli (IMPORTANT-5)
**Resolution:** RESEARCH_NEEDED

`windows-x64` is listed as a target but no Windows-specific concerns are addressed (path separators, stdin detection, signal handling, file locking, terminal color). Needs investigation of Bun's Windows behavior.

### IMP-18: `resource:` namespace is verbose
**Files:** `commands-api.md`
**Flagged by:** api-contract (IMPORTANT-01), tui-cli (IMPORTANT-6)
**Resolution:** USER_INPUT

`goodplan resource:epic list` is 3 tokens deep. Since resource commands use `list`/`show` verbs (distinct from workflow verbs), the `resource:` prefix may be redundant. But it serves as an architectural "read-only" marker. Trade-off requires user judgment.

### IMP-19: `--verbose` flag missing from global flags table
**Files:** `commands-api.md`
**Flagged by:** tui-cli (IMPORTANT-1), holistic (MINOR-4), api-contract (MINOR-05)
**Resolution:** DIRECTLY_ACTIONABLE

conventions.md says "stderr for diagnostics (only with `--verbose`)" but the flag isn't in commands-api.md. Add it.

---

## MINOR Issues

### MIN-1: `resource:` namespace — colon syntax exception not called out
**Files:** `commands-api.md`
**Flagged by:** software-architecture (MINOR)
**Resolution:** DIRECTLY_ACTIONABLE — note the exception in commands-api.md

### MIN-2: Missing `explore` and `architecture` phase commands in commands-api.md
**Files:** `commands-api.md`
**Flagged by:** software-architecture (MINOR)
**Resolution:** Subsumed by CRIT-1 (command surface reconciliation)

### MIN-3: `listEntities` return type is singular instead of array
**Files:** `data-layer-api.md`
**Flagged by:** api-contract (MINOR-01)
**Resolution:** DIRECTLY_ACTIONABLE — fix return type to `OverviewEntity[]`

### MIN-4: `quest:start` vs `quest:create` naming gap
**Files:** `commands-api.md`
**Flagged by:** api-contract (MINOR-03)
**Resolution:** Subsumed by CRIT-1

### MIN-5: `StatusResult.artifacts` type is too loose
**Files:** `rpc-layer-api.md`
**Flagged by:** api-contract (MINOR-04)
**Resolution:** DIRECTLY_ACTIONABLE — enumerate known artifact keys

### MIN-6: Fitness functions all "candidate" with no prioritization
**Files:** All architecture files
**Flagged by:** software-architecture (MINOR), holistic (MINOR-3)
**Resolution:** DIRECTLY_ACTIONABLE — note priority order (state machine purity, deterministic JSON round-trip first)

### MIN-7: `plan-refining.md` / `plan-refined.md` missing from data model
**Files:** `data-model.md`
**Flagged by:** holistic (MINOR-1)
**Resolution:** DIRECTLY_ACTIONABLE — add plan lifecycle files to directory structure

### MIN-8: `GOODPLAN_DIR` env var not mentioned in architecture
**Files:** `data-layer-api.md`, `conventions.md`
**Flagged by:** holistic (MINOR-2), tui-cli (MINOR-4)
**Resolution:** DIRECTLY_ACTIONABLE — reference in data-layer-api.md

### MIN-9: `schema` command underspecified
**Files:** `commands-api.md`
**Flagged by:** tui-cli (MINOR-1)
**Resolution:** DIRECTLY_ACTIONABLE — define output structure and whether it accepts command path arguments

### MIN-10: Exit code space could be richer
**Files:** `conventions.md`
**Flagged by:** tui-cli (MINOR-2)
**Resolution:** DIRECTLY_ACTIONABLE — consider exit 3 for state machine errors (invalid transition vs internal error)

### MIN-11: `--override` flag for refinement not in architecture
**Files:** `commands-api.md`, `state-machine-api.md`
**Flagged by:** holistic (MINOR-5)
**Resolution:** DIRECTLY_ACTIONABLE — add override mechanism per command-surface-conventions decision

### MIN-12: Flows.md command syntax inconsistent with commands-api.md
**Files:** `flows.md`
**Flagged by:** tui-cli (MINOR-3)
**Resolution:** Subsumed by CRIT-1

---

## DIRECTLY_ACTIONABLE

1. **CRIT-1 — Reconcile command surface**: Pick the canonical pattern (recommend: generic orchestrator verbs `begin`/`complete`/`context`/`status` matching the RPC layer + `start-*`/`submit-*` for sub-agents per decision). Update commands-api.md, flows.md. Remove or alias entity-specific verbs.
2. **CRIT-2 — Standardize flag name**: Replace all `--inline-context` with `--inline` per decision. Clarify parsing: `--inline` (boolean, use default budget) or `--inline=<bytes>` (explicit budget).
3. **IMP-1 — Add sub-agent commands**: Add `start-<action>` and `submit-<action>` commands to commands-api.md with signatures and descriptions.
4. **IMP-2 — Add `write-<field>` or map to `submit-*`**: Document how LLM sub-agents write lifecycle-bound markdown back.
5. **IMP-3 — Acknowledge context bundling boundary**: Add a paragraph to rpc-layer-api.md or _overview.md describing context bundling as an internal module within the RPC layer, referencing `src/core/context/`.
6. **IMP-4 — Define `Phase` and `Target` types**: Add TypeScript type definitions to rpc-layer-api.md.
7. **IMP-5 — Canonical Learning type**: Define one `Learning` interface. Document where `source` is populated and how `rollupTo` maps to stored `rollup`.
8. **IMP-6 — Align CompleteInput**: Add `architectureDelta` to `CompleteInput` or document the RPC-to-event transformation.
9. **IMP-7 — Map commands to events**: Either add missing events or show how entity commands dispatch to generic `BEGIN`/`COMPLETE` events with phase parameters.
10. **IMP-8 — Document state key dependencies**: Add a table showing which state keys each event type reads in state-machine-api.md.
11. **IMP-9 — Fix guard return type**: Change guard signature to return `true | 'skip' | StateError`.
12. **IMP-10 — Add refinement tracking to data model**: Add round count, score history, circuit breaker state to entity JSON schemas.
13. **IMP-11 — Add architecture delta storage**: Document where `ArchitectureDelta[]` is persisted.
14. **IMP-12 — Decide goal storage**: Goals as JSON fields or markdown files. Update data-model.md consistently.
15. **IMP-13 — Clarify atomicity story**: Document write ordering in data-layer-api.md. Update flows.md to not imply full atomicity.
16. **IMP-14 — Document stdin behavior**: Add TTY detection, empty-stdin, max size to commands-api.md.
17. **IMP-15 — Document color behavior**: Add `NO_COLOR`, TTY detection, `--json` interaction to conventions or commands-api.md.
18. **IMP-16 — Define `--query` error behavior**: Specify exit codes for invalid expression, empty result, multiple results.
19. **IMP-19 — Add `--verbose` to global flags**: Add with description of stderr diagnostic behavior.
20. **MIN-3 — Fix `listEntities` return type**: Change to `OverviewEntity[]`.
21. **MIN-5 — Enumerate artifact keys in `StatusResult`**.
22. **MIN-6 — Prioritize fitness functions**: Note which to implement first.
23. **MIN-7 — Add plan lifecycle files to data model**.
24. **MIN-8 — Reference `GOODPLAN_DIR` in data-layer-api.md**.
25. **MIN-9 — Specify `schema` command output**.
26. **MIN-10 — Consider richer exit codes**.
27. **MIN-11 — Add `--override` flag for refinement**.

---

## RESEARCH_NEEDED

1. **IMP-17 — Windows cross-platform**: Investigate Bun's behavior on Windows for: path separators in file operations, `process.stdin.isTTY`, signal handling (SIGINT/SIGTERM), file rename atomicity, terminal color support. **Strategy**: Check Bun documentation and issue tracker for Windows compatibility status. If Bun Windows support is experimental, consider marking `windows-x64` as aspirational.

---

## Contradictions Resolved

1. **`--inline-context` severity**: tui-cli rated CRITICAL, api-contract rated IMPORTANT, software-architecture rated MINOR. **Resolution**: Elevated to CRITICAL. While the fix is straightforward, the inconsistency spans all architecture files and the flag is central to the LLM-first design. Trusted tui-cli as domain specialist on CLI flag consistency.

2. **`resource:` namespace verbosity**: api-contract and tui-cli both flagged as IMPORTANT. software-architecture flagged as MINOR (syntax exception). **Resolution**: Kept as IMPORTANT but tagged USER_INPUT since it's a UX trade-off (architectural clarity vs typing friction).

3. **Guard return type severity**: software-architecture rated IMPORTANT (2x weight). api-contract rated MINOR. **Resolution**: Kept as IMPORTANT. Trusted software-architecture reviewer on module boundary/depth issues per conflict resolution rules.

4. **Command surface severity**: api-contract rated two separate CRITICALs. tui-cli rated one CRITICAL. holistic and software-architecture rated IMPORTANT. **Resolution**: Merged into one CRITICAL. The core issue is the same across all reviewers — the command surface doesn't match the decisions. Trusted api-contract's severity since this is a public interface design issue.

---

## Unresolved (USER_INPUT required)

### 1. Should the `resource:` namespace prefix be kept or flattened?
**Context**: `resource:epic list` is 3 tokens deep. Resource commands already use distinct verbs (`list`/`show`) that don't collide with workflow verbs. The prefix provides architectural read-only signaling but adds friction.
**Flagged by**: api-contract (IMPORTANT-01), tui-cli (IMPORTANT-6)
**Options**: (a) Keep `resource:` for architectural clarity, (b) Flatten to `epic list` / `slice list` and route internally, (c) Keep but document the UX rationale explicitly.

### USER_INPUT Resolved

**1. Should the `resource:` namespace prefix be kept or flattened?**
Answer: Keep `resource:` for architectural clarity. The read-only signal is worth the extra token.
