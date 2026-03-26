# Software Architecture Review — Phase 1: Show Artifact Enrichment

## Issues

**[IMPORTANT]** Missing `completion` boolean from epic target architecture

The epic's `cli-interaction-conventions.md` (line 238) specifies a `completion` boolean in the artifact shape for slices. The `cli-changes.md` (line 110-124) omits it. The implementation follows `cli-changes.md` and omits `completion`. The research file (item 6) flagged this discrepancy. Since the convention doc is the consumer-facing spec that skills will code against, the omission should be resolved explicitly — either add `completion` now (detecting a completion marker file) or document why it's excluded.

File: src/core/artifacts.ts:107
Resolution: USER_INPUT

**[MINOR]** Zod artifact schemas defined but never used at runtime

`sliceArtifactFlagsSchema` and `epicArtifactFlagsSchema` in `src/schemas/commands/artifacts.ts` are defined but never imported outside the file (no validation, no `schema` command output). The plan notes output schema exposure is deferred. This is acceptable for now — the schemas serve as type documentation and will be used when output schema exposure is implemented. However, the integration tests mention "Validate `show --json` output against the response schema" in the plan tasks but the actual integration test does not perform schema validation. This is a minor gap.

File: src/schemas/commands/artifacts.ts:14
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Defensive fallback to empty directory is unreachable

In all three show commands (slice, epic, quest), after `getJson()` succeeds (entity exists), `getDir()` for the same entity path should always return a `DirectoryEntry` — the entity JSON lives inside that directory, so the directory must exist. The fallback `detectArtifacts({ type: "directory", contents: {} }, ...)` is defensive code for an unreachable path. Not harmful, but adds visual noise. Consider simplifying with a non-null assertion or extracting a helper.

File: src/commands/slice/show.ts:43
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is architecturally sound. Module placement is correct (`src/core/artifacts.ts` as a pure tree interpreter peer to `tree.ts`), dependency direction is right (Commands imports from core, not the reverse), the state machine boundary is respected (no imports from `src/core/state/`), and all invariants are preserved. The function is genuinely pure — no I/O, deterministic, testable in isolation with in-memory tree fixtures. The overloaded signature pattern provides good type narrowing at call sites.

To reach 9+: resolve the `completion` boolean discrepancy with the epic target architecture, and use the Zod schemas for runtime validation in at least the integration tests (bridging the INV-005 intent).

## Summary
- Critical: 0
- Important: 1
- Minor: 2
