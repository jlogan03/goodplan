# Plan: Skill Packaging

## Goal

Extend the `build:plugin` pipeline to copy all skills from `skills/` into the plugin at `dist/gp-plugin/skills/`, and add build-time structural assertions verifying the output is valid before completion.

Source `skills/` files are never modified by the build. The existing `skills/_shared/references/cli-interaction.md` already covers binary detection and CLI usage patterns — no new file is needed. If a plugin-context binary path note is needed in the future, extend `cli-interaction.md` (Section 1) rather than creating a separate file.

Claude Code auto-namespaces plugin skills as `/gp:<skill-name>` based on the `name` field in `plugin.json`. No build-time namespace prefixing is needed. Integration testing (Phase 2) will verify auto-namespacing works correctly.

## Phase 1: Build Script & Skill Copying

Extend `scripts/build-plugin.sh` to copy skills and verify the output.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `ls dist/gp-plugin/skills/explore/SKILL.md` — file not found (skills not copied yet)

**After implementation** (should pass / show presence):
- [x] `bun run build:plugin` completes without errors
- [x] `ls dist/gp-plugin/skills/explore/SKILL.md` — file exists
- [x] `ls dist/gp-plugin/skills/_shared/references/` — shared references directory exists
- [x] `find dist/gp-plugin/skills -name '.DS_Store' | wc -l` returns 0 (no OS artifacts)
- [x] Source `skills/explore/SKILL.md` is unchanged after build

### Tasks

- [x] Extend `scripts/build-plugin.sh` to copy skills:
  1. Keep the existing `mkdir -p "$PLUGIN_DIR/skills"` line as a defensive fallback (rsync creates the directory, but retaining mkdir guards against confusing errors if rsync is later moved or fails)
  2. After the existing plugin assembly steps, add: `rsync -a --exclude '.DS_Store' skills/ dist/gp-plugin/skills/`
     (Matches `install-skills.sh` convention; excludes `.DS_Store` and OS artifacts)
  3. This copies the entire `skills/` tree including `_shared/` and all skill directories

- [x] Add build verification assertions to `scripts/build-plugin.sh`:
  1. Assert `dist/gp-plugin/skills/_shared/` directory exists and `dist/gp-plugin/skills/_shared/references/cli-interaction.md` exists (catches empty directory from rsync misconfiguration)
  2. Assert every skill directory not prefixed with `_` contains a `SKILL.md` file (underscore-prefixed directories like `_shared` are internal/shared resources, not skills)
  3. Assert no `SKILL.md` references the old CLI name as an invocation: `grep -rE 'goodplan (init|status|epic:|slice:|quest:|learning:|decision:|task:|schema|version|subagent:)' dist/gp-plugin/skills/` returns no matches. (Currently matches zero files — this is a regression guard, not catching existing issues. The rename to `gp` already happened.)
  4. Assert no `.DS_Store` files in the output: `find dist/gp-plugin/skills -name '.DS_Store' | wc -l` returns 0
  5. Count skill directories and print summary: "Packaged N skills"

### Verification

Run `bun run build:plugin` — completes without errors, prints skill count. Verify `dist/gp-plugin/skills/` contains all expected directories. Confirm source SKILL.md files are unchanged.

## Phase 2: Integration Testing

Verify the built plugin loads correctly in Claude Code. Structural assertions in the build script plus manual runtime testing.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep -cE 'frontmatter|SKILL.md.*name:|SKILL.md.*description:' scripts/build-plugin.sh` returns 0 — UNEXPECTED-PASS: already added in Phase 1

**After implementation** (should pass / show presence):
- [x] Build script validates: each SKILL.md has valid YAML frontmatter (opening and closing `---`), `name` field is present, `description` field is present
- [x] `claude --plugin-dir dist/gp-plugin` starts without errors — plugin is recognized (verified via Agent SDK)
- [x] In the Claude Code session: `/gp:project-status` is listed as an available skill (auto-namespacing works — all 18 skills discovered with /gp: prefix)
- [x] `/gp:project-status` executes successfully in a test project with `.goodplan/` state (reads state, returns status)
- [x] A skill that references `../_shared/references/cli-interaction.md` loads it successfully (relative path resolution within plugin boundary works)

### Tasks

- [x] Add frontmatter validation to build script (completed in Phase 1):
  1. For each `SKILL.md` in `dist/gp-plugin/skills/*/`, verify it starts with `---` and has a closing `---`
  2. Extract the frontmatter block with `sed -n '/^---$/,/^---$/p'` then grep within that block only (avoids false-positives on `name:` or `description:` appearing in skill prose)
  3. Verify `name:` field exists in the extracted frontmatter
  4. Verify `description:` field exists in the extracted frontmatter (note: existing SKILL.md files use `description: >` YAML folded scalars — check for field presence only, do not attempt to extract/validate the value without a YAML parser)
  5. Fail the build if any check fails, listing the specific file and what's missing
  6. Assumption: `claude plugin validate` does not check SKILL.md frontmatter fields — our build assertions fill this gap. If it turns out `claude plugin validate` does cover these checks, the duplication is harmless (belt-and-suspenders)

- [x] Integration test via Agent SDK harness (`tools/dogfood/test-plugin-skills.ts`):
  1. Build: `bun run build:plugin`
  2. Create temp test project: `mkdir -p /tmp/gp-plugin-test && cd /tmp/gp-plugin-test && gp init --name plugin-test`
  3. Start Claude Code: `claude --plugin-dir <absolute-path-to>/dist/gp-plugin`
  4. Verify plugin loads (check for errors on startup)
  5. Verify `/gp:project-status` appears in available skills (confirms auto-namespacing)
  6. Run `/gp:project-status` — confirm it reads `.goodplan/` state and returns status
  7. Verify a skill with `_shared` references loads (e.g., `/gp:explore` reads `../_shared/references/cli-interaction.md`)
  8. Clean up: `rm -rf /tmp/gp-plugin-test`

  **Evidence to capture:** Copy terminal output for each step (startup messages, skill listing, execution output). For failures, capture the full error message. These manual checks should become automated assertions in slice 07 (CI) — specifically: plugin load verification, skill discoverability, and namespace correctness.

- [x] ~~If auto-namespacing does NOT work~~ — AUTO-NAMESPACING WORKS. Bug #20994 is fixed. No fallback needed:
  1. Add a namespace prefixing build step that prepends `gp:` to the `name:` field in each dist SKILL.md
  2. Grep dist SKILL.md files for cross-skill references (e.g., `/create-plan`, `/explore`) and update them to `/gp:create-plan`, `/gp:explore` etc. — otherwise internal references won't resolve
  3. Add assertion that every dist SKILL.md has `name: gp:<skill-name>`
  4. Document the workaround for removal when the bug is fixed

- [x] Document test results: Auto-namespacing works (all 18 skills under /gp: prefix). /gp:project-status executes correctly. _shared references resolve. No workarounds needed. Test harness at tools/dogfood/test-plugin-skills.ts.

### Verification

Build script exits cleanly with all assertions passing. Manual testing confirms skills are discoverable and executable with the `/gp:` namespace prefix. Relative references within the plugin boundary resolve correctly. Document any issues found for the CI slice (07) to address.

**Known divergence:** `build-plugin.sh` auto-discovers skills via rsync, while `install-skills.sh` uses a hardcoded `SKILL_DIRS` array. A new skill added to `skills/` will be included in the plugin but silently excluded from installed skills. This is acceptable — `install-skills.sh` will be deprecated once plugin distribution is live. No action needed in this slice.

**Future improvement:** The build script is accumulating responsibilities (compilation, assembly, skill copying, assertions). A future refactor to extract assertion logic into `scripts/validate-plugin.sh` would improve maintainability — not blocking for this slice.
