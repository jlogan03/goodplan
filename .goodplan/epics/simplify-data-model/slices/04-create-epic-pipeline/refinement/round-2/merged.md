# Merged Feedback — Create-Epic Pipeline Plan (Round 2)

Reviewers: holistic (8/10), software-architecture (8/10), agent-skill (7/10)

## IMPORTANT Issues

### I1. Refinement loop submit payload includes `round` field the CLI rejects
Sources: software-architecture, agent-skill

Phase 4 step 6 and Phase 6 step 6 pass `{"scores": {...}, "round": N}` to `submit-refine-architecture` / `submit-refine-slices`. The Zod schemas (`submitRefineArchitectureInputSchema`, `submitRefineSlicesInputSchema`) only accept `{epic, scores}` — no `round` field. Zod strict validation will reject extra fields. The CLI tracks rounds internally via `epic.refinement.round`. Fix: remove `round` from all submit payloads.

### I2. Refinement loop exit logic duplicates CLI circuit breaker — use `response.advanced` instead
Sources: software-architecture, agent-skill

The plan specifies orchestrator-side exit conditions ("all scores >= 9 AND no CRITICAL/IMPORTANT issues") and stagnation detection. The CLI's `evaluateRefinement()` already implements score threshold + round cap logic and surfaces results via `advanced: boolean` in the submit response. The proven plan-slice pattern is: submit scores, check `response.advanced` to decide continue/stop. The orchestrator SHOULD keep a pre-submit gate for CRITICAL/IMPORTANT issues (the CLI only sees numeric scores), but score-threshold and round-cap decisions should defer to the CLI's `advanced` field. For stagnation, the orchestrator can use `--override` to force exit. This avoids maintenance risk from duplicated logic.

### I3. Refinement loop omits `start-refine-architecture` / `start-refine-slices` context bundling
Sources: software-architecture (MINOR), agent-skill (IMPORTANT)

The plan uses `start-explore`, `start-architecture`, `start-slices` for initial phases but never calls `start-refine-architecture` or `start-refine-slices` during refinement loops. These commands exist and return structured `ContextBundle` JSON with architecture/slice paths, prior review output, decisions, and learnings. Without them, the orchestrator must do ad-hoc path assembly — breaking the pattern established by plan-slice. Fix: call the appropriate `start-refine-*` command at the top of each refinement loop iteration and pass the returned bundle to sub-agents.

### I4. Refinement loop should explicitly follow the plan-slice pattern rather than re-specifying a variant
Sources: software-architecture, agent-skill

The refinement loop specifies coordinator + reviewers + synthesis + editor but differs from plan-slice's proven pattern in several ways: score source (synthesis vs per-reviewer returns), exit logic, stagnation thresholds. The plan should explicitly reference plan-slice steps 4f-i through 4f-vi as the canonical pattern and note only the intentional deviations (e.g., different env var name `GP_CREATE_EPIC_MAX_ITERATIONS`, lower default cap of 3 vs 10). Per-reviewer scores from individual reviewer returns should drive the exit decision, matching plan-slice.

### I5. `decision:list` and `learning:list` do not support `--epic` flag — client-side filtering needed
Source: holistic

Phase 3 uses `gp decision:list --epic <name> --json` and `gp learning:list --epic <name> --json`, but these commands have no `--epic` flag. Fix: use `gp decision:list --json` and filter client-side by `entityPath` prefix `epics/<name>`. Alternatively, add a prerequisite task to implement the flag.

### I6. Re-entry test fixture missing explore-phase artifact and submit-explore stdin spec
Sources: holistic, agent-skill

Phase 5 re-entry test says to advance an epic to `explored` via `gp epic:explore` -> `gp submit-explore`, but: (a) `submit-explore` requires an `explore-complete.md` file to exist in the epic directory (proven in `createMinimalFixture` which writes this file before calling `submit-explore`), and (b) the plan doesn't specify the stdin payload `submit-explore` expects. Fix: reference the `createMinimalFixture` pattern (write `explore-complete.md`, then call `submit-explore` with appropriate stdin), or note that the implementer must check `submitExploreInputSchema` for the required payload shape.

### I7. Architecture-phase agent should write to CLI-managed paths, not temp dir
Source: software-architecture

The plan says agents write to a temp dir then submit, but `submit-architecture` expects content already at the CLI-managed location. The correct flow: (1) query `paths.architecture` from the `start-architecture` response, (2) pass that path to the architecture-phase agent as write destination, (3) agent writes directly there, (4) `submit-architecture` triggers the state transition. This matches how plan-slice works.

## MINOR Issues

### M1. Phase 4 before-check agent count says 10, actual is 7
Source: holistic

The `agents/` directory currently has 7 agents, not 10. The before-count should be 7, making the after-count 13 (7 + 3 phase agents + 3 reviewers).

### M2. Phase 3/4 refinement loops don't specify `review_context` values
Source: holistic

Phase 4 reviewers should get `review_context: "architecture-proposal"`, Phase 6 reviewers should get `review_context: "slice-definitions"`.

### M3. `reviewers-language.md` extraction mechanism is ambiguous
Source: software-architecture

The task says "extract and adapt" but should be explicit: read installed file at the plugin cache path, extract the "TypeScript and JavaScript Reviewer" section, adapt for agent-based format, write to `skills/_shared/references/review-typescript.md`.

### M4. Explore-phase trade-off note lacks improvement mechanism
Source: software-architecture

The "Known trade-off" about losing parallel research should note the specific future improvement path: orchestrator spawns multiple research agents in parallel, passing topics from the explore-phase agent's return.

### M5. Phase 5 re-entry test could reuse `createMinimalFixture` with `activateEpic: false`
Source: holistic

The re-entry test (which needs an epic at a specific status) could use `createMinimalFixture` with `activateEpic: false` to get a project + epic in `created` status, then advance manually — reducing boilerplate.

### M6. Architecture Q&A deep pass lacks iteration limits for large projects
Source: agent-skill

For projects with 6+ subsystems, the deep pass (2-3 questions per subsystem) could produce 12-18 questions. Add a total question cap or note: "cap deep pass at 3 subsystems; remaining get 1 question each" or "total Q&A under 15 questions."

### M7. WebSearch tool availability is runtime-dependent
Source: agent-skill

Phase 1 explore-phase agent lists WebSearch, but availability depends on runtime config. Should note graceful degradation: "WebSearch if available; fall back to codebase exploration and Context7 MCP."

### M8. Plugin namespace transform (`create-epic` -> `gp:create-epic`) should be noted
Source: agent-skill

Source SKILL.md has `name: create-epic` but dist has `name: gp:create-epic`. Add a brief note explaining the namespacing transform to prevent implementer confusion.

### M9. Verified CLI note can be resolved
Source: holistic

The plan's bottom note "Verify `gp epic:refine-slices` exists" is confirmed — the command exists at `src/commands/epic/refine-slices.ts` with precondition `slices-defined`. Mark as resolved.

## Scores
| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 8/10 | 0 | 2 | 4 |
| software-architecture | 8/10 | 0 | 3 | 4 |
| agent-skill | 7/10 | 0 | 4 | 3 |

## Merged Totals (deduplicated)
- Critical: 0
- Important: 7
- Minor: 9
