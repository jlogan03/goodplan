# DevOps & Infrastructure Review — Plugin Distribution Epic (Round 2)

## Issues

### [IMPORTANT] `__GOODPLAN_VERSION__` define not updated to `__GP_VERSION__` in build pipeline spec

**Severity:** Important

The plugin-api.md build step specifies:
```
--define __GP_VERSION__=\"<version>\" --define __GP_HMAC_KEY__=\"<key>\"
```

But the codebase uses `__GOODPLAN_VERSION__` everywhere: `package.json` build script, `vitest.config.ts`, `tests/global-setup.ts`, and `src/version.ts` (which declares `__GOODPLAN_VERSION__` and uses it). The architecture does not mention this rename or the migration path for it.

If `build:plugin` uses `__GP_VERSION__` without updating `src/version.ts` to declare and consume it, the version injection will silently fail and the binary will fall back to reading `package.json` at runtime (which won't exist in a compiled binary context, producing `0.0.0-dev`).

**Resolution:** Either (a) keep using `__GOODPLAN_VERSION__` in the build:plugin pipeline (simpler, no code changes needed) or (b) explicitly call out the rename from `__GOODPLAN_VERSION__` to `__GP_VERSION__` as a migration step, listing all affected files: `src/version.ts`, `vitest.config.ts`, `tests/global-setup.ts`, and the existing `build` script in `package.json`.

---

### [IMPORTANT] CI pipeline lacks HMAC key injection detail

**Severity:** Important

The build step specifies `--define __GP_HMAC_KEY__=\"<key>\"` and conventions.md says the key is "injected from a CI secret." The CI/CD pipeline section says "authenticated via `GITHUB_TOKEN` or deploy key" but does not mention how the HMAC key secret is provided to the build step.

The current `build` script in `package.json` uses inline shell substitution (`$(node -p '...')`). The `build:plugin` script will need to receive the HMAC key from a CI secret (e.g., `${{ secrets.GP_HMAC_KEY }}`), but this is not specified. Locally, developers running `build:plugin` also need a key — the architecture doesn't say whether there's a default dev key, an env var, or whether local builds skip HMAC entirely.

**Resolution:** Specify: (a) the GitHub Actions secret name for the HMAC key, (b) how it's passed to the build script (env var or argument), (c) what happens for local `build:plugin` runs — either a hardcoded dev key or an env var with a documented fallback.

---

### [IMPORTANT] No rollback or versioned release strategy

**Severity:** Important

Round 1 raised that force-push to `release` has no rollback. The updated architecture still uses `ref: "release"` in the marketplace manifest with no SHA pinning. All users get the latest release immediately. If a broken build is force-pushed, every new plugin installation or update gets the broken version, and there's no git history to revert to (force-push).

The architecture added a post-build assertion (binary `--version` vs `plugin.json`), which helps catch version mismatches but not functional regressions.

**Resolution:** (a) Tag releases on the `release` branch before force-pushing so previous versions are recoverable via `git checkout v1.0.0`. (b) Consider whether the marketplace manifest should pin a tag ref rather than a branch ref. (c) Document the manual rollback procedure (re-tag, re-push).

---

### [MINOR] `macos-latest` runner may not be arm64

**Severity:** Minor

The CI section specifies "macOS arm64 runner (`macos-latest` with Bun)". GitHub Actions `macos-latest` currently maps to `macos-14` which is arm64, but this mapping can change. Since the architecture explicitly targets arm64 and uses `--target=bun-darwin-arm64`, the runner should be pinned to a specific label (e.g., `macos-14` or `macos-15`) to guarantee the architecture matches.

Cross-compilation would also work (Bun supports `--target` for other platforms), but the post-build assertion runs the binary with `--version`, which requires the runner architecture to match the target.

**Resolution:** Pin the runner to `macos-14` or `macos-15` (both arm64) instead of `macos-latest`. Add a comment explaining why.

---

### [MINOR] `build:plugin` does not specify HMAC key for step 2

**Severity:** Minor

The build pipeline step 2 shows:
```
bun build --compile src/index.ts --outfile dist/gp-plugin/binaries/macos-arm64/gp --target=bun-darwin-arm64 --define __GP_VERSION__=\"<version>\" --define __GP_HMAC_KEY__=\"<key>\"
```

The `<version>` placeholder has a clear source (package.json), but `<key>` has no specified source in the build script. Should it read from an env var? A file? The script description says "assembling" but doesn't mention secret injection.

**Resolution:** Specify that `<key>` comes from `$GP_HMAC_KEY` environment variable, which CI sets from the secret and developers set locally.

---

### [MINOR] `claude plugin validate` availability not guaranteed

**Severity:** Minor

Build step 7 says "Validate: `claude plugin validate dist/gp-plugin/` (if `claude` CLI available)". The CI pipeline step 4 lists the same validation unconditionally. If the CI runner does not have the `claude` CLI installed, validation silently passes in the build script but fails in CI.

**Resolution:** Either (a) make the CI step explicitly install the `claude` CLI before validation, or (b) mark the CI validation step as conditional with a fallback (structural checks via `jq` — verify `plugin.json` has required fields, `hooks.json` parses, skills have frontmatter).

---

### [MINOR] `jq` fallback guidance is imprecise

**Severity:** Minor

The architecture now acknowledges `jq` may not be available and suggests fallbacks: `python3 -c` or `osascript -l JavaScript`. This is an improvement from round 1. However, the hook script pseudocode still shows `jq` as the primary path with no actual fallback implementation. The guidance says "check for `jq` availability and provide a clear error message if missing" — but if `jq` is missing and hooks fall back to an error message instead of parsing, state files are left unprotected.

**Resolution:** Specify the primary implementation: either (a) use `python3 -c` unconditionally (available on all macOS and most Linux), removing the `jq` dependency entirely, or (b) show the actual fallback chain in the hook pseudocode. Option (a) is simpler and more reliable.

---

## Resolved from Round 1

1. **hooks.json format** — corrected to three-level nested format. Verified against research.
2. **Multi-platform scoping** — v1 explicitly scoped to macOS arm64 with documented constraint and migration path.
3. **CI runner requirements** — now specifies macOS arm64 runner, Bun, post-build assertion.
4. **Post-build version assertion** — added (binary `--version` vs `plugin.json`).
5. **HMAC key security language** — corrected to "prevents casual LLM bypass, not determined adversaries." Key injected from CI secret, not stored in source.
6. **`build:plugin` as package.json script** — explicitly specified.
7. **Binary reference via `CLAUDE_PLUGIN_ROOT`** — architecture chose direct reference over `CLAUDE_PLUGIN_DATA` copy. This is a valid simplification for v1 (the binary is replaced atomically on plugin update, and mid-session updates are an edge case). Accepted.

## Score: 7/10

Significant improvement from round 1 (5/10). The critical issues (hooks format, platform scoping) are resolved. CI pipeline now has concrete runner and validation details. The remaining issues are concentrated in two areas: (1) the `__GP_VERSION__` vs `__GOODPLAN_VERSION__` define mismatch, which will cause a silent build failure if not addressed, and (2) incomplete HMAC key injection details across the build/CI/local-dev surface. The rollback gap persists but is lower risk for a v1 with a single user. No showstoppers remain.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
