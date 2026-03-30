# TypeScript and JavaScript Review — Phase 1: Registry & Core Function

## Issues

**[CRITICAL]** TypeScript compiler error: unreachable comparisons in `computeNextCommands`
The `entityType` variable is cast via `as NextCommandsEntityType` on line 583, which strips `"project"` and `"rollup"` from the type. The subsequent comparisons on line 586 (`entityType === "project" || entityType === "rollup"`) are flagged as TS2367 because the type system knows `NextCommandsEntityType` excludes those values. The runtime guard is correct in intent but the type assertion defeats the type narrowing. Fix: check `target.type` directly (before the cast) instead of `entityType`, or narrow on `target.type` first and only cast afterward.
File: src/core/rpc/next-commands.ts:583-588
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `commandMappings` built as module-level side effect — no lazy initialization or test reset
`buildCommandMappings()` runs at import time (line 538). This means: (1) any import of this module triggers computation, even if `computeNextCommands` is never called; (2) tests cannot reset or reconfigure the registry. For a Developing-maturity subsystem this is acceptable in the short term, but the module-level mutation of a `Map` is a latent test isolation risk. Consider wrapping in a lazy singleton (`let built = false; function ensureBuilt()`) or exporting a `getCommandMappings()` function. This is not blocking since tests currently pass and the registry is deterministic.
File: src/core/rpc/next-commands.ts:538
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `expandWildcard` handles `*(terminal)` but it's never used in current transition tables
The `*(terminal)` branch (line 485) exists but no transition table uses that wildcard. This is dead code at present. The comment on line 474 says terminal wildcards are "always paired with `to: '(error)'` and eliminated by the error filter" — which contradicts having an explicit expansion for it. Either remove the branch or add a comment explaining it's forward-looking.
File: src/core/rpc/next-commands.ts:485-488
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fitness test `description drift check` asserts descriptions must DIFFER from commandRegistry
The test on line 207 asserts `entry.description !== registryEntry.description`. This is a fragile heuristic — if someone intentionally uses the same description for both, the test fails with a misleading message about "copy-paste drift." The intent (detect stale copy-paste) is good, but the mechanism inverts: it penalizes correct alignment rather than detecting staleness.
File: tests/fitness/command-metadata-coverage.test.ts:201-217
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Unit test uses `as Target` assertion for decision target
Line 89: `{ type: "decision", id: "DEC-001" } as Target` — this works but bypasses TypeScript's structural checking. The object literal already satisfies `Target` (the `{ type: "decision"; id: string }` variant), so the `as` cast is unnecessary. Remove it for stricter checking.
File: tests/unit/rpc/next-commands.test.ts:89
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Unit test uses `as Target` for project target too
Line 97: `{ type: "project" } as Target` — same issue, the literal already matches the `{ type: "project" }` variant.
File: tests/unit/rpc/next-commands.test.ts:97
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The core design is solid: pure functions, transition-table-driven derivation, clean separation from the state machine, and good bidirectional fitness coverage. The CRITICAL compiler error must be fixed — the codebase has `strict: true` with no suppressions, so `tsc --noEmit` failing is a blocking issue. The IMPORTANT item (module-level side effect) is a design smell but acceptable for now. To reach 9+: fix the compiler error, address the lazy-init concern (even just a comment acknowledging the tradeoff), and clean up the minor test assertions.

## Summary
- Critical: 1
- Important: 1
- Minor: 4
