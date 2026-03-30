# Plan: CI Distribution

## Overview

Create a GitHub Actions workflow that builds the goodplan plugin on version tag push and publishes it to a `release` branch for marketplace distribution. Also verify/update the existing repo-root marketplace manifest (created in slice 02) so users can install via `/plugin marketplace add ian97531/project-skills`.

The workflow runs on a pinned `macos-15` runner (macOS arm64 only for v1), reuses the existing `bun run build:plugin` script (which already handles binary compilation, skill copying with assertions, hook copying, and plugin validation), then adds CI-specific steps: post-build binary version assertion, hook smoke tests, release asset upload, and force-push to the release branch.

The release branch is a self-contained marketplace: `.claude-plugin/marketplace.json` at root + `plugins/gp/` containing the assembled plugin. Version tags on the release branch provide rollback points.

**Manifest authority model**: The authoritative marketplace manifest lives on `main` and is what Claude Code reads when resolving `/plugin marketplace add ian97531/project-skills`. The copy on the `release` branch is for self-containment only. The `source.ref: "release"` field intentionally uses a branch name (not a SHA) since the release branch is force-pushed by CI on each release.

## Phase 1: Workflow & Marketplace Manifest

Create `.github/workflows/publish-plugin.yml` and verify/update the existing `.claude-plugin/marketplace.json`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls .github/workflows/publish-plugin.yml` — file not found
- [ ] `cat .claude-plugin/marketplace.json` — file exists (created in slice 02); verify `description` field is absent (will be added by this slice) or note its current value for before/after comparison

**After implementation** (should pass / show presence):
- [ ] `.github/workflows/publish-plugin.yml` exists with valid YAML syntax (`python3 -c "import yaml; yaml.safe_load(open('.github/workflows/publish-plugin.yml'))"`)
- [ ] `.claude-plugin/marketplace.json` exists with valid JSON (`python3 -c "import json; json.load(open('.claude-plugin/marketplace.json'))"`)
- [ ] Workflow triggers on `push: tags: ['v*']` and `workflow_dispatch`
- [ ] Workflow uses `macos-15` runner (not `macos-latest`)
- [ ] Workflow has `concurrency: { group: release-pipeline, cancel-in-progress: false }`
- [ ] Marketplace manifest points to `plugins/gp/` via `git-subdir` with `ref: "release"`
- [ ] Workflow maps `GP_HMAC_KEY` from secrets in the build step

### Tasks

- [ ] Create `.github/workflows/publish-plugin.yml` with these steps:

  **Trigger**: `push: tags: ['v*']` + `workflow_dispatch` (for manual testing)

  **Concurrency**: `group: release-pipeline`, `cancel-in-progress: false`

  **Permissions** (top-level): `permissions: {}` (deny all). Job-level: `permissions: { contents: write }` (required for releases, tags, and force-push to release branch).

  **Job: `build-and-publish`** on `macos-15`:

  1. **Checkout**: `actions/checkout@<SHA>` (SHA-pin with `# v4` comment; resolve current v4 SHA at implementation time)
  2. **Setup Bun**: `oven-sh/setup-bun@<SHA>` (SHA-pin with `# v2` comment)
  3. **Install dependencies**: `bun install`
  4. **Build plugin**: `bun run build:plugin` with `env: { GP_HMAC_KEY: ${{ secrets.GP_HMAC_KEY }} }` — the build script handles binary compilation, skill copying with frontmatter validation, hook copying, CLAUDE.md, and `claude plugin validate`
  5. **Post-build assertion**: Run `dist/gp-plugin/binaries/macos-arm64/gp --version --json` (outputs `{"version":"X.Y.Z"}`), extract the version with python3, and compare against the tag with the `v` prefix stripped. Fail on mismatch:
      ```bash
      BINARY_VERSION=$(./dist/gp-plugin/binaries/macos-arm64/gp --version --json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
      TAG_VERSION="${GITHUB_REF_NAME#v}"
      [ "$BINARY_VERSION" = "$TAG_VERSION" ] || { echo "Version mismatch: binary=$BINARY_VERSION tag=$TAG_VERSION"; exit 1; }
      ```
      **Workflow contract**: `package.json` version must be bumped to match the tag before tagging — this assertion enforces that contract.
  6. **Smoke test hooks**: Remove the `.goodplan-dev` sentinel file before running smoke tests — it causes both hook scripts to skip all protection logic (the sentinel is for the dev repo only, not CI):
      ```bash
      # Remove dev sentinel so hooks enforce protection during smoke tests
      rm -f .goodplan-dev
      ```
      Then run hooks from `dist/gp-plugin/hooks/` with synthetic stdin JSON. Concrete test cases:
      ```bash
      # protect-state: blocked path — expected exit 2
      echo '{"tool_input":{"file_path":".goodplan/project.json"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/protect-state.sh
      [ $? -eq 2 ] || exit 1

      # protect-state: allowed path — expected exit 0
      echo '{"tool_input":{"file_path":"src/index.ts"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/protect-state.sh
      [ $? -eq 0 ] || exit 1

      # warn-bash: .goodplan/ command — expected exit 0, stdout contains hookSpecificOutput.additionalContext
      OUTPUT=$(echo '{"tool_input":{"command":"cat .goodplan/project.json"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/warn-bash-state.sh)
      [ $? -eq 0 ] || exit 1
      echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'additionalContext' in d.get('hookSpecificOutput',{})" || exit 1

      # warn-bash: clean command — expected exit 0, no stdout
      OUTPUT=$(echo '{"tool_input":{"command":"ls src/"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/warn-bash-state.sh)
      [ $? -eq 0 ] || exit 1
      [ -z "$OUTPUT" ] || exit 1
      ```
      Fail the workflow step on unexpected exit codes or output.
  7. **Create tarball**: `tar -czf gp-plugin-${{ github.ref_name }}.tar.gz -C dist gp-plugin`
  8. **Create GitHub Release**: Use `softprops/action-gh-release@<SHA>` (SHA-pin with `# v2` comment) to create a release from the tag. Upload the tarball (`gp-plugin-${{ github.ref_name }}.tar.gz`) as a release asset. Gate this step with `if: github.ref_type == 'tag'` so `workflow_dispatch` runs skip release creation.
  9. **Prepare release branch content**: Assemble a temporary directory with marketplace layout:
     ```
     tmp-release/
     ├── .claude-plugin/
     │   └── marketplace.json    # copied from repo root
     └── plugins/
         └── gp/                 # copied from dist/gp-plugin/
     ```
  10. **Tag release branch**: Before force-pushing, tag the current release branch HEAD as `release-before-${{ github.ref_name }}` (rollback point). Only create this tag if the release branch already exists (`git ls-remote --heads origin release` returns a result); skip on first-ever release.
  11. **Publish to release branch**: Force-push `tmp-release/` contents to the `release` branch. Use `GITHUB_TOKEN` for auth. This replaces the entire branch content — no history accumulation. Mechanism:
      ```bash
      cd tmp-release
      git init && git checkout -b release && git add -A && git commit -m "Release ${{ github.ref_name }}"
      git push --force "https://x-access-token:${GITHUB_TOKEN}@github.com/${{ github.repository }}.git" HEAD:refs/heads/release
      ```
      **Note**: The `release` branch must NOT have force-push protection enabled (or use a deploy key/PAT if protection is required).

- [ ] Verify/update the existing `.claude-plugin/marketplace.json` (created in slice 02). Ensure it contains the fields needed for CI distribution:
  - `plugins[0].source.source` = `"git-subdir"`
  - `plugins[0].source.url` = `"https://github.com/ian97531/project-skills.git"`
  - `plugins[0].source.path` = `"plugins/gp"`
  - `plugins[0].source.ref` = `"release"`
  - Add `description` field if not already present
  - Reconcile any field differences with the existing file (e.g., `owner.url` — add only if missing)

- [ ] Verify `.claude-plugin/marketplace.json` is tracked by git (it should be — `.gitignore` does not exclude it)

- [ ] Add a `docs/releasing.md` documenting the release process:
  - How to trigger a release (tag push `v*` pattern, `workflow_dispatch`)
  - The version contract: `package.json` version must match the tag (without `v` prefix)
  - What the `release` branch contains (marketplace manifest + assembled plugin) and that it is force-pushed on each release
  - Rollback: `release-before-<tag>` tags mark the prior release branch HEAD; restore via `git push --force origin release-before-<tag>:release`

### Verification

Validate YAML syntax of workflow file. Validate JSON syntax of marketplace manifest. Confirm all required workflow steps are present. Verify `GP_HMAC_KEY` is mapped in the build step environment. Verify concurrency group is set.

## Phase 2: End-to-End Validation

Push a test tag and verify the full pipeline runs correctly.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `gh run list --workflow=publish-plugin.yml --limit=1` — no successful runs (prior failed runs may exist)

**After implementation** (should pass / show presence):
- [ ] Workflow run completes successfully (all steps green)
- [ ] Post-build assertion step verified binary version matches tag
- [ ] Smoke test step verified hook exit codes
- [ ] GitHub Release exists for the test tag with `.tar.gz` asset attached
- [ ] `release` branch exists with `plugins/gp/.claude-plugin/plugin.json`
- [ ] `release` branch has `.claude-plugin/marketplace.json` at root
- [ ] Binary on release branch runs: `plugins/gp/binaries/macos-arm64/gp --version --json` returns expected version
- [ ] `/plugin marketplace add ian97531/project-skills` installs the plugin (if feasible)

### Tasks

- [ ] Push the workflow and manifest to the remote (commit + push to current branch)
- [ ] Trigger the workflow via `workflow_dispatch` using `gh workflow run publish-plugin.yml --ref epic/plugin-distribution` (the workflow must exist on the target ref; specify the branch explicitly until merged to main)
- [ ] Monitor the run: `gh run watch` — wait for completion
- [ ] If the run fails: read logs with `gh run view --log-failed`, diagnose, fix, re-push, re-trigger
- [ ] Once workflow_dispatch succeeds, push a real test tag:
  1. `git tag v1.0.0-test && git push origin v1.0.0-test`
  2. Monitor: `gh run watch`
  3. Verify GitHub Release: `gh release view v1.0.0-test`
  4. Verify release branch: `git fetch origin release && git log origin/release --oneline -1`
  5. Verify marketplace manifest on release: `git show origin/release:.claude-plugin/marketplace.json`
  6. Verify plugin binary on release: `git show origin/release:plugins/gp/.claude-plugin/plugin.json`
- [ ] Clean up test tag, release, and rollback tag:
  1. `gh release delete v1.0.0-test --yes`
  2. `git push origin :refs/tags/v1.0.0-test`
  3. `git tag -d v1.0.0-test`
  4. `git push origin :refs/tags/release-before-v1.0.0-test` (rollback tag)
  5. `git tag -d release-before-v1.0.0-test`
- [ ] Document any issues found and workarounds applied
- [ ] **Note**: After cleanup, the `release` branch still contains the test build content — this is expected and will be overwritten on the next real release

### Verification

Full pipeline runs end-to-end. Release branch contains valid marketplace + plugin structure. Binary on release branch is executable and reports correct version. Document whether `/plugin marketplace add` works for the CI slice's final notes.
