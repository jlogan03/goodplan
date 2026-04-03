# Software Architecture Review — Create-Epic Pipeline (R3)

## Issues

**[IMPORTANT] Phase 4 references `response.paths.architecture` from `start-architecture`, but `start-architecture` returns a `ContextBundle` (no `paths` field)**

The plan says in Phase 4: "Get architecture output path from `start-architecture` response: `response.paths.architecture`". However, `start-architecture` is a `start-*` sub-agent command that returns a `ContextBundle` (`{ inline, references, decisions, learnings }`). The `paths` field exists on `BeginResult` (returned by mutation commands like `gp epic:define-architecture`), not on context bundles.

The architecture output directory path should come from the `gp epic:define-architecture` call in Phase 3 (which returns `BeginResult` with `paths?.architecture`), or the orchestrator should compute it from CLI conventions. The plan already calls `gp epic:define-architecture --epic <name> --json` in Phase 3 -- its `paths.architecture` response field is where the architecture directory path should be captured and carried forward to Phase 4.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3 status table says `explored` -> `defining-architecture` but the Phase 3 task says the transition command is `gp epic:define-architecture --epic <name> --json`; meanwhile the plan also references `start-architecture` as a context loader -- the ordering and role separation is ambiguous**

Phase 3 description says it is "Interactive -- architecture Q&A" and the task says: "Transition: `gp epic:define-architecture --epic <name> --json` (`explored` -> `defining-architecture`)" followed by "Load context bundle via `gp start-architecture --epic <name> --json`". The state transition must happen before loading context (since `start-architecture` is read-only and doesn't change status). But the plan lists the context load *after* the transition, which is correct in sequencing but then says Phase 4 should get `paths.architecture` from `start-architecture` (wrong source, as noted above).

Clarify in Phase 3 that `gp epic:define-architecture` returns a `BeginResult` including `paths.architecture` (the absolute filesystem path to the architecture directory), and Phase 4 should use this stored path -- not re-derive it from `start-architecture`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Context discipline exception for file copying uses Read+Write but plan says to avoid this**

Phase 3 task on context discipline says: "Exception: the orchestrator may use Write to copy agent-produced files to CLI-designated paths (file copying doesn't require reading content into the orchestrator's context -- use shell `cp` or CLI commands, not Read+Write)." This is internally contradictory: it says "may use Write" but then says "use shell `cp` or CLI commands, not Read+Write." The parenthetical corrects the main clause but the main clause is misleading.

Rewrite to unambiguously say: "For file copying between temp dir and CLI-designated paths, use shell `cp` via Bash tool -- never Read+Write, which would pull artifact content into orchestrator context."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 explore-phase PARTIAL protocol duplicates info already in Phase 1 agent definition**

Phase 1 (agent definitions) thoroughly describes the explore-phase PARTIAL cycle (orchestrator presents findings, asks user, re-spawns with "finalize" instruction). Phase 3 (orchestrator) also describes PARTIAL handling generically in its own task bullet. The Phase 2 orchestrator task should reference the explore-phase-specific protocol from Phase 1 rather than restating the generic PARTIAL pattern, since explore uses a custom variant (user-controlled exit with "finalize" re-spawn, not the standard questions/researchTopics PARTIAL).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Available reviewer list for architecture refinement is not specified**

The plan says Phase 4's refinement loop spawns a refinement-coordinator which selects reviewers, but does not specify which reviewer names to pass as `availableReviewers` for architecture review context. Plan-slice's orchestrator explicitly passes `["reviewer-holistic", "reviewer-software-architecture", "reviewer-agent-skill"]`. Phase 4 should specify the available set (likely the full 6: holistic, software-architecture, agent-skill from slice 02, plus typescript, tui-cli, repo-tooling from Phase 2 of this plan). Same applies to the Phase 6 slices refinement loop.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `submit-explore` stdin handling is inconsistent between plan and test**

Phase 5 (test harness) says: "`echo '' | gp submit-explore --epic <name> --json` (empty stdin, not JSON -- CLI expects no payload). Check `submitExploreInputSchema` if this fails." But the plan's Phase 2 orchestrator task doesn't mention what stdin (if any) `submit-explore` expects. If the CLI expects no stdin payload for `submit-explore`, the orchestrator Phase 2 should note this explicitly to avoid implementers passing JSON.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase count in overview vs phase table is inconsistent -- overview says "6-phase pipeline" but phase table has 5 implementation phases**

The overview says "Build `/gp:create-epic` as a 6-phase pipeline orchestrator" and the Phase 3 task describes 6 pipeline phases (goal capture, explore, architecture Q&A, architecture draft+refine, slices Q&A, slices draft+refine). But the *implementation plan's* phase table lists only 5 phases (Phase Agents, Additional Reviewers, Create-Epic Orchestrator, Build Pipeline Update, Test Harness). This is not actually a bug -- the "6 phases" refers to the pipeline's runtime phases, while the 5 phases are implementation phases. But the distinction could confuse an implementer. Consider adding a brief clarification in the overview: "6 runtime pipeline phases, implemented across 5 plan phases."

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid architectural plan that correctly follows the proven orchestrator pattern from plan-slice, with appropriate status mapping and layering. The major issues are the `paths.architecture` source confusion (referencing the wrong command's response type) and the ambiguity in how the architecture output directory is communicated from Phase 3 to Phase 4. These are directly actionable and do not require design rethinking. To reach 9+: fix the `paths` source, clarify the file-copying discipline statement, and specify available reviewer sets for each refinement loop.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
