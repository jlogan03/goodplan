# @michaelhomer/jqjs

> **Version:** 1.6.0 | **Fetched:** 2026-03-21 | **Source:** [github.com/mwh/jqjs](https://github.com/mwh/jqjs)

Pure-JavaScript jq implementation. Single 118 KB file, zero dependencies, ESM-only (`"type": "module"`).

## Install

```sh
# npm registry (may lag behind GitHub)
bun add @michaelhomer/jqjs

# GitHub direct (recommended — what the spike validated)
bun add github:mwh/jqjs
```

**Warning:** The npm package `jqjs` (no scope) is a *different, broken* package by np42. Always use the scoped `@michaelhomer/jqjs`.

## API

### `compile(expr: string) => (input: unknown) => Generator<unknown>`

Main entry point. Compiles a jq expression into a generator function.

```typescript
import compile from "@michaelhomer/jqjs";

const filter = compile(".slices[] | select(.status == \"active\")");
for (const result of filter(data)) {
  console.log(result);
}
```

### Default export shorthand

```javascript
import jq from "@michaelhomer/jqjs";

// One-arg: same as compile
const filter = jq(".x[].y");

// Two-arg: compile + run
for (const v of jq(".x[].y", obj)) { ... }
```

### Tagged template

```javascript
const filter = jq`.x[].y`;
```

### Helpers

- `func.filter` — exposes the parsed AST
- `func.trace(input)` — returns nested trace of every subexpression
- `jq.prettyPrint(obj)` — renders object to formatted text

## Recommended wrapper

```typescript
import compile from "@michaelhomer/jqjs";

function jqQuery(data: unknown, expr: string): unknown[] {
  const filter = compile(expr);
  return [...filter(data)];
}
```

## Supported jq features

Covers the features we need for project-state queries:

- Field access (`.foo`, `.[key]`, `.[idx]`), slicing (`.[2:5]`), iteration (`.[]`)
- Pipes (`|`), comma (`,`), parentheses, recursive descent (`..`)
- Arithmetic, comparisons, boolean operators, alternative (`//`)
- `if-then-elif-else-end`, `try-catch`, `?` operator
- Variable binding (`as $x`), `reduce`, `foreach`
- Update operators (`|=`, `+=`, etc.)
- Object/array construction with shorthand and computed keys
- String interpolation `\(expr)`, format strings (`@base64`, `@uri`, `@csv`, `@json`, etc.)
- Builtins: `length`, `keys`, `values`, `select`, `map`, `sort_by`, `group_by`, `unique`, `flatten`, `contains`, `split`, `join`, `test`, `match`, `capture`, `sub`, `gsub`, `path`, `getpath`, `setpath`, `INDEX`, `JOIN`, `IN`, math functions, date functions

**Not implemented:** modules (import/include), I/O, streaming, destructuring patterns, some advanced math (erf, gamma, Bessel).

## Bun compatibility

Validated in the [jqjs spike](../../prototypes/jqjs-spike/summary.md) (committed in repo history):

| Aspect | Result |
|---|---|
| `bun run` (interpreted) | All 7 test expressions pass |
| `bun build --compile` | All 7 test expressions pass, byte-for-byte identical output |
| Compiled binary size | ~57 MB (Bun runtime baseline; jqjs adds negligible overhead) |
| Startup + simple query | ~12-16 ms wall time |

## Gotchas

1. **npm package name confusion** — `jqjs` != `@michaelhomer/jqjs`. The unscoped package is broken.
2. **ESM-only** — `"type": "module"`, main field is `./jq.js`. Fine for Bun; CJS environments need adaptation.
3. **No TypeScript types** — `compile` returns a generator-producing function. Needs a thin typed wrapper.
4. **"Correctness first, performance second"** — irrelevant for our use case (small project-state JSON, <100 KB).
5. **No formal GitHub releases** — versions published to npm (1.0.0, 1.0.1, 1.5.0, 1.6.0) but no GitHub release tags.
