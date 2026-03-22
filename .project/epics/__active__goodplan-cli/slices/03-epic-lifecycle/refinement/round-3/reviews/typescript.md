## Issues

**[IMPORTANT]** Phase 1: `refinement` field definition conflicts with existing `refinementSchema` in shared.ts

Phase 1 task says to add a `refinement` field to `epicSchema` with inline schema: `z.object({ round: z.number(), maxRounds: z.number(), scoreHistory: z.array(z.object({ round: z.number(), scores: z.record(z.number()), timestamp: z.string() })) }).nullable()`. Two problems:

1. A `refinementSchema` already exists in `src/schemas/shared.ts` and is already imported by `sliceSchema` and `questSchema`. The epic schema should reuse it (`refinementSchema.nullable()`) rather than defining a conflicting inline schema. This was a round-2 issue about slice/quest needing refinement -- the answer is they already have it via the shared schema.

2. The inline schema includes a `timestamp` field on score history entries, but the existing `scoreEntrySchema` in shared.ts only has `{ round, scores }` -- no `timestamp`. Either the plan should note that `scoreEntrySchema` needs a `timestamp` field added (which would affect slice/quest schemas too), or it should drop the `timestamp` from the epic refinement schema to match the existing shared schema. Using inconsistent schemas across entities violates the "narrow interfaces" principle and will cause confusing Zod validation failures.

Fix: Replace the inline schema with `refinement: refinementSchema.nullable()` (matching slice/quest). If `timestamp` is genuinely needed on score entries, add it to `scoreEntrySchema` in shared.ts as a separate task, noting the schema migration impact.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1: Architecture amendment for `ts` on CREATE_EPIC and ACTIVATE_EPIC needs explicit task

The plan correctly identifies that `CREATE_EPIC` and `ACTIVATE_EPIC` need `ts: string` and says "Architecture amendment required: add `ts: string` to CREATE_EPIC and ACTIVATE_EPIC in state-machine-api.md's canonical StateEvent union." This addresses the round-2 concern. However, the amendment is buried in a description paragraph -- it should be a separate checked task item so it doesn't get missed during implementation. The implementer adding event types to `state-events.ts` will reference the canonical union in state-machine-api.md, and if the architecture doc hasn't been updated first, they'll implement the wrong signatures.

Fix: Add an explicit task: "Amend state-machine-api.md: add `ts: string` to `CREATE_EPIC` and `ACTIVATE_EPIC` event definitions in the canonical StateEvent union."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4: `BeginPayloadMap` type defined in types.ts but `begin()` signature doesn't show typed payload parameter

Phase 4's types.ts task mentions defining `BeginPayloadMap` mapping phase to payload shape, and begin.ts task mentions a `payload` parameter. But the begin.ts task's signature is `begin(phase: BeginPhase, target: Target, options?: WorkflowOptions)` with no payload parameter. The payload typing (from round-2 feedback) was added to the description but not reflected in the actual function signature. The implementer needs to know where `payload` goes -- is it a fourth parameter, is it part of `WorkflowOptions`, or does `options` become a union?

Fix: Update the begin.ts task signature to include the payload parameter explicitly, e.g., `begin(phase: P, target: Target, payload: BeginPayloadMap[P], options?: WorkflowOptions)` where `P extends BeginPhase`. This preserves compile-time type safety per the types.ts task description.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: `submit()` redundant `phase` parameter acknowledged but resolution unclear

Round-2 flagged that `phase` appears both as a top-level parameter and inside `SubmitInput.phase`. The plan now acknowledges this ("intentionally redundant") and says "the implementation should assert this." This is acceptable but the assertion mechanism isn't specified. Since both are string literals, a simple `if (phase !== content.phase) throw` suffices, but this should be noted in the task to avoid an implementer thinking the redundancy is a bug and "fixing" it by removing one.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2: `loadState()` signature uses optional `projectDir?` but `assembleState()` uses it to mean "no project = ZERO_STATE"

Phase 2's loadState task says `loadState(projectDir?)`. The existing `assembleState(projectDir?)` returns `ZERO_STATE` when `projectDir` is undefined. The plan says loadState falls back to `assembleState()` on cache miss. This is fine, but the optional parameter semantics should be explicit: when `projectDir` is undefined, loadState should also return `ZERO_STATE` directly (no cache interaction). The current wording could lead to attempting cache reads with an undefined path.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: Handler Map refactor should preserve exhaustiveness checking

The plan says to replace the switch with a handler Map. The current switch has a TODO note about adding a `never` exhaustiveness check when more events are added. With a Map, exhaustiveness is lost -- a missing handler silently falls through to the "unknown type" error path. The plan should note that the Map should be typed `Map<StateEvent['type'], Handler>` and that a build-time or test-time check should verify all event types in the union have entries. This is particularly important with `noUncheckedIndexedAccess: true` in the tsconfig -- `Map.get()` returns `T | undefined`, which naturally forces the error path, but doesn't catch missing handlers at compile time.

Fix: Add a note to the handler Map task: "Include a compile-time or test-time exhaustiveness check ensuring every `StateEvent['type']` literal has a corresponding handler entry." A `satisfies Record<StateEvent['type'], Handler>` on the object before converting to Map would provide this.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan improved significantly from round 2. Key round-2 issues are addressed: `ts` field is clarified with an architecture amendment note, `begin()` payload mechanism is designed, cache format includes `dirMtimes`, the transition table export decision is made (export preferred), `epic:list` return shape is specified, and submit-plan schema validation is clarified. The remaining issues are: (1) the inline `refinement` schema in Phase 1 conflicts with the existing shared `refinementSchema` (most impactful -- will cause implementation confusion); (2) the architecture amendment needs to be a discrete task; (3) the `begin()` typed payload needs to be in the signature, not just the description. To reach 9+: fix the refinement schema to use the shared one, make the architecture amendment a task item, and update the begin() signature.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
