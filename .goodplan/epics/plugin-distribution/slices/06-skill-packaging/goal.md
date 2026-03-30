# Skill Packaging

## What We're Building
Copy all skills from the repo's `skills/` directory into the plugin structure at `dist/gp-plugin/skills/`. Verify skills load correctly with the `/gp:` namespace prefix. Handle the known namespacing bug (#20994) with a fallback strategy: if auto-namespacing doesn't work, manually prefix skill names in YAML frontmatter.

## Behavior
1. `build:plugin` copies the entire `skills/` directory to `dist/gp-plugin/skills/`, including `_shared/` references
2. Create `plugin/skills/_shared/cli-usage.md` — shared skill reference containing the binary path `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. Skills import this via relative path. This was deferred from slice 02 because there were no consumers until skills are packaged. `${CLAUDE_PLUGIN_ROOT}` substitution works in skill content but NOT in a plugin's root-level CLAUDE.md (see slice 02 research: `claude-plugin-root-scope.md`).
2. All skill SKILL.md files reference `gp` (not `goodplan`) for CLI invocations — already done in slice 1
3. Relative paths (`../_shared/references/`) work within the plugin boundary since `_shared/` is a sibling of skill directories
4. Skills are discoverable by Claude Code when loaded via `--plugin-dir`
5. Skills are invoked as `/gp:<skill-name>` (e.g., `/gp:explore`, `/gp:create-plan`)
6. If auto-namespacing bug (#20994) is still present: the build script adds `name: gp:<skill-name>` to each SKILL.md frontmatter if not already prefixed
7. Build pipeline includes a verification step asserting all skill names carry the `gp:` prefix after copying

## Verification
- [ ] `bun run build:plugin` completes — `dist/gp-plugin/skills/` contains all skill directories from `skills/`
- [ ] `dist/gp-plugin/skills/_shared/` exists with references
- [ ] `dist/gp-plugin/skills/explore/SKILL.md` exists and references `gp` CLI (not `goodplan`)
- [ ] `claude --plugin-dir dist/gp-plugin` — start Claude Code, run `/gp:project-status` — skill loads and executes
- [ ] Skill relative references work: a skill that reads `../_shared/references/cli-interaction.md` loads it successfully
- [ ] `grep -r "goodplan" dist/gp-plugin/skills/ --include="*.md" -l` — zero results for CLI invocation references
- [ ] Build script verification step passes: all SKILL.md files have `gp:` prefixed names

Start Claude Code with `claude --plugin-dir dist/gp-plugin` in a test project that has `.goodplan/` state. Invoke `/gp:project-status` and verify it runs (reads state, returns status). Try `/gp:explore` to confirm the skill loads and its references resolve. If auto-namespacing works, skills appear as `/gp:explore`. If it doesn't, the build script's manual prefixing ensures the same result.

## Scope Boundaries
**In scope:** Skill copying in `build:plugin`, namespace verification, SKILL.md frontmatter prefixing fallback, `_shared/` references within plugin boundary
**Out of scope:** Modifying skill content (already done in slice 1), hook scripts (slice 4), CI/CD (slice 7)
