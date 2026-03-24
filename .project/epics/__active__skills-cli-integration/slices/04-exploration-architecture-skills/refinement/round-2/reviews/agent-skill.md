# Agent Skill Review — Round 2

## Issues

**[IMPORTANT]** create-architecture missing `start-architecture` context bundling for sub-agents
The plan's Phase 2 task for create-architecture says "Conventions research sub-agent stays as regular Agent tool call (one-off research, not CLI context bundling)." However, `start-architecture` exists as a CLI command (`src/commands/subagent/start-architecture.ts`) and is the correct way for sub-agents to get context during the architecture phase. The conventions research sub-agent (Step 4.1) is indeed a one-off web research agent that doesn't need epic context, so excluding it is correct. But the plan doesn't address whether ANY sub-agents in create-architecture should use `start-architecture`. Currently, create-architecture doesn't spawn sub-agents that need project/epic context (the research sub-agent searches the web for library versions), so the plan's approach is defensible. However, this should be explicitly stated: "No sub-agents in create-architecture need `start-architecture` context bundling — the conventions research sub-agent (Step 4.1) does web research only, and all other work is orchestrator-level." Without this note, an implementer might wonder whether they missed something.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** refine-architecture resume detection: plan conflates two different activity-log files
Phase 3 says "Replace `activity-log.jsonl` resume detection with `goodplan status --json` or `epic:show --json` to check current status." The current skill's resume detection (Step 0, sub-step 5) reads `$SCOPE_ROOT/architecture-refining/activity-log.jsonl` — this is a **skill-local** run log inside the refining working directory, NOT the project-level `.project/activity-log.jsonl`. The CLI status check (`epic:show --json` returning `refining-architecture`) only tells you the epic is in the refining phase, not which iteration you're on or whether the previous run completed. The plan should specify: (a) use `epic:show --json` to check if status is `refining-architecture` (confirms we're mid-refine), AND (b) the skill's local `architecture-refining/` directory still exists with round files — detect resume from the directory structure (count round directories, read last merged.md). The skill-local activity-log.jsonl was just a convenience — the round directory structure itself provides the same information. Explicitly state that the skill-local activity-log.jsonl write in `architecture-refining/` is eliminated and resume detection uses directory structure inspection instead.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** create-architecture: multiple reference files with `state.md` patterns not inventoried
The plan's Phase 2 tasks specify updating `create-architecture/references/guidance.md` lines 56-63 (Early Stop section). This is correct — those lines reference `state.md` and `activity-log.jsonl`. However, the SKILL.md itself has extensive `state.md`/`activity-log.jsonl` references beyond what the plan lists. The plan says "Rewrite `skills/create-architecture/SKILL.md`" with several bullet points, but the SKILL.md has at least 15 distinct `state.md`/`activity-log.jsonl`/`state-and-activity-formats.md` references across Steps 0, 8e (6 graceful stop scenarios each with their own state.md and activity-log.jsonl instructions), 10, and the References section. The plan should acknowledge the scale of rewriting needed in the SKILL.md — a bullet saying "Replace state.md/activity-log.jsonl writes" undersells 15+ distinct locations across 6 graceful stop scenarios, the normal completion path, and the scope resolution logic. Suggest adding: "Note: create-architecture has the highest density of state.md/activity-log.jsonl references (~15 locations including 6 graceful stop scenarios). The graceful stop redesign (I3 from round 1) subsumes most of these."
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** explore skill: plan doesn't address `state.md` scope resolution in Step 2
The current explore SKILL.md Step 2 ("If no argument was passed") reads `.project/state.md` for scope resolution — checking Work Stack top, Active Slice, and falling through to project level. The plan says "Replace state.md scope resolution with `goodplan status --json`" but doesn't specify how the `status --json` output maps to the old state.md fields. Specifically: (a) Work Stack — does `status --json` expose a work stack? (b) Active Slice — what JSON path in `status --json` maps to this? (c) Epic state check (is it "Ready for exploration" or "Exploring") — what JSON path? The plan should specify the exact JSON paths the skill will read from `status --json` to replace each state.md field lookup, or explicitly note which scope resolution paths are dropped vs preserved.
Resolution: CODEBASE_EXPLORATION
Research: Check `goodplan status --json` output shape — specifically whether it includes work stack, active slice, and epic status fields. Check `src/commands/global/status.ts` and the status assembler for output schema.

---

**[MINOR]** audit-architecture: plan says "Replace state.md reads" but audit never reads state.md
Looking at the current `skills/audit-architecture/SKILL.md`, Step 1 does NOT read state.md. It uses `ls -d .project/epics/__active__*/` for path resolution (Step 1a) and reads `activity-log.jsonl` for context (Step 1 sub-step 5). The plan's task "Replace state.md reads with `goodplan status --json` and `epic:show --json`" is partially misleading — the `status --json` replacement is for the `ls -d __active__` detection (which is file-existence-based, not state.md-based), and `epic:show --json` is for getting epic details. The `activity-log.jsonl` read replacement is covered by the separate task. Suggest rewording: "Replace `ls -d .project/epics/__active__*/` active epic detection with `goodplan status --json` -> `.activeEpic`" to be precise about what's actually being replaced.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 and Phase 3: `ls -d .project/epics/__active__*/` pattern not called out for refine-architecture
The plan mentions replacing `ls -d __active__` for create-architecture (round 1 M4 fix) but refine-architecture SKILL.md also uses this pattern in Step 0a. The plan's Phase 3 tasks don't explicitly call out this replacement for refine-architecture. The general "Rewrite SKILL.md" task would implicitly cover it, but given that the round-1 merged feedback explicitly added a task for create-architecture's `ls -d`, the same should be explicit for refine-architecture.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** refine-architecture: `$SCOPE_ROOT/architecture-refining/` working directory management not addressed
The current skill creates `$SCOPE_ROOT/architecture-refining/` for round directories, merged feedback, and a local activity-log. The plan says the skill "creates its own `-refining` working copy of architecture files" (which is correct), but doesn't address what happens to the run directory management. The current skill uses `mkdir -p "$SCOPE_ROOT/architecture-refining/"` — per cli-interaction.md section 3 ("Use `mkdir` to create `.project/` subdirectories" is prohibited for CLI-owned dirs but OK for skill-owned working dirs). The plan should explicitly note that `architecture-refining/` is a skill-owned working directory (like `completion/` in slice 03), so `mkdir -p` is retained.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification approach: Phase 4 smoke test doesn't exercise `start-*` context bundling
The smoke test (Phase 4) exercises the lifecycle commands (`epic:explore`, `submit-explore`, etc.) but doesn't test any `start-*` commands. Since three of the four skills (explore, create-architecture concept unused, refine-architecture) use `start-*` for sub-agent context bundling, the smoke test should include at least one `start-*` invocation (e.g., `goodplan start-explore --epic smoke --inline`) to verify context bundle assembly works.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** explore skill: `decision:create` payload construction not specified
The plan says "Replace `mkdir -p .project/decisions/` with `decision:create --json` — stdin payload: `{ id: string, domain: string, title: string, summary: string }`." This is good — the R2 research confirmed the command exists. But the plan doesn't specify how the explore skill's interactive decision-recording flow constructs this payload. Currently the skill asks the user for decisions interactively (Step 4b2) and writes directly. The migrated version needs to: (a) construct the JSON payload from the user's input, (b) derive `id` (kebab-case slug), `domain` (from exploration context), `title`, and `summary` fields, (c) pipe to `decision:create --json`. A brief note on payload construction would prevent ambiguity during implementation.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Significant improvement from round 1 (5/10). The plan now correctly handles start-epic retirement, skip flows, non-epic scope loss, audit provenance loss, and smoke test lifecycle. The remaining issues are mostly about precision: the refine-architecture resume detection conflation (IMPORTANT), the explore scope resolution mapping gap (IMPORTANT), and create-architecture rewrite scale acknowledgment (IMPORTANT). None are structural — they're about making the plan unambiguous enough for an implementer to execute without guessing. To reach 9+: resolve the three IMPORTANT items (especially the resume detection conflation and scope resolution mapping), and add the MINOR clarifications about skill-owned working directories and start-* smoke testing.

## Summary
- Critical: 0
- Important: 4
- Minor: 5
