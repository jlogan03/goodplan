# Software Architecture Review — Test Harness (Integration)

Reviewer: software-architecture
Scope: Full diff 7833e50..HEAD (11 files, +2575 -1149)
Context: a code implementation

## Issues

**[IMPORTANT]** validate.ts retains its own `log()` helper instead of using `createLogger()`
validate.ts defines a local `log(file, content)` function (line 47-49) that writes to files via `appendFileSync`. This duplicates the logging concern that `createLogger()` in utils.ts was designed to centralize. harness.ts has the same pattern (line 147-149). Both scripts import `createLogger` is NOT imported in validate.ts. This is a shallow duplication — two scripts maintain their own file-writing log wrappers that differ from the utils version (append-only vs. overwrite-then-append, no console mirroring). The API surface for this use case (multi-file logging where each file is a different run log) differs from the single-file `createLogger()`, so this is a deliberate divergence rather than accidental duplication, but it means the logging abstraction in utils.ts is incomplete for this caller pattern.
File: tools/dogfood/validate.ts:47
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** harness.ts creates a new `simulatedUser` per skill run, never reusing session context
In harness.ts (line 189-193), each `runSkill()` call creates a fresh `createSimulatedUser()` and closes it at the end (line 309). This means the simulated user cannot accumulate cross-skill conversational context (e.g., remembering architecture decisions from explore when answering questions during create-architecture). validate.ts follows the same pattern (line 89-93). By contrast, test-onboard.ts creates one `simulatedUser` at module scope (line 84) and reuses it across both the main test and the negative test. The harness/validate approach is safer (clean state per skill), but it contradicts the design intent of `createSimulatedUser()` which explicitly states "the simulated user naturally accumulates conversational history." If per-skill isolation is the correct choice, the docstring on `createSimulatedUser()` should clarify this as the expected usage pattern.
File: tools/dogfood/harness.ts:189
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `test-plugin-skills.ts` hardcodes `binaries/macos-arm64/gp` — not portable
Line 37 of test-plugin-skills.ts hardcodes `const GP_BIN = join(PLUGIN_DIR, "binaries/macos-arm64/gp")`. Meanwhile, utils.ts exports `platformBinaryDir()` for exactly this purpose, and test-integration.ts uses it correctly (line 111). This script should use `platformBinaryDir()` instead.
File: tools/dogfood/test-plugin-skills.ts:37
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `test-plugin-skills.ts` also hardcodes `binaries/macos-arm64` in PATH construction
Line 155 constructs the PATH with a hardcoded `binaries/macos-arm64` segment. This should also use `platformBinaryDir()`.
File: tools/dogfood/test-plugin-skills.ts:155
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `AsyncQueue` is not exported despite being a reusable data structure
The `AsyncQueue<T>` class in utils.ts (line 340) is a well-documented, generic async iterable queue. It is private to `createSimulatedUser()`. If other test scripts need async message queues in the future, they would have to reimplement it. Given this is Experimental maturity, keeping it private is reasonable — but worth noting as a deepening opportunity if more consumers emerge.
File: tools/dogfood/utils.ts:340
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Duplicated `stubMessage` helper across test-utils.ts and unit tests
Both `tools/dogfood/test-utils.ts` (line 32-38) and `tests/unit/dogfood/utils.test.ts` (line 29-35) define identical `stubMessage()` functions. This is a minor DRY violation — at Experimental maturity and with only two consumers it is fine, but if more integration tests are added, extracting a shared test-helpers module would reduce duplication.
File: tools/dogfood/test-utils.ts:32
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `validate.ts` uses `HOME!` non-null assertion
Line 39: `const HOME = process.env.HOME!` uses a non-null assertion instead of the guarded pattern used in all other scripts (check + `process.exit(1)`). This is inconsistent with the rest of the codebase and with `noUncheckedIndexedAccess`.
File: tools/dogfood/validate.ts:39
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The extraction is well-executed. `utils.ts` presents a deep module with a clean API surface — consumer scripts import exactly what they need, and the Agent SDK `query()` call is fully encapsulated behind `runSkillSession()` and `createSimulatedUser()`. The `AsyncQueue` + drain loop + abort controller lifecycle is sound. Dependency direction is correct (scripts depend on utils, never the reverse). The `checkViolation` + `canUseTool` composition in `runSkillSession` is a good example of centralizing cross-cutting concerns.

To reach 9+: fix the `platformBinaryDir()` usage gap in test-plugin-skills.ts (portability bug), and clarify the simulated user lifecycle documentation (per-skill vs. shared). The validate.ts/harness.ts logging divergence is worth a design note but not blocking.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
