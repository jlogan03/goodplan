# Repo & Tooling Review — Plugin Scaffold Plan

## Issues

**[IMPORTANT]** `dist/` not in `.gitignore`

The plan includes a task "Add `dist/` to `.gitignore` (if not already present)." The current `.gitignore` does not have a `dist/` entry. However, `biome.json` already ignores `dist` for linting/formatting. The plan correctly identifies the gap, but the task should also note that `biome.json` already covers linting — only `.gitignore` needs the addition. No issue with the plan itself, just confirming the task is needed.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plugin CLAUDE.md template placed in `docs/` instead of a build-input location

The plan creates the plugin CLAUDE.md template at `docs/plugin-claude-md.md` and the build script copies it to `dist/gp-plugin/CLAUDE.md`. The `docs/` directory currently only contains `primer.md` and a `superpowers/` subdirectory — it's documentation for humans, not build inputs. A build-input template that gets copied into an assembled artifact would be more conventional in a dedicated directory like `plugin/` or `templates/`, or alongside the build script in `scripts/`. This avoids confusion about whether `docs/` files are reference docs or build artifacts.

Suggested fix: Place the template at `plugin/CLAUDE.md` or `scripts/plugin-claude-md.md` instead, and update the build script path accordingly. The `plugin/` directory at repo root would be a natural home for all plugin source assets (CLAUDE.md template, and potentially future plugin-specific config).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Build script uses `--target=bun-darwin-arm64` but existing build does not

The current `package.json` `build` script and `install-skills.sh` both omit `--target`, relying on building for the host platform. The plan's build script explicitly passes `--target=bun-darwin-arm64`. This is correct for the plugin distribution model (must target a specific platform), and aligns with the epic architecture ("macOS arm64 only" for v1). However, developers building on Intel Macs or Linux for local testing would get a binary that doesn't match their platform. The plan should add a comment in the build script explaining why the target is explicit, and consider a note that local-dev testing should use `bun run build` (no target) while `build:plugin` always targets arm64.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Build script should include `--minify` and `--sourcemap` flags

The research doc (`bun-compile-binary-embedding.md` section 7) recommends `--minify --sourcemap` for the plugin build. The plan's compile command omits both. While minification saves minimal size (~0.63 MB per the research), `--sourcemap` provides readable stack traces in bug reports and is essentially free. The plan should include `--sourcemap` at minimum.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `__GP_HMAC_KEY__` define included in build command but not yet used

The plan's build command includes `--define __GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-key}\"` as a placeholder for slice 03. This is fine as forward preparation, but `src/version.ts` (the only file with a `declare const` pattern) doesn't declare `__GP_HMAC_KEY__`. Without a corresponding `declare const` in the TypeScript source, the define has no effect — Bun's `--define` only replaces identifiers that exist in the source. The plan should note that the actual `declare const __GP_HMAC_KEY__` will be added in slice 03, and that the define in the build script is a no-op until then. This prevents confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Marketplace manifest `source.source` field value `"git-subdir"` — verify this is the correct field name

The plan's Phase 2 Expected Behavior checks `jq '.plugins[0].source.source'` expecting `"git-subdir"`. The research doc mentions `git-subdir` as a source type but doesn't show the exact marketplace manifest schema field names. The field path `source.source` (a `source` key containing another `source` key) looks unusual and could be a schema error. The exact marketplace manifest format should be verified against the Claude Code docs.

Resolution: RESEARCH_NEEDED
Research: Verify the exact schema for `marketplace.json` plugin entries — specifically the field structure for declaring a `git-subdir` source. The plan uses `.plugins[0].source.source` which nests `source` inside `source`. Check the Claude Code marketplace docs or the `anthropics/claude-code` repo for example marketplace manifests. Source: Claude Code marketplace documentation at code.claude.com/docs/en/plugin-marketplaces, or the official marketplace repo structure.

---

**[MINOR]** Missing verification: `bun run test` and `bun run check` in Phase 1

Phase 1 verification runs the build and checks the output structure but doesn't run `bun run test` or `bun run check` to confirm the new script and package.json changes don't break existing CI. Phase 2 includes this ("Run `bun run test` and `bun run check` to confirm no regressions") but Phase 1 should also verify, since adding the `build:plugin` script to package.json could theoretically affect other tooling.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured with clear phases, concrete Expected Behavior checks (including before/after assertions), and aligns with both the research findings and epic architecture. The issues are mostly about conventional placement (docs vs build-input), missing build flags from research recommendations, and a potential schema verification gap in the marketplace manifest. To reach 9+: move the CLAUDE.md template out of `docs/`, add `--sourcemap` to the build, clarify the `__GP_HMAC_KEY__` no-op, and verify the marketplace manifest schema field names.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
