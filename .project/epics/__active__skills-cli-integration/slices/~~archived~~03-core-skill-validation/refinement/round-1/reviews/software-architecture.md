# Software Architecture Review — Slice 03: Core Skill Validation

## Issues

**[CRITICAL]** Plan incorrectly claims `slice:complete` handles archiving — it does not

Phase 2, Step 10b says: "Eliminate. The CLI's `slice:complete` / `epic:complete` handles the `~~archived~~` rename." Codebase exploration confirms no archiving logic exists anywhere in `src/core/` — no references to `archived`, `~~archived~~`, or `rename`. The state machine transitions status to `completed` but directory renaming is not part of the CLI. If Step 10b is eliminated, completed scopes will never be archived, breaking signal tracking (Step 6d), project-status scans, and re-entry detection that rely on `~~archived~~` prefixes.

The skill must either retain its own archive rename step, or the plan must document this as a CLI gap requiring a follow-up. Since the plan explicitly says "No CLI code changes expected," the archive step must stay in the skill.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Redundant and conflicting interaction between `slice:complete` payload and separate `learning:rollup` / `decision:create` calls

The plan proposes a multi-step flow for `complete`: filesystem accumulation of learnings (Step 4) -> separate `learning:rollup` CLI call (Step 5) -> separate `decision:create` calls (Step 6) -> final `slice:complete` call (Step 10). However, `slice:complete` already accepts `learnings` and `architectureDelta` arrays in its stdin payload, and the state machine processes learnings rollup atomically within the `COMPLETE_SLICE` reducer (confirmed: `buildSliceCompleteResult` computes `learningsRolledUp` deltas from old vs new state).

This creates two problems:
1. If the skill calls `learning:rollup` separately AND passes `learnings` in the `slice:complete` payload, learnings will be double-processed.
2. If the skill calls `learning:rollup` first, the `slice:complete` event may fail or produce unexpected state because the learnings are already rolled up.

The correct pattern: accumulate learnings and architecture deltas to filesystem during the interactive flow, then read them back and pass them all in the `slice:complete` stdin payload. Remove the separate `learning:rollup` call (Step 5) and the separate `decision:create` calls for architecture deltas (Step 6). The `slice:complete` command handles the rollup atomically.

For `decision:create`: decisions about architecture updates (Step 6) are a different concern from the completion payload's `architectureDelta`. The plan must clarify which decisions are structured records (via `decision:create`) vs which are architecture deltas bundled into the completion payload. Currently the plan conflates them.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `learning:rollup` uses flags, not stdin — plan says "stdin payload"

Phase 2, Step 5 says: "Replace direct `.project/learnings.md` edit with `goodplan learning:rollup --json` with stdin payload." The actual `learning:rollup` command uses `--from` and `--to` flags (no stdin): `goodplan learning:rollup --from slices/01-auth --to project --json`. The plan's description of the interaction is incorrect and will lead to implementation errors.

If `learning:rollup` is kept as a separate call (see critical issue above about redundancy), the plan must specify the correct flag-based invocation. However, per the critical issue, the preferred approach is to remove `learning:rollup` entirely and let `slice:complete` handle rollup atomically.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No `start-complete` command exists — convention doc example is misleading

The cli-interaction-conventions.md "Worked example: complete orchestrator pattern" shows `goodplan start-complete --slice my-slice --inline --json`, but no `start-complete` command exists in the codebase (only `start-plan`, `start-refinement`, `start-implementation`, `start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`). The plan's Phase 2 Step 3 references reading artifacts via `slice:show --json` and `state --json --query`, which is correct. But the plan should explicitly note that there is no `start-complete` context bundling command, and the skill must assemble its own context from individual `show`, `list`, and `state --query` calls plus direct reads of LLM-owned markdown.

This is not a plan bug per se (the plan doesn't reference `start-complete`), but it should be explicitly called out since the convention doc's worked example suggests otherwise. If the implementer reads the convention doc alongside the plan, they may expect it to exist.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan does not specify `decision:create` vs `architectureDelta` boundary

The current `complete` skill writes markdown decision files to `.project/decisions/` for architecture updates (Step 6). The plan says to replace these with `decision:create` CLI calls. However, `decision:create` writes to `decisions.jsonl` (a structured JSONL record with id, domain, title, summary), while `slice:complete` also accepts `architectureDelta` in its payload (structured entries with subsystem, type, description). These are different records serving different purposes.

The plan must specify:
- Which items from Step 6 become `architectureDelta` entries in the `slice:complete` payload (subsystem-level changes)
- Which items become `decision:create` calls (formal decisions about architectural direction)
- Whether the markdown decision file format (`.project/decisions/*.md`) is fully replaced by `decisions.jsonl`, or if some decisions still need markdown

Without this clarity, the implementer will have to reverse-engineer the boundary during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `epic:complete` stdin shape differs from plan assumptions

The plan's Phase 2 Step 10 says the skill constructs the `epic:complete` stdin payload, but the actual `epic:complete` stdin schema requires `verificationResults` (an array of `{index, passed, notes}` per epic-level verification), not `verificationPassed` / `learnings` / `architectureDelta` as used for slices. The plan does not mention how the skill obtains or constructs these verification results. The plan should specify where the verification criteria come from (likely `epic:show --json` to read existing verifications) and how the user reviews them during the interactive flow.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 2 Step 2 auto-detect logic proposes `slice:list --json` but doesn't specify filtering

The current auto-detect logic scans the filesystem for slices where implementation is complete but completion hasn't run. The plan says to replace this with `slice:list --json` + check `status` and `artifacts` fields. This is correct conceptually, but the plan should specify the exact filter: look for slices with status `implementation-complete` (or check `artifacts.implementation === true && status !== 'completed' && status !== 'abandoned'`). Without this, the implementer must figure out the correct status values from the state machine.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Convention doc location inconsistency

Phase 3 references writing the "Migration Patterns" section to `skills/_shared/references/cli-interaction.md`, while the epic architecture references `cli-interaction-conventions.md` as the authoritative doc. The plan should clarify which file gets the new section and whether the two files should be consolidated or the migration patterns belong in the already-installed shared reference.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two critical issues (false assumption about CLI archiving, redundant/conflicting learnings processing) and four important issues affecting the interaction model between the skill and CLI commands. The plan demonstrates good understanding of the high-level migration direction, but several specific CLI interaction patterns are based on incorrect assumptions about what the CLI does. To reach 9+: resolve the archiving gap, restructure the `complete` flow to use `slice:complete`'s atomic payload correctly (removing redundant `learning:rollup` and clarifying `decision:create` boundaries), fix the `learning:rollup` invocation, and specify the `epic:complete` payload construction.

## Summary
- Critical: 2
- Important: 4
- Minor: 2
