# Merged Feedback — Slice 06: Skill Packaging (Round 1)

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: `cli-usage.md` should not be created as a new file — consolidate into existing `cli-interaction.md`**
(Flagged by all 3 reviewers — software-architecture version is most specific)

The plan creates `skills/_shared/cli-usage.md` containing `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. Three problems:
1. **Wrong location:** All shared files live under `skills/_shared/references/`, not directly in `_shared/`. The plan itself checks `ls dist/gp-plugin/skills/_shared/references/` in Expected Behavior, contradicting the file placement.
2. **Duplicates existing content:** `skills/_shared/references/cli-interaction.md` Section 1 already covers binary detection and version checking. A second file creates two sources of truth for "how to find the CLI binary."
3. **Broken in dev context:** `${CLAUDE_PLUGIN_ROOT}` is undefined during local development — the file contains a literal unresolved variable. The comment saying "use `gp` on PATH instead" isn't enforced.
4. **Orphan file:** No skill is updated to reference `cli-usage.md`, so it's dead code from the start.

**Recommendation:** Do not create `cli-usage.md`. Instead, extend the existing binary detection logic in `cli-interaction.md` (Section 1) with a plugin-context path note. This keeps a single source of truth and avoids a file that is misleading in dev context. If no skill currently needs this info, defer entirely.
Resolution: DIRECTLY_ACTIONABLE

---

**IMP-2: Use `rsync` instead of `cp -R` to exclude `.DS_Store` and OS artifacts**
(Flagged by all 3 reviewers — consistent recommendation)

`cp -R skills/ dist/gp-plugin/skills/` copies `.DS_Store`, resource forks, and any future dev-only artifacts. The existing `install-skills.sh` deliberately uses `rsync -a --exclude='.DS_Store'`. The build script should match this convention.

**Recommendation:** Replace `cp -R` with `rsync -a --exclude '.DS_Store' skills/ dist/gp-plugin/skills/`. Add a verification assertion: `find dist/gp-plugin/skills -name '.DS_Store' | wc -l` returns 0.
Resolution: DIRECTLY_ACTIONABLE

---

**IMP-3: `goodplan` subcommand assertion needs a concrete regex or should be dropped**
(Flagged by all 3 reviewers — consistent)

Phase 1 task 3 says "assert no SKILL.md references `goodplan ` followed by a subcommand" but doesn't specify the regex. Distinguishing prose ("the goodplan repo") from invocation (`goodplan status`) requires an explicit subcommand list. Current SKILL.md files already use `gp` exclusively, so this assertion passes vacuously today.

**Recommendation:** Either (a) provide a concrete pattern like `goodplan (init|status|epic:|slice:|quest:|learning:|decision:|task:|schema|version|subagent:)` or (b) drop the assertion since the rename already happened and future regressions are better caught by CI linting.
Resolution: DIRECTLY_ACTIONABLE

---

**IMP-4: Phase 2 "before" check is not falsifiable**
(Flagged by holistic reviewer only)

The "before" check is a prose statement: "No automated structural validation of skill SKILL.md frontmatter validity in the build script." This is not runnable. A proper before check would be: `grep -c 'frontmatter\|SKILL.md' scripts/build-plugin.sh` returns 0.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: Phase 2 manual test results should feed into CI automation planning**
(Flagged by holistic + software-architecture)

Phase 2's manual integration test (launch Claude Code, visually verify skills) is appropriate for first pass, but the plan should: (a) specify what success/failure evidence to capture (terminal output, screenshot), and (b) note which manual checks should become automated in slice 07 CI, making the dependency explicit.
Resolution: DIRECTLY_ACTIONABLE

---

**MIN-2: Phase 2 frontmatter validation — note YAML folded scalar pattern**
(Flagged by repo-tooling-docs)

Every existing SKILL.md uses `description: >` (YAML folded scalar). A naive `grep 'description:'` works for presence checking, but the plan should note this pattern so the implementer doesn't attempt to extract/validate the description value (which would require YAML parsing).
Resolution: DIRECTLY_ACTIONABLE

---

**MIN-3: Phase 2 frontmatter validation may overlap with `claude plugin validate`**
(Flagged by software-architecture)

The plan adds bash-based YAML frontmatter validation. If `claude plugin validate` already checks SKILL.md frontmatter fields, this is redundant. Worth checking before implementing.
Resolution: CODEBASE_EXPLORATION
Research: Run `claude plugin validate --help` or test with a malformed SKILL.md to determine if it validates frontmatter fields (name, description).

---

**MIN-4: Build script growing without modularization path**
(Flagged by software-architecture)

Not blocking, but the build script is accumulating responsibilities. A future refactor to extract assertion logic into `scripts/validate-plugin.sh` would improve maintainability.
Resolution: DIRECTLY_ACTIONABLE

---

**MIN-5: Existing `mkdir -p "$PLUGIN_DIR/skills"` should be noted/removed**
(Flagged by repo-tooling-docs)

The existing build script creates an empty `skills/` directory. The plan's copy step replaces this with actual content. The plan should note this so the implementer removes the redundant `mkdir -p` line.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

1. **IMP-1** — Do not create `cli-usage.md`; extend `cli-interaction.md` or defer
2. **IMP-2** — Use `rsync -a --exclude '.DS_Store'` instead of `cp -R`; add `.DS_Store` absence assertion
3. **IMP-3** — Provide concrete regex for `goodplan` assertion or drop it
4. **IMP-4** — Make Phase 2 "before" check a runnable grep command
5. **MIN-1** — Specify manual test evidence format; note CI automation handoff for slice 07
6. **MIN-2** — Note YAML folded scalar pattern for frontmatter validation
7. **MIN-4** — Note build script modularization as future improvement (no action now)
8. **MIN-5** — Note/remove existing `mkdir -p "$PLUGIN_DIR/skills"` line

## RESEARCH_NEEDED

1. **MIN-3** — Check whether `claude plugin validate` validates SKILL.md frontmatter fields

## Contradictions Resolved

**cli-usage.md approach:** Holistic and repo-tooling-docs recommended moving the file to `skills/_shared/references/cli-usage.md`. Software-architecture recommended not creating the file at all and instead extending `cli-interaction.md`. Resolved in favor of software-architecture's recommendation (domain specialist on source-of-truth concerns) — extending the existing file is cleaner than creating a new one that duplicates content and is broken in dev context.

## Unresolved (USER_INPUT required)

None.
