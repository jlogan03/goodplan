# Learnings — 05-epic-lifecycle-commands

## Domain

1. **Epic lifecycle has 14+ distinct event types spanning 4 domains.** The entity-lifecycle, exploration, pause-steering, and pressure-test domains each require different reducer treatment. Mapping these cleanly to citty commands required splitting v1 monolithic commands (e.g., `explore.ts`) into 2-5 granular commands each.

2. **ContentRef pattern is the right abstraction for artifact storage.** Using `git hash-object -w` to store content as git blobs and referencing by SHA decouples artifact content from file system layout. This enables event payloads to be small (just the SHA reference) while content remains durable and addressable.

3. **Phase transitions are enforced by invariant rules, not command logic.** Commands just append events; the invariant engine prevents invalid transitions. This is cleaner than embedding state machine logic in each command.

## Architecture

4. **Context Bundler integration via `context-helper.ts` is clean and non-blocking.** The helper wraps `buildContextBundle` in a try/catch so context bundle failures never block the command itself. This advisory pattern is the right tradeoff — context bundles are for skill optimization, not command correctness.

5. **ContentResolver injection keeps the bundler testable.** By accepting `(ref: ContentRef) => string` as a parameter, the bundler is a pure computation module testable with mocks. The real resolver (`readContentRef` via `git cat-file blob`) is injected at call sites.

6. **Phase-spec lookup table pattern works well for 18 phases.** Having a `Record<Phase, PhaseSpec>` with explicit inline/reference keys for each phase is more maintainable than conditional logic. Easy to review and audit against the architecture spec.

7. **Layer boundary fitness test (`v2-layer-boundaries.test.ts`) catches violations early.** Adding this in Phase 1 meant that as 25+ command files were added in later phases, import direction was automatically verified.

## Code Patterns

8. **V2 command boilerplate is significant but consistent.** Every mutating command follows the same 7-step pattern: resolve project dir, check entity exists, read stdin, wire invariant engine, append event, build output, handle errors. The `globalArgs` spread and `InvariantError` catch pattern are reused across all 25+ commands.

9. **Conditional spread for `exactOptionalPropertyTypes` works throughout.** The `...(contextBundle !== undefined ? { contextBundle } : {})` pattern is used in every phase-starting command's output. This is verbose but correct.

10. **Event payload schemas as a single map (`EpicEventMap`) enables type-safe dispatch.** The `EpicEventPayload<T>` generic type allows commands to get type-checked payloads without runtime overhead.

## Dependencies

11. **`execSync` for git operations is synchronous but acceptable.** Both `storeContentRef` and `readContentRef` use `execSync` which blocks the event loop. This is fine for a CLI tool but would need to change if the bundler is ever used in a server context.

## Plan Accuracy

12. **Plan was highly accurate.** The 5-phase decomposition mapped cleanly to implementation. The existing code audit in the plan (listing all existing reducers, invariant rules, and event types) prevented significant rework. The main divergence was the addition of `context-helper.ts` as a shared helper — this was not explicitly planned but emerged naturally from the repetition across 6 phase-starting commands.

13. **V1 file removal was scoped correctly.** The plan identified 15 v1 commands to remove from the registry (commented out in `main.ts`). The v1 files themselves were left in place (not deleted) to avoid breaking any remaining v1 references. This was the right conservative choice.
