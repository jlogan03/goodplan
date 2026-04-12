# Codex Plugin Adaptation Plan

## Goal

Make this repo usable as a Codex plugin without changing the existing Claude plugin behavior, packaging, or release workflow.

## Current State

- The repo already has a working Claude plugin pipeline. `scripts/build-plugin.sh` assembles `dist/gp-plugin/` with `.claude-plugin/plugin.json`, `skills/`, `agents/`, `hooks/`, `bin/`, and the compiled `gp` binary.
- `plugin/` is the source of truth for shared workflow content: skills, agents, hook scripts, and the `gp` launcher.
- The source skill names are already host-neutral (`explore`, `plan-slice`, `task`, etc.). The Claude build adds the `gp:` prefix during packaging, so the source content does not need a naming rewrite for Codex.
- The main portability gaps are host-specific path conventions:
  - `plugin/skills/**` and `plugin/agents/**` reference bundled markdown via `@${CLAUDE_PLUGIN_ROOT}/...`
  - `plugin/hooks/hooks.json` invokes shell scripts via `${CLAUDE_PLUGIN_ROOT}/hooks/...`
  - `plugin/skills/_references/expertise-tracking.md` depends on `${CLAUDE_PLUGIN_DATA}`
- Docs and tests are Claude-oriented today:
  - install and release docs assume `claude plugin ...`
  - `tools/dogfood/*.ts` use `@anthropic-ai/claude-agent-sdk`
  - release docs describe a Claude marketplace branch, not a Codex marketplace file

## Constraints

- `plugin/` should remain the single source of truth for shared workflow logic.
- `bun run build` must continue producing the Claude plugin exactly as it does today, or be kept as a thin wrapper around the unchanged Claude build path.
- No Claude-specific workflow behavior should regress:
  - same `gp` CLI
  - same `gp:` slash-skill experience
  - same hook protections
  - same release branch flow for Claude
- Codex support should start as a repo-local plugin target first. Codex distribution/release automation can be a second phase.

## Recommended Target Shape

- Keep `plugin/` as shared source content.
- Add a separate Codex packaging target that emits a repo-local plugin at `plugins/goodplan/`.
- Add `.agents/plugins/marketplace.json` pointing to `./plugins/goodplan`.
- Keep Claude packaging separate in `dist/gp-plugin/`.
- Treat `plugins/goodplan/` like generated output, not hand-edited source.

## Workstreams

### 1. Split shared assets from host-specific packaging

- Preserve the existing Claude build path by extracting the current `scripts/build-plugin.sh` logic into:
  - a shared assembly step
  - a Claude-target wrapper
  - a new Codex-target wrapper
- Keep shared files in `plugin/`:
  - `skills/`
  - `agents/`
  - hook shell scripts
  - `bin/gp`
- Move or duplicate only the host-specific config into target overlays:
  - Claude manifest and hook config
  - Codex manifest, hook config, and command wrappers

### 2. Add a Codex plugin scaffold

- Create a Codex manifest at `plugins/goodplan/.codex-plugin/plugin.json`.
- Add repo-local marketplace metadata at `.agents/plugins/marketplace.json`.
- Populate Codex interface metadata from the existing package/repo metadata:
  - name: `goodplan`
  - version from `package.json`
  - repo/homepage/license from current metadata
- Do not add MCP or app config unless a real Codex use case needs it; the current workflow is skill and CLI driven.

### 3. Make bundled markdown portable

- Keep the source markdown Claude-compatible.
- During Codex packaging, rewrite Claude-specific bundle references to Codex-friendly relative paths.
- Scope:
  - `plugin/skills/**`
  - `plugin/agents/**`
  - shared reference files under `_references/`
- Examples:
  - `@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md` becomes a relative include such as `@../_references/cli-interaction.md`
  - agent references under `agents/_references/` become same-directory relative includes
- Add a structural validation step that fails the Codex build if any packaged markdown still contains `CLAUDE_PLUGIN_ROOT`.

### 4. Add Codex-native entrypoints

- Ship the shared skills to Codex without the Claude-only `gp:` name rewrite.
- Add `commands/` wrappers in the Codex package for the command-shaped workflows so the plugin remains easy to invoke.
- Initial command set should mirror the current workflow surface:
  - `init`
  - `status`
  - `create-epic`
  - `start-epic`
  - `explore`
  - `plan-slice`
  - `implement`
  - `create-side-quest`
  - `complete-epic`
  - `audit`
  - `upgrade`
  - `task`
- If Codex command names do not allow `:` separators, use `gp-...` command names and document the mapping from Claude's `/gp:...` commands.
- Keep `workflow-guide` as the natural-language router skill for non-command usage.

### 5. Port hooks without changing Claude hooks

- Keep the current shell scripts unchanged.
- Generate a Codex `hooks.json` that uses relative command paths, following existing Codex plugin conventions.
- Leave Claude hook config behavior untouched.
- Add a validation step that verifies:
  - hook JSON parses
  - hook scripts are executable
  - the Codex package contains no `${CLAUDE_PLUGIN_ROOT}` references

### 6. Decide how Codex handles plugin data

- `plugin/skills/_references/expertise-tracking.md` currently depends on `${CLAUDE_PLUGIN_DATA}`.
- I did not find a Codex-local equivalent in the installed plugin examples available on this machine.
- Recommended phase-1 behavior:
  - keep Claude expertise tracking exactly as-is
  - make Codex packaging explicitly disable or no-op expertise persistence until a Codex plugin-data location is confirmed
- Only after that discovery should we decide whether Codex should:
  - use its own plugin-local data path, if available
  - or move expertise tracking into repo-managed `.goodplan/` state for both hosts
- Do not move expertise tracking into `.goodplan/` as part of the first Codex-enablement pass; that is a behavior change, not a packaging change.

### 7. Add Codex structural validation

- Extend build-time assertions so both targets are validated.
- Claude validations stay as they are today.
- Add Codex validations for:
  - `.codex-plugin/plugin.json` exists and parses
  - `.agents/plugins/marketplace.json` exists and points to `./plugins/goodplan`
  - all packaged skill/agent references resolve
  - expected commands are present
  - no `CLAUDE_PLUGIN_ROOT` or `CLAUDE_PLUGIN_DATA` placeholders remain in the Codex package unless intentionally preserved in a guarded no-op path
- Keep the existing Anthropic dogfood harnesses for Claude only.
- Add a lightweight Codex smoke script if practical, but do not block the first iteration on a full Codex SDK harness.

### 8. Update docs without replacing Claude docs

- Keep the current Claude install path in `README.md`.
- Add a separate Codex install section that explains:
  - run the Codex build target
  - use the repo-local marketplace file
  - expected Codex command names
- Update `docs/releasing.md` to clarify that Claude release automation is unchanged and Codex support is initially repo-local unless a separate Codex publish flow is later added.
- Add a short maintainer note explaining that `plugin/` is source and `plugins/goodplan/` is generated output.

## Suggested File/Script Changes

- Keep:
  - `plugin/skills/**`
  - `plugin/agents/**`
  - `plugin/hooks/protect-state.sh`
  - `plugin/hooks/warn-bash-state.sh`
  - `plugin/bin/gp`
- Refactor or add:
  - `scripts/build-plugin.sh` -> Claude wrapper or compatibility entrypoint
  - `scripts/build-codex-plugin.sh`
  - a small packaging helper to rewrite markdown references per target
  - `.agents/plugins/marketplace.json`
  - `plugins/goodplan/.codex-plugin/plugin.json`
  - `plugins/goodplan/commands/*.md`
  - Codex-specific `hooks.json`

## Definition Of Done

- `bun run build` still produces the same Claude plugin behavior and structure.
- A Codex build target produces a repo-local plugin under `plugins/goodplan/` with a valid `.codex-plugin/plugin.json`.
- `.agents/plugins/marketplace.json` installs that local plugin in Codex.
- The Codex package exposes the same core workflow surface through Codex-native skills and commands.
- The Codex package contains no unresolved Claude-only root-path references.
- Claude-specific docs, build flow, and tests continue to work unchanged.

## Open Questions To Resolve During Implementation

1. What is the correct Codex-side replacement, if any, for `${CLAUDE_PLUGIN_DATA}`?
2. What exact command naming convention should Codex use for goodplan: raw command names or `gp-...` wrappers?
3. Do Codex hook matchers behave close enough to Claude's `PreToolUse` rules to reuse the current protection policy verbatim?
4. Is repo-local Codex installation sufficient, or is a publishable Codex distribution needed after the local path works?

## Recommended Execution Order

1. Add the Codex build target and marketplace scaffold without touching the current Claude build output.
2. Implement markdown reference rewriting and Codex hook config generation.
3. Add Codex command wrappers and structural validations.
4. Update docs.
5. Resolve plugin-data handling as a follow-up once the basic Codex package is functional.
