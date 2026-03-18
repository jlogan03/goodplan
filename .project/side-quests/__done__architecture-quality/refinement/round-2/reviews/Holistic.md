## Issues

**[IMPORTANT]** Phase 4 iteration loop extraction task is underspecified — no content outline for the shared file
Phase 4 includes a task to "Create or extend `~/.claude/skills/_shared/references/iteration-loop.md`" extracting the shared iteration loop skeleton from refine-plan. But the task doesn't specify what content goes in that file vs what stays skill-specific. The task says "spawn reviewers -> synthesize -> edit -> check exit criteria" but the actual refine-plan SKILL.md Step 3 has significant orchestration detail (run directory setup, reviewer bootstrap assembly, synthesis prompt, editor invocation, exit logic with score thresholds and iteration caps). Without specifying which parts are extracted vs referenced, the implementer must reverse-engineer refine-plan's Step 3 to decide the split — risking either too much extraction (breaking refine-plan) or too little (the shared file is useless). Add a bullet list of what the shared file covers (e.g., "run directory structure, reviewer spawn pattern, synthesis prompt skeleton, exit criteria evaluation") and what remains skill-specific (e.g., "editor prompt, reviewer selection, score thresholds, scope constraints").
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 consolidation task lacks migration safety for implement-plan's different framing
The plan correctly consolidates `reviewers-cross-cutting.md` to `_shared/references/`, but the two existing copies differ: refine-plan's version reviews "an implementation plan" while implement-plan's version reviews "a code implementation" (line 1 of each file's Software Architecture section). Simply replacing both with one shared file would either break plan review framing or code review framing. The task says "Update both refine-plan and implement-plan to reference the shared file" but doesn't address how framing differences are handled. The shared file needs a parameterized framing (e.g., `{review_target}` placeholder injected by each skill's bootstrap) or the per-skill framing must be injected separately. This is solvable but needs to be explicit in the task.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 design tree reference file task doesn't specify what stays in SKILL.md vs what moves to the reference
The task says "SKILL.md Steps 5 and 7 should contain a concise summary and reference this file for the full protocol." But the Step 5 and Step 7 task descriptions in the plan are themselves the detailed content (7 substeps each with full interaction guidance). The implementer must decide which substeps stay in SKILL.md as the "concise summary" vs which move to `design-tree.md`. Without guidance, the implementer might leave too much in SKILL.md (exceeding the 500-line limit the plan explicitly cites) or move too much out (making SKILL.md unreadable without the reference). Specify the split: e.g., "SKILL.md keeps the numbered substep titles and one-line descriptions; the reference file contains the detailed interaction protocol, progress display format, and stopping criteria."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 Step 4 conflates two different side quest types without distinguishing their scope
Step 4 says "For gaps (code doesn't match architecture): draft a side quest" and "For architecture improvements (target should change): first update the architecture files, then draft a side quest." Both produce side quests, but gap quests are implementation-only (bring code in line) while improvement quests involve architecture changes followed by implementation. The plan says to "Write approved side quests to `.project/side-quests/<name>/goal.md`" — but doesn't specify whether the goal.md format should distinguish these types. An implementer picking up a gap quest vs an improvement quest needs to know whether to run `/refine-architecture` first or go straight to `/create-plan`. Consider adding a `type: gap | improvement` field to the goal.md or noting the distinction in the goal text.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 Step 3 final verification ("compare refined vs original for goal drift") has no specified mechanism
The task says "Compare refined architecture against original to check for goal drift" but doesn't specify how. Is this a diff? A sub-agent comparison? A manual user review? For plans, refine-plan has an explicit Step 4 with diff generation and goal-alignment check. Phase 4 should specify the mechanism — at minimum, present a summary of what changed and ask the user to confirm the changes serve the verified goal from Step 1.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No graceful stop handling specified for Phase 5 (audit-architecture)
Phases 2-3 explicitly address graceful stop for define-architecture's new steps. Phase 4 mentions it in the verification section ("Graceful stop handling covers all states"). But Phase 5's audit-architecture has no graceful stop task or verification item. If the user stops mid-audit (e.g., after gap analysis but before side quest creation), the skill needs to write partial state. Add a graceful stop task to Phase 5 or note that audit-architecture runs to completion without intermediate state (and justify why).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 broad pass stopping criteria ("enough structure exists for design-it-twice") is subjective
Step 5.6 says "Stop when enough structure exists for design-it-twice: at minimum, subsystem boundaries, communication patterns, and key constraints must be resolved." The "at minimum" list is good, but "enough structure" beyond those three items is left to agent judgment. For a skill that will be executed by different agents across sessions, more concrete criteria would improve consistency. Consider: "Stop when subsystem boundaries, communication patterns, key constraints, and data ownership are all resolved. If the user expresses readiness, proceed even if secondary branches remain open."
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues were thoroughly addressed — reviewer consolidation, parallel sub-agents for audit, dry-run verification, frontmatter drafts, SKILL.md size management, and editor guardrails are all present. The plan is well-structured with clear phase ordering and each phase is independently testable. The remaining issues are mostly about implementation specificity: the iteration loop extraction needs a content outline, the reviewer consolidation needs a framing strategy for the two different review contexts (plan vs code), and the SKILL.md/reference-file split needs explicit guidance. These are all directly actionable and won't require restructuring. Addressing the 3 IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
