# Software Architecture Review — Phase 1: Registry & Core Function

## Issues

**[IMPORTANT]** Unused `toStatus` variable in `buildCommandMappings` — dead code indicates incomplete `(same)` expansion logic
The variable `toStatus` is computed on line 503 of `next-commands.ts` but never used. The `fromStatus` is used as the map key, which is semantically correct (the map answers "what commands are available when an entity is IN this status"). However, the `(same)` expansion resolves `to` to the concrete `fromStatus` value, and the intent was clearly to use `toStatus` somewhere (perhaps to also index by destination status). As written, `toStatus` is dead code and Biome correctly flags it. The fix is simple: remove the `toStatus` variable entirely, since the keying-by-`fromStatus` approach is correct and `toStatus` adds no value. The `(same)` expansion is already handled by the fact that wildcard `from` values are expanded and each concrete `fromStatus` becomes a key in the map.
File: src/core/rpc/next-commands.ts:503
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `commandMappings` built as module-level side effect — no lazy init or testability seam
`buildCommandMappings()` runs at module init (line 538). This is fine for production but means the registry is built once and cannot be reconstructed or inspected in tests. If a test ever needs to verify the registry contents directly (e.g., checking that a specific status maps to specific commands), it must go through `computeNextCommands`. This is acceptable given that the fitness test validates reachability indirectly, and the registry is deterministic. No action needed now, but flagging for awareness.
File: src/core/rpc/next-commands.ts:538
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `computeNextCommands` accepts `Target` but immediately casts to `NextCommandsEntityType`
Line 583 casts `target.type as NextCommandsEntityType`, then checks for `"project"` and `"rollup"` on line 586. The type narrowing could be done without a cast — check for excluded types first, then let TypeScript narrow naturally. This is cosmetic but avoids the `as` cast which the project's CLAUDE.md discourages (anti-pattern: `as any`/`@ts-ignore`). The `as NextCommandsEntityType` is technically safe since the excluded types are checked immediately after, but a guard-first pattern is cleaner:
```ts
if (target.type === "project" || target.type === "rollup") {
  return { entity: [], other: [] };
}
const entityType: NextCommandsEntityType = target.type;
```
File: src/core/rpc/next-commands.ts:583-586
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation. The registry derivation approach is well-designed — it correctly inverts transition tables at init time and prevents manual maintenance of a parallel status-to-command mapping. Dependency direction is correct: the RPC layer imports from the state machine (transition tables) and schemas, never from the Commands layer. The `commandToEvent` array's `as const satisfies ReadonlyArray<...>` pattern provides compile-time validation that event strings are real `StateEvent` types. Module boundaries are clean — types, registry, and computation are co-located in a single file with a well-defined public API surface (`computeNextCommands`, `commandToEvent`, types). The fitness test provides bidirectional coverage ensuring the registry stays in sync. The one unused variable is the only substantive issue preventing a perfect score.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
