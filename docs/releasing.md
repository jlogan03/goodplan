# Releasing

## How to trigger a release

Push a version tag matching `v*`:

```bash
# 1. Bump version in package.json
# 2. Commit the version bump
git add package.json && git commit -m "Bump version to X.Y.Z"
# 3. Tag and push
git tag vX.Y.Z && git push origin main --tags
```

The `publish-plugin.yml` workflow triggers automatically on `v*` tag push.

For testing without creating a release, use `workflow_dispatch` (requires workflow on default branch):

```bash
gh workflow run publish-plugin.yml
```

This runs the build and smoke tests but skips release creation and release branch publishing.

## Codex target

Codex has a separate publish workflow:

- Workflow: `.github/workflows/publish-codex-plugin.yml`
- Build locally with `bash scripts/build-codex-plugin.sh`
- The generated plugin lives at `plugins/goodplan/`
- The marketplace entry lives at `.agents/plugins/marketplace.json`
- Tagged releases publish a dedicated `codex-release` branch containing only:
  - `.agents/plugins/marketplace.json`
  - `plugins/goodplan/`

This keeps the existing Claude release path unchanged while giving Codex a marketplace-ready release branch.

## Version contract

`package.json` version must match the tag (without `v` prefix). The workflow's post-build assertion enforces this:

- Tag `v1.2.3` requires `package.json` version `1.2.3`
- Mismatch fails the workflow

Bump `package.json` version **before** tagging.

## What the release branch contains

The `release` branch is force-pushed on each release with this structure:

```
.claude-plugin/
  marketplace.json      # marketplace manifest (copied from main)
plugins/
  gp/                   # assembled plugin directory
    .claude-plugin/
      plugin.json
    binaries/
      macos-arm64/gp    # compiled CLI binary
    skills/             # all workflow skills
    hooks/              # state protection hooks
    CLAUDE.md           # universal goodplan instructions
```

Users install via: `/plugin marketplace add ian97531/goodplan`

The separate `codex-release` branch contains the Codex marketplace payload (`.agents/plugins/marketplace.json` plus `plugins/goodplan/`). The `release` branch remains Claude-only.

## Rollback

Each release tags the previous release branch HEAD before force-pushing:

```bash
# See available rollback points
git tag -l 'release-before-*'

# Restore a previous release
git push --force origin release-before-v1.2.3:release
```

The first release has no rollback tag (nothing to roll back to).
