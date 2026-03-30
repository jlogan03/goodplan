# Merged Feedback — Slice 06: Skill Packaging (Round 2)

Reviewers: holistic (9/10), software-architecture (9/10), repo-tooling-docs (9/10)

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: Phase 1 `_shared` exclusion uses hardcoded name instead of convention-based pattern**
(software-architecture)
Phase 1 task 2 asserts "every skill directory (except `_shared`) contains a `SKILL.md` file" but doesn't specify how the exclusion works in bash. Hardcoding `_shared` becomes a maintenance trap if future non-skill directories are added.
**Recommendation:** Assert that every directory NOT prefixed with `_` contains a `SKILL.md`. Underscore-prefixed directories are already the convention for shared/internal resources. This makes the assertion resilient.
Resolution: DIRECTLY_ACTIONABLE

**IMP-2: Phase 2 frontmatter validation uses fragile bash YAML parsing — resolve `claude plugin validate` overlap first**
(software-architecture + repo-tooling-docs + holistic — deduplicated)
Three reviewers flagged overlapping concerns: (a) the bash grep for `name:` / `description:` between `---` delimiters can false-positive on comments or non-frontmatter content, (b) the plan leaves "check if `claude plugin validate` already covers this" as an implementation-time decision when it should be resolved now, (c) the implementer may stall on this ambiguity.
**Recommendation:** Resolve before implementation: run `claude plugin validate` against a SKILL.md with missing `name:` field. If it catches the error, skip custom bash validation for that field. If bash checks are still needed, extract the frontmatter block first with `sed -n '/^---$/,/^---$/p'` then grep within that block only. State the assumption explicitly in the plan ("claude plugin validate likely does not check SKILL.md frontmatter — our build assertions fill this gap") and drop the conditional phrasing.
Resolution: DIRECTLY_ACTIONABLE

**IMP-3: `install-skills.sh` hardcoded `SKILL_DIRS` array diverges from plugin's auto-discovery approach**
(repo-tooling-docs)
`build-plugin.sh` copies all skills via rsync (auto-discovers), while `install-skills.sh` uses an explicit allowlist (lines 39-59). A new skill added to `skills/` is automatically included in the plugin but silently excluded from installed skills. This creates a maintenance divergence.
**Recommendation:** Add a one-line note to the plan acknowledging the divergence. Either (a) note it as a known issue for a future slice, or (b) add a build assertion that the skill directories in dist match the `SKILL_DIRS` array in `install-skills.sh`. Option (a) is fine if `install-skills.sh` will be deprecated once plugin distribution is live.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: Phase 1 `goodplan` invocation regex assertion currently matches zero files**
(software-architecture)
The grep assertion passes vacuously today — zero matches exist in the current `skills/` directory. This is fine as a regression guard but the implementer should know the value is preventing future regressions, not catching current issues. No change needed.
Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Phase 2 auto-namespacing fallback could silently break skill cross-references**
(software-architecture)
If the fallback prepends `gp:` to `name:` in dist SKILL.md files, internal cross-references like `/create-plan` in skill prose won't match. The plan doesn't address updating cross-references in dist copies.
**Recommendation:** If fallback is needed, add a grep to identify cross-skill references in dist SKILL.md content and either update them or document as a known gap.
Resolution: DIRECTLY_ACTIONABLE

**MIN-3: No assertion that `_shared/references/` is non-empty after copy**
(software-architecture)
Phase 1 checks the directory exists but not that it's populated. A subtle rsync misconfiguration could create an empty directory structure.
**Recommendation:** Add an assertion that `dist/gp-plugin/skills/_shared/references/cli-interaction.md` exists.
Resolution: DIRECTLY_ACTIONABLE

**MIN-4: Phase 1 Task 1 removing `mkdir -p` slightly reduces defensiveness**
(repo-tooling-docs)
Removing the `mkdir -p "$PLUGIN_DIR/skills"` line is cosmetically clean since rsync creates the directory, but if rsync is moved or fails, downstream errors become more confusing. Extremely minor.
Resolution: DIRECTLY_ACTIONABLE

**MIN-5: Phase 2 before-check grep may false-positive on "name:" in existing code**
(holistic)
The before check `grep -cE 'frontmatter|SKILL.md.*name:|SKILL.md.*description:'` could match if the build script already references SKILL.md and name on the same line. Currently no such references exist, so this works in practice.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 8 issues (3 IMPORTANT, 5 MINOR) are directly actionable.

## RESEARCH_NEEDED

None. The one research question (`claude plugin validate` coverage) was flagged as something to resolve before implementation rather than requiring open-ended research.

## Contradictions Resolved

**`claude plugin validate` overlap:** Holistic (MINOR) treated this as a phrasing improvement. Software-architecture (IMPORTANT) treated it as a reliability concern about fragile YAML parsing. Repo-tooling-docs (MINOR) treated it as a research question that should be pre-resolved. These are three perspectives on the same root issue. Merged as IMPORTANT (IMP-2) since the arch reviewer's concern about false positives blocking valid builds is the most impactful framing, with the other reviewers' recommendations folded in.

## Unresolved (USER_INPUT required)

None.
