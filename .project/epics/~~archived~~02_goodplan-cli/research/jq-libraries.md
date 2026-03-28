# jq-Style Query Libraries for JS/TS

**Research date**: 2026-03-20
**Context**: Evaluating libraries for a `--query` flag on `goodplan` CLI output. Must work inside a `bun build --compile` standalone binary (no native modules, WASM is risky).

---

## Library Landscape

### 1. jqjs (mwh/jqjs) — Pure JS jq Implementation

| Attribute | Value |
|---|---|
| Syntax | jq (most core features) |
| Pure JS | Yes |
| Bundle size | Unknown on bundlephobia (likely ~30-50 KB based on source) |
| Weekly downloads | Very low (not in npm trends top results) |
| Last commit | Jan 2025 |
| GitHub stars | ~97 |
| Bun --compile safe | Yes (pure JS) |

**Supported jq features**: Identity (`.`), object/array indexing, slicing, iteration (`.[]`), pipes (`|`), recursive descent (`..`), arithmetic, 50+ builtins (map, sort, group_by, unique, flatten, split, join, regex, path manipulation, date functions), user-defined functions, conditionals, variable binding (`as $var`), reduce, foreach, string interpolation, format strings (`@json`, `@base64`).

**Limitations**: Missing some advanced functions, no full Unicode support, prioritizes correctness over performance.

**Assessment**: The most compelling option for true jq syntax. Covers the useful subset we'd need. Low download count is a concern for long-term maintenance, but the codebase is modest and could be vendored if abandoned.

### 2. jmespath (original) — JMESPath Query Language

| Attribute | Value |
|---|---|
| Syntax | JMESPath (not jq) |
| Pure JS | Yes |
| Bundle (min) | 21.4 KB |
| Bundle (gzip) | 5.9 KB |
| Weekly downloads | ~8M |
| Last publish | Old (0.16.0, not actively updated) |
| Bun --compile safe | Yes |

**Assessment**: Tiny, massively adopted, but the original package is essentially unmaintained. JMESPath syntax is less powerful than jq (querying only, limited transformation). LLMs know JMESPath well since it's used in AWS CLI.

### 3. @jmespath-community/jmespath — Community JMESPath (TypeScript)

| Attribute | Value |
|---|---|
| Syntax | JMESPath (extended) |
| Pure JS/TS | Yes |
| Bundle (min) | 32.6 KB |
| Bundle (gzip) | 9.2 KB |
| Weekly downloads | Growing (community fork) |
| Maintenance | Active |
| Bun --compile safe | Yes |

**Assessment**: Best JMESPath option if we go that route. TypeScript, no deps, actively maintained. Adds arithmetic and ternary operations beyond spec. Still limited to querying — can't construct arbitrary output shapes as easily as jq.

### 4. jsonpath-plus — JSONPath Implementation

| Attribute | Value |
|---|---|
| Syntax | JSONPath (XPath-like) |
| Pure JS | Yes |
| Bundle (min) | 25.4 KB |
| Bundle (gzip) | 8.0 KB |
| Weekly downloads | ~7.4M |
| Maintenance | Active |
| Bun --compile safe | Yes |

**Assessment**: Mature, well-maintained, pure JS. JSONPath syntax (`$.store.book[*].author`) is familiar from XPath but verbose. Good for extraction, weak for transformation. LLMs can generate JSONPath reliably.

### 5. JSONata — JSON Query + Transformation

| Attribute | Value |
|---|---|
| Syntax | JSONata (custom, XPath-inspired) |
| Pure JS | Yes |
| Bundle (min) | 75.5 KB |
| Bundle (gzip) | 23.5 KB |
| Weekly downloads | ~690K |
| Maintenance | Active |
| Bun --compile safe | Yes |

**Assessment**: Most powerful transformation language — can restructure, compute, aggregate. But it's the largest bundle (75 KB min) and uses its own syntax that's less well-known than jq. LLMs know it reasonably well. Overkill for our use case.

### 6. jq-web / jq-wasm — WASM-compiled jq

| Attribute | Value |
|---|---|
| Syntax | Full jq |
| Pure JS | No (WASM) |
| Bundle size | Large (WASM binary ~500KB+) |
| Bun --compile safe | **No** — `bun build --compile` has known issues with WASM deps (issue #6567, closed but unresolved) |

**Assessment**: Eliminated. WASM embedding in Bun standalone binaries is unreliable. The workaround (copying .wasm files alongside the binary) defeats the purpose of a single-file distribution.

### 7. node-jq — Native jq Wrapper

| Attribute | Value |
|---|---|
| Syntax | Full jq |
| Pure JS | No (shells out to jq binary) |
| Bun --compile safe | **No** — requires jq installed on host |

**Assessment**: Eliminated. Requires external binary.

---

## Comparison Matrix

| Library | Syntax | Bundle (gzip) | Bun-safe | Transform power | LLM familiarity |
|---|---|---|---|---|---|
| **jqjs** | jq | ~15-20 KB (est) | Yes | High | High (jq is well-known) |
| **jmespath** | JMESPath | 5.9 KB | Yes | Low-Med | High (AWS CLI) |
| **@jmespath-community** | JMESPath+ | 9.2 KB | Yes | Medium | High |
| **jsonpath-plus** | JSONPath | 8.0 KB | Yes | Low | Medium |
| **jsonata** | JSONata | 23.5 KB | Yes | Very High | Medium |
| jq-web/jq-wasm | jq | ~200+ KB | **No** | Very High | High |
| node-jq | jq | N/A | **No** | Very High | High |

---

## LLM Syntax Generation Considerations

For our use case, the CLI output will often be queried by LLMs (Claude) generating the `--query` expression. Relevant factors:

- **jq syntax**: LLMs generate jq very reliably — it's in tons of training data (Stack Overflow, docs, tutorials). Pipe-based composition (`.slices[] | select(.status == "done") | .name`) is natural.
- **JMESPath**: Also well-known to LLMs (AWS CLI docs). Syntax: `slices[?status=='done'].name`. Slightly less intuitive for multi-step transforms.
- **JSONPath**: `$.slices[?(@.status=='done')].name` — more verbose, `@` syntax is less intuitive.
- **JSONata**: Capable but less common in training data. Risk of LLM hallucinating syntax.

**Verdict**: jq syntax is the best choice for LLM generation. JMESPath is a solid second.

---

## Could We Build Our Own?

A minimal jq-like evaluator covering our actual needs:

**Required operations for goodplan CLI**:
- Dot access: `.name`, `.slices[0]`
- Pipe: `.slices[] | .name`
- Array iteration: `.[]`
- Select/filter: `select(.status == "done")`
- Field projection: `{name, status}`
- Array slicing: `.slices[2:5]`

**Estimated effort**: 300-500 lines for a recursive descent parser + tree-walking evaluator. This is tractable but:
- Edge cases multiply fast (string escaping, nested pipes, operator precedence)
- Testing burden is significant — every jq expression a user tries must work or fail gracefully
- Maintenance cost of a bespoke parser vs. a dependency

**Verdict**: Not recommended unless we can't find a suitable library. The testing surface area is large and jqjs already exists as pure JS.

---

## Recommendation

**Primary choice: jqjs**

Rationale:
1. True jq syntax — the most powerful and LLM-friendly option
2. Pure JavaScript — works in `bun build --compile` with zero risk
3. Covers all operations we need (dot access, pipes, select, array ops, object construction)
4. Small enough to vendor if maintenance stalls
5. Generator-based API is clean: `compile(expr)(data)` returns an iterator

Risks:
- Low adoption (~97 stars) means less battle-testing
- If it has bugs in edge cases, we own them
- No TypeScript types (would need `@types` or a `.d.ts` shim)

**Fallback: @jmespath-community/jmespath**

If jqjs proves too unreliable or we want minimal bundle size:
- TypeScript native, no deps, 9.2 KB gzipped
- JMESPath is sufficient for read-only querying of project state
- Sacrifice: can't do arbitrary output reshaping

---

## Next Steps

1. **Spike**: Install jqjs, test with representative goodplan JSON output, verify it works in `bun build --compile`
2. **Evaluate API ergonomics**: Test `compile()` with expressions LLMs would generate
3. **Bundle size check**: Measure actual impact in compiled binary
4. **Fallback test**: Try @jmespath-community/jmespath with same queries as comparison
5. If jqjs works: integrate behind `--query` / `-q` flag. If not: fall back to JMESPath or consider vendoring + fixing jqjs.
