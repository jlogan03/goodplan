# API Contract Review — Round 3

**Focus:** Interface consistency, naming, ergonomics, error contracts
**Goal alignment:** Deep modules, boundary quality, pure state machine, simplicity

---

## Summary

The command surface reconciliation in iteration 3 is substantially complete. The entity-namespace pattern is clean, the `submit-*` / state event wiring is explicit and correct, and the absence of a `context` command (replaced by `start-*`) is a good simplification. The state machine discriminated union is exhaustive with correct payloads. The layered error contract is consistent. What remains are a handful of cross-layer naming tensions, one ergonomics gap in the RPC public API, and some minor ambiguities.

---

## Critical Issues (0)

None.

---

## Important Issues (4)

### IMP-1: RPC `begin` / `complete` / `submit` don't map cleanly to entity-namespace commands — the phase vocabulary mismatch creates unnecessary translation cost

The RPC layer exposes `begin(phase, target)` / `complete(phase, target)` / `submit(phase, target)`. The `Phase` union includes values like `'define-architecture'`, `'refine-architecture'`, `'define-slices'`, `'refine-slices'` — but the Commands layer maps entity commands like `epic:define-architecture` → `begin('define-architecture', { type: 'epic', ... })`. This means the Commands layer must translate entity-verb to `Phase` string. The `Phase` type is underdefined for the quest entity: quest uses `'plan'`, `'refine-plan'`, `'implement'` (shared with slice) but also needs `'start'` (quest:start → BEGIN_QUEST). `'start'` is missing from the `Phase` union. The Commands layer has no way to route `quest:start` through `begin('start', ...)`.

**Fix:** Add `'start'` to the `Phase` union, or document that `quest:start` maps to `begin('create-journey', ...)` — whichever was intended. Verify all entity commands have a corresponding `Phase` value.

### IMP-2: `submit` function on the RPC layer is underdocumented — its relationship to `complete` is unclear

`rpc-layer-api.md` defines three functions: `begin`, `complete`, `submit`. The doc says `submit` handles `submit-*` commands. But `complete` also accepts a `CompleteInput` that carries `verificationPassed`, `deferred`, `learnings`, `architectureDelta`. It's not clear whether `slice:complete` maps to `rpc.complete(...)` or `rpc.submit(...)`. The command-to-RPC routing is implied but not stated. The `commands-api.md` example shows `rpc.complete('slice', input.slice, input.payload, input.options)` for `slice:complete` — but that's the only example and it only covers one command.

This is an ergonomics problem for implementors: which RPC function does each entity command call?

**Fix:** Add a routing table in `rpc-layer-api.md` (or a cross-ref to `commands-api.md`) mapping each entity command category to the RPC function it calls. Clarify: entity lifecycle commands (epic:complete, slice:complete) → `rpc.complete()`; sub-agent submit commands → `rpc.submit()`.

### IMP-3: `COMPLETE_SLICE` event payload carries `verificationPassed` — but `slice:complete` is the command that sets this, not `submit-implementation`

The state machine event `COMPLETE_SLICE` carries `verificationPassed: boolean`. The command `slice:complete` is what the orchestrator calls after implementation. But the orchestrator never sees implementation content — sub-agents call `submit-implementation`. There's a missing link: who determines `verificationPassed` and when? The `flows.md` completion flow shows `slice:complete` accepting stdin with `verificationPassed` — which implies the orchestrator (or human) asserts this after reviewing the sub-agent summary. But this is never stated explicitly. If verification is automatic (based on test results in `submit-implementation`), the payload should be on `submit-implementation`, not `slice:complete`.

**Fix:** Clarify whether `verificationPassed` is: (a) a human/orchestrator assertion passed via `slice:complete` stdin, or (b) derived from implementation results stored during `submit-implementation`. State this explicitly in `commands-api.md` or `flows.md`. The current design implies (a) — if that's correct, state it.

### IMP-4: Error exit code inconsistency between `commands-api.md` and `invariants.md`

`commands-api.md` (Contracts → Consistent Error Output) says: "Exit codes: 1 internal errors, 2 validation/usage errors, 3 state machine errors."

`invariants.md` (INV-006) says the same.

`commands-api.md` (Fitness Functions → "Every error produces structured JSON") says: "exit code is 2 (validation) or 1 (other)" — silently dropping exit code 3.

The fitness function description is incomplete and contradicts the contract above it in the same file.

**Fix:** Update the fitness function description in `commands-api.md` to include exit code 3 for state machine errors, matching the contract above it.

---

## Minor Issues (5)

### MIN-1: `quest:create` takes no flags, but `epic:create` and `slice:create --epic <name>` do — underdocumented intentional difference

`quest:create` has no `--name` or `--goal` flag shown. `epic:create` has none either (presumably uses stdin). `slice:create --epic <name>` requires `--epic`. The asymmetry between quests and slices (slices need an epic parent, quests are freestanding) is correct per the data model, but it's not explained. Someone implementing `quest:create` might wonder if `--quest` or `--goal` is missing.

**Fix:** Add a one-line note to the quest lifecycle section explaining that quests are not epic-scoped (unlike slices), so no `--epic` flag is needed.

### MIN-2: `start-implementation` has no `--quest` variant listed, but quest:implement exists

The sub-agent commands list `start-implementation --slice <name>` but not `start-implementation --quest <name>`. Yet `quest:implement` exists as a lifecycle command. If quests have an implementation phase, sub-agents need `start-implementation --quest` too. If quests don't use sub-agents for implementation, that should be stated.

**Fix:** Either add `--quest` to `start-implementation`, or note that quest implementation is handled directly (no sub-agent / no `start-implementation` for quests).

### MIN-3: `resource:activity list [--scope <scope>]` — `<scope>` format is unspecified

All other resource commands use clear flag names matching entity types (`--epic <name>`, `--slice <name>`). The `--scope` flag on `resource:activity` is the only one with an untyped `<scope>` value. It's unclear whether scope is a string like `"slices/01-auth"`, an entity type, or something else.

**Fix:** Specify the format of `--scope` (e.g., `--scope slices/01-auth` or `--scope epic:<name>`).

### MIN-4: `submit-refinement` triggers `COMPLETE_REFINEMENT_ROUND` OR `COMPLETE_QUEST_REFINEMENT_ROUND` — but disambiguation logic isn't specified

The command-to-event mapping table shows `submit-refinement` maps to `COMPLETE_REFINEMENT_ROUND` (or `COMPLETE_QUEST_REFINEMENT_ROUND`). The disambiguation is presumably based on whether `--slice` or `--quest` is provided. This is implied but not stated. The same applies to `submit-plan`.

**Fix:** Add a note (one sentence) that the `--slice` vs `--quest` flag determines which event variant is triggered.

### MIN-5: `WorkflowOptions` only contains `inlineContext` — but `override` is a distinct option that should appear here

The `--override` flag is documented on `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, and `quest:refine-plan`. These all go through `rpc.complete()` (or `rpc.submit()`). But `WorkflowOptions` only has `inlineContext`. The `override` flag must reach the RPC layer somehow to be included in the `StateEvent` payload. It's not shown in `WorkflowOptions` or in the `CompleteInput` type.

**Fix:** Add `override?: boolean` to either `WorkflowOptions` or `CompleteInput` (whichever the RPC layer uses to pass it to the state event). Verify it flows through to the `COMPLETE_*_ROUND` event payloads.

---

## Positive Observations

- The discriminated union in `state-machine-api.md` is complete and well-typed. Every event carries exactly its required payload. No stringly-typed catch-all.
- The `submit-*` / state event mapping table is explicit and correct. The single-call contract (content write + state transition in one `commitState`) is well-specified.
- Removing the standalone `context` command and replacing it with `start-*` is the right simplification. Context bundling is now only reachable by sub-agents, which matches the access pattern.
- `_derived` fields as read-only guard inputs, never written back, is a clean separation between computed and stored state.
- The concurrent modification detection contract (`DATA_CONCURRENT_MODIFICATION` on both `commitState` and `writeEntity` with `expected`) is thorough.
- `goodplan schema --command <path>` for self-describing CLI is an excellent LLM ergonomics feature.
- The `override` flag flowing through the state machine (INV-001 compliance) rather than being handled at the RPC layer is the right call.

---

## Verdict

The architecture is in good shape for iteration 3. The entity-namespace surface is consistent. The critical invariant (all mutations through state machine) is enforced by architecture. The four issues above are ergonomics and completeness gaps, not design problems. The most impactful fix is IMP-1 (Phase union completeness) since it's a type error that would surface immediately in implementation.
