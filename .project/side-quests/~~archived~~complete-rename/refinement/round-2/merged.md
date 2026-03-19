# Merged Review Feedback — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

1. **Step 9 adaptation for initiative scope is internally inconsistent** (Software Architecture)
   The plan changes Step 9's purpose from an interactive user question ("Do you want a cleanup pass?") to an automated check ("check for stale references"). These are different operations. Clarify whether initiative-scope Step 9 is interactive (AskUserQuestion presenting findings) or automated.
   Resolution: DIRECTLY_ACTIONABLE

2. **Artifact promotion destination directories not specified** (Software Architecture)
   Step 6e says "Copy artifact to project-level directory" but doesn't specify where. No `.project/research/`, `.project/brainstorm/`, or `.project/prototypes/` directories exist. The plan needs: (a) concrete destination paths, (b) whether to create directories as needed, (c) conflict handling for same-name files.
   Resolution: DIRECTLY_ACTIONABLE

3. **SKILL.md description text not specified for initiative completion triggers** (Agent Skill)
   The description field is the primary trigger mechanism (max 1024 chars) and must distinguish "complete this initiative" from "complete this slice" (initiative-scoped). The plan should include the literal description string. Round 1 flagged this; still not resolved.
   Resolution: DIRECTLY_ACTIONABLE

4. **Guidance.md "Initiative Completion Protocol" section scope is underspecified** (Agent Skill)
   Beyond a topic list, the plan needs to specify: (1) how initiative learnings differ from slice learnings (cross-slice pattern synthesis), (2) reconciliation AskUserQuestion options and effects, (3) artifact promotion copy-not-move rationale, (4) archive numbering algorithm. Without this, the implementer must invent protocol details.
   Resolution: DIRECTLY_ACTIONABLE

5. **Graceful stop cases (e) and (f) missing state.md format details** (Agent Skill)
   New graceful stop states don't specify: flow-log entry format (should use `"status":"started"` matching cases b/d), or Next Step value (should be `Resume /complete for <initiative> (<pending action>)`). Existing cases are fully specified; new ones should match.
   Resolution: DIRECTLY_ACTIONABLE

6. **Phase 1 repo-files task lists files that need no changes** (Holistic + Software Architecture)
   Task lists `workflow.md`, `CLAUDE.md`, `.project/idea.md` but research confirms all already use `/complete`. Remove these three no-op targets or note they're for completeness verification only. Keep the catch-all and side quest goal files.
   Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

7. **Phase 3 scope is thin — consider merging into Phase 1** (Holistic)
   Phase 3 contains only two tasks (remove parenthetical in `status-logic.md` + grep for others). Both are trivially part of Phase 1's cross-reference cleanup. A separate phase adds process overhead for ~5 minutes of work.
   Resolution: DIRECTLY_ACTIONABLE

8. **Graceful stop states use vague initiative identifiers** (Holistic)
   `<initiative>` in stop states could be directory name, full path, or display name. Should use `initiatives/<name>` form (matching Step 10's `"scope":"initiatives/<name>"`).
   Resolution: DIRECTLY_ACTIONABLE

9. **Verification for Phase 2 trace-through could be more specific** (Holistic)
   Per scope type, specify checks: (a) Step 0 variables set, (b) Step 2 detection matches, (c) Steps 6b/6c/6d/7/9/9b skip-or-apply decisions consistent, (d) Step 10 writes correct phase/scope/status.
   Resolution: DIRECTLY_ACTIONABLE

10. **Re-entry handling for initiative scope not addressed** (Software Architecture)
    Step 2 only checks `completion/learnings.md` for re-entry. For initiative scope, should also check `completion/architecture-updates.md` to distinguish "learnings done, reconciliation pending" from "fully done." Graceful stop adds states (e)/(f) but Step 2 doesn't detect them.
    Resolution: DIRECTLY_ACTIONABLE

11. **Step 8 initiative variant could trigger false "new initiative needed" recommendations** (Agent Skill)
    Without guardrails, the agent may over-suggest new initiatives. Add: "Present observations only. Do not auto-propose initiatives — surface findings for user decision."
    Resolution: DIRECTLY_ACTIONABLE

12. **Auto-detect for initiative completion needs explicit scan ordering** (Agent Skill)
    Initiative completion should be scanned last (after slices and side quests), since it's a higher-level operation. State this explicitly to prevent offering initiative completion before remaining scopes complete.
    Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 12 issues are directly actionable.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **Phase 1 no-op files**: Holistic (IMPORTANT) and Software Architecture (MINOR) flagged the same issue — Phase 1 listing files that already use `/complete`. Kept Software Architecture's more specific version (mentions task 4, gives resolution options). Elevated to IMPORTANT since both reviewers flagged it and it causes implementer confusion.

## Unresolved (USER_INPUT required)

None.
