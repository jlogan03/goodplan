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

Codex has a separate publish workflow, but it uses the same release tag as Claude:

- Workflow: `.github/workflows/publish-codex-plugin.yml`
- Build locally with `bash scripts/build-codex-plugin.sh`
- The generated plugin lives at `plugins/gp/`
- The marketplace entry lives at `.agents/plugins/marketplace.json`
- Local builds compile the native host platform by default. Set `GOODPLAN_BINARY_PLATFORM=<platform>` to override, or `GOODPLAN_BINARY_PLATFORMS=<comma-separated platforms>` to build a multi-platform payload.
- Tagged releases attach `goodplan-codex-plugin-vX.Y.Z.tar.gz` to the same GitHub Release tag used by the Claude workflow.

This keeps the existing Claude release branch flow unchanged while letting Codex share the same versioned release tag.

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
      macos-x64/gp
      linux-arm64/gp
      linux-x64/gp
    skills/             # all workflow skills
    hooks/              # state protection hooks
    CLAUDE.md           # universal goodplan instructions
```

Users install via: `/plugin marketplace add ian97531/goodplan`

The Codex workflow attaches the Codex marketplace payload (`.agents/plugins/marketplace.json` plus `plugins/gp/`) as a release asset on the same tag. Both release workflows set `GOODPLAN_BINARY_PLATFORMS=macos-arm64,macos-x64,linux-arm64,linux-x64` so the published payload includes the full supported binary matrix. The `release` branch remains Claude-only.

## Rollback

Each release tags the previous release branch HEAD before force-pushing:

```bash
# See available rollback points
git tag -l 'release-before-*'

# Restore a previous release
git push --force origin release-before-v1.2.3:release
```

The first release has no rollback tag (nothing to roll back to).
