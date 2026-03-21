# API Contract Review

Reviewer focus: public interface design across all surfaces — CLI commands, inter-subsystem APIs, error shapes. Evaluating naming, consistency, ergonomics, and contract completeness.

## Issues

### CRITICAL-01: Command surface in commands-api.md contradicts the command-surface-conventions decision for workflow verbs
**Severity:** CRITICAL
**File:** `architecture/commands-api.md`
**Resolution:** Align commands-api.md with the decision

The command-surface-conventions decision (2026-03-20) defines phase-level orchestrator verbs as `begin`, `status`, `context`, `complete`, `abandon`, and sub-agent verbs as `start-<action>`, `submit-<action>`. But commands-api.md uses action-specific verbs per entity namespace instead: `epic:explore`, `epic:define-architecture`, `slice:plan`, `slice:implement`, etc. These are neither the `begin`/`complete` pattern nor the `start-*`/`submit-*` pattern.

The flows.md file partially follows the decision — it shows `goodplan begin plan --slice 01-auth` — but this command doesn't appear anywhere in commands-api.md. Meanwhile commands-api.md lists `goodplan slice:plan --slice <name>` which follows a different pattern entirely.

This is a fundamental inconsistency in the primary public interface. The command surface is the most visible contract, and having the architecture file disagree with its own decision (and with flows.md) makes the design ambiguous. Which pattern is canonical?

### CRITICAL-02: RPC Layer's `begin`/`complete` interface doesn't match the command surface
**Severity:** CRITICAL
**File:** `architecture/rpc-layer-api.md`, `architecture/commands-api.md`
**Resolution:** Reconcile the two APIs

The RPC Layer defines four operations: `begin(phase, target, options)`, `complete(phase, target, input, options)`, `context(phase, target, options)`, `status(options)`. These use a `Phase` type as a parameter — a generic "what phase are you beginning/completing" dispatch.

But commands-api.md defines per-entity verb commands (`slice:plan`, `slice:implement`, `epic:explore`, `epic:define-architecture`). There's no mapping showing how `goodplan slice:plan --slice foo` translates to `rpc.begin('plan', { slice: 'foo' })`. And conversely, the RPC interface implies a `goodplan begin plan --slice foo` pattern that doesn't appear in commands-api.md.

Either the command surface should use generic verbs (`begin`, `complete`) with phase arguments, or the RPC layer should expose per-phase methods. Currently they disagree.

### IMPORTANT-01: `resource:` namespace prefix is verbose and inconsistent with how it would actually be used
**Severity:** IMPORTANT
**File:** `architecture/commands-api.md`
**Resolution:** Simplify or justify

The `resource:epic list` pattern means typing `goodplan resource:epic list` — three tokens before any flags. The decision doc says "resource: namespace keeps CRUD operations out of the way since the LLM rarely uses them directly." But the commands-api.md also shows `resource:activity list`, `resource:decision list`, `resource:learning list` which are likely high-frequency for status queries.

Compare: `goodplan resource:slice list --epic foo` vs `goodplan slice list --epic foo`. The `resource:` prefix adds friction for little benefit. Since resource commands are already distinguished by using `list`/`show` verbs (which don't appear in workflow commands), the namespace prefix may be redundant.

### IMPORTANT-02: `--inline-context` flag naming is inconsistent across documents
**Severity:** IMPORTANT
**File:** `architecture/commands-api.md`, `architecture/rpc-layer-api.md`, `architecture/conventions.md`
**Resolution:** Standardize on one name

Three different names appear:
- commands-api.md global flags table: `--inline-context`
- commands-api.md context command: `--inline-context[=<bytes>]`
- rpc-layer-api.md WorkflowOptions: `inlineContext`
- The decision (inline-flag-replaces-depth): `--inline`
- conventions.md: `--inline-context`

The decision explicitly says the flag is called `--inline`. The architecture files use `--inline-context`. Pick one and use it everywhere. The decision should be the source of truth.

### IMPORTANT-03: `Target` type in RPC Layer is undefined
**Severity:** IMPORTANT
**File:** `architecture/rpc-layer-api.md`
**Resolution:** Define the Target type

`begin(phase: Phase, target: Target, options)` uses a `Target` type that is never defined. Same for `Phase`. These are load-bearing types — they determine which entity the operation applies to and what workflow phase it maps to. Without definitions, implementers must guess. Should `Target` be `{ slice?: string; epic?: string; quest?: string }` or a discriminated union? What are the valid `Phase` values?

### IMPORTANT-04: Commands-api.md lists commands that don't map to any state event
**Severity:** IMPORTANT
**File:** `architecture/commands-api.md`, `architecture/state-machine-api.md`
**Resolution:** Add missing events or remove commands

Several commands in commands-api.md have no corresponding `StateEvent`:
- `epic:explore` — no EXPLORE event
- `epic:define-architecture` — no DEFINE_ARCHITECTURE event
- `epic:refine-architecture` — no REFINE_ARCHITECTURE event
- `epic:define-slices` — no DEFINE_SLICES event
- `epic:refine-slices` — no REFINE_SLICES event
- `quest:start` — no START_QUEST event (there's `BEGIN_QUEST`)
- `slice:implement` — no direct event (there's `BEGIN_IMPLEMENTATION`)

Either these commands map to generic events like `BEGIN` with a phase parameter (supporting the flows.md pattern), or the state event list is incomplete. This gap makes the command-to-event contract unclear.

### IMPORTANT-05: `complete` command input shape differs between RPC layer and state machine
**Severity:** IMPORTANT
**File:** `architecture/rpc-layer-api.md`, `architecture/state-machine-api.md`
**Resolution:** Align or document the transformation

RPC `CompleteInput` has:
```
verificationPassed, deferred?, learnings?
```

State machine `COMPLETE_SLICE` event has:
```
verificationPassed, deferred, learnings, architectureDelta
```

The `architectureDelta` field appears in the state event but not in `CompleteInput`. And `CompleteInput.learnings` uses `rollupTo: ('epic' | 'project')[]` while the data model `learnings.jsonl` uses `rollup: true` (a boolean). These are different shapes for the same concept. Who transforms between them?

### IMPORTANT-06: Learning schema differs across three locations
**Severity:** IMPORTANT
**File:** `architecture/rpc-layer-api.md`, `architecture/data-model.md`, `architecture/state-machine-api.md`
**Resolution:** Define one canonical Learning type

- rpc-layer-api.md: `{ category, summary, detail, tags, rollupTo: ('epic' | 'project')[] }`
- data-model.md (learnings.jsonl): `{ category, summary, detail, tags, source, rollup: true }`
- state-machine-api.md: references `Learning[]` without defining it

Three different shapes. The RPC version uses `rollupTo` (array of targets), the stored version uses `rollup` (boolean). These must be reconciled — is the transformation documented? Where does `source` get populated?

### IMPORTANT-07: No `write-<field>` commands defined despite being referenced
**Severity:** IMPORTANT
**File:** `architecture/data-layer-api.md`, `architecture/commands-api.md`
**Resolution:** Add the commands or clarify the mechanism

The overview states: "Lifecycle-bound markdown (goals, plans) is written through CLI `write-<field>` commands with state validation." But no `write-*` commands appear in commands-api.md. How does the LLM write a slice goal or plan? This is a gap in the command surface.

### MINOR-01: `listEntities` return type is `OverviewEntity` (singular) instead of array
**Severity:** MINOR
**File:** `architecture/data-layer-api.md`
**Resolution:** Fix the return type

```typescript
function listEntities(collectionPath: string): OverviewEntity;
```

Should return `OverviewEntity[]` or the full overview object `{ items: OverviewEntity[] }`. As written, it returns a single entity for a list operation.

### MINOR-02: Guard pattern uses `STATE_GUARD_SKIP` as a control flow mechanism
**Severity:** MINOR
**File:** `architecture/state-machine-api.md`
**Resolution:** Consider a cleaner pattern

The transition table example uses `StateError` with code `STATE_GUARD_SKIP` to mean "this guard didn't match, try the next row." Using the error type for non-error control flow is confusing. A guard returning `false` (skip) vs `true` (match) vs `StateError` (reject) would be clearer.

### MINOR-03: `quest:start` vs `quest:create` — naming gap with Begin pattern
**Severity:** MINOR
**File:** `architecture/commands-api.md`
**Resolution:** Clarify naming

Quests have `quest:create` and `quest:start` but slices have `slice:create` and then use `slice:plan`/`slice:implement` to advance. If the pattern is supposed to be `begin`/`complete` (per the decision), neither entity follows it consistently in commands-api.md.

### MINOR-04: `StatusResult.artifacts` type is too loose
**Severity:** MINOR
**File:** `architecture/rpc-layer-api.md`
**Resolution:** Define known artifact keys

`artifacts: Record<string, number>` loses type information. Known artifact types (architecture files, research docs, brainstorm docs, prototypes, decisions, learnings) could be enumerated for better type safety.

### MINOR-05: No `--verbose` flag documented despite conventions.md referencing it
**Severity:** MINOR
**File:** `architecture/commands-api.md`, `architecture/conventions.md`
**Resolution:** Add to global flags or clarify

Conventions.md says "stderr for diagnostics (only with `--verbose`)" but `--verbose` doesn't appear in the global flags table in commands-api.md.

## Score: 5/10

The inter-subsystem APIs (state-machine-api.md, data-layer-api.md, rpc-layer-api.md) are individually well-designed with clear contracts and good depth hiding. The state machine's single `reduce()` entry point is excellent. The data layer's concurrent modification detection is thoughtful.

However, the command surface — the most visible and most important API contract — has fundamental inconsistencies with the decisions it's supposed to implement. The commands-api.md defines per-entity verb commands (`slice:plan`, `epic:explore`) while the decision defines generic orchestrator verbs (`begin`, `complete`) and the flows.md uses a third pattern (`goodplan begin plan --slice`). This isn't a minor naming quibble — it's a disagreement about the fundamental command structure that would block implementation.

The Learning type appearing in three different shapes across three files compounds the problem — it's unclear which is canonical.

To reach 9+: (1) Resolve the command surface pattern — pick one and update commands-api.md, flows.md, and the decision to agree. (2) Define `Phase` and `Target` types explicitly in rpc-layer-api.md. (3) Reconcile the Learning/CompleteInput shapes across all files so the transformation path is clear. (4) Add the missing `write-<field>` commands or document how lifecycle-bound markdown gets written. (5) Align the `--inline` vs `--inline-context` naming.

## Summary
- Critical: 2
- Important: 7
- Minor: 5
