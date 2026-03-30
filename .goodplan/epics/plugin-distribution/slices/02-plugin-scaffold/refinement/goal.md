# Confirmed Goal

Create the Claude Code plugin scaffold for goodplan — a build script (`scripts/build-plugin.sh`) that assembles a valid `dist/gp-plugin/` directory containing the compiled binary, plugin manifest, CLAUDE.md, and placeholder directories for skills/hooks. Additionally, set up the marketplace manifest at the repo root and supporting directories for future slices.

## Done Criteria

1. `bun run build:plugin` produces a complete `dist/gp-plugin/` that passes `claude plugin validate`
2. The compiled binary inside the plugin dir is functional (`--version --json` works)
3. Marketplace manifest at `.claude-plugin/marketplace.json` points to the plugin on the `release` branch
4. Dev repo sentinel (`.goodplan-dev`) and `plugin-hooks/` directory are in place for future slices
