## Issues

**[MINOR] Inconsistent tree.js import paths in data-layer modules**
`hmac.ts` imports from `../tree.js` (the shared pure module directly), while peer modules (`commit.ts`, `load.ts`, `assemble.ts`) import from `./tree.js` (the data-layer re-export barrel). Both resolve to the same types, but the inconsistency means if the re-export barrel ever adds data-layer-specific narrowing or guards, `hmac.ts` would bypass them. This is the same pattern as `serialize.ts`, so it's a pre-existing inconsistency, not introduced by this slice — but worth noting since `hmac.ts` is a new file that could have followed the local convention.
File: src/core/data/hmac.ts:14-15
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `serializeForHmac` structurally couples to `"project.json"` key path**
The function hardcodes stripping `stateSignature` from the `"project.json"` key at the root of the state tree. The doc comment acknowledges this ("Structural coupling... if the project node is relocated, the stripping silently stops working"). This is acceptable at current Developing maturity, but the entity-restructuring epic (which introduces nested slice paths and potentially relocates entities) should include a task to revisit this. No action needed now — the comment is sufficient documentation.
File: src/core/data/hmac.ts:44
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong, clean architecture. The HMAC subsystem integrates into the existing 4-layer stack without violating boundaries: `hmac.ts` is a pure data-layer utility with no I/O of its own; `commit.ts` calls `signStateTree` at the right moment (after diffTree populates writes, before flushing); `load.ts` calls `verifyHmacOrThrow` on every non-cache-hit path; `verify.ts` uses `assembleState` directly (bypassing `loadState`'s HMAC check) as the documented escape hatch. The INV-001 exception for `verify --fix` is properly documented in invariants.md.

Key architectural strengths:
- **Dependency direction is correct**: `hmac.ts` depends only on pure tree types, `deterministicStringify`, and `node:crypto`. No circular dependencies. `commit.ts` depends on `hmac.ts` (sign on write), `load.ts` depends on `hmac.ts` (verify on read) — clean unidirectional flow.
- **Build-define key injection** follows the established `__GOODPLAN_VERSION__` pattern exactly. `vitest.config.ts`, `global-setup.ts`, and `build-plugin.sh` all inject the same dev key via `--define`, with the production key coming from `GP_HMAC_KEY` env var in the build script.
- **Cache-hit security tradeoff is explicitly documented** (load.ts line 87-93): cache hits skip HMAC reverification for performance, with the rationale that cached state was verified on the prior non-cache-hit load and `commitState` embeds a fresh signature. This is the right call — `gp verify` provides the explicit full-check path.
- **Markdown exclusion** from HMAC is architecturally sound: sub-agents write `.md` files directly to disk between commits, so including them would cause false integrity failures. The `serializeExcludingMarkdown` function completely omits markdown entries (not just their content — their very presence is excluded), which is the correct choice.
- **`embedStateSignature` in commit.ts** is well-designed: it doesn't mutate `newState`, creates a shallow clone with the signature, validates through `projectSchema` (preserving INV-005), and syncs the cache state to include the signature (preventing cache/disk divergence).
- **Test boundary alignment is excellent**: unit tests (`hmac.test.ts`) test the pure functions in isolation, command tests (`verify.test.ts`) test through the command interface, and the fitness test (`state-integrity.test.ts`) tests the full write-read-verify cycle including an end-to-end binary test. All 1509 tests pass.

The only deduction is for the minor import path inconsistency, which is cosmetic but represents a missed opportunity to establish a clean convention for new data-layer modules.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
