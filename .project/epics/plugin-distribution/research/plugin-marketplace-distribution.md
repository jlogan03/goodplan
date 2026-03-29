# Claude Code Plugin Marketplace Distribution -- Research Findings

**Date:** 2026-03-29
**Sources:** Official Claude Code docs, anthropics/claude-plugins-official repo, anthropics/claude-code repo, community marketplace repos

---

## 1. What Is a Claude Code Marketplace?

A **plugin marketplace** is a catalog (a Git repo or URL) that lists available plugins and where to fetch them. It provides centralized discovery, version tracking, automatic updates, and support for multiple source types.

### How Users Add a Marketplace

**CLI command:**
```shell
/plugin marketplace add owner/repo                        # GitHub shorthand
/plugin marketplace add https://gitlab.com/team/plugins.git  # Git URL
/plugin marketplace add ./local/path                      # Local directory
```

**Settings-based (team distribution):** Add to `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  }
}
```

Users are automatically prompted to install when they trust the project folder.

**Pre-enabled plugins:** Pair with `enabledPlugins` to auto-enable specific plugins:
```json
{
  "enabledPlugins": {
    "code-formatter@company-tools": true,
    "deployment-tools@company-tools": true
  }
}
```

**Managed restrictions:** Admins can lock down allowed marketplaces via `strictKnownMarketplaces` in managed settings (supports exact match, `hostPattern` regex, `pathPattern` regex, or empty array for complete lockdown).

### Official Marketplace

The **`claude-plugins-official`** marketplace at `anthropics/claude-plugins-official` is auto-available and browsable at claude.com/plugins. It currently lists 100+ plugins with SHA-pinned sources.

---

## 2. Marketplace Manifest Format

The manifest lives at `.claude-plugin/marketplace.json` in the repo root. It is a JSON file (not YAML, not TOML).

### Schema

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "marketplace-name",           // Required. Kebab-case. Users see this in install commands.
  "owner": {                             // Required.
    "name": "Maintainer Name",
    "email": "optional@example.com"
  },
  "plugins": [                           // Required. Array of plugin entries.
    {
      "name": "plugin-name",            // Required. Kebab-case.
      "source": "./plugins/my-plugin",  // Required. String (relative path) or object (remote source).
      "description": "...",             // Optional.
      "version": "1.0.0",              // Optional. Semver.
      "author": { "name": "..." },     // Optional.
      "homepage": "...",               // Optional.
      "repository": "...",            // Optional. String URL.
      "license": "MIT",               // Optional. SPDX identifier.
      "keywords": ["..."],            // Optional.
      "category": "development",      // Optional.
      "tags": ["..."],                // Optional.
      "strict": true,                 // Optional. Default true. Controls plugin.json authority.
      "commands": "...",              // Optional. Can override/supplement plugin.json.
      "agents": "...",                // Optional.
      "hooks": {},                    // Optional. Inline or path.
      "mcpServers": {},               // Optional. Inline or path.
      "lspServers": {}                // Optional. Inline or path.
    }
  ],
  "metadata": {                          // Optional.
    "description": "...",
    "version": "1.0.0",
    "pluginRoot": "./plugins"           // Base dir prepended to relative source paths.
  }
}
```

### Reserved Marketplace Names

Cannot be used: `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `knowledge-work-plugins`, `life-sciences`. Names that impersonate official marketplaces are also blocked.

### Strict Mode

| Value | Behavior |
|-------|----------|
| `true` (default) | `plugin.json` is authoritative for components. Marketplace entry supplements. |
| `false` | Marketplace entry is the entire definition. Plugin must NOT have its own component declarations in `plugin.json`. |

---

## 3. Plugin Source Types

The `source` field in each plugin entry tells Claude Code where to fetch the plugin.

### Relative Path (same repo)
```json
{ "source": "./plugins/my-plugin" }
```
Resolves relative to the marketplace root (the dir containing `.claude-plugin/`). Only works when the marketplace is added via Git clone (not via raw URL).

### GitHub Repository
```json
{
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo",
    "ref": "v2.0.0",              // Optional. Branch or tag.
    "sha": "a1b2c3d4..."          // Optional. 40-char commit SHA for pinning.
  }
}
```

### Git URL (GitLab, Bitbucket, self-hosted)
```json
{
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin.git",
    "ref": "main",
    "sha": "a1b2c3d4..."
  }
}
```

### Git Subdirectory (monorepo)
```json
{
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/acme-corp/monorepo.git",
    "path": "tools/claude-plugin",
    "ref": "v2.0.0",
    "sha": "a1b2c3d4..."
  }
}
```
Uses sparse, partial clone to minimize bandwidth. The `url` field also accepts GitHub shorthand (`owner/repo`) or SSH URLs.

### npm Package
```json
{
  "source": {
    "source": "npm",
    "package": "@acme/claude-plugin",
    "version": "^2.0.0",
    "registry": "https://npm.example.com"   // Optional. Custom registry.
  }
}
```

### What's NOT Supported as a Source

There is **no** `github-release` or `tarball` source type. You cannot point to a GitHub Release asset or a `.tar.gz` URL directly. The supported mechanisms are Git repos (full or sparse clone), relative paths, and npm packages.

---

## 4. Can a Marketplace Point to a GitHub Repo Subdirectory?

**Yes.** The `git-subdir` source type does exactly this. It uses sparse checkout to clone only the specified `path` from the repo.

This is actively used in the official marketplace. Example from `claude-plugins-official`:
```json
{
  "name": "amazon-location-service",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/awslabs/agent-plugins.git",
    "path": "plugins/amazon-location-service",
    "ref": "main"
  }
}
```

---

## 5. Can a Marketplace Use GitHub Releases?

**No, not directly.** There is no `github-release` source type. However, there are workarounds:

1. **Use a release branch or tag with `ref`:** Pin the `github` or `url` source to a tag like `v1.0.0`. The Git repo at that tag contains the built artifacts.
2. **Use npm:** Publish the built plugin to npm and use the `npm` source type with version pinning.
3. **Use a separate "dist" repo:** A CI/CD pipeline builds the plugin, commits the output to a separate `dist` repo, and the marketplace points to that repo.
4. **Use a release branch:** CI pushes built artifacts to a `release` branch; the marketplace pins `ref: "release"`.

---

## 6. Versioning and Auto-Updates

### Version Source Priority

- `plugin.json` version always wins over `marketplace.json` version.
- Recommendation: For relative-path plugins, set version in marketplace entry. For external plugins, set version in `plugin.json`.
- If code changes but version doesn't bump, users won't see updates (due to caching by version).

### Auto-Update Behavior

| Marketplace type | Auto-update default |
|-----------------|---------------------|
| Official (`claude-plugins-official`) | **Enabled** |
| Third-party / local | **Disabled** |

Toggle per-marketplace via `/plugin` > Marketplaces > select > Enable/Disable auto-update.

Environment variables:
- `DISABLE_AUTOUPDATER=true` -- disables all auto-updates
- `FORCE_AUTOUPDATE_PLUGINS=true` -- keeps plugin auto-updates even when autoupdater is disabled

### Manual Update

```shell
claude plugin update <plugin> [--scope <scope>]
/plugin marketplace update
```

### Release Channels

Support "stable" and "latest" by creating two marketplace manifests pointing to different `ref` values of the same plugin repo. Assign each marketplace to different user groups via managed settings.

---

## 7. Can One Repo Be Both Source Code AND Marketplace?

**Yes.** The `anthropics/claude-code` repo demonstrates this pattern:

- Source code lives in the repo root
- `.claude-plugin/marketplace.json` at the repo root lists plugins
- Plugins live in `./plugins/` subdirectories (relative path sources)
- The same repo serves as both the development workspace and the distribution marketplace

For goodplan, the structure would be:

```
goodplan/
  .claude-plugin/
    marketplace.json        # Marketplace manifest
  plugins/
    goodplan/               # The plugin itself
      .claude-plugin/
        plugin.json
      skills/
      hooks/
      binaries/             # Platform-specific compiled binaries
  src/                      # Source code
  ...
```

The marketplace.json would reference the plugin via relative path:
```json
{
  "name": "goodplan-marketplace",
  "owner": { "name": "goodplan" },
  "plugins": [
    {
      "name": "goodplan",
      "source": "./plugins/goodplan",
      "description": "Workflow management for Claude Code projects"
    }
  ]
}
```

### Alternative: Separate Distribution Repo

A CI pipeline could build the plugin (compile binaries, assemble skills/hooks) and push to a separate `goodplan-plugin` repo. This keeps the marketplace clean and avoids shipping source code to end users.

### Alternative: Same Repo, Release Branch

CI builds artifacts and pushes to a `release` branch. The marketplace.json on `main` points to a `github` source with `ref: "release"`:
```json
{
  "source": {
    "source": "github",
    "repo": "yourorg/goodplan",
    "ref": "release"
  }
}
```

---

## 8. Existing Examples in the Wild

### Official Anthropic

| Repo | Description |
|------|-------------|
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Official curated directory. 100+ plugins. Mix of relative paths, `url`, and `git-subdir` sources. SHA-pinned. |
| [anthropics/claude-code](https://github.com/anthropics/claude-code) | Claude Code's own bundled plugins. 13 plugins (code-review, commit-commands, feature-dev, etc.) All relative-path sources. |

### Community / Third-Party

| Repo | Description |
|------|-------------|
| [ivan-magda/claude-code-plugin-template](https://github.com/ivan-magda/claude-code-plugin-template) | GitHub template with scaffolding, validation, CI/CD workflows |
| [hyperskill/claude-code-marketplace](https://github.com/hyperskill/claude-code-marketplace) | Hyperskill team's curated plugin collection |
| [kivilaid/plugin-marketplace](https://github.com/kivilaid/plugin-marketplace) | Community marketplace showcasing all component types |
| [pyang2045/claude-code-marketplace](https://github.com/pyang2045/claude-code-marketplace) | Personal marketplace with planning plugins |
| [sgaunet/claude-plugins](https://github.com/sgaunet/claude-plugins) | Curated collection of development workflow plugins |
| [ananddtyagi/cc-marketplace](https://github.com/ananddtyagi/cc-marketplace) | Another community marketplace |
| [claudemarketplaces.com](https://claudemarketplaces.com/) | Third-party directory/aggregator of Claude Code plugins |

### Patterns Observed in the Official Marketplace

Analysis of `claude-plugins-official/marketplace.json`:
- **Most common source type:** `url` with `sha` pinning (pointing to GitHub repos via `.git` URL)
- **Second most common:** `git-subdir` with `sha` pinning (for monorepos like `awslabs/agent-plugins`)
- **Also used:** Relative paths (`./plugins/...` and `./external_plugins/...`) for plugins maintained in the same repo
- **Not observed:** `npm` source type (none used in the official marketplace)
- **Every external source is SHA-pinned** for reproducibility

---

## 9. CI/CD Setup for Building and Publishing a Plugin

### Validation Workflow (from plugin-template)

The [ivan-magda/claude-code-plugin-template](https://github.com/ivan-magda/claude-code-plugin-template) includes a GitHub Actions workflow (`validate-plugins.yml`) that runs on push/PR and validates:

1. `marketplace.json` is valid JSON with required fields (`name`, `owner`, `plugins`)
2. Each plugin entry has required fields (`name`, `source`)
3. Each local plugin directory exists with a valid `plugin.json`
4. No duplicate plugin names

### Built-in Validation

Claude Code ships a validation command:
```bash
claude plugin validate .        # CLI
/plugin validate .              # Interactive
```
This checks `plugin.json`, skill/agent/command frontmatter, and `hooks/hooks.json`.

### Recommended CI/CD Pipeline for goodplan

A build-and-publish pipeline would need:

```yaml
# .github/workflows/publish-plugin.yml
name: Build and Publish Plugin

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            arch: arm64
            target: darwin-arm64
          - os: macos-latest
            arch: x64
            target: darwin-x64
          - os: ubuntu-latest
            arch: x64
            target: linux-x64

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v6
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun build --compile --target=bun-${{ matrix.target }} ./src/cli.ts --outfile goodplan
      - uses: actions/upload-artifact@v4
        with:
          name: goodplan-${{ matrix.target }}
          path: goodplan

  assemble:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/download-artifact@v4

      # Assemble plugin directory
      - run: |
          mkdir -p dist/plugins/goodplan/.claude-plugin
          mkdir -p dist/plugins/goodplan/binaries/{darwin-arm64,darwin-x64,linux-x64}
          mkdir -p dist/plugins/goodplan/skills
          mkdir -p dist/plugins/goodplan/hooks

          # Copy plugin manifest
          cp plugin-dist/plugin.json dist/plugins/goodplan/.claude-plugin/

          # Copy binaries
          cp goodplan-darwin-arm64/goodplan dist/plugins/goodplan/binaries/darwin-arm64/
          cp goodplan-darwin-x64/goodplan dist/plugins/goodplan/binaries/darwin-x64/
          cp goodplan-linux-x64/goodplan dist/plugins/goodplan/binaries/linux-x64/

          # Copy skills and hooks
          cp -r skills/ dist/plugins/goodplan/skills/
          cp hooks/hooks.json dist/plugins/goodplan/hooks/

          # Copy marketplace manifest
          mkdir -p dist/.claude-plugin
          cp plugin-dist/marketplace.json dist/.claude-plugin/

      # Validate
      - run: claude plugin validate dist/

      # Option A: Push to dist repo
      - run: |
          cd dist
          git init && git add -A
          git commit -m "Release ${{ github.ref_name }}"
          git push --force https://x-access-token:${{ secrets.DIST_REPO_TOKEN }}@github.com/yourorg/goodplan-plugin.git HEAD:main
          git tag ${{ github.ref_name }}
          git push https://x-access-token:${{ secrets.DIST_REPO_TOKEN }}@github.com/yourorg/goodplan-plugin.git ${{ github.ref_name }}

      # Option B: Push to release branch of same repo
      # - run: git push --force origin HEAD:refs/heads/release
```

### Distribution Options Comparison

| Option | Pros | Cons |
|--------|------|------|
| **Same repo, relative path** | Simplest. No extra repos. | Ships source code. Large repo clone. |
| **Same repo, release branch** | One repo. Clean separation. | Branch management. Force pushes. |
| **Separate dist repo** | Clean. Small. No source leak. | Extra repo to manage. Token setup. |
| **npm package** | Standard versioning. Semver ranges. | Requires npm account. Extra build step. |

---

## 10. Container/CI Pre-Population

For container images and CI, set `CLAUDE_CODE_PLUGIN_SEED_DIR` to pre-populate plugins at build time:

```
$CLAUDE_CODE_PLUGIN_SEED_DIR/
  known_marketplaces.json
  marketplaces/<name>/...
  cache/<marketplace>/<plugin>/<version>/...
```

Simplest approach: run Claude Code during image build, install plugins, then copy `~/.claude/plugins` into the image. The seed dir is read-only; auto-updates are disabled for seed marketplaces.

---

## 11. Private Repository Authentication

For manual install/update: uses existing git credential helpers (`gh auth login`, macOS Keychain, etc.).

For background auto-updates: requires environment variable tokens:

| Provider | Environment Variables |
|----------|-----------------------|
| GitHub | `GITHUB_TOKEN` or `GH_TOKEN` |
| GitLab | `GITLAB_TOKEN` or `GL_TOKEN` |
| Bitbucket | `BITBUCKET_TOKEN` |

---

## Implications for goodplan Plugin Distribution

### Recommended Approach

**Phase 1 (MVP):** Same-repo marketplace with relative path source.
- Add `.claude-plugin/marketplace.json` to the goodplan repo
- Build the plugin directory at `plugins/goodplan/` containing compiled binaries, skills, and hooks
- Users add with `/plugin marketplace add yourorg/goodplan`
- Simple, no extra infrastructure

**Phase 2 (Production):** Separate dist repo with CI/CD.
- CI compiles multi-platform binaries on tag push
- Assembles plugin directory with binaries + skills + hooks
- Pushes to `yourorg/goodplan-plugin` dist repo with version tag
- Marketplace.json in source repo points to dist repo via `github` source with `ref` pinning
- Keeps source private, distribution clean

### Key Design Decisions Needed

1. **Single marketplace vs official submission:** Start with own marketplace, later submit to `claude-plugins-official` for broader discovery?
2. **Binary size management:** Git repos with large binaries (~50MB per platform) will grow. Consider git-lfs or the separate dist repo approach.
3. **npm as alternative:** npm source type supports semver ranges (`^2.0.0`), which is more flexible than git tag pinning. But npm distribution of platform-specific binaries requires postinstall scripts.
4. **Release channels:** Two marketplaces (stable/latest) pinned to different refs enables staged rollouts via managed settings.

### What's Missing from the Platform

- **No GitHub Releases source type:** Cannot point directly to release tarballs or assets
- **No platform detection in source:** Cannot specify "use this source on macOS, that one on Linux" at the marketplace level -- must handle in SessionStart hook
- **No size limits documented:** No guidance on maximum plugin size, though large binaries will slow cloning

---

## Sources

- [Create and distribute a plugin marketplace -- Claude Code Docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [Discover and install prebuilt plugins -- Claude Code Docs](https://code.claude.com/docs/en/discover-plugins)
- [anthropics/claude-plugins-official marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- [anthropics/claude-code marketplace.json](https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json)
- [ivan-magda/claude-code-plugin-template](https://github.com/ivan-magda/claude-code-plugin-template)
- [hyperskill/claude-code-marketplace](https://github.com/hyperskill/claude-code-marketplace)
- [kivilaid/plugin-marketplace](https://github.com/kivilaid/plugin-marketplace)
- [claudemarketplaces.com](https://claudemarketplaces.com/)
- [liteLLM Claude Code Plugin Marketplace tutorial](https://docs.litellm.ai/docs/tutorials/claude_code_plugin_marketplace)
