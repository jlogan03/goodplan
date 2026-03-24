## Issues

**[IMPORTANT] refine-architecture resume detection uses a local activity-log.jsonl that the plan eliminates without replacement**

Phase 3 says to "Replace `activity-log.jsonl` resume detection with `goodplan status --json` or `epic:show --json` to check current status." However, the current resume detection (SKILL.md line 109) checks `$SCOPE_ROOT/architecture-refining/activity-log.jsonl` — this is a *local* activity-log in the refining working directory, not the project-level `.project/activity-log.jsonl`. It tracks iteration progress within a single refinement session, not epic lifecycle status.

Checking `epic:show --json` for `refining-architecture` status only tells you whether the epic is in the refinement phase — it does NOT tell you which iteration was last completed or whether to resume or start fresh. The plan conflates two different granularities of state: epic lifecycle status (CLI-owned) vs. iteration progress within a phase (skill-owned).

The local `architecture-refining/activity-log.jsonl` is an LLM artifact (like `completion/` logs), not a CLI-managed state file. It should be preserved as skill-owned, not eliminated.

Resolution: DIRECTLY_ACTIONABLE — Update Phase 3 to clarify: (1) the project-level `activity-log.jsonl` direct writes are eliminated (CLI handles via mutations); (2) the local `$SCOPE_ROOT/architecture-refining/activity-log.jsonl` is retained as a skill-owned iteration tracking artifact, same category as `completion/` directories; (3) resume detection uses `epic:show --json` for lifecycle status AND the local activity-log for iteration progress.

---

**[IMPORTANT] create-architecture graceful stop redesign underspecified — 6 scenarios need concrete CLI-based equivalents**

Phase 2 says "Design re-entry detection using `epic:show --json` status check for `defining-architecture` to detect resume, plus file existence checks." This addresses resume detection but not the 6 distinct graceful-stop scenarios in the current skill (guidance.md lines 56-63 and SKILL.md lines 205-209). Each currently writes different state.md content and conditionally appends to activity-log.jsonl.

In the CLI model, state transitions happen via `submit-architecture` — there's no mechanism for the skill to record partial progress to the CLI. The plan should explicitly specify:

- Scenarios (a) and (b): no CLI mutation (nothing to submit). Leave `defining-architecture` status as-is. Re-entry detected by `epic:show --json` returning `defining-architecture`.
- Scenarios (c)-(f): same — no CLI mutation until full completion. File existence checks determine what was written.
- The `"status":"started"` activity-log entries in scenarios (b)-(f) are simply dropped — the CLI already recorded the `BEGIN_ARCHITECTURE` transition when `epic:define-architecture` was called.

Without this mapping, the implementer will have to reverse-engineer each scenario.

Resolution: DIRECTLY_ACTIONABLE — Add a concrete mapping table to Phase 2 create-architecture tasks: for each of the 6 stop scenarios, specify (1) what CLI mutation occurs (if any), (2) what file existence signals resume, (3) what re-entry detection looks like. Reference the current scenario letters (a)-(f) from guidance.md.

---

**[IMPORTANT] explore skill's non-epic scope handling path is architecturally unclear — what happens to the skill's step flow?**

The plan says "For non-epic scopes (project, slice, quest), the exploration work itself still happens but formal state tracking is lost." This is sound as a high-level decision, but the plan doesn't specify how the *skill code path* changes. The current explore skill uses `state.md` for scope resolution (SKILL.md Step 2 lines 48-50: "Read `.project/state.md`. Determine scope using resolution order"). With state.md eliminated, how does the non-epic path resolve scope?

For epic scope: `goodplan status --json` -> `.activeEpic` gives the scope. For non-epic scopes: the user passes an argument (Step 2 "If an argument was passed" branch), so scope resolution from state.md is only needed for the "no argument" case. But the "no argument" case also uses the Work Stack from state.md, which is eliminated.

The plan should specify: for the "no argument" case, replace state.md Work Stack resolution with `goodplan status --json` -> check `.activeEpic`, `.activeSlice`, `.activeQuest` in priority order. If none active, ask the user for a scope argument.

Resolution: DIRECTLY_ACTIONABLE — Add explicit task to Phase 2 explore rewrite: "Replace Step 2 'no argument' scope resolution. Instead of reading state.md Work Stack, use `goodplan status --json` to check for active entities. Priority: activeSlice > activeQuest > activeEpic. If none active, prompt user for scope argument."

---

**[IMPORTANT] Phase 3 refine-architecture: `paths.architecture` return shape needs clarification against current skill's `$ARCH_DIR` resolution**

The plan says `epic:refine-architecture` returns `{ architecture: "<path>" }` and "Use this CLI-provided path for the source architecture." But the current skill (SKILL.md lines 65-79) has a dual-path resolution: active epic uses epic architecture dir, no active epic falls back to `.project/architecture/`. The CLI command only accepts `--epic` — there's no project-scope path for refine-architecture.

The plan should clarify: after migration, refine-architecture is epic-only (since the CLI command requires `--epic`). The project-level fallback (`$ARCH_DIR = .project/architecture/`) is lost. Is this acceptable? The skill description says "Falls back to `.project/architecture/` for side quests and project-level work" — this functionality would be eliminated.

If project-level refinement is still needed, it can't go through the CLI. If it's not needed (all architecture refinement happens at epic scope), the skill description and documentation should be updated.

Resolution: USER_INPUT — Decide whether project-level architecture refinement (no active epic) should be preserved. If yes, the skill needs a dual path: CLI-based for epic scope, direct filesystem for project scope. If no, update the skill description to reflect epic-only scope.

---

**[MINOR] Phase 1 audit-architecture activity-log query assumes jq availability via `--query` flag**

The plan specifies `goodplan state --json --query '[.["activity-log.jsonl"][] | select(.scope | startswith("epics/<name>"))] | .[-20:]'`. The `--query` flag uses `@michaelhomer/jqjs` (per architecture overview), which is built into the CLI binary. This is fine architecturally — just noting that the query is correct and the scope-filtering from round 1 (I8) was properly incorporated. No issue here, but the query complexity is high for an LLM to reliably produce — consider whether a dedicated `activity-log:show --epic <name> --limit 20 --json` command would be simpler. This is a future ergonomic improvement, not a blocker.

Resolution: DIRECTLY_ACTIONABLE — Add a note to Phase 1: "The jq query for activity-log filtering is complex. If the implementer finds it error-prone, consider a follow-up to add a dedicated activity-log query command."

---

**[MINOR] Phase 2 explore: `decision:create` stdin payload construction not specified in skill flow**

The plan says "Replace `mkdir -p .project/decisions/` with `decision:create --json` — stdin payload: `{ id: string, domain: string, title: string, summary: string }`." Research R2 confirms the command exists. However, the plan doesn't specify where in the explore skill's flow this is called or how the interactive decision-recording session constructs the payload. The current skill presumably uses direct filesystem writes after the brainstorm/research loop. The plan should add a brief note: "After the user confirms a decision during exploration, construct the payload from the discussion and pipe to `echo '<json>' | goodplan decision:create --json`."

Resolution: DIRECTLY_ACTIONABLE — Add a brief note to the explore rewrite task specifying when and how `decision:create` is invoked in the skill flow.

---

**[MINOR] Phase 4 smoke test: `submit-architecture` expected stdin payload not specified**

Step 6 says `goodplan submit-architecture --epic smoke --json` with "(expected stdin payload: architecture content)". But looking at the actual command flow — `submit-architecture` triggers `COMPLETE_ARCHITECTURE`, and the architecture content is already on disk (written by the LLM into `paths.architecture`). The `submit-explore` command similarly needs no stdin. Verify whether `submit-architecture` actually needs stdin or if it's a no-content-required completion signal like `submit-explore`.

Resolution: CODEBASE_EXPLORATION — Check `src/commands/subagent/submit-architecture.ts` and `src/schemas/commands/submit.ts` for the `submitArchitectureInputSchema` to confirm whether stdin is required.

## Score: 7/10

Significant improvement from round 1 (was 4/10). The start-epic retirement, non-epic scope handling decision, skip flow clarification, and smoke test lifecycle steps all address round 1's critical gaps. However, two important architectural concerns remain: (1) the conflation of skill-owned iteration tracking with CLI-owned lifecycle state in refine-architecture resume detection, and (2) the underspecified create-architecture graceful-stop mapping. Both are resolvable without structural changes — they need concrete specification. The non-epic scope resolution path and refine-architecture project-level fallback need explicit handling. To reach 9+: resolve the resume detection conflation, provide concrete graceful-stop scenario mappings, specify non-epic scope resolution, and clarify refine-architecture scope limitations.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
