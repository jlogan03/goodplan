# Repo, Tooling, & Docs Review — Skill Packaging Plan

## Issues

**[IMPORTANT]** cli-usage.md placement is inconsistent with _shared directory structure
The plan places `cli-usage.md` at `skills/_shared/cli-usage.md` (direct child of `_shared/`), but the existing `_shared/` directory contains only a `references/` subdirectory — all shared files live under `skills/_shared/references/`. Placing a file directly in `_shared/` breaks the established convention and creates an inconsistent structure. It should be `skills/_shared/references/cli-usage.md` to match the existing pattern. Skills already reference shared content via `../_shared/references/<file>.md`, and the plan's Expected Behavior for Phase 1 even checks `ls dist/gp-plugin/skills/_shared/references/` — so the references path is already assumed. Update the task to create the file at `skills/_shared/references/cli-usage.md`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `cp -R skills/` copies .DS_Store and other OS artifacts
The plan's copy step is `cp -R skills/ dist/gp-plugin/skills/`. The existing `install-skills.sh` deliberately uses `rsync -a --exclude='.DS_Store'` to avoid copying macOS metadata files. The build script should either use `rsync -a --exclude='.DS_Store'` (matching the existing pattern) or add an explicit find-and-delete step after copying. Shipping `.DS_Store` files in a plugin is unprofessional and could cause issues on non-macOS systems.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** The "goodplan " followed by subcommand assertion is ambiguously specified
Phase 1 Task 3 says: "Assert no SKILL.md references `goodplan ` followed by a subcommand (the old CLI name in invocation context -- `goodplan` as a project name in prose is fine)." This is hard to implement reliably in bash — distinguishing "goodplan CLI" or "the goodplan repo" (prose) from `goodplan status` (invocation) requires either a regex with an explicit subcommand list or a negative lookahead. The plan should specify the exact regex or subcommand list to match against. Looking at current SKILL.md files, none actually use `goodplan <subcommand>` — they all use `gp` already. The assertion is a guard against regression, which is fine, but it needs a concrete pattern like `goodplan (init|status|epic:|slice:|quest:|learning:|decision:|task:|schema|version|subagent:)` so the implementer knows exactly what to match.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Frontmatter validation in Phase 2 doesn't handle multi-line YAML values
Phase 2 Task 1 says to verify `name:` and `description:` exist between frontmatter delimiters. Every existing SKILL.md uses `description: >` (YAML folded scalar) where the actual description text is on subsequent lines. A naive `grep 'description:'` will work, but the plan should note this pattern exists so the implementer doesn't try to extract and validate the description value itself (which would require YAML parsing).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Build script already creates empty `skills/` directory — plan should note this
The existing `build-plugin.sh` already has `mkdir -p "$PLUGIN_DIR/skills"`. The plan's `cp -R skills/ dist/gp-plugin/skills/` would copy into the already-created directory. This works fine but the plan should note it's replacing the empty directory creation with actual content, not adding a new directory. The existing `mkdir -p` line could be removed for clarity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 verification missing: check that `.DS_Store` and other artifacts are excluded
The Expected Behavior section for Phase 1 doesn't include a check for absence of unwanted files (`.DS_Store`, `__MACOSX`, etc.) in the output. Adding `find dist/gp-plugin/skills -name '.DS_Store' | wc -l` as a zero-count assertion would strengthen the verification.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is clear, well-structured, and correctly identifies the key work items. The two-phase approach (build mechanics first, integration testing second) is sound. However, the `.DS_Store` exclusion gap is a real build quality issue that would ship artifacts into the plugin, the `cli-usage.md` placement contradicts the established `_shared/references/` convention, and the `goodplan` subcommand assertion needs a concrete pattern to be implementable. Fixing these three IMPORTANT issues and the three MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
