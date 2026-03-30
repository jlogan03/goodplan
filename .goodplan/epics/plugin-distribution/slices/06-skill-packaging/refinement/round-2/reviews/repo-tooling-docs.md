# Repo, Tooling, & Docs Review — Skill Packaging Plan (Round 2)

## Issues

**[IMPORTANT]** `install-skills.sh` has a hardcoded `SKILL_DIRS` array — plan copies all skills but doesn't address the divergence
The plan uses `rsync -a --exclude '.DS_Store' skills/ dist/gp-plugin/skills/` to copy the entire `skills/` tree. This is correct for the plugin build. However, `install-skills.sh` maintains a hardcoded `SKILL_DIRS` array (line 39-59) that must be manually updated when skills are added. The two scripts now use fundamentally different approaches: `build-plugin.sh` auto-discovers all skills via directory copy, while `install-skills.sh` uses an explicit allowlist. This creates a maintenance divergence where a new skill added to `skills/` is automatically included in the plugin but silently excluded from the installed skills. The plan should either (a) note this divergence as a known issue for a future slice, or (b) add a build assertion that the set of skill directories in `dist/gp-plugin/skills/` matches the `SKILL_DIRS` array in `install-skills.sh` (minus `_shared`). Option (a) is fine if the intent is to deprecate `install-skills.sh` once plugin distribution is live.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Task 1 step 1 says "Remove the existing `mkdir -p "$PLUGIN_DIR/skills"` line" — but context matters
The plan correctly identifies the redundant `mkdir -p` (line 18 of build-plugin.sh). However, the instruction "the copy step replaces it with actual content" could be misread — `rsync` to a non-existent destination directory creates it, but if the rsync is moved or fails, the downstream `claude plugin validate` would get a more confusing error about missing directories. This is extremely minor; just noting that removing the mkdir is cosmetically clean but slightly reduces defensiveness. Not blocking.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Task 1 step 5 says "check if `claude plugin validate` already checks these frontmatter fields" — this should be resolved before implementation, not during
The plan includes a conditional: "if `claude plugin validate` already checks these frontmatter fields, this validation may be redundant — check before implementing." This is a research question that should be resolved during plan refinement, not left as an implementation-time decision. Running `claude plugin validate` against the current build output (which has an empty `skills/` directory) would answer this now. Based on the `claude plugin validate --help` output, it validates plugin/marketplace manifest structure — it likely does NOT validate individual SKILL.md frontmatter since that's a skill-level concern, not a plugin-level concern. The plan should state the assumption ("claude plugin validate does not check SKILL.md frontmatter — our build assertions fill this gap") and drop the conditional.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 2 addresses all three IMPORTANT issues from round 1 cleanly: rsync replaces cp -R (with `.DS_Store` exclusion matching `install-skills.sh`), the `goodplan` assertion now uses a concrete regex with explicit subcommand list, and the `cli-usage.md` placement issue was resolved by removing the unnecessary file entirely. The plan is well-structured with clear phase separation, concrete Expected Behavior checks, and appropriate verification steps. The one remaining IMPORTANT issue (install-skills.sh divergence) is a maintenance concern that should be acknowledged even if deferred. The two MINOR items are polish.

To reach 10/10: acknowledge the `install-skills.sh` divergence (even just a one-line note) and resolve the `claude plugin validate` conditional before implementation.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
