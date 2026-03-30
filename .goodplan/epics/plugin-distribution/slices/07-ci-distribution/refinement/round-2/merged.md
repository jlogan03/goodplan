# Merged Feedback — Slice 07: CI Distribution (Round 2)

**Reviewer scores:** holistic 8/10, software-architecture 8/10, ci-github-workflows 8/10

## IMPORTANT Issues (3 unique)

### 1. warn-bash-state.sh smoke tests lack executable assertions
**Sources:** holistic, software-architecture, ci-github-workflows (all three flagged this)

Phase 1 Step 6 smoke tests for `warn-bash-state.sh` use comments ("verify stdout is non-empty JSON with additionalContext", "verify stdout is empty") rather than executable shell commands. The assertions must:
- Parse stdout JSON and assert `hookSpecificOutput.additionalContext` exists (not a top-level `additionalContext` field — holistic notes the output shape is `hookSpecificOutput.hookEventName` + `hookSpecificOutput.additionalContext`)
- Assert empty stdout for the clean-command case with `[ -z "$OUTPUT" ] || exit 1`

Concrete example from ci-github-workflows review:
```bash
# match case
OUTPUT=$(echo '{"tool_input":{"command":"cat .goodplan/project.json"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/warn-bash-state.sh)
[ $? -eq 0 ] || exit 1
echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'additionalContext' in d.get('hookSpecificOutput',{})" || exit 1

# no-match case
OUTPUT=$(echo '{"tool_input":{"command":"ls src/"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/warn-bash-state.sh)
[ $? -eq 0 ] || exit 1
[ -z "$OUTPUT" ] || exit 1
```

### 2. Version assertion step does not specify JSON extraction or tag-stripping
**Sources:** software-architecture, ci-github-workflows

Step 5 says to run `dist/gp-plugin/binaries/macos-arm64/gp --version --json` and "verify the output version matches the tag version" but does not specify: (a) the expected JSON shape (`{"version":"X.Y.Z"}`), (b) how to extract the version (jq or python3), or (c) how to strip the `v` prefix from the tag. This assertion gates release publication and must be precise:
```bash
BINARY_VERSION=$(./dist/gp-plugin/binaries/macos-arm64/gp --version --json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
TAG_VERSION="${GITHUB_REF_NAME#v}"
[ "$BINARY_VERSION" = "$TAG_VERSION" ] || { echo "Version mismatch: binary=$BINARY_VERSION tag=$TAG_VERSION"; exit 1; }
```

### 3. No documentation task for the release process
**Source:** holistic

The plan introduces a non-obvious contract (package.json version must match tag) and a novel branch structure (force-pushed release branch with `release-before-*` rollback tags). There is no task to document: how to trigger a release, what the release branch contains, how rollback works, or the version contract. A brief `docs/releasing.md` or CLAUDE.md section would prevent future confusion.

## IMPORTANT Issue (deferred — new scope)

### 4. Tarball release asset has no SHA-256 checksum
**Source:** ci-github-workflows

The plan creates and uploads `gp-plugin-${{ github.ref_name }}.tar.gz` but publishes no checksum. Standard practice for binary releases is to include a `.sha256` file. Low effort:
```bash
shasum -a 256 gp-plugin-${{ github.ref_name }}.tar.gz > gp-plugin-${{ github.ref_name }}.tar.gz.sha256
```
Upload both as release assets. Could be deferred to a follow-up if desired, but is directly actionable now.

## MINOR Issues (4 unique after dedup)

### 5. Rollback tag assumes release branch already exists
**Source:** software-architecture

Step 10 tags `origin/release` before force-push. On the first-ever release, the branch does not exist and `git tag release-before-... origin/release` will fail. Add a conditional: only create the rollback tag if `git ls-remote --heads origin release` returns a result.

### 6. Phase 2 workflow_dispatch ref and cleanup gaps
**Sources:** holistic, ci-github-workflows (overlapping)

Two related issues:
- **Ref:** `gh workflow run publish-plugin.yml` without `--ref epic/plugin-distribution` will look for the workflow on the default branch where it may not exist yet. Specify the ref or note the merge prerequisite.
- **Cleanup:** The workflow_dispatch run may create a GitHub Release via `softprops/action-gh-release`. The plan should clarify whether the release step is conditional on `github.ref_type == 'tag'` or document the cleanup needed.

### 7. `git init` in tmp-release creates ambiguous local branch name
**Source:** holistic

`git init` creates a `main` branch by default, but pushes to `refs/heads/release`. Functionally fine but confusing. Use `git checkout -b release` after init for clarity.

### 8. Phase 1 "before" check for marketplace.json is not falsifiable
**Source:** holistic

The before check passively observes `cat .claude-plugin/marketplace.json`. A meaningful before/after contrast would assert that a field (e.g., `description` or `$schema`) is absent before and present after.

## Not re-raised (addressed from round 1)

### 9. No Dependabot/Renovate config for Actions version pinning
**Source:** ci-github-workflows (minor, carried from round 1)

SHA-pinned actions will go stale without automated updates. A `dependabot.yml` with `package-ecosystem: github-actions` is a one-time fix. Noted as follow-up rather than blocking.

## Resolution Summary

| # | Severity | Resolution |
|---|----------|------------|
| 1 | IMPORTANT | Fix: add executable assertions to warn-bash smoke tests |
| 2 | IMPORTANT | Fix: specify version extraction command and tag-strip logic |
| 3 | IMPORTANT | Fix: add documentation task for release process |
| 4 | IMPORTANT | Fix or defer: add SHA-256 checksum to release tarball |
| 5 | MINOR | Fix: conditional rollback tag for first release |
| 6 | MINOR | Fix: specify workflow_dispatch ref + clarify release step scope |
| 7 | MINOR | Fix: explicit branch name in tmp-release git init |
| 8 | MINOR | Fix: make marketplace.json before-check falsifiable |
| 9 | MINOR | Defer: Dependabot config as follow-up |
