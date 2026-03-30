# Software Architecture Review — Slice 06: Skill Packaging (Round 2)

## Issues

**[IMPORTANT] Phase 1 `rsync` excludes only `.DS_Store` but the `_shared/` directory has no `SKILL.md` — assertions will misfire**
Phase 1 task 2 asserts "every skill directory (except `_shared`) contains a `SKILL.md` file." The `_shared` directory currently contains only a `references/` subdirectory with shared markdown files — no `SKILL.md`. The assertion logic must correctly enumerate skill directories and exclude `_shared`. However, the plan says "except `_shared`" without specifying how the exclusion works in bash. The implementer could use `find skills -maxdepth 1 -type d -not -name _shared` or glob patterns — but if a future convention adds another non-skill directory (e.g., `_templates/`), the hardcoded `_shared` exclusion becomes a maintenance trap.

**Recommendation:** Rather than excluding `_shared` by name, invert the check: assert that every directory containing a `SKILL.md` has valid frontmatter (Phase 2 already does this). For the "every skill has a SKILL.md" check, assert that every directory that is NOT prefixed with `_` contains a `SKILL.md`. Underscore-prefixed directories are already the convention for shared/internal resources. This makes the assertion resilient to future `_shared`-like directories.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Phase 2 frontmatter validation uses fragile bash parsing for YAML**
Phase 2 task 1 validates YAML frontmatter with shell commands: checking for `---` delimiters, `name:` field, and `description:` field between them. The plan explicitly notes "do not attempt to extract/validate the value without a YAML parser" — but the check for field presence IS parsing YAML, just unreliably. Consider: a SKILL.md with a comment `# name: old-name` between the delimiters, or `description` appearing in a non-frontmatter context. The regex approach can produce false positives.

This matters because the assertion runs at build time and blocks the build. A false positive blocks a valid build; a false negative ships a broken skill.

**Recommendation:** Since the plan notes "if `claude plugin validate` already checks these frontmatter fields, this validation may be redundant," make the task ordering explicit: (1) test what `claude plugin validate` catches, (2) only implement bash frontmatter checks for gaps not covered. If bash checks are still needed, use `sed -n '/^---$/,/^---$/p'` to extract the frontmatter block first, THEN grep within that block only. This prevents matching `name:` outside frontmatter.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] The `goodplan` invocation regex assertion currently matches zero files**
Phase 1 task 3 asserts `grep -rE 'goodplan (init|status|epic:|slice:|quest:|learning:|decision:|task:|schema|version|subagent:)' dist/gp-plugin/skills/` returns no matches. I verified this against the current `skills/` directory: zero matches exist today. The assertion passes vacuously. This is fine as a regression guard, but the implementer should know it's a no-op today — the value is preventing future regressions, not catching current issues. No change needed, just worth noting.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 auto-namespacing fallback task could silently break skill cross-references**
Phase 2 task 3 (fallback if auto-namespacing bug #20994 persists) prepends `gp:` to the `name:` field in each dist SKILL.md. This modifies the dist copies only (source is preserved), which is correct. However, skills reference each other by name in their content (e.g., "use `/create-plan` to..." in prose). If the `name:` field becomes `gp:create-plan` but internal cross-references say `/create-plan`, users following skill instructions would invoke the wrong command. The plan doesn't address updating cross-references in the dist copies.

**Recommendation:** If the fallback is needed, add a grep to identify cross-skill references in dist SKILL.md content (patterns like `/create-plan`, `/explore`, `/project-status`) and either update them to use the `gp:` prefix or document this as a known gap for the CI slice to address.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] No assertion that `_shared/references/` is non-empty after copy**
Phase 1 Expected Behavior checks that `dist/gp-plugin/skills/_shared/references/` exists as a directory. But it doesn't assert the directory is populated. A subtle rsync misconfiguration (e.g., trailing slash difference) could create the directory structure but leave it empty. Skills that reference `../_shared/references/cli-interaction.md` would then fail at runtime with no build-time warning.

**Recommendation:** Add an assertion that `dist/gp-plugin/skills/_shared/references/cli-interaction.md` exists (it's the most-referenced shared file). This catches the empty-directory edge case.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 1's three IMPORTANT issues (cli-usage.md duplication, cp -R vs rsync, vague regex) are all resolved cleanly. The plan now uses rsync, avoids a separate cli-usage.md file, and specifies a concrete regex pattern. The remaining issues are about assertion robustness (underscore convention vs hardcoded `_shared`, frontmatter parsing reliability) and edge cases (cross-references in namespacing fallback, empty `_shared`). These are IMPORTANT/MINOR — they improve resilience but don't affect the core design. The two-phase structure (build + validate) is well-layered, and the dependency on slice 02 (plugin-scaffold) is correctly scoped.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
