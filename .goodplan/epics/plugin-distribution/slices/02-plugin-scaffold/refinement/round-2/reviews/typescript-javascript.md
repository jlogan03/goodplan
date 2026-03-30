# TypeScript and JavaScript Review — Plugin Scaffold (Round 2)

## Issues

**[MINOR]** Build script version extraction duplicates an existing pattern but with slight inconsistency

The plan says to read the version from `package.json` using "the same pattern as `install-skills.sh`." The install script uses `node -p 'require("./package.json").version'`, and the existing `build` script in `package.json` uses the same. However, the plan's Phase 1 task 3 shows the `--define` flag with `__GOODPLAN_VERSION__=\"$VERSION\"` (escaped double-quotes in shell), while the existing `build` script uses `--define __GOODPLAN_VERSION__='\"'$(node -p ...)'\"'` (a different quoting approach that embeds the version inline). The plan stores the version in a `$VERSION` variable first, which is cleaner, but the `--define` quoting must produce the same result: a string literal in the compiled output. The plan should explicitly show the shell quoting for the `--define` flag to avoid a subtle bug where the compiled binary gets an unquoted value (which would be interpreted as an identifier, not a string). The install script (`install-skills.sh` line 13) uses `--define "__GOODPLAN_VERSION__=\"$VERSION\""` — the plan should match this exact quoting pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `plugin/skills/_shared/cli-usage.md` path may conflict with existing `skills/_shared/` conventions

The plan creates `plugin/skills/_shared/cli-usage.md` as a shared skill reference file. The existing repo has `skills/_shared/references/` as the shared reference location for installed skills. When skills are eventually copied into the plugin (slice 4+), there will be two `_shared` directories: one at `plugin/skills/_shared/` (plugin-specific, with `cli-usage.md`) and the copied `skills/_shared/` (existing repo skills). The plan should clarify whether `plugin/skills/_shared/` will eventually merge with or replace the repo's `skills/_shared/` content, or whether these are intentionally separate namespaces. This is not a blocking issue for this slice (which only creates the placeholder), but noting it for awareness since it affects how slice 4 copies skills.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `--sourcemap` flag on `bun build --compile` produces external source map files in the output directory

The plan's compile command includes `--sourcemap`. When used with `--compile`, Bun writes `.map` files alongside the output. These would land in `dist/gp-plugin/binaries/macos-arm64/`. The plan's verification section and directory structure listing do not mention `.map` files. This is fine functionally (source maps help with error stack traces during development), but the plan should acknowledge whether the `.map` file should be included in the plugin distribution or excluded. For a production plugin, source maps increase bundle size without user benefit; for development, they aid debugging. A minor note in the build script (or a `--sourcemap=none` for production builds) would clarify intent.

Resolution: DIRECTLY_ACTIONABLE

---

No CRITICAL or IMPORTANT issues found. The plan is well-structured after round 1 improvements. The `${CLAUDE_PLUGIN_ROOT}` research was correctly incorporated (binary path moved to skill content), the `__GP_HMAC_KEY__` define was properly removed (deferred to slice 03), and the `--target` flag rationale is documented. The build script follows the existing patterns from `install-skills.sh`. The marketplace manifest structure matches the plugin format research. The `.gitignore` additions are correct (both `dist/` and `.goodplan-dev`).

Type safety considerations are not applicable to this slice since no TypeScript source code is being written or modified — the plan creates a shell script, JSON manifests, and markdown files. The `version.ts` `declare const __GOODPLAN_VERSION__` already handles the build-time define correctly and no changes are needed there.

## Score: 9/10

Strong plan with clear task breakdown, well-researched decisions, and thorough verification steps. The three MINOR issues are cosmetic or forward-looking clarifications, not correctness problems. The round 1 feedback was addressed comprehensively. To reach 10/10: explicitly show the shell quoting for the `--define` flag to prevent a known pitfall, and note the source map file disposition.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
