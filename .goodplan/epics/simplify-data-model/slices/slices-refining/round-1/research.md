# Plugin Infrastructure Research

## 1. Does plugin.json require an explicit `agents` field?

**No. Claude Code auto-discovers `agents/` directories.** The `agents` field in `plugin.json` is an optional path override. Per the plugin format research (`.goodplan/research/claude-code-plugin-format.md`), when component paths are not specified in the manifest, Claude Code scans default locations including `agents/` automatically. The `agents` field only needs to be set if agents live at a non-default path (e.g., `"agents": "./custom/agents/"`).

The existing `plugin.json` at `dist/gp-plugin/.claude-plugin/plugin.json` confirms this -- it specifies only `"skills": "./skills"` and omits `agents` entirely. The build script (`scripts/build-plugin.sh`, lines 48-51) conditionally copies an `agents/` directory into the plugin dist if one exists in the repo root, relying on auto-discovery.

**Key detail:** specifying a component path in `plugin.json` **replaces** the default location rather than supplementing it. To keep the default AND add more, use an array: `"agents": ["./agents/", "./extra-agents/"]`.

## 2. Do build-plugin.sh and plugin.json already exist?

**Yes, both already exist** from completed slice 02 (plugin-scaffold) of the plugin-distribution epic:

| File | Path |
|------|------|
| `build-plugin.sh` | `scripts/build-plugin.sh` |
| `plugin.json` (generated) | `dist/gp-plugin/.claude-plugin/plugin.json` |

The build script is a 174-line bash script that:
- Compiles the `gp` binary via `bun build --compile`
- Generates `plugin.json` with the current version from `package.json`
- Copies skills with `gp:` namespace prefixing
- Copies agents (if present), hooks, and plugin CLAUDE.md
- Validates frontmatter, checks for old CLI name references, runs `claude plugin validate`

These are fully functional and do not need to be created in the simplify-data-model epic. Any skill consolidation changes (19 to 12 skills) will be picked up automatically by the existing build pipeline since it copies from `skills/` and validates dynamically.
