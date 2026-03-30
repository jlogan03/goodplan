# Plan: Skill Packaging

## Overview

Extend the `build:plugin` pipeline to copy all skills from `skills/` into the plugin at `dist/gp-plugin/skills/`, create `skills/_shared/cli-usage.md` as a source file containing the plugin-runtime binary path, and add a build-time namespace prefixing step that ensures every SKILL.md in the dist output has a `name: gp:<skill-name>` frontmatter field (workaround for Claude Code namespacing bug #20994). The build script also adds structural assertions verifying the output is valid before completion.

Source `skills/` files are never modified by the build — all transformations (namespace prefixing) happen on the dist copies. The `cli-usage.md` file lives in source as a shared reference that skills can import in both dev and plugin contexts.

## Phase 1: Build Script & Skill Copying

Extend `scripts/build-plugin.sh` to copy skills, create the cli-usage.md source file, apply namespace prefixing to dist copies, and verify the output.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls dist/gp-plugin/skills/explore/SKILL.md` — file not found (skills not copied yet)
- [ ] `cat skills/_shared/cli-usage.md` — file not found (doesn't exist yet)
- [ ] `bun run build:plugin && grep -r 'name: gp:' dist/gp-plugin/skills/*/SKILL.md` — no matches (no namespace prefixing)

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin` completes without errors
- [ ] `ls dist/gp-plugin/skills/explore/SKILL.md` — file exists
- [ ] `ls dist/gp-plugin/skills/_shared/references/` — shared references directory exists
- [ ] `cat skills/_shared/cli-usage.md` — exists with `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` binary path
- [ ] `grep -c 'name: gp:' dist/gp-plugin/skills/*/SKILL.md | grep -v ':0$' | wc -l` — matches total number of skill directories (excluding `_shared`)
- [ ] `grep -r 'goodplan ' dist/gp-plugin/skills/ --include='*.md' -l` — zero results for old CLI name references (note: `goodplan` as a project name in prose is fine, only CLI invocation references like `goodplan epic:create` should be absent)
- [ ] Source `skills/explore/SKILL.md` does NOT have `name: gp:` prefix (source unchanged)

### Tasks

- [ ] Create `skills/_shared/cli-usage.md` as a source file:
  ```markdown
  # CLI Binary Path

  <!-- This path resolves at plugin runtime via ${CLAUDE_PLUGIN_ROOT}. During local development, use `gp` on PATH instead. -->

  Binary: `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`
  ```
  Skills that need the binary path can reference this via `../_shared/cli-usage.md`.

- [ ] Extend `scripts/build-plugin.sh` to copy skills:
  1. After the existing plugin assembly steps, add: `cp -R skills/ dist/gp-plugin/skills/`
  2. This copies the entire `skills/` tree including `_shared/` and all skill directories

- [ ] Add namespace prefixing step to `scripts/build-plugin.sh`:
  1. After copying skills, iterate over every `SKILL.md` in `dist/gp-plugin/skills/*/SKILL.md` (skip `_shared/`)
  2. For each file, check if frontmatter already has a `name:` field starting with `gp:`
  3. If no `name:` field exists in frontmatter: insert `name: gp:<dirname>` after the opening `---` line (where `<dirname>` is the skill directory name, e.g., `explore`, `create-plan`)
  4. If `name:` exists but doesn't start with `gp:`: replace with `gp:<existing-name>`
  5. If `name:` already starts with `gp:`: leave unchanged
  6. Use `sed` for the transformation — operate on dist copies only, never source

- [ ] Add build verification assertions to `scripts/build-plugin.sh`:
  1. Assert `dist/gp-plugin/skills/_shared/` directory exists
  2. Assert every skill directory (except `_shared`) contains a `SKILL.md` file
  3. Assert every `SKILL.md` in dist has a `name: gp:` prefixed frontmatter field
  4. Assert no `SKILL.md` references `goodplan ` (the old CLI name followed by a space — avoids false positives on the project name) in CLI invocation context
  5. Count skill directories and print summary: "Packaged N skills"

### Verification

Run `bun run build:plugin` — completes without errors, prints skill count. Verify `dist/gp-plugin/skills/` contains all expected directories. Spot-check 2-3 SKILL.md files in dist for correct `name: gp:` prefix. Confirm source SKILL.md files are unchanged.

## Phase 2: Integration Testing

Verify the built plugin loads correctly in Claude Code. Structural assertions in the build script plus manual runtime testing.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] No automated structural validation of skill SKILL.md frontmatter validity in the build script beyond the namespace prefix check

**After implementation** (should pass / show presence):
- [ ] Build script validates: each SKILL.md has valid YAML frontmatter (opening and closing `---`), `name` field is present, `description` field is present
- [ ] `claude --plugin-dir dist/gp-plugin` starts without errors — plugin is recognized
- [ ] In the Claude Code session: `/gp:project-status` is listed as an available skill (skill discovery works)
- [ ] `/gp:project-status` executes successfully in a test project with `.goodplan/` state (reads state, returns status)
- [ ] A skill that references `../_shared/references/cli-interaction.md` loads it successfully (relative path resolution within plugin boundary works)

### Tasks

- [ ] Add frontmatter validation to build script:
  1. For each `SKILL.md` in `dist/gp-plugin/skills/*/`, verify it starts with `---` and has a closing `---`
  2. Verify `name:` field exists between the frontmatter delimiters
  3. Verify `description:` field exists between the frontmatter delimiters
  4. Fail the build if any check fails, listing the specific file and what's missing

- [ ] Manual integration test — create or use a test project:
  1. Build: `bun run build:plugin`
  2. Create temp test project: `mkdir -p /tmp/gp-plugin-test && cd /tmp/gp-plugin-test && gp init --name plugin-test`
  3. Start Claude Code: `claude --plugin-dir <absolute-path-to>/dist/gp-plugin`
  4. Verify plugin loads (check for errors on startup)
  5. Verify `/gp:project-status` appears in available skills
  6. Run `/gp:project-status` — confirm it reads `.goodplan/` state and returns status
  7. Verify a skill with `_shared` references loads (e.g., `/gp:explore` reads `../_shared/references/cli-interaction.md`)
  8. Clean up: `rm -rf /tmp/gp-plugin-test`

- [ ] Document test results in this plan's verification section — what worked, what didn't, any workarounds needed

### Verification

Build script exits cleanly with all assertions passing. Manual testing confirms skills are discoverable and executable with the `/gp:` namespace prefix. Relative references within the plugin boundary resolve correctly. Document any issues found for the CI slice (07) to address.
