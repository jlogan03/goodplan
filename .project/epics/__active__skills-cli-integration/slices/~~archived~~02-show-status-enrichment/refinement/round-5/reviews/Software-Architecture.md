## Issues

**[MINOR]** Phase 4 `resolveProjectDir()` redundancy in `src/index.ts` adds a second filesystem traversal

The plan specifies adding a `resolveProjectDir()` call in the dispatch path for the version compat check, "accepting minor redundancy with per-command calls." Currently `resolveProjectDir()` walks up the directory tree to find `.project/` — each command then calls it again independently. This is fine for correctness (the try-catch on `DATA_NO_PROJECT` is the right approach for skipping the check on `init`/`--version`/etc.), and the performance cost of a second directory walk is negligible for a CLI tool. The plan acknowledges the redundancy explicitly, which is sufficient. No change needed — noting for completeness that this is a conscious tradeoff, not an oversight.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `resolvePathReferences` phase union type should include `BeginPhase | SubmitPhase | 'complete'` but `submit-*` mapping documentation could be clearer

The plan specifies `resolvePathReferences(projectDir, target, phase: BeginPhase | SubmitPhase | 'complete')` and separately documents that "submit-* phases return the same paths as their corresponding begin phase." The actual `SubmitPhase` type in `src/core/rpc/types.ts` uses different names than `BeginPhase` (e.g., `'refinement'` vs `'refine-plan'`, `'architecture'` vs `'define-architecture'`). The plan's task for `submit()` says "call `resolvePathReferences()` using the begin-phase equivalent" — this means the mapping logic lives in the `submit()` call site, not inside `resolvePathReferences` itself. This is architecturally clean (the caller translates, the resolver has a single code path). The plan should explicitly list the submit-phase-to-begin-phase mappings (e.g., `'plan' -> 'plan'`, `'refinement' -> 'refine-plan'`, `'implementation' -> 'implement'`, etc.) so the implementer doesn't have to infer them.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is architecturally mature after four rounds of refinement. All round-4 issues have been addressed: (1) dual-directory aggregation is now explicit in Phase 2 with state-tree-relative paths; (2) the INV-001 exception for version stamping is documented with rationale (option b — version is infrastructure metadata, not workflow state); (3) the `completion` field removal from `cli-interaction-conventions.md` is included in Phase 2 tasks; (4) `stampVersionIfNeeded` uses `ProjectState` and `setEntry()`; (5) `parseGlobalFlags` `--quiet` duplication is documented; (6) `detectArtifacts` has a Commands-layer-only JSDoc; (7) `paths?` has "always populated" JSDoc; (8) version comparison references `parseSemver` tuple comparison.

Module boundaries are correct: `artifacts.ts` as a Commands-layer-only pure function peer to `tree.ts`, `paths.ts` as RPC-layer logic, `semver.ts` as a utility. Dependency direction is clean. The phase ordering rationale (1, 3, 4, 2) correctly places the 1.0.0 version bump before the breaking schema change. The INV-001 exception is well-reasoned and explicitly documented. The two remaining minor issues are documentation polish, not structural concerns.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
