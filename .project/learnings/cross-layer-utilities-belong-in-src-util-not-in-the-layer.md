`deterministicStringify` was placed in `src/core/data/` but needed by `src/util/output.ts` — a cross-layer import violation. Start shared utilities in `src/util/` from the beginning.
