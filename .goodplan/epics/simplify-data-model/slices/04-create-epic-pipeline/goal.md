# Create-Epic Pipeline

## What We're Building
Build the most complex pipeline skill: `/gp:create-epic` — a 6-phase orchestrator that takes a user from epic goal capture through defined slices. This produces the remaining phase agents (explore-phase, architecture-phase, slices-phase) and additional reviewer agents. The orchestrator pattern was validated in slice 02 with plan-slice; this slice applies the proven pattern to a more complex, multi-phase pipeline with both interactive and autonomous phases.

## Behavior
1. Create phase agent definitions: `explore-phase.md` (research/brainstorm/prototype loop), `architecture-phase.md` (draft architecture from Q&A), `slices-phase.md` (draft slice definitions from Q&A).
2. Add reviewer agents needed for architecture and slice review contexts: at minimum `reviewer-typescript.md`, `reviewer-tui-cli.md`, `reviewer-repo-tooling.md` (select based on project conventions).
3. Build the `create-epic` orchestrator skill (`skills/create-epic/SKILL.md`):
   - Phase 1 (interactive): Goal capture — ask user about the epic goal, write `goal.md`.
   - Phase 2 (autonomous): Explore — spawn `explore-phase` agent, receive research/brainstorm summaries.
   - Phase 3 (interactive): Architecture Q&A — run design tree (broad pass: what subsystems, then deep pass: API surfaces, data models, flows).
   - Phase 4 (autonomous): Architecture draft + refinement — spawn `architecture-phase`, then refinement loop (coordinator → reviewers → synthesis → editor).
   - Phase 5 (interactive): Slices Q&A — discuss scope, ordering, dependencies with user.
   - Phase 6 (autonomous): Slices draft + refinement — spawn `slices-phase`, then refinement loop.
4. Re-entry protocol: query `gp epic:show --epic <name> --json`, map status to phase, offer continue/go-back.
5. Front-loaded interaction: all Q&A phases (1, 3, 5) run their questions in the orchestrator context. Autonomous phases (2, 4, 6) spawn sub-agents.
6. Sub-agent yield and resume: if a sub-agent returns PARTIAL, handle questions (AskUserQuestion) and research topics (spawn research agent), then re-spawn with continuation file.
7. Phase agents evaluate `reconsiderWhen` and `validUntil` conditions when provided in task prompt. Verify with a fixture-based test: create a fixture decision with a `reconsiderWhen` condition that matches the test epic's goal, assert the agent output mentions the condition.

**Maturity Note:** State Machine subsystem at "Developing (modified)" maturity (modified by slice 03). This slice builds skills that target the post-slice-03 CLI API surface.

## Verification
- [ ] Run `bun tools/dogfood/test-create-epic.ts` — full 6-phase pipeline completes: goal captured, explore runs, architecture Q&A collects input, architecture drafted and refined, slices Q&A collects input, slices drafted and refined
- [ ] After test run, `gp epic:show --epic <name> --json` returns status `slices-refined` (or equivalent post-slices status)
- [ ] Re-entry test: create a fixture at "explore-complete" status, invoke skill, verify it picks up at architecture Q&A phase (not from the beginning)
- [ ] `reconsiderWhen` positive test: fixture decision with matching condition — agent output references the condition
- [ ] `reconsiderWhen` negative test: fixture decision with a non-matching condition — agent output does NOT surface the irrelevant condition
- [ ] Verify explore-phase agent writes research and brainstorm files to the epic's directories
- [ ] Verify architecture-phase agent produces `_overview.md` and subsystem API files
- [ ] Verify slices-phase agent produces `sequencing.md` and per-slice `goal.md` files
- [ ] Orchestrator context discipline: no Read calls on full artifacts in the orchestrator log

Run `test-create-epic.ts` with a minimal fixture. The test should exercise all 6 phases with simulated user responses. Verify that each phase transitions the epic's CLI status correctly. Test re-entry by running the skill twice — once stopping after explore, then again to verify it resumes from architecture Q&A. Check that all expected artifacts (goal.md, research files, architecture files, slice files) are written to the correct epic directories.

## Scope Boundaries
**In scope:** `skills/create-epic/SKILL.md` orchestrator, `agents/explore-phase.md`, `agents/architecture-phase.md`, `agents/slices-phase.md`, additional reviewer agents, `tools/dogfood/test-create-epic.ts`, re-entry protocol, sub-agent yield/resume for PARTIAL status
**Out of scope:** `/gp:explore` standalone skill wrapper (built in slice 06). Init skill (slice 06). The explore-phase agent IS built here — the standalone `/gp:explore` skill just wraps it.
