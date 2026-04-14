# Learnings: 02-invariant-engine

## Domain

1. **CheckContext pre-indexing is the right abstraction for event-sourced invariants.** Pre-building `eventsByType` and `eventsByScopeRef` maps in `buildCheckContext()` gives O(1) lookups to all 24 rules. This eliminated per-rule linear scans and kept rule implementations clean (3-15 lines each).

2. **Invariants that span domains need explicit multi-domain `appliesTo`.** Several rules that logically belong to "epic" enforcement actually trigger on events from other domains (e.g., `epicArchitectureShapeApprovalRequired` triggers on `pressure-test-drafted` from the `pressure-test` domain). The `appliesTo` array must list ALL triggering domains, not just the rule's logical home domain.

3. **Spine milestone rule is underspecified.** `spine.write-only-via-milestone` checks that the immediately preceding event is `milestone-committed`, but the milestone system itself is not yet built. This rule is marked `custom` with a TODO. It will need refinement when milestone design lands in a later slice.

## Architecture

4. **`ruleType` instead of `type` was the right call.** Avoided collision with the JS `type` keyword and the `type` field on event envelopes. This is an intentional deviation from the architecture doc that should be documented as canonical.

5. **Ports-and-adapters for GitOps works cleanly.** The `GitOps` interface at `src/engine/interfaces/git-ops.ts` with `MemoryGitOps` in test fixtures provides full testability without filesystem access. 3 methods cover all current needs.

6. **Dependency injection via function parameters beats dynamic imports.** `createReplayGetContext` accepts `replayEvents` as a parameter rather than importing it. This keeps the invariant engine independent of the event engine's concrete implementation, honoring the architecture's dependency rules while remaining statically analyzable.

## Code Patterns

7. **`narrowPayload` with Zod safeParse is a clean pattern for erased envelopes.** Rules operate on `AnyEventEnvelope` (unknown payload) and narrow via Zod. Failed parse means "this rule doesn't apply to this event shape" -- returns null, not an error. This pattern is reusable across the codebase.

8. **Conditional spread for exactOptionalPropertyTypes.** `...(data.context !== undefined ? { context: data.context } : {})` is the required pattern. Documented in the `InvariantViolation` type comment for future contributors.

9. **Helper functions centralize common patterns.** `_helpers.ts` exports `lastEvent`, `findLatest`, `countMatching`, `hasEventOfType`, `narrowPayload` -- used across all 12 rule files. Keeps individual rules focused on business logic.

## Dependencies

10. **Zod is used for payload narrowing in rules, not just schema validation.** Rules import Zod to define inline payload schemas for type-safe access. This is a lightweight usage that doesn't pull in the full schema registry.

## Plan Accuracy

11. **Plan was highly accurate.** The 4-phase structure (framework, entity-lifecycle rules, domain rules, integration) mapped cleanly to implementation. The main deviation was `ruleType` vs `type` naming, which was anticipated in the plan's implementation details.

12. **YAML loader required a custom parser.** The plan specified YAML loading but the implementation uses a hand-rolled parser rather than a YAML library dependency. This keeps the dependency footprint small but limits the DSL to flat key-value structures.
