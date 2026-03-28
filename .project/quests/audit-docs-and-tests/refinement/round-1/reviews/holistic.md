# Holistic Review — audit-docs-and-tests

## Issues

**[CRITICAL]** Plan does not include adding new skills to `scripts/install-skills.sh`
The research file explicitly notes that `scripts/install-skills.sh` has a hardcoded `SKILL_DIRS` array and new skills must be added to it. Neither Phase 1 nor Phase 2 includes a task to add `audit-docs` and `audit-tests` to this array. Without this, `bun run install:skills` will silently skip the new skills, and the confirmed goal's "done means both skills installed via `bun run install:skills`" criterion will fail.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Side quest creation uses wrong mechanism
Phase 1 Step 4 says "propose as side quest via `goodplan quest:create`" but the confirmed goal says these skills should propose *side quests*, not quests. The `quest:create` CLI command creates a full quest (with lifecycle tracking), while the audit-architecture pattern writes side quest proposals to `.project/side-quests/<name>/goal.md` as lightweight filesystem artifacts. The plan conflates quests and side quests. The audit-architecture skill uses the filesystem approach — the new audit skills should match. The research file even notes this: "The audit-architecture skill also writes side quest goal files to `.project/side-quests/<name>/goal.md`" and "The `.project/side-quests/` directory does not currently exist in this repo." The plan should either consistently use the filesystem approach (matching audit-architecture) or consistently use `quest:create`, but must pick one and document why.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Missing audit report and project-health steps from audit-architecture pattern
The audit-architecture skill includes Step 5 (Write Audit Report to `.project/audits/`) and Step 5b (Refresh Project Health). Neither audit-docs nor audit-tests includes these steps. The plan says "following the `/audit-architecture` pattern" but omits two significant pattern elements. If these are intentionally omitted (audit-docs auto-fixes instead of just reporting), that should be stated explicitly. If they should be included, add tasks for them.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing graceful stop / resume detection from audit-architecture pattern
The audit-architecture skill has Step 6 (Graceful Stop with partial markers) and resume detection in Step 1. Both new skills omit this. For skills that spawn multiple parallel sub-agents and may take significant time, graceful interruption is important. Either add these or document why they're not needed.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing expertise check step from audit-architecture pattern
Both audit-docs and audit-tests omit the expertise check step (Step 7 in audit-architecture). This is a standard step in the audit pattern for calibrating communication depth. Should be included for pattern consistency.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing context loading steps from audit-architecture pattern
The audit-architecture skill has an extensive Step 1 (Load Context) that includes: reading `cli-interaction.md`, detecting active epic, loading decisions, loading learnings, loading conventions, loading activity-log, expertise calibration, and resume detection. Both new skills jump straight into domain work without these foundational steps. At minimum, the new skills need: version check, CLI interaction conventions, learnings (may contain relevant audit context), and conventions loading.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Expected Behavior checks are grep-based rather than functional
Both phases use `grep -c` on the SKILL.md content as verification. These checks verify that certain strings exist in the file, not that the skill actually works. The confirmed goal says "verified working on this repo" but the Expected Behavior sections don't include running the skill. The "Test on this repo" task exists but has no corresponding Expected Behavior check. Add a functional verification like: "Run `/audit-docs` on this repo and verify it produces findings without errors" to the Expected Behavior After section.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Expected Behavior "Before" section is redundant
Both "Before" checks (`ls` and `grep -c`) test the same thing (file doesn't exist). One is sufficient. Phase 2 already does this correctly with a single check.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Reference file naming inconsistency with audit-architecture pattern
The audit-architecture skill uses `references/sub-agent-prompts.md` for sub-agent prompts. The plan proposes `references/reviewer-prompts.md` for both new skills. While not wrong, using the same name (`sub-agent-prompts.md`) would improve pattern consistency and discoverability. Similarly, audit-architecture uses `references/guidance.md` — neither new skill includes a guidance file.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No verification section in Phase 2
Phase 1 has both "Expected Behavior" and a separate "Verification" section with additional criteria. Phase 2 has "Expected Behavior" and "Verification" as well, but Phase 2's Verification is thinner (4 bullets vs Phase 1's 4). Both are fine but the Phase 2 verification could mirror Phase 1's structure for consistency.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan captures the right domain intent (parallel sub-agent reviewers, fix/propose workflow) but has significant structural gaps relative to the pattern it claims to follow. The audit-architecture skill has 8 steps with careful attention to context loading, graceful interruption, audit reporting, and expertise tracking. Both new skills only describe 5-6 steps and omit several foundational elements. The `install-skills.sh` omission would cause the "done" criterion to fail. Fixing the critical issues (install script, side quest mechanism) and adding the missing pattern steps (context loading, graceful stop, audit report, expertise check) would bring this to 9+.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
