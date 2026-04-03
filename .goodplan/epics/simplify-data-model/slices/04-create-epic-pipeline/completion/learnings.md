# Learnings: 04-create-epic-pipeline

## ContextBundle has no `paths` field -- derive filesystem paths from conventions or mutation responses
_Source: 04-create-epic-pipeline_

The `start-*` context bundling commands return `ContextBundle` with `{ inline, references, decisions, learnings }` -- no `paths` field. Filesystem paths (e.g., architecture output directory) come from mutation commands like `gp epic:define-architecture` which return `BeginResult` with `paths`. Three refinement rounds surfaced this confusion before the plan correctly separated "context loading" (read-only `start-*`) from "path discovery" (mutation responses or convention-derived paths). When the CLI doesn't return a path, derive it from the epic name convention rather than hardcoding.

## Refinement loop exit logic belongs in the CLI -- orchestrators check `response.advanced`
_Source: 04-create-epic-pipeline_

Early plan versions duplicated score-threshold and round-cap logic from the CLI's `evaluateRefinement()` into the orchestrator. Reviewers correctly identified this as a maintenance risk. The proven pattern: submit scores, check `response.advanced` (boolean) to decide continue/stop. The orchestrator owns one gate the CLI cannot: a pre-submit check for CRITICAL/IMPORTANT issues in merged feedback (the CLI only sees numeric scores). For stagnation, the orchestrator uses `--override` to force exit. This division of responsibility -- CLI owns numeric thresholds, orchestrator owns semantic quality gates -- should apply to all future pipeline skills.

## 6-phase orchestrator scales from 2-phase PoC with explicit pattern referencing
_Source: 04-create-epic-pipeline_

The plan-slice 2-phase orchestrator pattern (slice 02) successfully scaled to create-epic's 6-phase pipeline. The key enabler was explicitly referencing plan-slice steps (e.g., "steps 4f-i through 4f-vi") and noting only intentional deviations (different env var, lower iteration cap). Early plan versions tried to re-specify the refinement loop from scratch, leading to divergence and reviewer confusion. Explicit cross-referencing to the proven pattern kept the plan tight and reduced review cycles.

## Compose-via-@-reference scales to 13 agents but reviewer extraction needs a source audit
_Source: 04-create-epic-pipeline_

Creating 13 agent definitions (7 prior + 3 phase agents + 3 reviewers) using `@${CLAUDE_PLUGIN_ROOT}/...` references for shared content worked well. Each reviewer agent is under 50 lines -- just frontmatter + preamble reference + domain reference. However, round 1 surfaced that the plan referenced a nonexistent `reviewers-language.md` for TypeScript reviewer source material. The file existed only in the installed plugin cache, not the repo. Lesson: when extracting reviewer domains from monolithic reference files into standalone per-domain files, verify the source file location exists in the repo -- not just in an installed/cached copy.

## Agent definitions that lose sub-agent parallelism need explicit trade-off documentation
_Source: 04-create-epic-pipeline_

The explore-phase agent cannot spawn sub-agents (flat agent hierarchy -- agents don't spawn agents), losing the parallel research capability of the original explore skill (which spawned up to 5 concurrent research sub-agents). Round 1 reviewers flagged this as a significant regression. The plan resolved it by: (1) documenting the trade-off explicitly in the agent definition, (2) noting the future improvement path (orchestrator spawns multiple research agents in parallel), and (3) accepting sequential research as acceptable for the initial version. Undocumented capability regressions during consolidation cause repeated reviewer friction.

## Test harness for 6-phase pipelines: fixture setup is the hard part
_Source: 04-create-epic-pipeline_

The test harness (847 lines) follows the test-plan-slice.ts pattern but the re-entry test exposed fixture complexity. Advancing an epic to a specific status (e.g., `explored`) requires writing prerequisite artifacts (like `explore-complete.md`) before calling CLI transition commands -- the CLI validates artifact presence. Three refinement rounds were needed to nail down: (a) which artifacts each status transition requires, (b) the correct stdin format for `submit-explore` (empty, not JSON), and (c) that `createMinimalFixture` with `activateEpic: false` gives the right starting state. Future multi-phase pipeline tests should document the exact artifact+command sequence for each fixture status.

## Client-side filtering needed when CLI commands lack entity-scoped flags
_Source: 04-create-epic-pipeline_

`gp decision:list` and `gp learning:list` have no `--epic` flag. The plan initially assumed `--epic` existed; round 2 caught this. The workaround is: call the unfiltered command, filter client-side by `entityPath` prefix `epics/<name>`. This pattern (broad CLI query + client-side filtering) is acceptable for low-cardinality entities like decisions and learnings, but would be a performance problem at scale. Worth tracking as a CLI enhancement opportunity.

## Plan phase count vs pipeline phase count causes persistent reviewer confusion
_Source: 04-create-epic-pipeline_

The plan has 5 implementation phases that produce a 6-phase runtime pipeline. Every refinement round had at least one reviewer flag this as confusing. The fix is simple: state it explicitly in the overview ("5 implementation phases produce a 6-phase pipeline"). This distinction between "phases of the plan" and "phases of the thing being built" will recur in create-side-quest (slice 05) and should be addressed upfront.
