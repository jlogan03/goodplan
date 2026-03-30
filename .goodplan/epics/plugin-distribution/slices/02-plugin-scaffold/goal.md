# Plugin Scaffold

## What We're Building
Create the Claude Code plugin directory structure, `plugin.json` manifest, `build:plugin` script (as a `package.json` entry delegating to `scripts/build-plugin.sh`), and `.claude-plugin/marketplace.json` at the repo root. The build script assembles `dist/gp-plugin/` with the compiled binary and placeholder directories for skills and hooks. After this slice, `claude plugin validate dist/gp-plugin/` passes and `claude --plugin-dir dist/gp-plugin` loads without errors.

## Behavior
1. `bun run build:plugin` assembles `dist/gp-plugin/` containing:
   - `.claude-plugin/plugin.json` with `name: "gp"`, version from `package.json`
   - `binaries/macos-arm64/gp` (compiled binary)
   - `skills/` (empty placeholder — populated in slice 6)
   - `hooks/` (empty placeholder — populated in slice 4)
   - `CLAUDE.md` with universal goodplan instructions
2. `plugin.json` version is derived from `package.json` — single source of truth
3. `.claude-plugin/marketplace.json` at repo root points to `plugins/gp/` on the `release` branch via `git-subdir`
4. `scripts/build-plugin.sh` uses `set -e`, builds binary with `--define __GP_VERSION__` and `--define __GP_HMAC_KEY__` (dev key fallback), copies files to `dist/`
5. `dist/` added to `.gitignore`
6. `.goodplan-dev` sentinel file added to `.gitignore`
7. `plugin-hooks/` directory created at repo root (empty — populated in slice 4)

## Verification
- [ ] `bun run build:plugin` completes without errors
- [ ] `dist/gp-plugin/.claude-plugin/plugin.json` exists and contains `"name": "gp"` and correct version
- [ ] `dist/gp-plugin/binaries/macos-arm64/gp --version --json` returns the expected version
- [ ] `claude plugin validate dist/gp-plugin/` passes (if `claude` CLI available)
- [ ] `dist/gp-plugin/CLAUDE.md` exists with universal goodplan instructions
- [ ] `.claude-plugin/marketplace.json` exists at repo root with correct `git-subdir` source
- [ ] `dist/` is in `.gitignore`

Run `bun run build:plugin`, then verify the assembled directory structure matches the architecture spec. Run the compiled binary from its plugin location (`dist/gp-plugin/binaries/macos-arm64/gp --version --json`) to confirm it's functional. If `claude` CLI is available, run `claude plugin validate dist/gp-plugin/` for structural validation. Start Claude Code with `claude --plugin-dir dist/gp-plugin` and confirm it loads without errors (skills and hooks are empty placeholders at this point).

## Scope Boundaries
**In scope:** Plugin directory layout, `plugin.json`, `build:plugin` script, marketplace manifest, plugin CLAUDE.md, `.gitignore` updates, `plugin-hooks/` directory creation
**Out of scope:** Hook scripts (slice 4), skill copying (slice 6), HMAC key injection from CI secret (slice 7), actual marketplace installation
