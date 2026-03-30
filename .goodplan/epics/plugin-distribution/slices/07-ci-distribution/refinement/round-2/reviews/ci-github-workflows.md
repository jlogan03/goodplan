## Issues

**[IMPORTANT]** Smoke tests for `warn-bash-state.sh` lack concrete assertion commands

The protect-state smoke tests in Step 6 now have concrete payloads and exit code checks -- good. But the warn-bash-state tests are incomplete. The plan says:

```bash
# verify stdout is non-empty JSON with additionalContext
```
and
```bash
# verify stdout is empty
```

These are comments, not executable assertions. The workflow needs actual shell commands that fail the step on unexpected output. For example:

```bash
# warn-bash: .goodplan/ command — expected exit 0, stdout contains additionalContext
OUTPUT=$(echo '{"tool_input":{"command":"cat .goodplan/project.json"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/warn-bash-state.sh)
[ $? -eq 0 ] || exit 1
echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'additionalContext' in d.get('hookSpecificOutput',{})" || exit 1

# warn-bash: clean command — expected exit 0, no stdout
OUTPUT=$(echo '{"tool_input":{"command":"ls src/"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/warn-bash-state.sh)
[ $? -eq 0 ] || exit 1
[ -z "$OUTPUT" ] || exit 1
```

Without executable assertions, the warn-bash smoke tests are documentation, not verification.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Tarball step (Step 7) creates an asset but no checksum is published alongside it

The plan creates `gp-plugin-${{ github.ref_name }}.tar.gz` and uploads it as a release asset. For a plugin distribution pipeline shipping compiled binaries, consumers should be able to verify download integrity. The plan should include a SHA-256 checksum step:

```bash
shasum -a 256 gp-plugin-${{ github.ref_name }}.tar.gz > gp-plugin-${{ github.ref_name }}.tar.gz.sha256
```

And upload both files as release assets. This is low-effort and standard practice for binary releases.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Version assertion in Step 5 uses `--version --json` but doesn't specify the expected JSON shape

The plan says: "Run `dist/gp-plugin/binaries/macos-arm64/gp --version --json` and verify the output version matches the tag version." It doesn't show the actual assertion command. The implementer needs to know the JSON structure to extract the version. Based on the build script's `--define __GOODPLAN_VERSION__`, the output is likely `{"version":"1.0.0"}` but the plan should include the jq/python extraction command:

```bash
BINARY_VERSION=$(./dist/gp-plugin/binaries/macos-arm64/gp --version --json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
TAG_VERSION="${{ github.ref_name }}"
TAG_VERSION="${TAG_VERSION#v}"
[ "$BINARY_VERSION" = "$TAG_VERSION" ] || { echo "Version mismatch: binary=$BINARY_VERSION tag=$TAG_VERSION"; exit 1; }
```

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No Dependabot/Renovate config for GitHub Actions version management

Flagged in round 1 as minor and still not addressed. The plan SHA-pins third-party actions (good), but without a Dependabot or Renovate config, those SHA pins will become stale. A `dependabot.yml` with `package-ecosystem: github-actions` is a one-time addition that keeps pins current automatically. Could be added as a task in Phase 1 or noted as a follow-up.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 E2E validation relies on `workflow_dispatch` but doesn't specify a ref

When triggering `gh workflow run publish-plugin.yml`, the workflow will run against the default branch. But the workflow file is being created on `epic/plugin-distribution`, not `main`. The plan should either:
1. Specify `--ref epic/plugin-distribution` in the `gh workflow run` command, or
2. Note that the workflow must be merged to the default branch first for `workflow_dispatch` to work (GitHub Actions only lists `workflow_dispatch` triggers from the default branch's version of the file).

This is a practical execution issue -- the E2E test in Phase 2 may silently fail to find the workflow.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong improvement from round 1 (6/10). All critical and important issues were addressed: permissions block with deny-all top-level + contents:write job-level, SHA-pinned actions, concrete force-push commands, smoke test payloads with expected outputs, tarball step, and manifest authority model clarification. The remaining issues are: incomplete assertions for warn-bash smoke tests (comments instead of executable commands), missing checksum for the release tarball, and a few minor specification gaps. To reach 9+: make the warn-bash assertions executable, add a SHA-256 checksum to the release assets, and specify the `workflow_dispatch` ref for Phase 2 testing.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
