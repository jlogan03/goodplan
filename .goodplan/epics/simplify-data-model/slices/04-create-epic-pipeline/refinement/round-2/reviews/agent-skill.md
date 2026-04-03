# Agent Skill Review — Create-Epic Pipeline Plan (Round 2)

## Issues

**[IMPORTANT]** Refinement loop submit payload includes `round` field that the CLI schema rejects
The plan's Phase 4 step 6 says: `gp submit-refine-architecture --epic <name> --json` with `{"scores": {...}, "round": N}`. The `submitRefineArchitectureInputSchema` (at `src/schemas/commands/submit.ts:61-64`) only accepts `{epic, scores}` — there is no `round` field. Zod strict validation will reject the extra field. The same issue exists in Phase 6 step 6 for `submit-refine-slices`. The CLI tracks round state internally via `epic.refinement.round` (see `evaluateRefinement` in `src/core/state/transitions/helpers.ts`). The orchestrator should submit only `{"scores": {...}}` and let the CLI manage round tracking.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Refinement loop exit logic duplicates CLI circuit breaker — creates risk of divergence
The plan's Phase 4 refinement loop describes orchestrator-side exit conditions: "Check exit: all scores >= 9 AND no CRITICAL/IMPORTANT issues -> exit loop" (step 4), stagnation detection (step 7), and round cap (step 7). However, the CLI's `evaluateRefinement()` already implements a circuit breaker: it checks scores against `SCORE_THRESHOLD`, tracks rounds against `maxRounds`, and returns `action: "advance"` or `action: "stay"` (which the `submit-refine-architecture` command surfaces via the `advanced` field in the response). The plan-slice orchestrator uses the simpler pattern: submit scores, check `advanced` in the response to decide whether to continue or stop. The create-epic plan should follow the same pattern — submit scores after each round, read `response.advanced` (true = done, false = continue), and use `--override` if the orchestrator wants to force exit (e.g., for stagnation). Duplicating the threshold/stagnation logic in the SKILL.md creates a maintenance risk where the orchestrator and CLI disagree on when to stop. However, the "no CRITICAL/IMPORTANT issues" check IS orchestrator-side logic the CLI cannot perform (it only sees numeric scores), so the plan should clarify: the orchestrator checks for blocking issues before submitting, and uses the CLI's `advanced` response for the score-threshold decision.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Refinement loop missing `start-refine-architecture` / `start-refine-slices` context bundling
The plan correctly uses `start-explore`, `start-architecture`, and `start-slices` for context assembly in the initial agent spawns. But the refinement loop (Phase 4 steps 1-8 and Phase 6 steps 1-7) never calls `gp start-refine-architecture --epic <name> --json` or `gp start-refine-slices --epic <name> --json`. These commands exist (`src/commands/subagent/start-refine-architecture.ts`, `start-refine-slices.ts`) and assemble context bundles scoped to the refinement phase (including architecture files, prior review output, etc.). Without these, the refinement-coordinator, reviewer, and editor agents would need ad-hoc path assembly from the orchestrator — breaking the pattern established by plan-slice which uses `start-refinement` for its refinement loop. The plan should call the appropriate `start-refine-*` command at the top of each refinement loop iteration and pass the returned `ContextBundle` to sub-agents.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 test re-entry fixture uses CLI commands but doesn't specify `start-refine-architecture` context availability
The Phase 5 re-entry test says: "Create fixture with epic at `explored` status: `gp init` -> `gp epic:create` -> run CLI commands to advance through goal and explore phases (`gp epic:explore`, `gp submit-explore`) to reach `explored` status." This is the right approach, but `submit-explore` requires stdin input (`{"files": [...]}` or similar). The plan should specify exactly what stdin payload `submit-explore` expects, or note that the test fixture needs to write placeholder explore output files before calling `submit-explore`. Without this, the implementer must reverse-engineer the `submitExploreInputSchema`.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 3 architecture Q&A "broad pass" / "deep pass" structure lacks iteration limits
The plan says Phase 3 (architecture Q&A) runs "Broad pass (3-5 questions)" and "Deep pass (2-3 questions per subsystem)." For a project with 6+ subsystems, the deep pass alone could produce 12-18 questions — a long interactive session. The plan-slice Q&A has a natural bound (one slice = limited scope). The create-epic plan should specify a total question cap or time-boxing heuristic (e.g., "cap deep pass at 3 subsystems; remaining subsystems get 1 question each" or "total Q&A under 15 questions"). Without this, the agent may exhaust the user.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 explore-phase agent lists `WebSearch` in tool note but Agent SDK tool availability depends on runtime
The plan says: "Tool note: 'This agent has full tool access (Read, Grep, Glob, Write, WebSearch).'" The `WebSearch` tool availability depends on the Claude Code runtime configuration and may not be present in all environments (e.g., test harness, Codex). The agent definition should handle graceful degradation: "WebSearch if available; fall back to codebase exploration and Context7 MCP if not." This matches how the existing explore skill handles tool availability.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 build verification Expected Behavior checks `name: gp:create-epic` but existing SKILL.md uses `name: create-epic`
The plan's Phase 4 Expected Behavior says: "`ls dist/gp-plugin/skills/create-epic/SKILL.md` -> exists with `name: gp:create-epic`." The plugin build pipeline applies the `gp:` namespace prefix during packaging (the source SKILL.md has `name: create-epic`, the dist version has `name: gp:create-epic`). This is correct behavior, but the plan's Phase 3 Tasks say "Frontmatter: `name: create-epic`" (the source name). The implementer needs to understand that the name in the source differs from the name in dist. The plan should add a brief note in Phase 3 or Phase 4 explaining the namespacing transform to prevent confusion.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Significant improvement from round 1 (5/10). The critical issues are resolved: `reviewers-language.md` path is now explicit, context bundling commands are used, the explore-phase parallel research trade-off is documented, and the fixture setup distinguishes bare project from `createMinimalFixture`. The refinement loop is more explicit than before. However, three important issues remain: the submit payload includes a `round` field the CLI rejects, the exit logic duplicates the CLI circuit breaker rather than using the `advanced` response field, and the refinement loop omits `start-refine-*` context bundling. To reach 9+: remove `round` from submit payloads, use `response.advanced` for loop exit (keep orchestrator-side CRITICAL/IMPORTANT check as a pre-submit gate), and add `start-refine-architecture`/`start-refine-slices` calls to the refinement loop iterations.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
