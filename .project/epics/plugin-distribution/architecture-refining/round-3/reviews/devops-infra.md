# DevOps and Infra Review — Round 3

## Summary

The build pipeline and CI/CD design is significantly improved since round 2. The `build:plugin` script as a `package.json` entry, pinned `macos-15` runner, `GP_HMAC_KEY` secret injection with dev fallback, release tagging for rollback, and `python3` replacing `jq` are all solid decisions. The distribution model (force-push to `release` branch, `git-subdir` marketplace) is simple and appropriate for a single-author plugin.

Several issues remain around CI robustness, secret handling nuances, and the force-push publishing model.

## Critical

### 1. Force-push to `release` branch has no pre-publish smoke test on the assembled artifact

The CI pipeline builds, validates structure, then force-pushes to the `release` branch. There is no step that actually runs the assembled plugin end-to-end before publishing. The `--version` post-build assertion checks the binary runs, but does not verify that the plugin directory works as a plugin (hook execution, skill loading). A broken hook script or missing file would be published immediately.

**Recommendation:** Add a smoke test step between validation and publish that exercises the plugin in a sandboxed Claude Code session (if feasible on the runner), or at minimum runs each hook script with synthetic stdin JSON to verify exit codes. This is the last gate before users receive the artifact.

### 2. No `GP_HMAC_KEY` rotation or compromise procedure documented

The architecture specifies the HMAC key is a "stable constant" baked into the binary. If the key leaks (binary disassembly, CI log exposure, secret rotation policy), every previously signed state tree becomes suspect. There is no documented procedure for rotating the key, migrating existing repos, or detecting stale keys.

**Recommendation:** Document a key rotation procedure: (1) generate new key, (2) update CI secret, (3) publish new binary, (4) users run `gp verify --fix` to re-sign with the new key. Acknowledge that key extraction from the binary is trivial (`strings`) — this is stated but the operational implications are not addressed.

## Important

### 3. `build:plugin` script complexity belongs in a shell script, not a `package.json` one-liner

The build pipeline has 7 steps (clean, compile with multiple `--define` flags, copy skills, copy hooks, generate plugin.json, copy CLAUDE.md, validate). Encoding this as a `package.json` script entry will produce an unreadable, unmaintainable command string — especially with the `GP_HMAC_KEY` fallback and version injection. The existing `install:skills` script is already a separate `scripts/install-skills.sh`.

**Recommendation:** Follow the established pattern: `"build:plugin": "bash scripts/build-plugin.sh"` with the multi-step logic in a proper shell script. This enables error handling (`set -e`), comments, and easier debugging.

### 4. No integrity check on the `release` branch after force-push

The CI force-pushes to `release` but does not verify the push succeeded or that the resulting tree on `release` matches what was built. Network failures, partial pushes, or race conditions (two tags pushed in quick succession) could leave `release` in a broken state.

**Recommendation:** After the force-push, add a verification step: checkout `release`, run `claude plugin validate` on the result (or structural checks), and confirm the version matches. Also consider a concurrency guard (GitHub Actions `concurrency` key) to prevent parallel release jobs from racing.

### 5. Dev HMAC key hardcoded in `package.json` script is visible in version control

The architecture states "a well-known dev key hardcoded in the script" for local builds. If this is in `package.json` (checked into git), it is in version control. While the dev key is explicitly not the production key, having any key material in source control — even a dev key — sets a bad precedent and may confuse contributors about the security model.

**Recommendation:** Use a `.env.development` file (gitignored) or a well-documented environment variable with a default. Alternatively, keep the dev key in `scripts/build-plugin.sh` (per issue 3) with a clear comment that it is intentionally non-secret.

### 6. No CI workflow file specified — implementation details are underspecified

The architecture describes what CI should do but there is no `.github/workflows/` directory or workflow file. Key implementation details are left open: which GitHub Actions actions to use, how `bun` is installed on the runner, how the `release` branch force-push is authenticated (GITHUB_TOKEN vs deploy key — both mentioned), and how `claude` CLI is installed for validation.

**Recommendation:** Specify the workflow skeleton: trigger (`on: push: tags: ['v*']`), runner (`macos-15`), steps (checkout, setup-bun action, build, validate, publish). Clarify auth: `GITHUB_TOKEN` has sufficient permissions for force-push within the same repo if the workflow has `contents: write`. Deploy keys are unnecessary overhead for this use case.

### 7. Rollback procedure relies on manual git operations

The rollback procedure (`git push --force origin <previous-tag>:release`) requires an operator to identify the correct tag and run a manual command. For a single-author project this is acceptable for v1, but the architecture also mentions "pinning a tag ref in the marketplace manifest instead of a branch ref" as a future enhancement — this should be prioritized higher.

**Recommendation:** Consider implementing tag-ref pinning in the marketplace manifest from the start. It eliminates the need for force-push rollbacks entirely and gives users deterministic versions. The `release` branch approach works but is fragile when combined with force-push semantics.

## Minor

### 8. `python3` JSON parsing invoked multiple times per hook execution

Both hook scripts parse the same stdin JSON twice (once for `file_path`/`command`, once for `cwd`), each spawning a separate `python3` process. While the overhead is small per invocation, hooks run on every tool call matching their matchers.

**Recommendation:** Parse once, extract both values:
```bash
INPUT=$(cat)
read -r FILE_PATH CWD <<< "$(python3 -c "
import sys,json
d = json.loads(sys.stdin.read())
print(d.get('tool_input',{}).get('file_path',''), d.get('cwd',''))
" <<< "$INPUT")"
```

### 9. No versioning strategy for the plugin manifest schema

`plugin.json` has a `version` field but no schema version. If the plugin manifest format changes in future Claude Code releases, there is no way to detect incompatibility.

**Recommendation:** This is likely managed by Claude Code's plugin system itself. Just note that if the plugin manifest schema evolves, the build pipeline needs to track which schema version it targets.

### 10. `.goodplan-dev` sentinel file for dev repo detection is fragile

The `warn-bash-state.sh` hook checks for `.goodplan-dev` in `cwd` to skip warnings. This file could be accidentally committed, deleted, or present in a non-dev context.

**Recommendation:** Add `.goodplan-dev` to `.gitignore` in the repo. Consider using an environment variable (`GP_DEV=1`) as an alternative signal that does not require filesystem state.

## Score

| Category | Assessment |
|---|---|
| Build pipeline design | Good — `package.json` entry point, bun compile, version injection |
| CI/CD completeness | Adequate concept, underspecified implementation |
| Secret management | Functional but rotation/compromise not addressed |
| Distribution model | Simple and appropriate for v1 scope |
| Rollback/recovery | Present but manual and fragile |
| Runner/platform strategy | Good — pinned runner, explicit platform constraint |

**Score: 6/10**
