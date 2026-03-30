# Holistic Review — Slice 06: Skill Packaging

## Issues

**[IMPORTANT] cli-usage.md location inconsistency and questionable value**
The plan creates `skills/_shared/cli-usage.md` as a top-level file in `_shared/`, but the existing pattern is that shared files live under `skills/_shared/references/`. Expected Behavior line 4 checks `cat skills/_shared/cli-usage.md` at the top level, while Phase 2 task 2 step 7 references `../_shared/references/cli-interaction.md` (a different file). The plan never specifies which skills will actually reference `cli-usage.md` or updates any existing skill to use it. As written, it creates an orphan file that nothing consumes. Either: (a) place it at `skills/_shared/references/cli-usage.md` to match the existing convention, and update at least one skill to reference it; or (b) defer creating it until a later slice when skills actually need to discover the plugin binary path.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 assertion 3 is fragile and under-specified**
The assertion "no SKILL.md references `goodplan ` followed by a subcommand" uses a prose description that's ambiguous about the regex. A grep search confirms no SKILL.md currently uses `goodplan` as a CLI invocation -- they all use `gp`. However, many SKILL.md files use `goodplan` in prose (e.g., "Install it with `bun run build` in the goodplan repo"). The plan says "the old CLI name in invocation context -- `goodplan` as a project name in prose is fine" but doesn't specify the regex that distinguishes these cases. The implementer will have to guess. Provide the actual regex or grep pattern (e.g., `grep -P 'goodplan (init|status|epic|slice|quest|task|decision|learning|schema|verify|migrate|version|subagent)' dist/gp-plugin/skills/*/SKILL.md`). Note: since the rename already happened in prior slices and no SKILL.md currently has this pattern, this assertion will never fail -- consider whether it's worth the complexity.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 Expected Behavior "before" check is not falsifiable**
The "before" check is: "No automated structural validation of skill SKILL.md frontmatter validity in the build script." This is a statement about what doesn't exist, not a runnable check. A proper before check would be something like: `grep -c 'frontmatter' scripts/build-plugin.sh` returns 0 (no frontmatter validation code present). This violates criterion 6a (concrete and falsifiable before checks).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 manual test has no automated fallback**
Phase 2 tasks 2.1-2.8 are entirely manual (create temp dir, launch Claude Code, visually verify skills). This is appropriate for a first pass, but the plan doesn't mention capturing the manual test results anywhere durable or creating an automated smoke test for CI (slice 07). Consider adding a task to document which manual checks should become automated in the CI slice, so the dependency is explicit.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `cp -R skills/` copies everything including potential .DS_Store files**
Phase 1 task 2 uses `cp -R skills/ dist/gp-plugin/skills/`. The existing install-skills.sh explicitly excludes `.DS_Store` via rsync flags. The plan should either use `rsync -a --exclude='.DS_Store'` or add a cleanup step after copy. This is minor but keeps the plugin clean.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No documentation update task**
The plan doesn't include updating any documentation about the new skill packaging behavior. At minimum, the build-plugin section in any developer docs or the plugin's CLAUDE.md should note that skills are now included. If no such docs exist yet, this is fine to skip -- but worth confirming.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good verification coverage, and correct understanding of the plugin format. The two phases are logically ordered with Phase 1 (build mechanics) preceding Phase 2 (integration validation). Goal alignment is strong -- every task directly serves the confirmed goal. The main issues are: (1) the cli-usage.md file is created but never consumed by anything, making it dead code from the start; (2) some verification checks aren't concretely falsifiable; (3) the `goodplan` subcommand assertion needs a concrete regex. Fixing these issues would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
