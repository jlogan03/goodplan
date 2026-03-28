# Software Architecture Review: skills-cli-integration (Round 2)

## Round 1 Resolution Verification

All 4 IMPORTANT issues from round 1 have been addressed:

1. **State tree serialization format (was I8):** `cli-changes.md` now has a "State Tree JSON Serialization Format" section specifying unwrapped serialization for all `StateEntry` variants. Clear, explicit, and matches the jq examples. Resolved.

2. **`begin()` overloading (was I3/I4):** `rpc-layer-api.md` now has dedicated functions: `rollupLearnings()`, `addVerification()`, `updateVerification()`, `createDecision()`, `updateDecision()`. `BeginPhase` reduced from 16 to 11 values. Each cross-cutting operation has its own return type (`RollupResult` for rollup). Resolved.

3. **`--archive` bypass of INV-001 (was I6):** Removed entirely per user decision. No archive references remain. Entity JSON tracks completion status directly. Resolved.

4. **Context module ambiguity (was I4/I5):** `context-api.md` created as a standalone subsystem doc. Context listed in project-level architecture maturity table as Developing. Dependency direction is clear: Context depends on tree types and Data Layer reads, consumed by RPC and Commands. Resolved.

## Issues

### 1. `startContext` appears in both RPC Layer and Context module APIs with unclear ownership
**Severity:** IMPORTANT (2x weight: module depth)
**Files:** `rpc-layer-api.md` (line 16), `context-api.md` (line 26)

Both `rpc-layer-api.md` and `context-api.md` declare `startContext()` with identical signatures. The RPC layer lists it among its "Workflow Operations" interface, and `context-api.md` presents it as the Context module's public API. The command-to-RPC routing table in `rpc-layer-api.md` routes `start-*` commands to `startContext(phase, ...)`. The conventions doc (`conventions.md`) classifies `start-*` as "Read-only workflow commands: Commands -> RPC Layer -> Data Layer (no state machine)" -- but `context-api.md` says "Commands layer uses Context for `start-*` commands (read-only context assembly)" with a direct arrow from Commands to Context.

This means `startContext` has two documented call paths:
- Commands -> RPC -> Context (per `rpc-layer-api.md` routing table and `conventions.md`)
- Commands -> Context directly (per `context-api.md` diagram)

The architecture should pick one. If Context is a peer module that Commands calls directly for `start-*`, then remove `startContext` from the RPC interface and update the routing table. If RPC mediates all context calls, then update `context-api.md`'s diagram to show Commands -> RPC -> Context.

**Resolution:** Clarify in both `rpc-layer-api.md` and `context-api.md` which layer owns the `startContext` call path from commands. The simplest fix: remove `startContext` from the RPC interface (it's read-only, no state machine involvement, fits the "Commands -> Context directly" path), and update `conventions.md` routing to show `start-*` commands going Commands -> Context -> Data Layer.

### 2. `SubmitPhase` type is shared between RPC and Context but defined in neither's API doc
**Severity:** MINOR
**Files:** `rpc-layer-api.md` (line 47), `context-api.md` (line 28)

`SubmitPhase` is used as a parameter to `startContext()` in both the RPC and Context APIs, and to `submit()` in RPC. It's defined inline in `rpc-layer-api.md` but not in `context-api.md`, which just references it. The project learnings note: "Peer modules needing each other's types should share a common types file" (source: 05-sub-agent-commands). `context-api.md` lists `Target` among its dependencies but doesn't mention `SubmitPhase`.

**Resolution:** Add `SubmitPhase` to the Dependencies section of `context-api.md`, noting it comes from shared types (not from the RPC layer). Minor documentation gap.

### 3. Context module fitness functions are placeholders without test strategies
**Severity:** MINOR
**Files:** `context-api.md` (lines 96-106)

Both fitness functions in `context-api.md` are marked "candidate -- not yet written." This is expected for a newly promoted subsystem, but the test strategies are thin compared to other subsystem fitness functions. The "Context budget is respected" function is straightforward, but "Context module has no State Machine imports" is the more architecturally important one (it enforces the dependency direction). The existing project-level architecture shows Context at "Developing" maturity with only "candidate" fitness functions. For a module that two other layers depend on, this is a gap.

**Resolution:** Acceptable for now given the subsystem was just promoted. Note that implementing these fitness functions should be prioritized early in the epic, especially the dependency-direction check.

### 4. `conventions.md` command routing table doesn't include Context as a routing target
**Severity:** MINOR
**Files:** `conventions.md` (lines 10-14)

The Command Routing section lists three routing types:
- Read-only entity commands: Commands -> Data Layer
- Read-only workflow commands: Commands -> RPC Layer -> Data Layer
- Mutation commands: Commands -> RPC Layer -> State Machine + Data Layer

Context is not mentioned anywhere in this routing model. `start-*` commands are "read-only workflow commands" that route to Context (either via RPC or directly), but the routing table doesn't reflect this. Since Context is now a first-class subsystem, its position in the routing model should be explicit.

**Resolution:** Add a fourth routing type or annotate the "read-only workflow" entry to mention Context: "Read-only workflow commands (`start-*`): Commands -> Context -> Data Layer (tree reads only)."

### 5. `rpc-layer-api.md` duplicates the full per-phase content priority table from `context-api.md`
**Severity:** MINOR
**Files:** `rpc-layer-api.md` (lines 334-347), `context-api.md` (lines 58-69)

The per-phase content priority table (9 phases x 5-9 items) appears identically in both files. `rpc-layer-api.md` § "Context Bundling as Peer Module" correctly references `context-api.md` as the authoritative source, but then duplicates the full priority table. Dual maintenance creates drift risk -- if a phase's priority order changes, both files must be updated.

**Resolution:** Remove the priority table from `rpc-layer-api.md` and replace with a reference: "See `context-api.md` for per-phase content priority tables and budget semantics." Keep the `ContextBundle` type definition in `rpc-layer-api.md` since it's part of the RPC return types.

### 6. `StatusResult` type `artifacts` field uses mixed shapes
**Severity:** MINOR
**Files:** `rpc-layer-api.md` (lines 353-368)

The `StatusResult.artifacts` field mixes two shapes: `{ count: number; files: string[] }` for architecture/research/brainstorm/prototypes, and bare numbers for decisions/learnings/completedSlices/totalSlices. This is intentional (enriched shapes for directory-based artifacts, counts for JSONL-based ones), but the mixed typing within a single `artifacts` object creates caller friction -- consumers must know which fields are objects vs numbers. The `cli-changes.md` enrichment section (section 3) shows the enriched shape clearly, so the intent is documented.

**Resolution:** Acceptable as-is. The shape is driven by the underlying data: directories have file listings, JSONL records have counts. The convention doc's `status --json` examples should show a realistic response to make this clear to skill authors.

### 7. `_overview.md` references subsystem maturity but lacks a maturity table
**Severity:** MINOR
**Files:** `_overview.md` (epic-level)

Three API docs (`state-machine-api.md`, `data-layer-api.md`, `rpc-layer-api.md`) reference "per _overview.md subsystem maturity" for their fitness function priorities. The epic-level `_overview.md` has no maturity table -- it lives in the project-level `architecture/_overview.md`. This isn't incorrect (the project-level file is authoritative), but the cross-references are misleading since they point to the epic's `_overview.md`.

**Resolution:** Either add a brief maturity table to the epic-level `_overview.md` (copied or referenced from project-level), or update the cross-references in API docs to point to the project-level architecture file explicitly.

## Evaluation

### Criteria Scores (2x weight on criteria 8-11)

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1 | Subsystem boundaries align with areas of likely change | 9 | Five subsystems (Commands, RPC, State Machine, Data Layer, Context) map cleanly to distinct change reasons. Context promotion was the right call. |
| 2 | Each subsystem's public API is minimal | 9 | State Machine: single `reduce()`. Data Layer: 3 core functions + helpers. RPC: 6 functions (down from overloaded `begin()`). Context: single `startContext()`. Commands: thin pass-through. |
| 3 | Modules hide complexity behind simple interfaces | 9 | State machine hides 37 event handlers behind `reduce()`. Data layer hides cache, diff, atomic writes behind 3 functions. Context hides 9 phase priority tables behind one function. |
| 4 | Architecture creates opportunities for deep modules | 9 | The reducer pattern, tree-diff commit, and budget-based context assembly are all deep implementations behind narrow interfaces. |
| 5 | Dependency directions are strict and unidirectional | 8 | Mostly clean. Issue 1 (startContext ownership ambiguity) creates a mild inconsistency in the documented routing. No circular deps. |
| 6 | Cross-entity consistency is enforceable | 10 | Unified ProjectState tree means single-reduce-call cross-entity guards work. Sequential slice enforcement, one-active-epic, deferred routing all operate on the complete tree. |
| 7 | Error model is complete and consistent | 9 | Namespaced codes, structured JSON, 3 exit codes, typed StateError. Error recovery patterns documented in convention doc. |
| 8 | **Module depth (2x)** | 9 | State machine (37 handlers, 1 entry point), data layer (cache + diff + atomic writes, 3 functions), context (9 phase tables + budget algorithm, 1 function). All deep. Mild concern: `show` commands adding workflow-aware `artifacts` makes them slightly deeper than "thin pass-through." |
| 9 | **Caller friction (2x)** | 9 | State tree serialization format now explicit. `begin()` factored into specific functions. Stdin examples corrected. Error recovery documented. Migration examples provided. |
| 10 | **Test boundary alignment (2x)** | 9 | `--archive` removal eliminates the cross-boundary testing gap. State machine purity enables unit testing. Fitness functions specified for all subsystems (Context candidates need implementation). |
| 11 | **Deepening opportunities (2x)** | 9 | Context module is the primary deepening opportunity -- currently a single function, but phase priorities, budget algorithm, and tree traversal can grow without API changes. RPC `status()` derivation logic can deepen independently. |
| 12 | Completeness (all workflows covered) | 9 | All ~15 skill workflows mapped to CLI commands. Transition tables cover every entity lifecycle. Convention doc bridges old patterns to new. `state --query` as escape hatch for uncovered queries. |
| 13 | Consistency across documents | 8 | Issue 1 (dual startContext ownership) and Issue 5 (duplicated priority tables) are mild consistency gaps. Otherwise, cross-document alignment is strong. |

### Weighted Score Calculation

Standard criteria (1-7, 12-13): 9+9+9+9+8+10+9+9+8 = 80/90
Deep module criteria (8-11, 2x weight): (9+9+9+9) * 2 = 72/80
Total: 152/170 = 89.4%

## Score: 9/10

The round 1 IMPORTANT issues are all resolved. The architecture is now internally consistent across all five subsystem API docs, the convention doc, and the transition tables. The `begin()` factoring, `--archive` removal, context promotion, and state tree serialization spec were the right fixes.

The remaining issues are all MINOR documentation consistency gaps, none of which affect implementation correctness or module depth. The most actionable is issue 1 (clarifying `startContext` call path ownership), which is a one-paragraph fix in two files.

The architecture successfully enables all ~15 workflow skills to use the CLI for structured state operations while maintaining deep modules with narrow interfaces. The pure reducer pattern, unified state tree, and budget-based context assembly are genuinely deep implementations that hide significant complexity. The factored RPC interface (6 specific functions replacing 16 `BeginPhase` values) reduces caller friction meaningfully.

## Summary
- Critical: 0
- Important: 1
- Minor: 6
