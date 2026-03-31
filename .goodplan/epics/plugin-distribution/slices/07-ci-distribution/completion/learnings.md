# Learnings — 07-ci-distribution

## Plugin name and skill prefix are independent concerns
_Source: 07-ci-distribution_

The plugin `name` field in plugin.json controls the marketing brand (what users see in `/plugin` listings), while skill names control the invocation prefix (`/gp:explore`). These should be set independently — `goodplan` for the plugin, `gp:` for skill prefixes via build-time namespace injection. Auto-namespacing from the plugin name produces `/goodplan:explore` which is too verbose.

## Claude Code auto-discovers hooks — don't declare them in plugin.json
_Source: 07-ci-distribution_

Claude Code auto-discovers `hooks/hooks.json` at the standard plugin location. Declaring `"hooks": "./hooks/hooks.json"` in plugin.json causes a "duplicate hooks file" error. Only use the `hooks` field for non-standard locations. This applies to skills too — the `skills` field may eventually be redundant if auto-discovery covers the standard location.

## Plugin skills must use ${CLAUDE_PLUGIN_ROOT} for CLI binary, never PATH
_Source: 07-ci-distribution_

Plugin users don't have `gp` on PATH — the binary is bundled at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. All skill references to the CLI must use this path. The `${CLAUDE_PLUGIN_ROOT}` variable is substituted at skill load time. This required updating 17 SKILL.md files, cli-interaction.md, and plugin/CLAUDE.md.

## workflow_dispatch requires the workflow file on the default branch
_Source: 07-ci-distribution_

GitHub Actions `workflow_dispatch` can only be triggered via API when the workflow YAML exists on the repository's default branch. Workflows on feature branches can only be triggered via tag push or other event-based triggers. This means new workflows can't be tested via dispatch until merged to main.

## Version assertion catches tag/package.json mismatches by design
_Source: 07-ci-distribution_

The post-build version assertion (`binary version == tag version`) enforces the contract that `package.json` must be bumped before tagging. Test tags like `v1.0.0-test` deliberately fail because the suffix doesn't match package.json. Use matching versions for real tests, not suffixed tags.

## git-filter-repo is essential before open-sourcing — plan for it
_Source: 07-ci-distribution_

Backup directories, log files, and prototype binaries accumulated in git history (238M → 36M after cleanup). History rewriting invalidates all tags and requires force-push + re-release. Future projects should establish .gitignore patterns early and audit before the first public push rather than retrofitting.
