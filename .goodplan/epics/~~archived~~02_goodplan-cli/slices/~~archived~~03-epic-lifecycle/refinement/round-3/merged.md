# Merged Review Feedback — Epic Lifecycle Plan (Round 3)

Reviewers: software-architecture (9/10), typescript (8/10)

## Issues

**[IMPORTANT] Phase 1: `refinement` field definition conflicts with existing `refinementSchema` in shared.ts**

Phase 1 defines an inline `refinement` schema on `epicSchema` with `z.object({ round, maxRounds, scoreHistory: z.array(z.object({ round, scores, timestamp })) })`. Two problems:

1. `refinementSchema` already exists in `src/schemas/shared.ts` and is imported by `sliceSchema` and `questSchema`. The epic schema should reuse it (`refinementSchema.nullable()`) rather than defining a conflicting inline schema.
2. The inline schema includes a `timestamp` field on score history entries, but the existing `scoreEntrySchema` only has `{ round, scores }`. Using inconsistent schemas across entities violates "narrow interfaces" and will cause confusing Zod validation failures.

Fix: Replace the inline schema with `refinement: refinementSchema.nullable()`. If `timestamp` is genuinely needed on score entries, add it to `scoreEntrySchema` in shared.ts as a separate task noting schema migration impact.

Flagged by: software-architecture, typescript
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/01-state-event-types.md`

---

**[IMPORTANT] Phase 1: Architecture amendment for `ts` on CREATE_EPIC and ACTIVATE_EPIC needs explicit task**

The plan correctly identifies the amendment needed but buries it in a description paragraph. It should be a separate checked task item so the implementer updates `state-machine-api.md` before implementing event types in `state-events.ts`.

Fix: Add an explicit task: "Amend state-machine-api.md: add `ts: string` to `CREATE_EPIC` and `ACTIVATE_EPIC` event definitions in the canonical StateEvent union."

Flagged by: typescript
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/01-state-event-types.md`

---

**[IMPORTANT] Phase 4: `begin()` signature doesn't include typed payload parameter**

Phase 4 defines `BeginPayloadMap` in types.ts and mentions a `payload` parameter in the begin.ts description, but the actual function signature is `begin(phase, target, options?)` with no payload parameter. The implementer needs to know where payload goes.

Fix: Update begin.ts task signature to `begin<P extends BeginPhase>(phase: P, target: Target, payload: BeginPayloadMap[P], options?: WorkflowOptions)`.

Flagged by: typescript
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/04-rpc-layer.md`

---

**[IMPORTANT] Phase 3: slice-submit.ts tests require manually constructed state fixtures**

The COMPLETE_PLAN guard checks `hasChild(state, "slices/<name>", "plan.md")`, but slice creation (CREATE_SLICE, BEGIN_PLAN) is deferred to slices 04-05. Tests must manually construct a state tree with a slice in `planning` status using `setEntry` rather than running through the slice creation workflow. The plan should note this explicitly.

Flagged by: software-architecture
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/03-epic-state-machine.md`

---

**[MINOR] Phase 4: `submit()` redundant `phase` parameter assertion needs specified error type**

Both `phase` (top-level parameter) and `SubmitInput.phase` are intentionally redundant and must match. The plan says "assert this" but doesn't specify the error type or mechanism. Since the CLI constructs both values, a mismatch is an internal consistency failure — use `INTERNAL_ERROR`, not a user-facing validation error. Also note in the task that the redundancy is intentional so an implementer doesn't "fix" it by removing one.

Flagged by: software-architecture, typescript
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/04-rpc-layer.md`

---

**[MINOR] Phase 3: Handler Map refactor should preserve exhaustiveness checking**

Replacing the switch with a handler Map loses compile-time exhaustiveness checking. With `noUncheckedIndexedAccess: true`, `Map.get()` returns `T | undefined` (forces error path) but doesn't catch missing handlers at compile time.

Fix: Add a note: "Use `satisfies Record<StateEvent['type'], Handler>` on the object before converting to Map to provide compile-time exhaustiveness."

Flagged by: typescript
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/03-epic-state-machine.md`

---

**[MINOR] Phase 3: Transition table export creates coupling between state machine and fitness functions**

The plan picks `export const epicTransitions: { from, event, to }[]` — a good choice for experimental maturity since it makes transitions testable without constructing state trees. Note: if the state machine later matures, evaluate whether this export leaks implementation details.

Flagged by: software-architecture
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/03-epic-state-machine.md`

---

**[MINOR] Phase 2: loadState incremental path should reference schema registry**

The plan says new files are parsed as "the appropriate entry type" but doesn't specify how the Zod schema is determined. The answer is `findSchema()` from `src/core/data/schema-registry.ts`. Reference it explicitly.

Flagged by: software-architecture
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/02-data-layer-upgrades.md`

---

**[MINOR] Phase 2: `loadState(projectDir?)` undefined semantics should be explicit**

When `projectDir` is undefined, `loadState` should return `ZERO_STATE` directly with no cache interaction. The current wording could lead to attempting cache reads with an undefined path.

Flagged by: typescript
Resolution: DIRECTLY_ACTIONABLE
File: `plan-refining/02-data-layer-upgrades.md`

## Contradictions

None. Both reviewers agreed on the refinement schema issue and submit redundancy issue; their recommendations are compatible.

## Summary

| Metric | Count |
|---|---|
| Critical | 0 |
| Important | 4 |
| Minor | 5 |
| DIRECTLY_ACTIONABLE | 9 |
| RESEARCH_NEEDED | 0 |
| USER_INPUT | 0 |
| Contradictions resolved | 0 |
| Duplicates merged | 2 |
