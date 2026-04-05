# Software Architecture Review — Slice 08 Documentation Plan (Round 2)

## Issues

**[IMPORTANT]** Phase 1 start-epic rewrite does not address architecture-proposal promotion — CLI `epic:activate` does not handle it
Round 1 flagged this as CODEBASE_EXPLORATION. The research file (`cli-commands-research.md`) confirms: "epic:activate does NOT copy/move architecture-proposal/ to architecture/. The handleActivateEpic function only sets epic status from slices-refined -> activated and sets project.activeEpic. No filesystem directory manipulation." The plan's rewrite removes all the current skill's architecture directory creation logic (Step 5c) and replaces it with a bare `gp epic:activate --epic <name> --json` call. But the CLI does not perform architecture promotion. The current start-epic SKILL.md creates `architecture/` from `architecture-proposal/` (Step 5c) — this is critical functionality. However, by this point in the simplify-data-model epic, the architecture-proposal workflow has been replaced by the create-epic pipeline which writes architecture directly (not via proposal). The plan's confirmed goal is for the 12-skill model where start-epic activates epics created by `/gp:create-epic`. In that model, `architecture/` already exists at activation time (created by the architecture phase of the create-epic pipeline). The plan should explicitly state this assumption — that architecture already exists when start-epic runs — and add a pre-activation check (e.g., verify `architecture/_overview.md` exists via CLI or `stat`) so the skill fails fast with a helpful message if this assumption is violated, rather than silently activating an epic with no architecture.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 Bug C verification validation lacks specificity on the agent's assessment mechanism
The plan says: "add a step where the agent reads the epic's verification criteria (from `gp epic:show --json`) and independently assesses whether each criterion is met." But the complete-epic orchestrator has Context Discipline constraints — it must not read architecture files, learnings, source code, etc. The "independent assessment" of verification criteria requires reading artifacts (e.g., checking test results, examining code changes). This assessment already happens inside the completion-epic sub-agent (Step 4). The plan should clarify: does "independently assesses" mean the orchestrator spawns a new sub-agent specifically for verification assessment, or does it mean the completion-epic agent's return value should include verification assessments? The latter would be consistent with the existing architecture (the agent already reads all the artifacts). If a new agent is needed, it should be specified. If the existing agent should return verification data, the agent's task prompt in Step 4e should be updated to request it.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 wrong-status remedies reference skills that may not exist for all epic statuses
Step 2 maps wrong-status cases to remedies: `created` or `explored` -> "run `/gp:create-epic`", `slices-defined` -> "run `/gp:refine-slices` (or `/gp:create-epic`)". The `slices-defined` remedy is correct. But for `created`, telling the user to "run `/gp:create-epic`" is misleading — `/gp:create-epic` creates *new* epics (or re-enters an existing epic's pipeline). The correct guidance for a `created` epic depends on what state it's in: if it needs exploration, the user should run `/gp:explore`; if it needs architecture, `/gp:create-epic` with the epic name could re-enter. The plan should either: (a) use `gp epic:show --json` to check nextCommands and surface those, or (b) provide more precise per-status guidance rather than a blanket "run /gp:create-epic". The `explored` status remedy has the same issue.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Bug A learningInputSchema format includes `validUntil` but plan omits it
The plan specifies the learningInputSchema as: `{ category, summary, detail, tags, rollupTo }`. The actual schema (confirmed in research and source code at `src/schemas/records/learning.ts`) also includes `validUntil: Array<string> (optional)`. While optional, the plan's explicit listing of the schema fields creates a false impression of completeness. Either include `validUntil` in the plan's schema listing with an `(optional)` annotation, or remove the inline schema definition and reference the CLI schema command instead.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 architecture overview update scope remains ambiguous after Round 1 fix
Round 1 flagged that the top-level `_overview.md` describes CLI subsystems, not skills. The plan now says "Clarify scope: this is the top-level CLI subsystem overview, not a per-skill breakdown." This is good. But the task still says "Update skill count to 12" and "Add agents/ as a described component (34 agent definitions)." The top-level architecture overview describes the 4-layer CLI stack (Commands, RPC, State Machine, Data Layer). Skills and agents are not CLI subsystems — they are plugin-level concerns described in the epic architecture. Adding them to the top-level overview would blur the architectural layering. The plan should specify: is this update adding a "Plugin/Skills" section to the top-level overview (which would represent the current reality after the epic lands), or is it updating the epic-level overview? If the former, it should be framed as "adding a new subsystem section" rather than "updating skill count."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 stale reference grep pattern may miss some edge cases
The before/after grep pattern excludes `SKILL.md:.*description` (frontmatter) and `$GP |gp ` (CLI references). But some stale references could appear in markdown link syntax like `[/create-plan](/create-plan)` or inline code blocks that are documenting old behavior. The grep also doesn't match `/explore` without the negative lookahead `[^-]` — but the actual pattern in the plan uses `/explore[^-]` which would miss `/explore` at end-of-line. This is a minor verification gap but could leave a few stale references undetected. Consider adding a secondary sweep with a simpler pattern after the primary fix.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 fixes substantially improved the plan. The learningInputSchema format, quest creation goal source, comprehensive status-logic.md mapping, and verification validation rewrite all address the original critical/important issues well. The remaining issues are: (1) the architecture-proposal promotion gap — not a code bug but an unstated assumption that needs explicit documentation and a safety check in the skill; (2) verification assessment mechanism needs clarification on where it runs (orchestrator vs sub-agent); (3) wrong-status remedies could be more precise. None of these are blockers if implemented thoughtfully, but they could cause runtime failures if the assumptions don't hold.

To reach 9+: add the architecture existence pre-check to Phase 1, clarify the verification assessment mechanism in Phase 2, and refine the wrong-status remedy guidance.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
