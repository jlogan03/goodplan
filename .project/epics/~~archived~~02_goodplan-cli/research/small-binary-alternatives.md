# Alternatives to Bun Compilation for Smaller CLI Binaries

**Date**: 2026-03-20
**Status**: Research complete
**Goal**: Find approaches that produce significantly smaller standalone CLI binaries than Bun's 55-65 MB output while maintaining TypeScript source, fast startup, cross-platform support, no runtime deps, and full fs/stdin/terminal capabilities.

## Baseline: Bun `build --compile`

| Metric | Value |
|---|---|
| Binary size (macOS arm64) | ~57 MB |
| Binary size (Linux x64) | ~55-65 MB |
| Startup time | <10 ms |
| Cross-compilation | Yes (`--target=bun-{os}-{arch}`) |
| npm compatibility | Full |
| TypeScript | Native |
| Why so large | Bundles entire Bun runtime (JavaScriptCore engine + all Bun APIs) |

---

## Option 1: Deno Compile

**Verdict: No improvement over Bun. Binaries are larger.**

| Metric | Value |
|---|---|
| Binary size (macOS arm64) | ~58 MB (hello world, Deno 1.41+) |
| Binary size (Linux x64) | ~80-135 MB (varies by version) |
| Startup time | Fast; competitive with Bun on Lambda cold starts |
| Cross-compilation | Yes, all targets from any host via `--target` |
| npm compatibility | Good (Deno 2+ supports `npm:` specifiers) |
| TypeScript | Native |

### How it works
Embeds your code into `denort`, a slimmed-down Deno runtime binary. V8 engine is the primary size contributor.

### Key issues
- **Larger than Bun**, not smaller. Deno 2 executables are ~80 MB on Linux.
- Deno team has plans for custom builds with only desired features, but not yet available.
- Cross-compilation is excellent (downloads target `denort` automatically).

### Conclusion
Wrong direction for our goal. Deno binaries are the same size or larger than Bun.

Sources: [Deno 1.41 blog](https://deno.com/blog/v1.41), [deno compile docs](https://docs.deno.com/runtime/reference/cli/compile/), [Discussion #28536](https://github.com/denoland/deno/discussions/28536)

---

## Option 2: Node.js SEA (Single Executable Applications)

**Verdict: Significantly larger than Bun. Not viable for size reduction.**

| Metric | Value |
|---|---|
| Binary size | ~88-100 MB (Node binary + injected blob) |
| Startup time | Comparable to Node (~30-50 ms) |
| Cross-compilation | Not native; requires Docker or `sea-builder` per platform |
| npm compatibility | Full (it IS Node) |
| TypeScript | Via esbuild/rollup pre-bundling step |

### How it works
Bundles your JS into a blob, injects it into a copy of the Node binary using postject (now integrated into Node 25.5+ via `--build-sea`).

### Key issues
- **Largest binaries of all options** (~88-100 MB). The Node binary itself is ~95 MB.
- No native cross-compilation; must build on each target platform (or use Docker).
- Maturity has improved (Node 25.5 added `--build-sea` one-step flow), but still awkward.
- `useCodeCache` and `useSnapshot` must be disabled for cross-platform builds.

### Conclusion
Node.js SEA makes binaries worse, not better. Only useful if Node compatibility is paramount.

Sources: [Node.js SEA docs](https://nodejs.org/api/single-executable-applications.html), [Improving SEA Building (Joyee Cheung)](https://joyeecheung.github.io/blog/2026/01/26/improving-single-executable-application-building-for-node-js/), [Node 25.5 release](https://progosling.com/en/dev-digest/2026-01/nodejs-25-5-build-sea-single-executable)

---

## Option 3: pkg / nexe (esbuild + legacy bundlers)

**Verdict: Deprecated/unmaintained. Not viable.**

| Metric | Value |
|---|---|
| Binary size | ~40-60 MB (Node runtime subset) |
| Status | **pkg: deprecated**. nexe: minimally maintained |

### Key issues
- `pkg` (Vercel) is officially deprecated. Community fork struggles to keep up with Node internals.
- `nexe` is available but has issues with Node v20+.
- Both patch Node.js internals, which breaks with each Node release.
- Node.js SEA is the official successor and renders these tools obsolete.

### Conclusion
Dead-end path. Do not invest here.

Sources: [pkg alternatives](https://www.libhunt.com/r/pkg), [nexe on npm](https://www.npmjs.com/package/nexe)

---

## Option 4: QuickJS + esbuild (compile to native)

**Verdict: MOST PROMISING for small binaries. ~2-5 MB. Significant tradeoffs.**

| Metric | Value |
|---|---|
| Binary size | **~2-5 MB** (hello world: ~210 KB; real app with deps: 2-5 MB) |
| Startup time | Very fast (<5 ms, no JIT warmup) |
| Cross-compilation | Yes, via C cross-compilation toolchains (gcc/clang/mingw) |
| npm compatibility | **Limited** - must esbuild-bundle everything; no Node APIs natively |
| TypeScript | Via esbuild transpilation (bundle TS -> single JS -> qjsc compile) |
| ES version | ES2023 (QuickJS-NG) |

### How it works
1. `esbuild` bundles your TypeScript into a single JS file (with all deps inlined)
2. `qjsc` compiles JS to C bytecode, then compiles with a C compiler to native binary
3. The QuickJS engine (~1 MB compiled) is statically linked

### Key strengths
- **10-30x smaller** than Bun/Deno/Node binaries
- No JIT compiler = fast, deterministic startup
- Pure C with no dependencies; compiles everywhere with a C compiler
- QuickJS-NG fork is actively maintained with ES2023 support

### Key issues
- **No native filesystem API** — QuickJS is a pure JS engine, not a runtime. You must either:
  - Use txiki.js (adds libuv bindings, see Option 4b below)
  - Write C extensions for fs/stdin/terminal operations
  - Use LLRT's approach (Rust wrapper around QuickJS, see Option 4c)
- **No npm package Node API compatibility** — packages using `fs`, `path`, `child_process`, `http` etc. won't work
- **No async I/O** out of the box (QuickJS has promises/async-await at language level, but no event loop for I/O)
- **Performance**: ~20x slower than V8 on CPU-intensive work (no JIT). Fine for CLI tools that are I/O-bound.
- Cross-compilation requires C toolchain setup per target (not as turnkey as `bun --target`)

### Conclusion
Dramatic size reduction but requires significant work to get runtime capabilities (fs, stdin, colored output). Not a drop-in replacement.

Sources: [QuickJS](https://bellard.org/quickjs/), [QuickJS-NG](https://quickjs-ng.github.io/quickjs/), [quickjs-cross-compiler](https://github.com/ctn-malone/quickjs-cross-compiler)

---

## Option 4b: txiki.js (QuickJS + libuv runtime)

**Verdict: Strong contender. ~5-6 MB binaries with runtime capabilities.**

| Metric | Value |
|---|---|
| Binary size | **~5-6 MB** (statically linked, includes libuv) |
| Startup time | Very fast (<10 ms) |
| Cross-compilation | Possible via C cross-compilation; not as turnkey |
| npm compatibility | **Very limited** — no Node API compatibility layer |
| TypeScript | Via esbuild pre-bundling |
| Runtime APIs | File I/O, stdin, networking, child processes (via libuv) |

### How it works
txiki.js = QuickJS-NG + libuv + curlsh. Provides a real runtime with async I/O, filesystem, networking. `tjs compile` bundles code + runtime into a standalone executable.

### Key strengths
- **~5-6 MB** statically linked binary (vs 57 MB for Bun)
- Has the runtime APIs we need: filesystem, stdin, process spawning
- Actively maintained (v26.3.0 released March 2026)
- `tjs compile` is simple: `esbuild --bundle` then `tjs compile bundle.js myexe`

### Key issues
- `tjs compile` doesn't bundle code itself (need esbuild first)
- APIs are txiki-specific, not Node-compatible (different module names/shapes)
- Would need to write a thin abstraction layer over txiki APIs for fs/stdin/terminal
- Colored terminal output: need to use ANSI codes directly (no chalk-like library unless bundled)
- Cross-compilation is "build on each platform" or Docker-based
- Smaller community; fewer resources/examples

### Conclusion
Best balance of small binary size and runtime capability. The 5-6 MB range is a 10x improvement over Bun. Main cost is writing to txiki-specific APIs rather than Node APIs.

Sources: [txiki.js GitHub](https://github.com/saghul/txiki.js), [txiki.js 26.3.0 release](https://code.saghul.net/2026/03/txiki-js-26-3-0-released-a-new-dawn/), [txiki.js site](https://txikijs.org/)

---

## Option 4c: LLRT (AWS Low Latency Runtime)

**Verdict: Interesting architecture but designed for Lambda, not general CLI distribution.**

| Metric | Value |
|---|---|
| Binary size | **~2 MB** (without AWS SDK); ~7 MB (with SDK) |
| Startup time | Extremely fast (designed for Lambda cold starts) |
| Cross-compilation | Rust cross-compilation targets |
| npm compatibility | Partial (subset of Node APIs) |
| TypeScript | Via bundling |

### How it works
Rust binary embedding QuickJS. Built specifically for AWS Lambda. Implements a subset of Node.js APIs.

### Key issues
- **Designed for Lambda**, not general-purpose CLI tools
- Subset of Node APIs (focused on AWS SDK compatibility)
- Would require forking/adapting for general CLI use
- Not designed for standalone executable distribution

### Conclusion
Proves the QuickJS-in-Rust approach can achieve ~2 MB binaries. Architecture is inspiring but the project itself isn't suitable for our use case without major forking.

Sources: [LLRT GitHub](https://github.com/awslabs/llrt), [LLRT overview](https://www.webpronews.com/amazons-llrt-a-revolutionary-2mb-javascript-runtime-combining-javascript-flexibility-with-rust-performance/)

---

## Option 5: Go with Embedded JS (goja)

**Verdict: Viable for tiny binaries with JS execution, but limited JS support.**

| Metric | Value |
|---|---|
| Binary size | **~8-12 MB** estimated (Go binary + goja engine) |
| Startup time | <10 ms |
| Cross-compilation | Excellent (Go's `GOOS`/`GOARCH`) |
| JS compatibility | **ES5.1 only** (no async/await, no ES modules) |
| TypeScript | Would require pre-transpilation to ES5 |
| npm compatibility | None |

### How it works
Write CLI scaffolding in Go (arg parsing, fs, stdin, terminal colors). Embed goja for JS evaluation where needed (e.g., jq-like queries).

### Key strengths
- Go cross-compilation is the gold standard (single command, any target)
- Pure Go, no CGO = simple builds
- goja is well-maintained and performant for ES5.1
- Could use Go for all I/O and goja only for expression evaluation

### Key issues
- **ES5.1 only** — no async/await, no destructuring, no template literals, no modules
- Would need to transpile TypeScript -> ES5.1 for any JS portions
- Splitting the codebase between Go and JS adds complexity
- If we're writing most logic in Go anyway, why not just write it all in Go?

### Conclusion
Only makes sense if we reframe the project: write the CLI in Go, use goja only for jq query evaluation. This is a different project architecture, not a TypeScript CLI.

Sources: [goja GitHub](https://github.com/dop251/goja), [Exploring Goja](https://jtarchie.com/posts/2024-08-30-exploring-goja-a-golang-javascript-runtime)

---

## Option 6: Compile to Native (Porffor, aspect.build)

**Verdict: Research-stage only. Not production-ready.**

| Tool | Status |
|---|---|
| **Porffor** | Experimental AOT JS/TS -> Wasm/C compiler. Only very limited JS supported. Research project, explicitly "not yet intended for serious use." |
| **aspect.build** | No relevant search results for JS/TS to native compilation. |
| **Static Hermes** (Meta) | AOT compilation for React Native; not general-purpose CLI. |

### Conclusion
No viable option here today. Porffor is the most interesting but years away from supporting real applications.

Sources: [Porffor](https://porffor.dev/), [Porffor GitHub](https://github.com/CanadaHonk/porffor)

---

## Summary Comparison

| Approach | Binary Size | Startup | Cross-compile | Node/npm compat | Maturity | Viable? |
|---|---|---|---|---|---|---|
| **Bun (baseline)** | 57 MB | <10 ms | Yes | Full | Production | Current |
| Deno compile | 58-135 MB | <15 ms | Yes | Good | Production | No (larger) |
| Node.js SEA | 88-100 MB | 30-50 ms | Docker only | Full | Maturing | No (larger) |
| pkg/nexe | 40-60 MB | 30-50 ms | Limited | Good | **Deprecated** | No |
| **QuickJS + esbuild** | **2-5 MB** | <5 ms | C toolchain | None | Stable | Maybe |
| **txiki.js** | **5-6 MB** | <10 ms | C/Docker | None | Active | **Yes** |
| LLRT (forked) | ~2 MB | <5 ms | Rust targets | Partial | Active | Risky |
| Go + goja | 8-12 MB | <10 ms | Excellent | None (ES5.1) | Stable | Different project |
| Porffor | <1 MB | <1 ms | Via C | None | **Experimental** | No |

---

## Recommendations

### If binary size is critical (must be <10 MB):
**txiki.js** is the strongest option. It provides a real runtime (filesystem, stdin, networking) in a 5-6 MB package. The cost is writing to txiki-specific APIs and giving up Node/npm compatibility. The workflow would be:
1. Write CLI logic in TypeScript
2. Use txiki.js APIs for I/O (instead of Node `fs`, `process.stdin`, etc.)
3. Bundle with esbuild -> compile with `tjs compile`
4. Cross-compile via Docker or CI matrix

### If binary size is important but not paramount (10-20 MB acceptable):
Consider a **custom Rust wrapper around QuickJS** (inspired by LLRT's architecture), exposing only the APIs you need. This is more work upfront but gives full control. Estimated binary: 5-10 MB.

### If current size is merely annoying, not blocking:
**Stay with Bun.** The 57 MB binary works, has full ecosystem compatibility, and the build story is simple. Bun's team may improve binary sizes over time. The development velocity advantage of full npm compatibility likely outweighs the distribution size cost for a developer tool.

### Not recommended:
- Deno compile (same size, less ecosystem)
- Node.js SEA (larger, more complex build)
- pkg/nexe (deprecated)
- Porffor (not production-ready)
- Go + goja (different language, ES5.1 only)
