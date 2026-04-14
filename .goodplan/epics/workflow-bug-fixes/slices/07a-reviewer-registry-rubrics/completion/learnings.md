# Learnings: 07a-reviewer-registry-rubrics

## Domain

1. **Reviewer frontmatter coexists with agent frontmatter**: The reviewer agent `.md` files already had `name`, `description`, `model` fields in their YAML frontmatter (used by Claude Code's agent system). The registry-specific fields (`version`, `domains`, `applies_to`, `rubric_ref`, `score_range`, `passing_threshold_per_dimension`) were added alongside them. The loader maps `name` to `id` to avoid duplication, which means the schema validates a transformed subset of the full frontmatter, not the raw parsed data.

2. **Rubric dimensions use 1-10 scoring in YAML but reviewer thresholds use different scales**: The rubric YAML files define thresholds on a 1-10 scale (e.g., `threshold: 7`), while the reviewer frontmatter `score_range` is `[1, 5]` and `passing_threshold_per_dimension` uses values like 3-4. These are separate scoring contexts -- the rubric threshold is for the rubric's own evaluation, while the reviewer threshold is for the convergence evaluator. This dual-scale design should be documented explicitly to avoid confusion.

3. **Always-on reviewers adapted to what exists**: The plan specified `holistic`, `invariant-checker`, and `context-transport` as always-on. Since `invariant-checker` and `context-transport` don't exist yet (deferred to slices 08-11), the routing function uses `reviewer-holistic`, `reviewer-agent-skill`, and `reviewer-software-architecture` instead. This is a pragmatic adaptation.

## Architecture

4. **InvariantRegistry pattern reused successfully**: The ReviewerRegistry follows the same private-Map, duplicate-throws, query-methods pattern as InvariantRegistry. This validates the pattern as a reusable approach for typed registries in the trust layer.

5. **Plugin dir resolution needed a new utility**: No existing utility resolved the `plugin/` source directory -- `resolveProjectDir` handles `.goodplan/` project dirs. The new `resolvePluginDir()` handles two contexts: compiled binary (walk up from execPath) and development (walk up from source file). This dual-strategy pattern is important for all CLI commands that read plugin content.

6. **Rubric loading uses js-yaml, reviewer loading uses gray-matter**: Two different YAML parsing approaches in the same subsystem. `gray-matter` is needed for reviewers because they're Markdown files with YAML frontmatter. `js-yaml` is used for rubrics because they're pure YAML files. Both were already project dependencies.

## Code Patterns

7. **Zod safeParse for external data, strict types for internal flow**: All external data (YAML frontmatter, rubric files) goes through `safeParse` with error aggregation. Internal code uses the inferred types. This is the right boundary between validated and trusted data.

8. **CLI commands that don't need .goodplan/ directory**: The 5 new commands read from the plugin directory, not project state. This is a new category -- most existing commands require a `.goodplan/` directory. The `resolvePluginDir()` utility makes this possible.

## Plan Accuracy

9. **Plan was highly accurate**: All three phases executed as specified. The main divergence was the always-on reviewer list (adapted to existing reviewers rather than planned-but-not-yet-created ones) and using `js-yaml` instead of the `yaml` package for rubric parsing. No significant scope changes were needed.

10. **Test count aligned**: Plan called for registry tests, routing tests, rubric tests, and CLI integration tests. The implementation delivered 30 tests across 4 test files, all passing.
