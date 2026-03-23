# Bun `build --compile` for Standalone CLI Binaries

## How It Works

`bun build --compile` bundles your TypeScript/JavaScript entry point, all imported modules (including `node_modules`), and a copy of the Bun runtime into a single standalone executable. The resulting binary runs without Bun, Node.js, or any runtime installed.

```bash
bun build ./cli.ts --compile --outfile goodplan
```

What goes into the binary:
- Your application code (bundled, tree-shaken)
- All statically-imported dependencies
- The full Bun runtime (this is why binaries are large)
- Any explicitly embedded files/assets

All built-in Bun and Node.js APIs are supported in compiled mode.

### JavaScript API

```ts
await Bun.build({
  entrypoints: ["./cli.ts"],
  compile: { outfile: "./goodplan" },
  minify: true,
  sourcemap: "linked",
  define: {
    BUILD_VERSION: JSON.stringify("1.0.0"),
  },
});
```

## Binary Sizes

The binary includes the entire Bun runtime regardless of what your app actually uses (bundler, test runner, package manager, etc. are all included). This is the single biggest downside.

| Target | Hello World | Real CLI (Tigris) |
|--------|-------------|-------------------|
| darwin-arm64 | ~57 MB | ~60 MB |
| darwin-x64 | ~51 MB | ~60 MB |
| linux-x64 | ~55 MB | ~60 MB |
| windows-x64 | ~100-105 MB | - |

### Reducing Size

1. **`--minify`** -- Reduces transpiled output size. Use `--minify-whitespace` and `--minify-syntax` for granular control. Saves meaningful space for large apps.
2. **UPX compression** -- `upx --all-methods --no-lzma ./goodplan` can reduce ~17% but adds a small startup time penalty.
3. **`--external`** -- Exclude unused modules from the bundle.

There is an open feature request to strip unused Bun runtime features from the binary, but as of early 2026, the full runtime is always included. **Expect ~55-65 MB per platform binary.**

### Implication for goodplan

Since goodplan ships alongside Claude Code skills (not as a standalone download), the ~55 MB binary size is the main concern. Options:
- Accept it -- users already have Claude Code installed which includes Bun itself
- Lazy-download binaries per-platform on first use
- Ship only the current platform's binary

## Cross-Compilation

Cross-compile from any machine to any target using `--target`:

```bash
# macOS ARM64 (Apple Silicon)
bun build --compile --target=bun-darwin-arm64 ./cli.ts --outfile goodplan-darwin-arm64

# macOS x64 (Intel)
bun build --compile --target=bun-darwin-x64 ./cli.ts --outfile goodplan-darwin-x64

# Linux x64
bun build --compile --target=bun-linux-x64 ./cli.ts --outfile goodplan-linux-x64

# Windows x64
bun build --compile --target=bun-windows-x64 ./cli.ts --outfile goodplan-windows-x64.exe
```

Additional targets available:
- `bun-linux-arm64` -- Linux ARM
- `bun-linux-x64-musl` / `bun-linux-arm64-musl` -- Alpine Linux
- `*-baseline` variants -- for pre-2013 CPUs without AVX2
- `*-modern` variants -- for 2013+ CPUs (Haswell+), slightly faster

**This means a single CI machine (e.g., macOS) can build all platform binaries.** No need for cross-platform CI runners.

### macOS Code Signing

As of Bun v1.2.4+, compiled macOS binaries can be code-signed:

```bash
codesign --deep --force -vvvv --sign "IDENTITY" ./goodplan
```

## Startup Performance

### Benchmarks

| Method | Startup Time | Notes |
|--------|-------------|-------|
| `bun run cli.ts` | ~77 ms | Development mode |
| Compiled binary | ~52 ms | Standard compile |
| Compiled + `--bytecode` | ~38 ms | Pre-compiled to bytecode |
| Tigris CLI (compiled) | ~104 ms | Real-world CLI, cold start |
| Tigris CLI (Node.js) | ~64 ms | Same CLI, Node.js |

### Bytecode Compilation

```bash
bun build --compile --bytecode --minify --sourcemap ./cli.ts --outfile goodplan
```

- Trades 2-4x larger output for 2-4x faster startup on complex apps
- Binary grows ~6 MB (59 MB -> 65 MB in one benchmark)
- **Constraint: top-level `await` is not supported with `--bytecode`** -- must wrap in async IIFE or function
- As of Bun 1.3.9, bytecode gives 25% faster startup than Node.js SEA + code cache

### `--smol` Flag

Embed `--smol` to reduce memory footprint at slight performance cost:

```bash
bun build --compile --compile-exec-argv="--smol" ./cli.ts --outfile goodplan
```

Normal Bun: ~343 MB memory. With `--smol`: ~54 MB. Good for CLI tools that run briefly.

### Assessment for goodplan

For a small CLI doing JSON/JSONL processing, startup should be well under 50ms compiled. The `--bytecode` flag is worth using since our CLI won't need top-level await. With bytecode, we should hit the <10ms target for the Bun runtime initialization itself, though total process startup (OS exec + runtime init + our code) will likely be 30-50ms. This is still excellent for a CLI tool.

## Known Limitations

### Dynamic Imports
- Non-statically-analyzable dynamic imports (`import(\`./${name}.ts\`)`) are **not bundled** into the executable
- Only static import paths are resolved at build time
- Workaround: use static imports or the `--splitting` flag with `--outdir`

### `--no-bundle` Not Supported
- `--compile` always bundles everything; you cannot opt out
- This is fine for CLI tools but matters if you rely on runtime module resolution

### File System Paths
- `__dirname` and `__filename` refer to the executable's location, not source paths
- `import.meta.dir` and `import.meta.path` behave similarly
- Embedded files use internal `$bunfs/` virtual paths

### Configuration Auto-Loading
By default, compiled binaries auto-load `.env` and `bunfig.toml` from the working directory. Disable for deterministic behavior:

```bash
bun build --compile --no-compile-autoload-dotenv --no-compile-autoload-bunfig ./cli.ts --outfile goodplan
```

### Native Modules / N-API
- Direct `require("./addon.node")` works
- Tools like `@mapbox/node-pre-gyp` may need adjustment
- Pure-JS packages are strongly preferred for compiled binaries

### External File Dependencies
- Some packages reference files at runtime that aren't bundled
- Test the compiled binary thoroughly -- it may fail if it tries to find files that existed at build time but aren't in the binary

## stdin, stdout, and File I/O in Compiled Mode

### Reading stdin (Piped/Heredoc)

All standard approaches work in compiled binaries:

```ts
// Bun-native: read all stdin as text
const input = await Bun.stdin.text();

// Bun-native: stream stdin
const reader = Bun.stdin.stream().getReader();

// Node.js compat: line-by-line
import { createInterface } from "node:readline";
const rl = createInterface({ input: process.stdin });
for await (const line of rl) { /* ... */ }

// Simple line iteration
for await (const line of console) { /* ... */ }
```

### Known stdin Issues
- **Bun 1.3.2 regression**: `@clack/prompts` hit EPERM errors reading stdin (fixed in later versions)
- **macOS piped stdin**: Earlier versions had issues with `node:readline` when stdin was piped from a parent process (fixed)
- Recommendation: use `Bun.stdin.text()` or `Bun.stdin.stream()` for piped input; these are the most reliable

### Colored Terminal Output

Works fine in compiled binaries. Options:

1. **No dependencies** (recommended for size):
   ```ts
   const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
   const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
   ```
   Check `process.stdout.isTTY` and `FORCE_COLOR` / `NO_COLOR` env vars.

2. **picocolors** (~2.6 KB, zero deps) -- works in compiled binaries
3. **chalk** -- works but heavier; picocolors preferred

### File I/O

```ts
// Bun-native (preferred, faster)
const data = await Bun.file("./data.jsonl").text();
await Bun.write("./output.json", JSON.stringify(result));

// Node.js compat (also works)
import { readFileSync, writeFileSync } from "node:fs";
```

Both Bun-native and Node.js file APIs work correctly in compiled binaries. File paths are resolved relative to `process.cwd()`, not the binary location.

## npm Packages: Compatibility

### Known to Work Well
- **picocolors** -- terminal colors, zero deps
- **commander** / **yargs** -- argument parsing (though `util.parseArgs` is built-in)
- **zod** -- schema validation, pure JS
- **fast-glob** / **Bun.Glob** -- file matching
- Standard Node.js built-in modules (`fs`, `path`, `readline`, `util`, etc.)

### Potentially Problematic
- Packages with **native addons** (node-gyp based) -- may need special handling
- Packages using **dynamic require** with computed paths
- Packages that **read their own package.json** at runtime
- **@clack/prompts** -- had stdin regression in specific Bun versions

### Recommendation for goodplan
Minimize dependencies. For our use case (JSON/JSONL processing, jq-style queries, colored output):
- Use built-in `Bun.file()` / `Bun.write()` for I/O
- Use built-in `Bun.stdin` for piped input
- Use raw ANSI codes or picocolors for color
- Use `util.parseArgs()` (built-in) for argument parsing
- Keep jq-style query logic as pure TypeScript

## Real-World Examples

### Claude Code
Anthropic acquired Bun in December 2025. Claude Code itself ships as a Bun-compiled binary to millions of developers -- strong validation of the approach.

### Tigris CLI
Migrated from Node.js npm distribution to Bun compiled binary. Took "a few hours." Binary ~60 MB. Approach: shared core logic, separate entry point for compiled binary. Upload operations were 22-48% faster than Node.js.

## Recommended Build Command

```bash
bun build ./src/cli.ts \
  --compile \
  --bytecode \
  --minify \
  --sourcemap \
  --compile-exec-argv="--smol" \
  --no-compile-autoload-dotenv \
  --no-compile-autoload-bunfig \
  --target=bun-darwin-arm64 \
  --outfile dist/goodplan-darwin-arm64
```

## Open Questions

1. **Binary size tolerance** -- Is ~55 MB per platform acceptable given the distribution model?
2. **Platform matrix** -- Do we need all 4 targets (darwin-arm64, darwin-x64, linux-x64, windows-x64) from day one, or can we start with darwin-arm64 + linux-x64?
3. **Distribution mechanism** -- Download on first use? Bundle with skills? Separate install step?
4. **Top-level await** -- Can we avoid it to enable `--bytecode`? (Should be easy for a CLI entry point)

## Sources

- [Bun Official Docs: Single-file executable](https://bun.com/docs/bundler/executables)
- [Bun Bytecode Caching](https://bun.com/docs/bundler/bytecode)
- [Tigris CLI: From npm to a Single Binary](https://www.tigrisdata.com/blog/using-bun-and-benchmark/)
- [How to Build CLI Applications with Bun](https://oneuptime.com/blog/post/2026-01-31-bun-cli-applications/view)
- [Bytecode Compile Benchmark (Peterbe)](https://www.peterbe.com/plog/trying-bun-compile-to-bytecode)
- [Binary Size Issue #5854](https://github.com/oven-sh/bun/issues/5854)
- [Cross-Compilation PR #10477](https://github.com/oven-sh/bun/pull/10477)
- [Evan You: Bun 1.3.9 bytecode improvements](https://x.com/youyuxi/status/2025397241218040030)
- [stdin Issues with Piped Input #13374](https://github.com/oven-sh/bun/issues/13374)
- [Dynamic Imports Issue #11732](https://github.com/oven-sh/bun/issues/11732)
