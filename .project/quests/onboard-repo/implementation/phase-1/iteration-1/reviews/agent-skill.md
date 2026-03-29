# Agent Skill Review — Phase 1: Skill Skeleton + Project Init

## Issues

**[IMPORTANT]** Re-entry guard in Step 3 is unreachable due to Step 1 stop
Step 1 unconditionally stops if `.project/` exists ("Stop the skill."). Step 3 has a re-entry guard: "If `.project/` exists from a previous partial run, skip init." This guard is dead logic — Step 1 already exited. If the intent is to support resuming a partially-completed onboarding (e.g., init succeeded but idea.md generation failed), Step 1 needs to distinguish between a fully-onboarded project (has `idea.md`, `conventions.md`, architecture files) and a partial run (just `.project/` with `project.json` but no markdown artifacts). The simplest fix: in Step 1, check for `goodplan status --json` and only stop if the project has meaningful content beyond bare init. Otherwise, inform the user this looks like a partial run and continue.
File: skills/onboard-repo/SKILL.md:37
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step 4 re-entry check has the same unreachability problem
Step 4 says: "If `idea.md` exists and has content, ask the user..." But if Step 1 stops whenever `.project/` exists, you can never reach Step 4 with an existing `idea.md`. The re-entry checks in Steps 3 and 4 need Step 1 to allow partial-run pass-through, or they should be removed to avoid misleading future skill maintainers.
File: skills/onboard-repo/SKILL.md:148
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step 3 project name priority order inverts conventions
Step 3 lists priority as: (1) repo directory name, (2) `package.json` name, (3) README title. Other skills (`create-epic`) use the user-provided or package manifest name as the primary source, with directory name as fallback. The directory name is the least reliable signal (often `repo`, `project`, or a generic clone name). Recommended order: (1) `package.json`/manifest name, (2) README title, (3) directory name.
File: skills/onboard-repo/SKILL.md:109
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 0 uses "Step 0" while `create-epic` uses "Step 1" for version check
Most skills in this repo use Step 0 for version check (audit-*, capture, create-slices, explore, create-architecture, create-plan), so onboard-repo's numbering is consistent with the majority. However, `create-epic` — the most analogous skill (also calls `goodplan init`) — uses Step 1. No action needed, just noting for awareness. The Step 0 convention is the more recent standard.
File: skills/onboard-repo/SKILL.md:19
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing `--json` flag on version check
Step 0 correctly shows `goodplan --version --json`, but Step 1's shallow clone check (`git rev-parse --is-shallow-repository`) and `gh auth status` don't capture structured output. This is fine for those git/gh commands, but worth noting that the `ls -d .project/` check in Step 1 could be replaced with `goodplan status --json` for more structured detection (distinguishing "project exists and is healthy" from "project exists but is bare init"). This ties into the re-entry issue above.
File: skills/onboard-repo/SKILL.md:38
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fixture script uses GNU date fallback that may not work on macOS
The `commit()` helper in `generate-onboard-fixture.sh` line 445 uses `date -v-"${days_ago}"d` (BSD/macOS) with a fallback to `date -d "${days_ago} days ago"` (GNU). The BSD variant is correct for macOS, but the fallback pattern uses `2>/dev/null || date -d` which suppresses errors from the first attempt. This is actually fine for cross-platform, but the `|| true` on the git commit (line 447) silently swallows commit failures. If a commit fails for a real reason (e.g., git config issue), the fixture will have missing history and the test will produce confusing results.
File: scripts/generate-onboard-fixture.sh:447
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test harness uses emoji in verification output
Line 199 and others use checkmark/cross emojis in log output. This is cosmetic and doesn't affect function, but the project CLAUDE.md guidelines say "avoid using emojis." Minor inconsistency with the existing `test-migrate.ts` harness — check if that one also uses emojis for consistency.
File: tools/dogfood/test-onboard.ts:199
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Description could be more "pushy" for triggering
The description is 412 chars (well under 1024 limit) and clearly describes what the skill does. However, per the triggering accuracy criterion, it could be slightly pushier. Consider adding trigger phrases like: "Use when joining an existing codebase, taking over a project, or wanting to understand a repo's architecture." This helps Claude trigger the skill on prompts like "help me understand this codebase" or "I just cloned this repo."
File: skills/onboard-repo/SKILL.md:3
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The skill skeleton is well-structured and follows established patterns (frontmatter, Step 0 version check, CLI-first state mutations, reference loading). The repo-scanning reference is thorough with good multi-language coverage. The fixture script and test harness are solid and follow the existing test-migrate pattern closely.

The score is held back by two IMPORTANT issues: (1) the re-entry logic is unreachable, creating dead code that will mislead maintainers and prevent crash-recovery in later phases, and (2) the project name priority order inverts the expected convention. Fixing these would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
