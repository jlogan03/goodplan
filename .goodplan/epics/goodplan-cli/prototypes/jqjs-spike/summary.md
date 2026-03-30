# jqjs Spike Summary

## What Was Tried

Validated that `@michaelhomer/jqjs` (GitHub: mwh/jqjs), a pure-JavaScript jq implementation, works inside a `bun build --compile` binary.

**Important**: The npm package `jqjs` (by np42) is a different, broken package with empty files. The correct package is `@michaelhomer/jqjs`, installed via `bun add github:mwh/jqjs`.

## Test Expressions

| # | Expression | Purpose | Interpreted | Compiled |
|---|---|---|---|---|
| 1 | `.slices[0].name` | field access | PASS | PASS |
| 2 | `.slices \| length` | pipe + builtin | PASS | PASS |
| 3 | `.slices[] \| select(.status == "active")` | filter | PASS | PASS |
| 4 | `.decisions[] \| select(.tags \| contains(["auth"]))` | nested filter | PASS | PASS |
| 5 | `.learnings[2:5]` | array slicing | PASS | PASS |
| 6 | `{name: .name, sliceCount: (.slices \| length)}` | object construction | PASS | PASS |
| 7 | `.slices \| sort_by(.sequence)` | sorting | PASS | PASS |

Output from interpreted and compiled modes is **byte-for-byte identical**.

## Measurements

| Metric | Value |
|---|---|
| Compiled binary size | 57 MB |
| Startup + simple query (wall time) | ~12-16ms |
| jqjs module size (source) | 118 KB (single file) |

The 57 MB binary size is the Bun runtime baseline — jqjs adds negligible overhead (118 KB source).

## What Worked

- All 7 jq expressions work correctly in both interpreted (`bun run`) and compiled (`bun build --compile`) modes.
- The `compile()` API is clean: takes a jq string, returns a generator function that yields results.
- Supports field access, pipes, builtins (`length`, `sort_by`, `contains`, `select`), array slicing, and object construction.
- Startup time is fast (~12-16ms wall time including process launch).

## What Didn't Work / Caveats

- The npm `jqjs` package is **not** the same as `mwh/jqjs`. Must install from GitHub: `bun add github:mwh/jqjs` (resolves to `@michaelhomer/jqjs`).
- The library is ESM-only (`"type": "module"`). This is fine for Bun but would need attention for CJS environments.
- Library self-describes as "semantically correct first, performance second" — but for our use case (small project-state JSON), this is irrelevant.
- No TypeScript types shipped; the `compile` function returns a generator-producing function. A thin typed wrapper would be needed.

## Verdict

**GO.** `@michaelhomer/jqjs` works correctly inside a `bun build --compile` binary for all query patterns we need. The API is simple, the library is a single 118 KB file with no dependencies, and it supports the jq features relevant to querying project state.

### Recommendation for integration

```typescript
import compile from "@michaelhomer/jqjs";

function jqQuery(data: unknown, expr: string): unknown[] {
  const filter = compile(expr);
  return [...filter(data)];
}
```

Install with: `bun add github:mwh/jqjs`
