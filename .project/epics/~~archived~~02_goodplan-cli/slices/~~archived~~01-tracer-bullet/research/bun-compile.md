# Bun Compile Research

> **Bun version**: v1.3.10 (released 2026-03-18)
> **Fetched**: 2026-03-21
> **Docs**: https://bun.com/docs/bundler/executables

## Overview

`bun build --compile` bundles a TypeScript/JavaScript entrypoint + all dependencies + the Bun runtime into a single standalone executable. No Bun installation required to run.

```bash
bun build --compile src/index.ts --outfile goodplan
```

## Key Details

### What gets bundled

- All imported files and packages are bundled into the executable
- A full copy of the Bun runtime is included
- All built-in Bun and Node.js APIs are available in the binary
- Pure-JS deps (Zod, picocolors, etc.) are bundled as source — no issues expected

### Binary size

- **~50-60 MB** on macOS ARM64 for even a hello-world program (the Bun runtime dominates)
- **~100 MB** on Windows x64
- `--minify` reduces the JS payload but the runtime is the bulk of the size
- `--bytecode` improves startup time (2x faster) at cost of slightly longer build

### Reducing size

```bash
bun build --compile --minify --bytecode --sourcemap=linked src/index.ts --outfile goodplan
```

Granular minify: `--minify-whitespace`, `--minify-syntax`, `--minify-identifiers`.

### Cross-compilation

Supports `--target` flag for cross-compiling:

| Target | OS | Arch |
|---|---|---|
| `bun-darwin-arm64` | macOS | ARM64 (Apple Silicon) |
| `bun-darwin-x64` | macOS | Intel |
| `bun-linux-x64` / `-musl` | Linux | x64 |
| `bun-linux-arm64` / `-musl` | Linux | ARM64 |
| `bun-windows-x64` | Windows | x64 |
| `bun-windows-arm64` | Windows | ARM64 |

The `-baseline` variants support pre-2013 CPUs (no AVX2).

### File embedding

```ts
import db from "./data.db" with { type: "file" };
// Returns a path; use Bun.file(db) to read
```

- Embedded files accessible via `Bun.embeddedFiles` (read-only `Blob` objects)
- SQLite can be embedded with `embed: "true"` — but changes are in-memory only, lost on exit
- Directories can be included via glob entrypoints

### Config file behavior

| File | Loaded at runtime? |
|---|---|
| `.env` | Yes (by default) |
| `bunfig.toml` | Yes (by default) |
| `tsconfig.json` | No |
| `package.json` | No |

## Limitations

### Hard constraints

- **Single entrypoint only** — cannot compile multiple entrypoints
- **No `--outdir`** — must use `--outfile`
- **No `--target=node`** — compile targets Bun runtime only
- **No `--no-bundle`** — compilation always bundles everything
- **No code splitting** with `--compile`

### Dynamic imports

- Statically analyzable dynamic imports work (literal string paths)
- **Non-static dynamic imports fail** — `import(variable)` won't be bundled
- No `--include` flag (unlike Deno) to manually add extra files

### Workers

- Workers referenced via `new Worker()` are **not bundled** automatically
- Must be added as separate entrypoints — but `--compile` only supports one entrypoint
- Worker paths using `import.meta.url` fail with `ModuleNotFound` at runtime
- **Workaround**: inline worker logic or restructure to avoid `new Worker()`

### macOS code signing

- Compiled binaries need code signing for distribution
- Use `codesign` command with JIT entitlements to avoid Gatekeeper warnings
- Added in Bun v1.2.4

### SQLite in compiled binaries

- Default path resolution is relative to CWD, not executable location
- Embedded SQLite DBs are read-only (in-memory changes lost on exit)

### N-API / native addons

- Native `.node` addons require direct imports
- Tools like `@mapbox/node-pre-gyp` may need manual handling

## Relevance to goodplan CLI

**Good fit**: goodplan is a pure-TS CLI with pure-JS deps (Zod, picocolors, citty). No workers, no native addons, no dynamic imports needed. Single entrypoint is fine.

**Concerns**:
- Binary size (~50-60 MB) is large for a CLI tool. Acceptable for personal/team use, may matter for distribution.
- No way to reduce the Bun runtime overhead — this is a known issue the Bun team acknowledges.

**Recommendation**: Proceed with `bun build --compile`. The limitations don't apply to our use case. Binary size is the only real downside, and it's tolerable for an internal tool.
