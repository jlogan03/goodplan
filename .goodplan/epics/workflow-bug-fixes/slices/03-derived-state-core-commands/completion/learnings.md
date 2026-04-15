# Learnings: 03-derived-state-core-commands

## Domain

1. **Event-sourced state computation is straightforward for a single-user CLI.** The derived state computer replays ~200-400 events per scope in <50ms. The no-cache approach is justified for v2 -- no performance optimizations needed yet.

2. **Phase detection is cleanest as reducer side-effects.** Rather than a separate post-processing pass, tracking phase transitions inside the entity-lifecycle reducer as events are processed is both simpler and correct -- each event that advances a phase boundary updates the phase field immediately.

3. **Filesystem scanning fallback for artifacts is pragmatic but creates a hybrid model.** `buildStatusResult` must read the filesystem for architecture/research/brainstorm/prototype file lists because artifact-tracking events don't exist yet. This creates a dual-source-of-truth situation that should be resolved as artifact events are added in later slices.

## Architecture

4. **Map<string, T> vs z.record() dual-type pattern works well.** Using TypeScript interfaces with `Map` for runtime state and Zod `z.record()` only for serialized JSON output avoids the Zod v4 limitation (no `z.map()`). The `serializeDerivedState` recursive walker handles the conversion cleanly.

5. **DeepReadonly<T> signals immutability without Object.freeze overhead.** The recursive type utility handles Map, Set, Array, and plain objects correctly. No runtime cost, good IDE support, caught two mutation attempts during development.

6. **replayAllScopes I/O shell is an acknowledged ports-and-adapters deviation.** The derived state computer (`computeDerivedState`) remains pure, but `replayAllScopes` does filesystem discovery via `fs.readdirSync` directly rather than through an injected adapter. This is pragmatic for now but should be noted for future refactoring if testability becomes an issue.

7. **CheckContext extension via optional field worked as designed.** The slice-02 `CheckContext` interface was pre-designed for this extension. Adding `derivedState?: DerivedStateData` with the conditional spread pattern (`...(derivedState !== undefined ? { derivedState } : {})`) satisfied `exactOptionalPropertyTypes` correctly.

## Code Patterns

8. **Entity-based event schema naming (project.ts, not entity-lifecycle.ts) is more navigable.** When looking for event payloads, searching by entity name is more intuitive than by domain name. This convention should be maintained for all future event schema files.

9. **Conditional spread for exactOptionalPropertyTypes is a recurring pattern.** Used in CheckContext, MutatingCommandOutput (phase field), and buildStatusResult. Consider a utility helper if the pattern continues to proliferate.

10. **Sub-package convention for complex commands (status/build-result.ts) provides clean separation.** Moving the pure `buildStatusResult` function out of the citty command file makes it independently testable without CLI infrastructure.

## Plan Accuracy

11. **Plan was highly accurate for phases 1-3.** File list, implementation details, and verification steps all matched. The plan's decision to use `as Record<string, unknown>` for payload access in reducers (rather than discriminated union narrowing) was pragmatic given the incremental event type coverage.

12. **gp init kept v1 error code (STATE_ALREADY_INITIALIZED) instead of v2 ALREADY_EXISTS.** The plan specified switching to `ALREADY_EXISTS` per v2 error codes in commands.md, but the implementation kept the v1 error code for backward compatibility with existing tests. This is a minor deviation -- the error code migration should happen when all commands are v2.

13. **gp schema retained the full v1 command registry alongside new v2 entries.** Rather than trimming to only v2 commands (as the plan suggested), all v1 commands remain registered. This is correct for backward compatibility since skills query the schema to discover commands.
