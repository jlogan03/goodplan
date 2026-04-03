# Holistic Review — Create-Epic Pipeline

## Issues

**[IMPORTANT] Phase detection table in conventions.md is incomplete — plan references it for re-entry but it omits refinement statuses**
The plan's Phase 3 re-entry protocol says to "map status to pipeline phase (see conventions.md phase detection table)." However, the conventions.md phase detection table (lines 119-128) only lists statuses through `slices-defined` and `activated` — it completely omits `refining-architecture`, `architecture-refined`, `refining-slices`, and `slices-refined`. These statuses DO exist in the transition tables and the plan's own phase table correctly uses them. The plan should either: (a) add a task to update conventions.md with the missing refinement statuses, or (b) include the complete status-to-phase mapping inline in the SKILL.md rather than referencing the incomplete conventions doc.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `reviewers-language.md` source location is ambiguous — research already flagged this**
Phase 2, Task 1 says to source TypeScript reviewer content from "existing `reviewers-language.md` section 'TypeScript and JavaScript Reviewer' in the installed refine-plan skill." The file exists at `/Users/iwhite/.claude/plugins/cache/goodplan-marketplace/goodplan/1.0.3/skills/refine-plan/references/reviewers-language.md` but NOT in the repo's `skills/_shared/references/`. The research file flagged this as Discrepancy #1. The plan should clarify the exact source path and note that the implementer must read from the installed plugin cache (since the repo doesn't have this file). Alternatively, add a preceding task to copy the relevant section into the repo first.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4 hardcodes architecture path instead of using CLI response field**
Phase 4 task says "Copy architecture files from temp dir to `.goodplan/epics/<name>/architecture/`." The research file (Discrepancy #2) notes that `epic:define-architecture` response includes a `paths.architecture` field. The plan should use this field rather than hardcoding the path convention, consistent with how plan-slice uses CLI response fields for path resolution. This makes the orchestrator resilient to future path convention changes.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] No version check step in the orchestrator**
The plan-slice orchestrator (proven pattern) has an explicit "Step 0 — Version Check" that validates the CLI binary exists and satisfies `requires: gp >= 1.0.0`. The existing create-epic skill also has a version check (Step 1). The plan's Phase 3 tasks do not include a version check step for the new SKILL.md. This is a required pattern per the established skill conventions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Explore-phase agent missing parallel research sub-agent cap**
Phase 1 task for `explore-phase.md` includes a tool note "No sub-agent spawning (disallowedTools: Agent)" but the research notes that the existing explore skill "uses sub-agents for parallel research (cap at 5)." If the explore-phase agent cannot spawn sub-agents, it loses the parallel research capability of the current explore skill. The plan should either: (a) allow Agent tool for explore-phase (with a cap) and update the tool note, or (b) explicitly acknowledge this as a deliberate simplification with rationale.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6 missing `--epic` flag on `gp slice:create`**
Phase 6 task says: `gp slice:create --epic <name> --json` for each slice with stdin `{"name":"<name>","goal":"<goal>"}`. The command syntax is correct, but the task description earlier says "Create slices via CLI: `gp slice:create --epic <name> --json` for each slice" — this is fine. However, the `gp epic:refine-slices` command referenced later is not shown in the verified CLI command surface in the research file. The research lists `epic:refine-slices` under subagent commands as `start-refine-slices` / `submit-refine-slices` but does not list `epic:refine-slices` as a separate command. Verify this command actually exists.
Resolution: CODEBASE_EXPLORATION

**[MINOR] Conventions.md phase detection table should be updated as part of this slice**
The conventions.md table is authoritative reference for all orchestrators. Since this plan builds the most complex orchestrator (6 phases with refinement loops), it should include a task to update the phase detection table with the complete set of epic statuses including refinement phases. This benefits both this slice and future maintenance.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No documentation update tasks**
The plan does not include tasks for updating documentation beyond the CLAUDE.md test harness table (Phase 5). The new pipeline orchestrator is a significant capability change. At minimum, the plan should note that documentation updates (architecture docs, skill inventory) are tracked in the epic's final slice per the epic architecture's "Post-Migration Documentation Updates" section — or add a lightweight task to update the skill description in any relevant index.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Test harness does not verify PARTIAL handling for architecture/slices phases**
Phase 5 tests cover the full pipeline, re-entry, and `reconsiderWhen` conditions. But PARTIAL handling (questions + research topics from sub-agents) is a core feature of the orchestrator described in Phase 3. There is no test that exercises PARTIAL returns from architecture-phase or slices-phase agents. The explore-phase PARTIAL is tested implicitly (user-controlled exit), but the general PARTIAL protocol for other phases lacks coverage.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No explicit error/recovery test for sub-agent FAILED status**
Phase 3 describes handling FAILED sub-agent returns ("surfaces the error to the user"), but Phase 5 has no test for this path. A negative test where a sub-agent returns FAILED would verify the orchestrator's error handling.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10
The plan is well-structured with clear phasing, good reuse of the proven plan-slice pattern, and thorough verification steps. The phase ordering is logical and dependencies are clear. However, there are several IMPORTANT issues: the conventions.md phase detection table gap creates a real risk of incorrect re-entry behavior if the implementer follows the reference literally; the missing version check breaks an established pattern; the explore-phase sub-agent restriction removes existing capability without acknowledgment; and the hardcoded architecture path ignores a CLI-provided field. Fixing the 5 IMPORTANT issues and the actionable MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 5
