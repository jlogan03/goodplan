# Bun Compile & Binary Embedding

Research date: 2026-03-29

## 1. How `bun build --compile` Works

`bun build --compile` bundles and tree-shakes an entire TypeScript/JavaScript application (including node_modules) plus the Bun runtime into a single standalone executable.

```bash
bun build --compile ./src/index.ts --outfile myapp
```

The output is a native binary for the target platform. All imported files and packages are bundled into the executable, along with a copy of the Bun runtime. All built-in Bun and Node.js APIs are supported.

**Build-time constants** can be injected via `--define`:
```bash
bun build --compile --define BUILD_VERSION='"1.2.3"' src/cli.ts --outfile mycli
```

**Production optimizations:**
- `--minify` — reduces transpiled output size
- `--sourcemap` — embeds zstd-compressed sourcemaps for readable stack traces
- `--bytecode` — pre-compiles JS to bytecode, improving startup time (2x for tsc-scale projects)

## 2. Supported Target Platforms

Cross-compilation is supported via `--target`:

| Target                  | OS      | Arch  | Notes                     |
|-------------------------|---------|-------|---------------------------|
| `bun-darwin-arm64`      | macOS   | arm64 | Apple Silicon (M1+)       |
| `bun-darwin-x64`        | macOS   | x64   | Intel Macs                |
| `bun-linux-x64`         | Linux   | x64   | Most servers (glibc)      |
| `bun-linux-x64-baseline`| Linux   | x64   | Pre-2013 CPUs (no AVX2)   |
| `bun-linux-arm64`       | Linux   | arm64 | Graviton, RPi             |
| `bun-linux-x64-musl`    | Linux   | x64   | Alpine/musl libc          |
| `bun-linux-arm64-musl`  | Linux   | arm64 | Alpine ARM                |
| `bun-windows-x64`       | Windows | x64   |                           |
| `bun-windows-arm64`     | Windows | arm64 |                           |

**macOS arm64 (our primary target):**
```bash
bun build --compile --target=bun-darwin-arm64 src/index.ts --outfile goodplan
```

When building on the same platform as the target, `--target` can be omitted.

## 3. Binary Size for This Project

Tested on the goodplan codebase (224 bundled modules):

| Build                | Size  |
|----------------------|-------|
| Default              | 58 MB |
| With `--minify`      | 58 MB |

The ~58 MB size is dominated by the embedded Bun runtime (~54 MB). Application code contributes only a few hundred KB. Minification saves ~0.63 MB of JS but doesn't noticeably change the final binary size.

This matches the project's existing architecture doc which states: "Binary size ~57 MB (acceptable for a development tool; Go port is the path to smaller binaries if needed)."

## 4. Current Build Configuration

### `package.json` build script:
```json
"build": "bun build --compile src/index.ts --outfile goodplan --define __GOODPLAN_VERSION__='\"'$(node -p 'require(\"./package.json\").version')'\"'"
```

### `scripts/install-skills.sh` (full install flow):
1. Reads version from `package.json`
2. Runs `bun build --compile src/index.ts --outfile goodplan --define "__GOODPLAN_VERSION__=\"$VERSION\""`
3. Copies binary to `~/.local/bin/goodplan`
4. Installs skills to `~/.claude/skills/`

### `tests/global-setup.ts` (test binary):
The test harness compiles the binary once before all tests and cleans it up afterward.

### Entry point: `src/index.ts`
Imports `citty` for CLI framework, sets up command routing, loads project state.

## 5. Embedding Assets (Non-Code Files)

Bun supports embedding arbitrary files into the compiled binary.

### Import attribute approach:
```typescript
import configPath from "./default-config.json" with { type: "file" };
import { file } from "bun";

const config = await file(configPath).json();
```

At build time, Bun reads the file, embeds it in the binary, and replaces the import with an internal `$bunfs/` path. The file can then be read via `Bun.file()` or Node.js `fs` APIs.

### Directory embedding via glob:
```bash
bun build --compile ./index.ts ./public/**/*.png
```

### Listing embedded files at runtime:
```typescript
import { embeddedFiles } from "bun";
for (const blob of embeddedFiles) {
  console.log(`${blob.name} - ${blob.size} bytes`);
}
```

### Relevance to goodplan:
The goodplan CLI does **not** currently embed any non-code assets. All state files live on disk in `.project/` and are read at runtime. No embedded assets are needed for the plugin binary — the CLI reads/writes `.project/` files via the filesystem at runtime.

## 6. Runtime Requirements

**The compiled binary is fully standalone.** It does not require Bun, Node.js, or any other runtime to be installed. The Bun runtime is embedded in the binary itself.

The binary is a native executable for the target platform — no interpreter, no VM, no dependencies.

**Automatic config loading in compiled binaries:**
- `.env` and `bunfig.toml` loading: **enabled** by default
- `tsconfig.json` and `package.json` loading: **disabled** by default
- Can be toggled with `--no-compile-autoload-dotenv`, `--compile-autoload-package-json`, etc.

**macOS code signing:** If distributing outside of direct installs, the binary can be codesigned:
```bash
codesign --deep --force -vvvv --sign "IDENTITY" --entitlements entitlements.plist ./goodplan
```

## 7. Including the Binary in a Plugin's `binaries/` Directory

Based on the Target Workflow Vision, the plugin structure is:

```
goodplan-plugin/
├── .claude-plugin/
│   └── plugin.json
├── binaries/
│   └── macos-arm64/goodplan    ← compiled binary lives here
├── scripts/
│   └── setup.sh
├── skills/
│   └── <all skill directories>/
└── hooks/
    ├── protect-state.sh
    └── hooks.json
```

The `binaries/` directory is **not a special Claude plugin convention** — it's a project-defined directory within the plugin root, referenced via `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/goodplan`.

### Build pipeline:
```bash
# Build for macOS arm64
bun build --compile --target=bun-darwin-arm64 --minify --sourcemap \
  src/index.ts --outfile goodplan-plugin/binaries/macos-arm64/goodplan \
  --define "__GOODPLAN_VERSION__=\"$VERSION\""
```

## 8. `${CLAUDE_PLUGIN_DATA}` and Setup Script for PATH Access

### Environment variables:

| Variable | Resolves to | Lifecycle |
|----------|-------------|-----------|
| `${CLAUDE_PLUGIN_ROOT}` | Plugin install directory (`~/.claude/plugins/cache/{id}/`) | Replaced on every plugin update |
| `${CLAUDE_PLUGIN_DATA}` | `~/.claude/plugins/data/{id}/` | Persists across plugin updates; deleted on uninstall |

### Setup script approach:

The `SessionStart` hook runs the setup script each session. The script copies/symlinks the binary from `${CLAUDE_PLUGIN_ROOT}` to `${CLAUDE_PLUGIN_DATA}` so it survives plugin updates:

```bash
#!/bin/bash
# scripts/setup.sh — run as SessionStart hook

BIN_DIR="${CLAUDE_PLUGIN_DATA}/bin"
mkdir -p "$BIN_DIR"

# Copy binary from plugin root to persistent data dir
# (symlinks won't work because CLAUDE_PLUGIN_ROOT changes on update)
INSTALLED="${BIN_DIR}/goodplan"
BUNDLED="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/goodplan"

# Only copy if version differs (avoid unnecessary I/O)
if ! cmp -s "$BUNDLED" "$INSTALLED" 2>/dev/null; then
  cp "$BUNDLED" "$INSTALLED"
  chmod +x "$INSTALLED"
fi
```

### hooks.json:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh"
          }
        ]
      }
    ]
  }
}
```

### PATH access:

The binary at `${CLAUDE_PLUGIN_DATA}/bin/goodplan` needs to be on PATH. Two approaches:

1. **Skills reference the binary directly** — Skills can use `${CLAUDE_PLUGIN_DATA}/bin/goodplan` in their SKILL.md instructions, since `${CLAUDE_PLUGIN_DATA}` is substituted in skill content.

2. **Hook adds to PATH** — A `SessionStart` hook could export PATH, but this only affects hook subprocess environments, not Claude's shell. Claude's Bash tool spawns fresh shells each invocation.

3. **Symlink to a known PATH location** — The setup script could symlink to `~/.local/bin/goodplan`, but this creates conflicts with the current manual install approach and is fragile.

**Recommendation:** For the plugin distribution model, skills should invoke the binary using its full path (`${CLAUDE_PLUGIN_DATA}/bin/goodplan`) rather than relying on PATH. This avoids conflicts and is deterministic.

## Key Findings Summary

| Question | Answer |
|----------|--------|
| Standalone? | Yes, fully. No runtime dependencies. |
| macOS arm64 target | `--target=bun-darwin-arm64` (or omit when building on Apple Silicon) |
| Binary size | ~58 MB (Bun runtime dominates; app code is negligible) |
| Asset embedding | Supported via `with { type: "file" }` imports, but not needed for goodplan |
| Current build | `bun build --compile src/index.ts --outfile goodplan` with `--define` for version |
| Plugin binary delivery | `binaries/macos-arm64/goodplan` in plugin root, copied to `${CLAUDE_PLUGIN_DATA}/bin/` via SessionStart hook |
| PATH access | Use full path in skills (`${CLAUDE_PLUGIN_DATA}/bin/goodplan`) rather than symlinks |

## Sources

- [Bun Single-file Executable Documentation](https://bun.sh/docs/bundler/executables)
- [Claude Code Plugins Documentation](https://code.claude.com/docs/en/plugins)
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference)
