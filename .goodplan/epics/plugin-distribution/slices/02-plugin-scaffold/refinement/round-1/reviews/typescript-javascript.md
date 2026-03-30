# TypeScript and JavaScript Review — Plugin Scaffold Plan

## Issues

**[IMPORTANT] Build script uses `__GP_HMAC_KEY__` define but no source code references it yet**
The build script task (Phase 1, task 1, step 3) passes `--define __GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-key}\"` to the Bun compiler. However, there is no `declare const __GP_HMAC_KEY__: string` anywhere in `src/`. Without a matching declaration and usage in the source code, this define is silently ignored by the bundler — it won't error, but it also won't do anything. This is fine if slice 03 adds the consumption side, but the plan's Phase 1 verification steps don't catch this gap. The plan should either (a) note explicitly that this define is forward-looking and unused until slice 03, or (b) add a minimal `src/hmac-key.ts` stub with `declare const __GP_HMAC_KEY__: string | undefined` (matching the `version.ts` pattern) so that the define has a landing zone. Option (a) is simpler and sufficient — just make the intent clear.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] CLAUDE.md template references `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` but the epic architecture says binary is accessed at that path directly (no setup script)**
The plan task says the plugin CLAUDE.md template should instruct use of `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. This aligns with the epic architecture's "Distribution Model" section which says "Binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` — no PATH integration or setup script needed." However, the research file `bun-compile-binary-embedding.md` section 8 recommends `${CLAUDE_PLUGIN_DATA}/bin/gp` with a SessionStart copy script. The plan correctly follows the architecture (not the earlier research), but the `docs/plugin-claude-md.md` task description says to use `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` while the Expected Behavior check says the same. This is consistent — no actual conflict. However, the CLAUDE.md template will be a `.md` file that Claude reads at runtime. The `${CLAUDE_PLUGIN_ROOT}` variable substitution happens in skill content and hook commands — confirm it also works in the plugin's root-level `CLAUDE.md`. The research file (section 3) says both variables are "substituted inline in skill content, agent content, hook commands, and MCP/LSP server configs." Root-level `CLAUDE.md` is not explicitly listed. If `${CLAUDE_PLUGIN_ROOT}` is NOT substituted in the plugin's `CLAUDE.md`, the template will contain a literal `${CLAUDE_PLUGIN_ROOT}` string that Claude cannot resolve to an actual path.
Resolution: RESEARCH_NEEDED
Research: Verify whether `${CLAUDE_PLUGIN_ROOT}` is substituted in a plugin's root-level `CLAUDE.md` file (not just in SKILL.md, hooks, and MCP configs). Check the Claude Code plugins reference or test with `claude --plugin-dir` using a CLAUDE.md that contains `${CLAUDE_PLUGIN_ROOT}`. Source: Claude Code docs on plugin variable substitution scope, or empirical test.

**[IMPORTANT] `dist/` not in `.gitignore` — plan says "add if not already present" but it is definitively absent**
The current `.gitignore` does not contain `dist/`. The plan's task correctly says to add it. However, the Biome config (`biome.json`) already has `"dist"` in its `files.ignore` list, so linting won't break. The plan should note this is already handled on the Biome side. More importantly: the existing build script (`bun run build`) outputs `./gp` to the repo root (already gitignored as `gp`). The new `build:plugin` will output to `dist/gp-plugin/`. Adding `dist/` to `.gitignore` is correct and necessary. No issue with the plan here — just confirming it's needed.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Build command in plan task uses `--target=bun-darwin-arm64` but current build script omits `--target`**
The existing `build` and `install:skills` scripts omit `--target`, relying on Bun's default of building for the current platform (which is `darwin-arm64` on Apple Silicon). The plan's build script explicitly passes `--target=bun-darwin-arm64`. This is fine and arguably better (explicit is good, and it documents the platform constraint). But it means the build script will fail on non-arm64 machines (e.g., CI running on Linux). Since the epic architecture says "macOS arm64 only" for v1, this is acceptable. Just noting for awareness.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Plugin CLAUDE.md template location at `docs/plugin-claude-md.md` is unconventional**
The plan places the template at `docs/plugin-claude-md.md`. The `docs/` directory currently contains only `primer.md` and a `superpowers/` subdirectory — it's not actively used for build artifacts. The build script will need to know where to find this template. Consider placing it closer to the build pipeline, e.g., `scripts/templates/plugin-claude-md.md` or `plugin-assets/CLAUDE.md`. This is a minor organizational concern — the plan works either way as long as the build script references the correct path.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] plugin.json `hooks` field points to nonexistent `hooks/hooks.json`**
The plan notes "hooks.json doesn't exist yet — that's fine, the manifest declares the path." This is correct per the research — `hooks` in plugin.json is a path declaration, not a requirement that the file exist at build time. However, `claude plugin validate` may or may not accept a manifest pointing to a missing file. The verification step runs validate, which will catch this if it's an issue. No change needed — just flagging that validate may produce a warning.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No `--minify` or `--sourcemap` flags in the build command**
The research file (`bun-compile-binary-embedding.md` section 7) shows the build pipeline with `--minify --sourcemap`. The plan's build command omits both. For a ~58MB binary where minification saves <1MB, this is fine. But `--sourcemap` would give better stack traces in production. Consider adding `--sourcemap` (compressed, negligible size impact).
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is solid for a shell-script-based build pipeline with no new TypeScript code. The main concerns are: (1) the `__GP_HMAC_KEY__` define landing in a void with no source-side declaration — this should be explicitly noted as forward-looking, (2) the critical question of whether `${CLAUDE_PLUGIN_ROOT}` substitution works in a plugin's root CLAUDE.md — if it doesn't, the entire binary path strategy in the CLAUDE.md template is broken, and (3) minor organizational and build flag choices. To reach 9+: resolve the CLAUDE_PLUGIN_ROOT substitution question and add an explicit note about __GP_HMAC_KEY__ being a forward declaration for slice 03.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
