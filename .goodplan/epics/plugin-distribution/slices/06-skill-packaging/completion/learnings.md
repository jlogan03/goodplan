# Learnings — 06-skill-packaging

## Claude Code auto-namespacing works — bug #20994 is fixed
_Source: 06-skill-packaging_

The Claude Code plugin system correctly auto-namespaces skills as `/<plugin-name>:<skill-name>` based on the `name` field in `plugin.json`. The documented bug (#20994) where skills needed manual `name: gp:<skill-name>` in frontmatter is no longer present as of 2026-03-30. Future plans should not include namespace prefixing build steps. The plan's contingency task was not needed.

## macOS sed has incompatible syntax for multiline extraction — use awk instead
_Source: 06-skill-packaging_

macOS ships BSD sed which doesn't support `{/pattern/!q}` syntax or other GNU sed extensions. The plan specified `sed -n '/^---$/,/^---$/p'` for YAML frontmatter extraction but this failed at build time. `awk` with state tracking (`NR==1 && /^---$/{found=1; next} found && /^---$/{exit} found{print}`) works reliably on both macOS and Linux. Future build script tasks involving text extraction should prefer `awk` over `sed` for portability.

## Agent SDK supports local plugin testing via `plugins` option
_Source: 06-skill-packaging_

The `@anthropic-ai/claude-agent-sdk` `query()` function accepts `plugins: [{ type: 'local', path: PLUGIN_DIR }]` which loads a plugin from a local directory — equivalent to `claude --plugin-dir`. This enables automated integration testing of plugin skills without manual Claude Code sessions. The test at `tools/dogfood/test-plugin-skills.ts` demonstrates the pattern. Future slices that need plugin testing should use this harness approach.

## Frontmatter validation belongs with skill copying, not as a separate phase
_Source: 06-skill-packaging_

The plan split frontmatter validation into Phase 2 (integration testing) but it was more natural to implement alongside the skill copying assertions in Phase 1. Build-time assertions are most coherent when all structural checks run together in one pass. Future plans should group all build-script assertions into a single phase rather than splitting structural vs semantic validation.
