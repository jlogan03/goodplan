# Learnings: 02-show-status-enrichment

## Phase ordering matters for breaking changes

The plan required Phase 4 (semver/1.0.0 bump) before Phase 2 (breaking `status --json` schema). This non-obvious implementation order prevented shipping a breaking change without a version boundary. Future plans with breaking changes should explicitly encode the ordering rationale.

## global-setup.ts must mirror production build flags

The `--define __GOODPLAN_VERSION__` flag was missing from `tests/global-setup.ts`, causing `parseSemver("0.0.0-dev")` to throw in every integration test. Any build-time define added to `package.json` scripts must also be added to the test compilation path.

## Zod z.infer types should be the single source of truth for function signatures

Phase 1 initially hand-wrote `SliceArtifactFlags` and `EpicArtifactFlags` interfaces alongside Zod schemas. Review caught the drift risk immediately. Using `z.infer<typeof schema>` as the return type of `detectArtifacts()` eliminates the entire class of type-drift bugs.

## Tree-based file listing eliminates redundant I/O

Replacing `countFiles()` (raw `fs.readdirSync`) with state tree walking (already assembled in memory) removed `src/core/data/files.ts` entirely. The tree is the canonical data source — prefer walking it over redundant filesystem reads when the state is already loaded.

## Infrastructure metadata exceptions to INV-001 need immediate documentation

The version stamp (`bumpDataVersionIfNeeded`) applies post-reduce in the RPC layer — a valid exception to INV-001 (all mutations through state machine). Documenting this in `invariants.md` at implementation time prevents contributors from "fixing" what appears to be a violation.
