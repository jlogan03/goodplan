# Architecture Updates: improve-test-coverage-and-quality

No architecture updates needed. Phase 4 already updated fitness function references in commands-api.md, rpc-layer-api.md, and _overview.md as part of implementation.

The only production code change (exporting ALL_ERROR_CODES from src/util/errors.ts) adds a public export for test exhaustiveness checking but does not change runtime behavior or architectural boundaries.
