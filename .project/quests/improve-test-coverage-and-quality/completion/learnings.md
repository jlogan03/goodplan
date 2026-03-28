# Learnings: improve-test-coverage-and-quality

## Bun --define quoting differs between shell and Node execFileSync
_Source: improve-test-coverage-and-quality_

The `--define` flag in `bun build --compile` interprets values as JS expressions. In package.json scripts (shell context), `'\"${version}\"'` correctly produces `"1.0.0"`. In global-setup.ts (execFileSync, no shell), the same quoting produces `'"1.0.0"'` — the extra single quotes become part of the value, causing `parseSemver()` to reject it. Future test infrastructure changes to `--define` should verify the compiled binary's embedded values, not just that compilation succeeds.

## Fitness functions testing invariants need exhaustive source-of-truth arrays
_Source: improve-test-coverage-and-quality_

When a fitness function verifies "every X has property Y" (e.g., every error code has an exit code mapping), the enumeration array must be exhaustive. A manually maintained test-local array silently goes stale when new members are added to the source type. Fix: export the array from the source file with a `satisfies` type assertion, plus a count constant. The test imports both and asserts count equality. This caught the pattern during review — future fitness functions should follow this pattern from the start.

## Pre-CLI fixtures must be excluded from modern entity updates
_Source: improve-test-coverage-and-quality_

Test fixtures like `pre-cli-project` and `learnings-migration` intentionally lack modern entities (e.g., `tasks/overview.json`). Adding them breaks the migration tests that rely on detecting their absence. Future fixture updates should check whether the fixture is used by migration tests before adding new entities.

## Static analysis fitness functions should use shared file-collection helpers
_Source: improve-test-coverage-and-quality_

Multiple fitness tests (`state-machine-purity`, `mutation-through-state-machine`, `data-determinism`) need to recursively collect `.ts` files under `src/`. Duplicating this logic across tests leads to divergent implementations and inconsistent comment-stripping. A shared `tests/fitness/helpers.ts` was created — future fitness functions should import from it rather than reimplementing.
