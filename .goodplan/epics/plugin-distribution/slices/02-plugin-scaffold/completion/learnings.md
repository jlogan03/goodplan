# Learnings — 02-plugin-scaffold

## Plugin manifest paths require `./` prefix
_Source: 02-plugin-scaffold_

`claude plugin validate` rejects bare component paths like `"skills": "skills"` — they must be `"skills": "./skills"`. The epic architecture doc (`plugin-api.md`) has this wrong. Future slices generating or modifying `plugin.json` must use the `./` prefix. This was caught during refinement, not implementation, which validates the refinement step for plugin-related slices.

## `${CLAUDE_PLUGIN_ROOT}` substitution does not work in plugin root CLAUDE.md
_Source: 02-plugin-scaffold_

Variable substitution (`${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`) is only performed in skill content, agent content, hook commands, and MCP/LSP configs. A plugin's root-level CLAUDE.md gets no substitution — and may not even be loaded for marketplace-installed plugins (CLAUDE.md discovery walks up from cwd, not from the plugin cache). Binary path instructions must live in skill content. This affects slices 06 (skill packaging) and 07 (marketplace testing).

## `__GOODPLAN_VERSION__` define was not renamed in slice 01
_Source: 02-plugin-scaffold_

The epic architecture doc (`cli-changes-api.md`, `plugin-api.md`) references `__GP_VERSION__`, but slice 01 explicitly kept `__GOODPLAN_VERSION__` (descoped during refinement). The architecture docs need updating to match reality. Future slices should reference `__GOODPLAN_VERSION__` for the version define and `__GP_HMAC_KEY__` for the HMAC key — these have intentionally different naming conventions.

## Build script pattern: explicit `--target` for distribution, omit for local
_Source: 02-plugin-scaffold_

`bun run build` omits `--target` (builds for host), while `scripts/build-plugin.sh` uses `--target=bun-darwin-arm64` (v1 distribution platform). This distinction matters — future cross-platform support (v2) will need multiple `--target` invocations in the plugin build but should never change the local build. The `install-skills.sh` script also omits `--target` since it installs on the host.

## Marketplace manifest `source.source` nesting is canonical
_Source: 02-plugin-scaffold_

The `marketplace.json` schema uses `{ "source": { "source": "git-subdir", ... } }` — the nested `source.source` is not an error. This was flagged during review as suspicious but confirmed correct by official docs. Future plan reviewers should not flag this pattern.
