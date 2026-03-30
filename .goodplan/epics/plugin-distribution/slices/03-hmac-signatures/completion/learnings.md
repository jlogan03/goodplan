# Learnings: 03-hmac-signatures

## Build-time defines need dual coverage in test infrastructure
_Source: 03-hmac-signatures_

Both `global-setup.ts` (compiled test binary for integration/fitness tests) and `vitest.config.ts` (Vitest module transform for unit tests) must define `__GP_HMAC_KEY__`. Missing either creates a silent dev-key fallback that makes tests pass vacuously without exercising the injected-key code path. This was the only critical issue across all 4 phases and was caught by reviewers, not the test suite itself.

## Vitest runs under Node runtime, not Bun — use node:crypto for portable code
_Source: 03-hmac-signatures_

`Bun.CryptoHasher` and other Bun-specific APIs are unavailable when Vitest runs unit tests. Use `node:crypto` (createHmac, timingSafeEqual) for any crypto code that must work in both compiled binary and unit test contexts. This is a general pattern: any module imported by unit tests should avoid Bun-specific APIs unless guarded by runtime detection.

## Markdown exclusion from HMAC must be total, not replacement
_Source: 03-hmac-signatures_

The plan specified reusing `serializeStateTree(state, { inline: false })` which replaces markdown content with `true`. This still makes the hash sensitive to markdown file additions/removals between commits (a normal workflow pattern where sub-agents write .md files directly). The correct approach is a custom tree walker (`serializeExcludingMarkdown`) that completely strips markdown entries — making signatures immune to markdown file presence/absence.

## commitState() has the most integration surface area in the Data Layer
_Source: 03-hmac-signatures_

Modifying `commitState()` requires coordinated changes to: (1) concurrent modification detection (must strip stateSignature from comparisons), (2) state cache population (must include signature to avoid cache/disk divergence), (3) test fixtures (must have valid precomputed signatures), and (4) INV-005 compliance (signature injection must go through `projectSchema.parse()`). Phase 2 was the weakest-scoring phase (7-8 vs 9 for others) because of this surface area. Future slices touching commitState should plan for this coordination burden.

## serializeForHmac has structural coupling to project.json tree path
_Source: 03-hmac-signatures_

The function destructures `stateSignature` from the `"project.json"` key at the root of the serialized tree. If the project node is relocated (e.g., entity-restructuring epic), the stripping silently stops working. Documented with an inline comment. The entity-restructuring epic should include a task to revisit this coupling.

## Cache-hit HMAC gap is a documented tradeoff at Developing maturity
_Source: 03-hmac-signatures_

loadState()'s cache-hit path (mtime match) returns cached state without HMAC reverification. An attacker modifying a JSON file without changing directory mtimes (same-second write) could bypass verification until the next cache miss. Accepted at Developing maturity — `gp verify` is the explicit escape hatch. Architecture docs must distinguish "non-cache-hit reads verify" from simplified "every read verifies."
