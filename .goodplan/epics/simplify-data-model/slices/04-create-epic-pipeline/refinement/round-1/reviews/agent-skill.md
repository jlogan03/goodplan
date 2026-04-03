# Agent Skill Review — Create-Epic Pipeline Plan

## Issues

**[CRITICAL]** Phase 2 references nonexistent `reviewers-language.md` for TypeScript reviewer source material
The plan says: "Source: adapt from existing `reviewers-language.md` section 'TypeScript and JavaScript Reviewer'." This file does NOT exist in the repo's `skills/_shared/references/`. It exists only in the installed plugin cache at `~/.claude/plugins/cache/goodplan-marketplace/goodplan/1.0.3/skills/refine-plan/references/reviewers-language.md`. The implementer would need to know to read from the installed cache, which violates the repo-as-source-of-truth convention. The plan should either: (a) reference the installed path explicitly with a note that this is a one-time extraction, or (b) point to `skills/refine-plan/references/reviewers-language.md` in the repo (which also doesn't exist — the repo's refine-plan skill references it but relies on the installed cache). The `reviewers-cross-cutting.md` in _shared/references/ (31KB) may or may not contain the TypeScript content — this needs clarification.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 3 architecture refinement loop uses wrong CLI command pattern
The plan says: "Per-round: `gp submit-refine-architecture --epic <name> --json` with scores." But the transition table shows that `submit-refine-architecture` triggers `COMPLETE_REFINE_ARCHITECTURE`, which either stays in `refining-architecture` (if scores below threshold) or transitions to `architecture-refined`. This means the orchestrator SKILL.md must handle the response to determine whether to continue looping or exit — similar to plan-slice's `submit-refinement`. The plan describes a "refinement loop: coordinator -> reviewers -> synthesis -> editor (same pattern as plan-slice)" but never specifies the per-round submit command semantics or how the loop reads the CLI response to know when to stop. The plan-slice orchestrator uses `submit-refinement` which has the same loop/exit behavior — the create-epic plan should explicitly mirror this pattern including response parsing (`thresholdMet`, `round`, `scores` fields).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 orchestrator missing `start-plan`-equivalent context bundling for architecture and slices phases
The plan-slice orchestrator uses `$GP start-plan --slice $SLICE_NAME --json` (Step 4a) to assemble a `ContextBundle` with inline content, references, decisions, and learnings. The create-epic plan has equivalent `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices` commands available (verified in `src/commands/subagent/`), but the plan says agents receive file paths assembled manually by the orchestrator. The research file flags this as a "discrepancy" but "consistent with plan-slice pattern." However, looking at plan-slice's SKILL.md, it DOES use `start-plan` for context bundling. The plan is inconsistent with the proven pattern. The orchestrator should use `$GP start-architecture`, `$GP start-slices`, etc. for context assembly.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 agents reference `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md` but plan doesn't verify this path resolves in the build
The Expected Behavior for Phase 1 says "Each references shared content via `@${CLAUDE_PLUGIN_ROOT}/...` (not `skills:` frontmatter)" and the tasks say "Inject shared content via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md`". This is correct for existing agents (reviewer-holistic, etc.). However, the plan doesn't mention verifying that `@` reference expansion works for agents in the `agents/` directory (as opposed to skills). The existing agents (reviewer-holistic.md, etc.) already use this pattern and it works in the build pipeline, so this is likely fine — but Phase 4 "Build Pipeline Update" should explicitly verify `@` reference resolution for the 3 new phase agents, not just the reviewers.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** explore-phase agent description omits parallel sub-agent research capability
The research file notes: "Key detail: explore skill uses sub-agents for parallel research (cap at 5) — the agent definition should preserve this." But the plan's explore-phase task says "Tool note: 'This agent has full tool access (Read, Grep, Glob, Write, WebSearch). No sub-agent spawning (disallowedTools: Agent).'" This means the agent CANNOT spawn parallel research sub-agents, which is a significant regression from the current explore skill's capability. The explore-phase agent is an autonomous agent spawned by the orchestrator — if it needs parallel research, either: (a) the orchestrator handles parallelism by spawning multiple explore-phase instances, or (b) the explore-phase agent gets Agent tool access (breaking flat hierarchy). The plan should document which approach is intended and why the regression is acceptable (or how it's compensated).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 SKILL.md frontmatter adds `user-invocable: true` — no existing skill uses this except plan-slice
The plan says to add `user-invocable: true` to the create-epic skill frontmatter. Only `plan-slice/SKILL.md` currently has this field. The current `create-epic/SKILL.md` does NOT have it and works fine as a user-invocable skill (it triggers via the `description` field, which is the standard agentskills.io mechanism). Unless `user-invocable` is consumed by the build pipeline or plugin runtime for a specific purpose, adding it is harmless but could create confusion about whether it's required. If it IS required for pipeline orchestrators specifically, the plan should explain why.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 test harness setup creates a bare project but test needs epic creation by the skill — insufficient fixture state specification
The plan says: "Setup: `createMinimalFixture()` with `activateEpic: false` (we're creating a NEW epic in this test, not planning a slice). Actually: create a bare project via `gp init`, no epic yet — the skill creates the epic." The `createMinimalFixture` utility (from test-plan-slice.ts) takes `epicName`, `sliceName`, etc. as parameters and creates a fixture with an epic already present. The plan needs to specify how to create a fixture WITHOUT an epic — either by extending `createMinimalFixture` with a `noEpic` option, or by calling `gp init` directly. The "Actually:" note suggests the author realized mid-writing that the fixture approach differs, but the task list still references `createMinimalFixture()`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6 creates slices via `gp slice:create` but `slice:create` requires `--epic` flag and an activated epic
The plan says: "Create slices via CLI: `gp slice:create --epic <name> --json` for each slice." The `slice:create` command requires `--epic` and the epic must be activated (per `createSliceInputSchema` and the `begin()` call). But at this point in the pipeline, the epic is in `slices-defined` status — not `activated`. Checking the transition table: `ACTIVATE_EPIC` requires `slices-refined` status AND verifications. The plan's Phase 6 creates slices BEFORE reaching `slices-refined`. This means `slice:create` may need the epic to be in an earlier-than-activated state. Need to verify that `slice:create`'s guard accepts the epic at `defining-slices` or `slices-defined` status.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 3 orchestrator Phase 4 description says "orchestrator may Write here since architecture files are the primary artifact" — breaks context discipline
The plan says the orchestrator can Write architecture files directly. The plan-slice orchestrator has strict context discipline ("You MUST NOT use the Read tool on architecture files, plan drafts, source code, or agent definitions"). If the create-epic orchestrator can Write architecture files, can it also Read them? The context discipline section should be explicit about Write exceptions and why they don't undermine the discipline.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 reviewer agents specify "Return review content inline — do not write files" but plan-slice pattern has orchestrator writing review files
This is consistent with the existing pattern (reviewer-holistic.md says the same), but the plan's Phase 2 Tasks say "Add tool restriction note to each: 'Read-only tools (Read, Grep, Glob). Return review content inline — do not write files.'" This is correct — just confirming the pattern is consistent. No action needed, but noting for completeness.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 re-entry test description is vague about fast-tracking to `explored` status
The plan says: "Create fixture with epic at `explored` status (use `createMinimalFixture` + fast-track to `explored`)." There's no existing utility for fast-tracking an epic to a specific status. The implementer would need to call `gp epic:create`, `gp epic:explore`, `gp submit-explore` in sequence (or use skip paths). The plan should specify the exact CLI commands to reach `explored`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has a solid high-level structure that correctly mirrors the proven plan-slice orchestrator pattern, and the phase table / status mapping aligns with the transition tables. However, there are two critical issues (nonexistent source file reference, under-specified refinement loop) and six important issues that would cause implementers to get stuck or produce incorrect behavior. The most concerning pattern is that the plan describes complex workflows ("same pattern as plan-slice") without actually specifying the details — the implementer would need to reverse-engineer plan-slice's SKILL.md to fill gaps. To reach 9+: fix the two critical issues, specify the context bundling commands (start-architecture, etc.), clarify explore-phase's parallel research story, detail the refinement loop's submit/response/exit pattern explicitly, and resolve the slice:create epic-activation question.

## Summary
- Critical: 2
- Important: 6
- Minor: 3
