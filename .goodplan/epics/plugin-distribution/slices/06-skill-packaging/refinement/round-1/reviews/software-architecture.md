# Software Architecture Review — Slice 06: Skill Packaging

## Issues

**[IMPORTANT] `cli-usage.md` placement and purpose is architecturally confused**
The plan creates `skills/_shared/cli-usage.md` as a source file containing `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. This has two problems:

1. **It duplicates what `cli-interaction.md` already covers.** Section 1 of `skills/_shared/references/cli-interaction.md` already defines binary detection and version checking. Adding a second file for the binary path creates two sources of truth for "how to find the CLI binary."

2. **The `${CLAUDE_PLUGIN_ROOT}` variable only resolves in plugin context.** During local development (skills installed to `~/.claude/skills/`), `${CLAUDE_PLUGIN_ROOT}` is undefined — the file would contain a literal unresolved variable. The plan acknowledges this ("During local development, use `gp` on PATH instead") but the comment is inside the file, not enforced. Skills that blindly read this file in dev context get a broken path.

**Recommendation:** Instead of creating a new `cli-usage.md`, extend the existing binary detection logic in `cli-interaction.md` (Section 1) with a plugin-context path note. Skills already read `cli-interaction.md` universally. This keeps a single source of truth and avoids a file that is misleading in dev context.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `cp -R skills/` copies everything including dev-only artifacts**
The plan proposes `cp -R skills/ dist/gp-plugin/skills/` which copies the entire tree. This is fragile because:

1. Any future dev-only files in `skills/` (test fixtures, drafts, `.DS_Store` already handled by existing install script but not by `cp -R`) get packaged into the plugin.
2. The existing `install-skills.sh` uses `rsync -a --exclude .DS_Store` for a reason — `cp -R` on macOS copies resource forks and `.DS_Store` files.

**Recommendation:** Use `rsync -a --exclude .DS_Store` (matching the existing install script pattern) instead of `cp -R`. This aligns with the existing codebase convention and avoids shipping macOS metadata files.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Assertion for "no `goodplan ` followed by a subcommand" is under-specified and fragile**
Phase 1 task 3 says: "Assert no `SKILL.md` references `goodplan ` followed by a subcommand (the old CLI name in invocation context — `goodplan` as a project name in prose is fine)." This is vague — what counts as "in invocation context" vs "in prose"? The grep in the build-pipeline research shows zero current matches for `goodplan ` in SKILL.md files, meaning this assertion would pass vacuously today. But more importantly, distinguishing invocation from prose in a shell script is error-prone (regex heuristics will have false positives/negatives).

**Recommendation:** Either (a) drop this assertion since the rename already happened and future regressions are better caught by a linter/CI check than a build assertion, or (b) define a precise regex pattern (e.g., backtick-wrapped `goodplan <word>` patterns) that can be reliably evaluated. The current description leaves too much ambiguity for the implementer.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 frontmatter validation duplicates `claude plugin validate` scope**
Phase 2 adds bash-based YAML frontmatter validation (check `---` delimiters, `name:` field, `description:` field). The build script already runs `claude plugin validate` which validates the plugin structure including skill discovery. If `claude plugin validate` already catches malformed skills, the bash validation is redundant. If it doesn't, that's worth knowing.

**Recommendation:** Check whether `claude plugin validate` validates SKILL.md frontmatter. If it does, the bash validation is belt-and-suspenders (acceptable but note it as such). If it doesn't, the bash validation fills a real gap and should stay.
Resolution: CODEBASE_EXPLORATION
Research: Check what `claude plugin validate` actually validates — does it check SKILL.md frontmatter fields (name, description) or only structural presence of files? Run `claude plugin validate --help` or test with a malformed SKILL.md to find out.

---

**[MINOR] Build script grows without modularization path**
The build script already handles binary compilation, manifest generation, hook copying, CLAUDE.md copying, and plugin validation. This plan adds skill copying, cli-usage.md creation, and 4+ structural assertions. The script is approaching the point where a single sequential bash file becomes hard to maintain and debug.

This is not blocking for this slice, but worth noting: a future refactor to extract assertion logic into a separate `scripts/validate-plugin.sh` (called at the end of `build-plugin.sh`) would improve maintainability.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 manual integration test is not reproducible**
The manual integration test (Phase 2, task 2) depends on running `claude --plugin-dir` interactively and visually checking skill availability. This is appropriate for a first pass, but the plan should note what success/failure evidence to capture (e.g., screenshot, terminal output) so it can be referenced later when building CI automation in slice 07.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan covers the right scope and the phasing is reasonable (build first, validate second). However, the `cli-usage.md` design introduces an unnecessary new source of truth that conflicts with the existing `cli-interaction.md` reference, and the `cp -R` approach doesn't match existing codebase conventions. The `goodplan` assertion is under-specified. Fixing the IMPORTANT issues (consolidating into `cli-interaction.md`, using `rsync`, and tightening the assertion spec) would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
