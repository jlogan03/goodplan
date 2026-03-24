## Issues

**[IMPORTANT]** Phase 2 does not specify that `/refine-plan` invocation should skip for the first slice if dogfooding time is a concern, but DOES correctly mandate full fidelity — verify skill re-entry behavior is tested

Phase 2 says "Run `/refine-plan`: Refine the plan through reviewer iterations" for each slice, but does not note what happens if `/refine-plan` is interrupted and re-entered. The `/refine-plan` skill uses `start-refinement` and `submit-refinement` CLI commands with a `scores` payload for the circuit breaker. If the session is interrupted mid-refinement, the skill's re-entry behavior depends on the CLI state (`plan-created` vs `plan-refining`). The plan should note that re-entry after interruption is a friction discovery vector worth testing — if it happens organically, log it; if not, consider deliberately interrupting one refinement session to test the recovery path.

This is especially relevant because the plan's stated goal includes "exercising... convention doc shortcomings" and the `cli-interaction.md` section 10 documents `STATE_INVALID_TRANSITION` recovery for re-entry — but that pattern has never been exercised end-to-end with the CLI-integrated skills.

Fix: Add a note to Phase 2 Planning & Implementation section: "If a skill session is interrupted during refinement, re-enter and observe recovery behavior. Log any issues — skill re-entry is a key friction discovery vector."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `bun run install:skills` will overwrite user-level skills used by other projects — no rollback guidance

Phase 1 task says "run `bun run install:skills` to install current skills at `~/.claude/skills/`." This overwrites any existing user-level skills. While the plan notes this for the in-project copy, it does not mention that the user's OTHER repos (including goodplan itself) will now use the newly installed skills. If a skill has a bug discovered during dogfooding and the user needs to work in another project, the broken skill is now global.

The plan does acknowledge this implicitly by mandating in-project install for the dogfood repo, but does not provide rollback guidance for the user-level install. Since the plan says "goodplan's old-format skills remain usable in this repo" (referring to the goodplan repo), this only works if goodplan has its own `.claude/skills/` — but it does not (skills are in `skills/`, not `.claude/skills/`).

Fix: Add a note: "If user-level skill bugs are discovered during dogfooding, fix in `skills/` and re-run `bun run install:skills`. Git history serves as rollback." This is informational, not blocking.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 deliberate quest does not specify whether `/refine-plan` is included or intentionally skipped

Phase 3 "Deliberate Quest" says "Run `/create-plan` -> `/implement-plan` -> `/complete`" — omitting `/refine-plan`. Phase 3 "Organic Quests" includes the full cycle with `/refine-plan`. This inconsistency could be intentional (small quests may not need refinement) but is not explained.

Since the dogfooding goal includes "exercising... all entity types" and quests share the same `plan-created -> plan-refining -> plan-refined` state transitions as slices, the deliberate quest should either include `/refine-plan` or explicitly note why it is skipped.

Fix: Either add `/refine-plan` to the deliberate quest sequence, or add a note: "Skip `/refine-plan` for the deliberate quest if it is small enough that refinement would not add value — this tests the direct plan-to-implement path."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 cross-skill grep pattern does not catch `cat .project/` or `Write.*\.project/.*\.json` patterns

Phase 5 task says to run a broader grep for `cat .project/`, `Write.*\.project/.*\.json`, etc. as a second pass. But the first grep command only covers `Read.*\.project/.*\.json|\.project/.*\.jsonl|state\.md|echo.*activity-log`. The "Run broader grep" task is present but does not provide the actual command — it lists patterns in prose without a concrete grep invocation.

Fix: Add a concrete second grep command: `grep -rn --exclude-dir='_shared' --exclude-dir='start-epic' 'cat \.project/\|Write.*\.project/.*\.json\|jq .* \.project/\|ls -d.*__active__\|mkdir -p \.project/' skills/`

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All critical and important issues from rounds 1-2 have been thoroughly addressed. The plan now correctly sequences `epic:activate` after slicing with `epic:add-verification` preceding it. The Phase 1 expected behavior correctly shows `activeEpic === null`. The Phase 4 approval workflow has concrete manual steps and explicitly avoids `/start-epic`. The skill reference path explanation is clear and actionable. The `slice:plan` and `quest:plan` transitions are present before `/create-plan`.

The remaining important issue (re-entry testing) is about maximizing friction discovery rather than plan correctness. The minor issues are about completeness and consistency. To reach 10: add the re-entry testing note and clean up the Phase 3 deliberate quest inconsistency.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
