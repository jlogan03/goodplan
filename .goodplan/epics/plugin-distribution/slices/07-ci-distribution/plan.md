# Plan: CI Distribution

## Overview

Create a GitHub Actions workflow that builds the goodplan plugin on version tag push and publishes it to a `release` branch for marketplace distribution. Also create the repo-root marketplace manifest so users can install via `/plugin marketplace add ian97531/project-skills`.

The workflow runs on a pinned `macos-15` runner (macOS arm64 only for v1), reuses the existing `bun run build:plugin` script (which already handles binary compilation, skill copying with assertions, hook copying, and plugin validation), then adds CI-specific steps: post-build binary version assertion, hook smoke tests, release asset upload, and force-push to the release branch.

The release branch is a self-contained marketplace: `.claude-plugin/marketplace.json` at root + `plugins/gp/` containing the assembled plugin. Version tags on the release branch provide rollback points.

## Phase 1: Workflow & Marketplace Manifest

Create `.github/workflows/publish-plugin.yml` and `.claude-plugin/marketplace.json`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls .github/workflows/publish-plugin.yml` — file not found
- [ ] `ls .claude-plugin/marketplace.json` — file not found

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

  **Job: `build-and-publish`** on `macos-15`:

  1. **Checkout**: `actions/checkout@v4`
  2. **Setup Bun**: `oven-sh/setup-bun@v2`
  3. **Install dependencies**: `bun install`
  4. **Build plugin**: `bun run build:plugin` with `env: { GP_HMAC_KEY: ${{ secrets.GP_HMAC_KEY }} }` — the build script handles binary compilation, skill copying with frontmatter validation, hook copying, CLAUDE.md, and `claude plugin validate`
  5. **Post-build assertion**: Run `dist/gp-plugin/binaries/macos-arm64/gp --version --json` and verify the output version matches the tag version (strip `v` prefix from `${{ github.ref_name }}`). Fail if mismatch.
  6. **Smoke test hooks**: Run `protect-state.sh` and `warn-bash-state.sh` with synthetic stdin JSON. For protect-state: test a blocked path (expect exit 2) and an allowed path (expect exit 0). For warn-bash: test a `.goodplan/` command (expect stdout JSON with additionalContext) and a clean command (expect no output). Fail on unexpected exit codes.
  7. **Create GitHub Release**: Use `softprops/action-gh-release@v2` to create a release from the tag. Upload `dist/gp-plugin/` as a `.tar.gz` asset (`gp-plugin-${{ github.ref_name }}.tar.gz`).
  8. **Prepare release branch content**: Assemble a temporary directory with marketplace layout:
     ```
     tmp-release/
     ├── .claude-plugin/
     │   └── marketplace.json    # copied from repo root
     └── plugins/
         └── gp/                 # copied from dist/gp-plugin/
     ```
  9. **Tag release branch**: Before force-pushing, tag the current release branch HEAD as `release-before-${{ github.ref_name }}` (rollback point).
  10. **Publish to release branch**: Force-push `tmp-release/` contents to the `release` branch. Use `GITHUB_TOKEN` for auth. This replaces the entire branch content — no history accumulation.

- [ ] Create `.claude-plugin/marketplace.json` at repo root:
  ```json
  {
    "name": "goodplan-marketplace",
    "owner": {
      "name": "Ian White",
      "url": "https://github.com/ian97531"
    },
    "plugins": [
      {
        "name": "gp",
        "source": {
          "source": "git-subdir",
          "url": "https://github.com/ian97531/project-skills.git",
          "path": "plugins/gp",
          "ref": "release"
        },
        "description": "goodplan — structured development workflow for Claude Code"
      }
    ]
  }
  ```

- [ ] Add `.claude-plugin/` to `.gitignore` exclusion if needed (ensure marketplace.json is tracked, not ignored)

### Verification

Validate YAML syntax of workflow file. Validate JSON syntax of marketplace manifest. Confirm all required workflow steps are present. Verify `GP_HMAC_KEY` is mapped in the build step environment. Verify concurrency group is set.

## Phase 2: End-to-End Validation

Push a test tag and verify the full pipeline runs correctly.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `gh run list --workflow=publish-plugin.yml --limit=1` — no runs (workflow never triggered)

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
- [ ] Trigger the workflow via `workflow_dispatch` using `gh workflow run publish-plugin.yml`
- [ ] Monitor the run: `gh run watch` — wait for completion
- [ ] If the run fails: read logs with `gh run view --log-failed`, diagnose, fix, re-push, re-trigger
- [ ] Once workflow_dispatch succeeds, push a real test tag:
  1. `git tag v1.0.0-test && git push origin v1.0.0-test`
  2. Monitor: `gh run watch`
  3. Verify GitHub Release: `gh release view v1.0.0-test`
  4. Verify release branch: `git fetch origin release && git log origin/release --oneline -1`
  5. Verify marketplace manifest on release: `git show origin/release:.claude-plugin/marketplace.json`
  6. Verify plugin binary on release: `git show origin/release:plugins/gp/.claude-plugin/plugin.json`
- [ ] Clean up test tag and release:
  1. `gh release delete v1.0.0-test --yes`
  2. `git push origin :refs/tags/v1.0.0-test`
  3. `git tag -d v1.0.0-test`
- [ ] Document any issues found and workarounds applied

### Verification

Full pipeline runs end-to-end. Release branch contains valid marketplace + plugin structure. Binary on release branch is executable and reports correct version. Document whether `/plugin marketplace add` works for the CI slice's final notes.
