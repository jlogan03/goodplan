# DevOps & Infrastructure Review — Plugin Distribution Epic

## Issues

### [CRITICAL] Hook configuration format does not match Claude Code's actual format

**Severity:** Critical

The architecture specifies `hooks.json` as a flat array:
```json
{
  "hooks": [
    { "event": "PreToolUse", "matcher": "^(Write|Edit)$", "command": "..." }
  ]
}
```

But the research (`claude-code-hooks-pretooluse.md` and `claude-code-plugin-format.md`) confirms the actual Claude Code format uses nested event-keyed objects with a matcher group layer:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "..." }
        ]
      }
    ]
  }
}
```

The plugin-api.md specifies a format that Claude Code will not recognize. The hooks will silently fail to load.

**Resolution:** Rewrite `hooks.json` in plugin-api.md to use the three-level nesting format (event -> matcher group -> handler array) documented in the research. Drop the `"event"` and `"description"` fields from individual hook entries; those are not part of the schema. The `description` can live at the top level of `hooks.json` if the wrapper format supports it, but must not be on individual hook entries.

---

### [CRITICAL] No multi-platform binary strategy for plugin distribution

**Severity:** Critical

The architecture hardcodes `binaries/macos-arm64/gp` as the binary path. Skills reference `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. The current system overview lists three target platforms: darwin-arm64, darwin-x64, linux-x64.

When a Linux user installs the plugin, their skills will try to execute a macOS arm64 binary. There is no platform detection, no conditional path resolution, and no SessionStart hook that selects the correct binary.

The CI/CD pipeline section acknowledges this: "future: multi-platform matrix" but the plugin structure, skill references, and build pipeline are all designed around a single platform. This is a structural gap, not a future enhancement — the plugin will fail on any non-arm64-Mac machine.

**Resolution:** Either (a) add a SessionStart hook that detects `uname -s`/`uname -m` and symlinks the correct binary from `${CLAUDE_PLUGIN_ROOT}/binaries/<platform>/gp` to `${CLAUDE_PLUGIN_DATA}/bin/gp`, with skills referencing the symlinked location, or (b) scope the first release explicitly to macOS arm64 only with a documented constraint, a CI validation step that fails on other platforms, and a clear migration path. Option (a) is recommended since the research already describes this pattern.

---

### [IMPORTANT] Architecture contradicts research on binary location strategy

**Severity:** Important

The architecture says: "Binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` -- no PATH integration or setup script needed." Skills reference this path directly.

But the research (`bun-compile-binary-embedding.md`) warns that `CLAUDE_PLUGIN_ROOT` changes on every plugin update and recommends copying the binary to `${CLAUDE_PLUGIN_DATA}/bin/` via a SessionStart hook. The research (`claude-code-plugin-format.md`) confirms: "files written here do NOT survive updates."

While the binary being replaced on update is actually fine (the new version ships a new binary), the concern is about mid-session behavior. If Claude Code updates a plugin during a session and the `CLAUDE_PLUGIN_ROOT` path changes, any cached references to the old path will break. Using `CLAUDE_PLUGIN_DATA` with a setup hook is the safer pattern and aligns with platform recommendations.

**Resolution:** Add a SessionStart hook that copies the binary to `${CLAUDE_PLUGIN_DATA}/bin/gp` (with version-change detection via `cmp`). Update skill references to use `${CLAUDE_PLUGIN_DATA}/bin/gp`. Document the rationale in conventions.md.

---

### [IMPORTANT] HMAC key as permanent constant is a security concern for open-source distribution

**Severity:** Important

The architecture states: "HMAC key is a permanent constant baked into the compiled binary via `--define __GP_HMAC_KEY__`" and "Same key across all builds -- signatures are stable."

If this repo is public (or ever becomes public), the HMAC key is visible in the build script, CI configuration, and potentially extractable from the binary via strings analysis. Anyone who knows the key can forge signatures, defeating the entire integrity verification system. The architecture explicitly says "The LLM cannot forge signatures because the key is embedded in the binary and inaccessible at runtime" -- but `--define` values in Bun compiled binaries are embedded as string literals in the JS bytecode/source within the binary and can be extracted.

This isn't a fatal flaw (the hooks are the primary protection layer, signatures are defense-in-depth), but the architecture should not claim the key is "inaccessible."

**Resolution:** (a) Acknowledge in the invariants doc that HMAC signatures protect against accidental corruption and casual LLM bypass, not against determined adversaries who extract the key. (b) Consider generating the key at install time and storing it in `${CLAUDE_PLUGIN_DATA}` rather than baking it into the binary. This makes each installation's signatures unique. (c) If the key must be baked in, at minimum ensure it is not present in source control -- inject it from a CI secret.

---

### [IMPORTANT] No GitHub Actions workflow exists and CI runner requirements are unspecified

**Severity:** Important

The architecture references a CI/CD pipeline triggered on version tag push, but no `.github/workflows/` directory exists in the repo. The pipeline description is high-level (4 numbered steps) without specifying:
- Runner requirements (Bun version, macOS runner for arm64 compilation, `claude` CLI availability for validation)
- Whether cross-compilation works (building darwin-arm64 on ubuntu-latest may not produce correct binaries for all Bun targets)
- How the `release` branch force-push is authenticated (deploy keys vs PAT vs GITHUB_TOKEN)
- How the `plugins/gp/` subdirectory on `release` is managed (orphan branch? subtree?)

Bun's `--target` flag supports cross-compilation, but the research doesn't confirm whether the resulting binary is tested on the target platform. macOS arm64 binaries built on ubuntu-latest runners may work (Bun bundles the target runtime) but this needs explicit validation.

**Resolution:** Add specifics to the plugin-api.md CI/CD section: (a) runner matrix with OS and Bun version, (b) authentication mechanism for release branch push, (c) explicit note on cross-compilation viability or requirement for native runners, (d) the `release` branch management strategy (orphan branch with force-pushed content). These can remain high-level but need enough detail for implementation.

---

### [IMPORTANT] Force-push to `release` branch has no rollback strategy

**Severity:** Important

The CI pipeline force-pushes to `plugins/gp/` on the `release` branch. Force-push overwrites history, so if a bad release ships, there is no git-level rollback. The marketplace manifest pins `ref: "release"` with no SHA pinning, meaning all users get the latest (possibly broken) version immediately.

**Resolution:** (a) Add SHA pinning to the marketplace manifest for production use (update SHA as part of the release workflow). (b) Keep tags on the release branch so previous versions are recoverable. (c) Consider using version tags (`v1.0.0`) on the release branch rather than force-pushing to a single branch name, so the marketplace can pin to specific release tags.

---

### [MINOR] `jq` dependency in hook scripts is not validated

**Severity:** Minor

The architecture notes "jq in hook scripts for JSON parsing (available on macOS by default)" but `jq` is not installed by default on macOS (it requires Homebrew or manual installation). It is also not universally available on Linux. If `jq` is missing, the hook scripts will fail silently or error out, leaving state files unprotected.

**Resolution:** Either (a) use built-in shell tools (`grep`, `sed`, `python3 -c`) for the simple JSON parsing needed in hooks, or (b) add a `jq` check at the top of each hook script with a clear error message, or (c) bundle a `jq` binary in the plugin. Option (a) is simplest -- the hooks only need to extract `file_path` and `command` strings.

---

### [MINOR] Build step numbering gap in plugin-api.md

**Severity:** Minor

The build pipeline steps in plugin-api.md skip from step 5 to step 7 (no step 6). This is cosmetic but suggests content was removed without renumbering.

**Resolution:** Renumber the build steps sequentially.

---

### [MINOR] `build:plugin` script does not exist yet and its location is underspecified

**Severity:** Minor

The architecture references `build:plugin` as "a repo-level script" but doesn't specify whether it's a shell script, a Bun script, or a `package.json` script entry. The current `package.json` has no `build:plugin` entry. For consistency with the existing `build` and `install:skills` patterns, this should be a `package.json` script calling a shell script in `scripts/`.

**Resolution:** Specify that `build:plugin` will be a `package.json` script entry (e.g., `"build:plugin": "bash scripts/build-plugin.sh"`) following the existing pattern of `install:skills`.

---

### [MINOR] No validation that plugin CLAUDE.md, skills, and binary version are consistent

**Severity:** Minor

The architecture relies on `claude plugin validate` for post-build validation, but this only validates the plugin structure (manifest, skill frontmatter, hooks format). It does not verify that the binary version matches the plugin manifest version, or that skill content references (`gp` vs `goodplan`) are consistent. A version mismatch between binary and manifest would be hard to debug.

**Resolution:** Add a post-build assertion in `build:plugin` that runs the compiled binary with `--version` and compares the output against the version in the generated `plugin.json`.

## Score: 5/10

The architecture makes sound high-level choices (single-repo marketplace, release branch distribution, hook-based state protection, compiled binary distribution) that align well with Claude Code's plugin platform. However, the hooks.json format is wrong and will not work as specified, there is no multi-platform story despite targeting multiple platforms, and several important operational details (CI runner specs, rollback strategy, key management) are missing. The build pipeline is described at too high a level for reliable implementation. The research phase produced excellent findings, but some of those findings (particularly around `CLAUDE_PLUGIN_DATA` binary management and the hooks format) were not carried through into the architecture.

## Summary
- Critical: 2
- Important: 4
- Minor: 4
