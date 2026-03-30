# marketplace.json Schema for git-subdir Source Type

**Date:** 2026-03-29
**Source:** Official Claude Code docs at code.claude.com/docs/en/plugin-marketplaces (fetched live)

---

## Key Finding: `source.source` Is Correct

The nested `source.source` pattern is **not a schema error**. It is the documented, canonical structure. Every remote source type uses an object where the `source` key names the type discriminant. The official docs show this pattern consistently across all source types (github, url, git-subdir, npm).

The plan's expected behavior check `jq '.plugins[0].source.source'` printing `"git-subdir"` is correct.

---

## git-subdir Source — Complete Field Reference

```json
{
  "name": "plugin-name",
  "source": {
    "source": "git-subdir",
    "url": "<git-url>",
    "path": "<subdirectory-path>",
    "ref": "<branch-or-tag>",
    "sha": "<40-char-commit-sha>"
  }
}
```

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `source` | string | Yes      | Must be `"git-subdir"` (type discriminant) |
| `url`    | string | Yes      | Git repo URL. Accepts `https://`, `git@` SSH, or GitHub shorthand (`owner/repo`). `.git` suffix optional. |
| `path`   | string | Yes      | Subdirectory within the repo containing the plugin (e.g. `"tools/claude-plugin"`) |
| `ref`    | string | No       | Git branch or tag. Defaults to repo's default branch. |
| `sha`    | string | No       | Full 40-character commit SHA to pin an exact version. |

Claude Code uses sparse, partial clone to fetch only the specified subdirectory, minimizing bandwidth for monorepos.

---

## Official Example (from docs)

```json
{
  "name": "my-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/acme-corp/monorepo.git",
    "path": "tools/claude-plugin",
    "ref": "v2.0.0",
    "sha": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
  }
}
```

---

## Real-World Example (from claude-plugins-official)

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

## goodplan's Planned Entry (validated against schema)

```json
{
  "name": "gp",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/ian97531/project-skills.git",
    "path": "plugins/gp",
    "ref": "release"
  },
  "description": "goodplan - structured development workflow for Claude Code"
}
```

This matches the documented schema. No changes needed.

---

## All Source Types (for reference)

| Source type    | `source` field type | Discriminant value | Required fields | Optional fields |
|---------------|--------------------|--------------------|-----------------|-----------------|
| Relative path | `string`           | N/A                | path string     | — |
| GitHub repo   | `object`           | `"github"`         | `repo`          | `ref`, `sha` |
| Git URL       | `object`           | `"url"`            | `url`           | `ref`, `sha` |
| Git subdir    | `object`           | `"git-subdir"`     | `url`, `path`   | `ref`, `sha` |
| npm package   | `object`           | `"npm"`            | `package`       | `version`, `registry` |

All object source types use the same pattern: `{ "source": "<type>", ...fields }`.

---

## Full marketplace.json Required Fields

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `name`    | string | Yes      | Marketplace identifier (kebab-case) |
| `owner`   | object | Yes      | `{ "name": "...", "email?": "..." }` |
| `plugins` | array  | Yes      | Array of plugin entries |

Each plugin entry requires `name` (string, kebab-case) and `source` (string or object).

Optional top-level: `metadata.description`, `metadata.version`, `metadata.pluginRoot`.
