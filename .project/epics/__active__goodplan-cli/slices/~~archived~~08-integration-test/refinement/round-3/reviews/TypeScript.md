# TypeScript Review (Round 3) -- Integration Tests & Fitness Functions

## Round 2 Issue Resolution Check

All 5 round-2 TypeScript issues have been addressed in the current plan:

- **IMP: `handlerRecord` export specification** -- Fixed. Overview and Phase 3 task both now say "add `export` to `const handlerRecord` on line 69; the `handlers` Map on line 111 remains unexported." Verified against actual `reduce.ts` -- line 69 is indeed `const handlerRecord`, line 111 is indeed `const handlers`.
- **IMP: vitest config underspecified** -- Fixed. Plan now specifies "single `vitest.config.ts` at project root with `testTimeout: 30_000`" and notes it is simplest for a single-package project. Good choice.
- **MIN: `buildBinary()` caching** -- Fixed. Plan now specifies Vitest `globalSetup` for compilation, with explicit rationale that `beforeAll` scopes to a single file.
- **MIN: `json` typed `unknown`** -- Fixed. `runCommand` description now explicitly says "`json` field typed as `unknown` (not `any`) to enforce narrowing under `noUncheckedIndexedAccess`."
- **MIN: `concurrent-modification.test.ts` call pattern** -- Fixed. Plan now specifies `commitState(dir, state, state)` as the exact call pattern and removes the misleading `loadState()` alternative.

## Issues

**[MINOR]** `buildBinary()` helper says it "returns the binary path" but `globalSetup` runs in a separate context

Vitest `globalSetup` executes in a separate module context from test files. The `buildBinary()` function described in the helpers module cannot directly receive data from `globalSetup`. The plan should clarify the bridging mechanism: `globalSetup` compiles the binary to a well-known path (e.g., `./goodplan` in the project root, which is what `bun build --compile` already produces), and `buildBinary()` in the helper simply returns that known path (or asserts the file exists). This is not a correctness issue -- implementers will figure it out -- but the current wording implies `globalSetup` and `buildBinary()` are one mechanism when they are two separate pieces.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `transition-completeness.test.ts` cannot easily count `StateEvent` union members at runtime

The plan says "verify the key count in `handlerRecord` matches the `StateEvent` union member count." But `StateEvent` is a TypeScript discriminated union -- it has no runtime representation. The plan doesn't specify how to derive the expected count. Options: (a) hardcode the count (fragile), (b) count the exported union members from `state-events.ts` by parsing the source (same approach as the purity test), (c) import all event schemas and count them. The plan should pick an approach. Option (c) is cleanest if the schemas are individually exported; option (b) is acceptable given the plan already does source parsing for the purity test.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-2 issues are correctly resolved. The plan is now precise about the production code change, vitest configuration, build caching via `globalSetup`, `unknown` typing, stdin payloads, and `commitState` call patterns. The two remaining minors are implementation-detail clarifications that an experienced implementer could resolve without the plan specifying them. The plan is ready for implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
