# Agent Skill Review — Remaining Skills + Cleanup (Round 3)

## Issues

**[IMPORTANT]** Phase 5: Hardcoded reviewer lists in create-epic and plan-slice SKILL.md files will not include the 14 new agents

`skills/create-epic/SKILL.md` hardcodes `Available reviewers: ["reviewer-holistic", "reviewer-software-architecture", "reviewer-agent-skill", "reviewer-typescript", "reviewer-tui-cli", "reviewer-repo-tooling"]` in two places (architecture refinement loop and slices refinement loop). `skills/plan-slice/SKILL.md` similarly hardcodes `["reviewer-holistic", "reviewer-software-architecture", "reviewer-agent-skill"]`. `skills/implement/SKILL.md` uses `reviewer-registry.md` (which Phase 5 rewrites correctly), but the other two orchestrators pass hardcoded lists directly to the refinement-coordinator's task prompt. After Phase 5 adds 14 new agents, create-epic and plan-slice will continue to invoke only 6 reviewers — the new python, rust, backend, frontend, data-layer, devops, etc. reviewers will never be selected for architecture or slice refinement. The create-side-quest skill (Phase 1) also needs this list defined correctly from the start.

Fix: Phase 5 must also update `skills/create-epic/SKILL.md` (2 places) and `skills/plan-slice/SKILL.md` (1 place) to expand the available reviewer lists. The create-side-quest SKILL.md template in Phase 1 should also reference the full set (or defer to the registry, following implement's pattern). All three skills should use the same set as implement — or better, all should be updated to reference `reviewer-registry.md` so reviewer list updates propagate from one place.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6: CLAUDE.md not updated — old skill names remain as stale references

The project `CLAUDE.md` (Section 2: Installed Tools) reads:

> "They are what `/project-status`, `/create-plan`, `/implement-plan`, and all other slash commands actually use."

and the harness table lists `test-onboard.ts` (`/onboard-repo` skill) and `test-migrate.ts` (`/migrate` skill) as examples. After Phase 6 deletes these skills, anyone reading CLAUDE.md will try to invoke non-existent skills. Phase 6 should include a task to update CLAUDE.md: replace the three old names with their new equivalents (`/status`, `/plan-slice`, `/implement`) and update the harness table to reference `test-init.ts` and `test-renames.ts`. This is a small but meaningful omission — CLAUDE.md is the first thing a developer reads.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1: Skip-explore path from `created` to `planning` is removed without providing an alternative

The transition table task says "`explored -> BEGIN_QUEST_PLAN -> planning` (replaces current `created -> BEGIN_QUEST_PLAN -> planning`)". This removes the direct `created -> planning` transition. The skill's re-entry table allows `created` to "offer to continue with explore or go-back" — but does not define a `created -> planning` path for users who explicitly skip exploration. The epic pattern has an analogous skip path (`created -> COMPLETE_EXPLORE -> explored` via the skip-explore flow) which allows `gp submit-explore --epic <name> --skip` to reach `explored` without running the explore agent. If the quest model does not support this skip pattern, the plan should explicitly state that skipping explore is not supported for quests (and remove the "offer to continue" ambiguity in the re-entry table). If it is supported, add it to the transition table and the skill's re-entry table.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2: Audit skill positional argument parsing still uses CLI-style syntax despite round 2 MINOR flag

Round 2 flagged this as MINOR and it remains unchanged. The plan says: "Parse mode from first positional argument: `/gp:audit architecture`, `/gp:audit docs`, `/gp:audit tests` (matching the existing pattern where the first word after the skill name is the mode)." The note "(matching the existing pattern...)" implies this is a deliberate design choice, but no other skill in the codebase uses this pattern. All existing skills parse intent from conversation context, not formal positional arguments. The phrasing "first positional argument" will cause an implementer to write CLI-style `argv` parsing code that won't work in a skill context. The plan should say "extract the mode from the user's invocation text" (same correction as round 2) — the examples `/gp:audit architecture` are correct, but the word "positional argument" is misleading. Note: AskUserQuestion fallback when mode is absent is correct and does not need changing.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: Reviewer agents still lack end-to-end test coverage

Round 2 flagged this as MINOR and it is still unaddressed. Phase 5 verification relies on file existence checks and `bun run build:plugin` — no runtime invocation. The plan should add a lightweight dogfood test (e.g., `test-reviewers.ts`) that spawns a single representative reviewer agent (e.g., `reviewer-agent-skill`) with a small fixture artifact and verifies the agent returns valid review JSON. This would catch `@` reference resolution failures and prompt issues that build-time checks cannot detect. If a full standalone test is impractical (reviewers are designed to be spawned by orchestrators), the plan should at minimum add a step that runs an existing skill's refinement loop against a fixture and verifies the new reviewers appear in the coordinator's selection output.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: Onboard-phase agent has full tool access but no Write path specification

The plan says the `onboard-phase` agent has "full tool access (Read, Grep, Glob, Write, WebSearch)" and "writes conventions.md, architecture files, idea.md". But it does not specify where those files are written — relative to the repo root, to a temp dir, or directly to `.goodplan/`. The agent should write to a temp dir and return `filesWritten` paths; the orchestrator then `cp`s them to their final destinations (same pattern as architecture-phase.md). Writing directly to `.goodplan/` from inside an agent would bypass the HMAC protection layer. The plan should specify: agent writes drafts to `<tmpdir>/`, orchestrator moves them via Bash `cp` commands.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 resolved all five IMPORTANT issues from that round (reviewer count corrected to 14/20, registry rewrite specified, reviewers-cross-cutting orphan identified, transition table rows explicit, submit-explore specified). Round 2 MINORs were mixed: init auto-detection false-positive was fixed, reference file list was added, and transition table was detailed — but positional-argument wording and reviewer end-to-end testing remain. Two new IMPORTANT issues surface this round: hardcoded reviewer lists in create-epic and plan-slice SKILL.md files (a genuine implementation correctness gap — the new reviewers will silently not be invoked by those orchestrators), and missing CLAUDE.md updates (developer experience gap). The plan is otherwise well-structured with complete verification steps and clear implementability. Addressing the two IMPORTANTs above would bring this to 9+.

## Summary

- Critical: 0
- Important: 2
- Minor: 4
