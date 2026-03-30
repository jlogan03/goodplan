# Holistic Review (Round 3) -- audit-docs-and-tests

## Issues

**[IMPORTANT]** audit-docs Step 2 epic-scope discovery is under-specified for documentation sources
Step 2 says "if active epic, include `.project/epics/<name>/` documentation in scope alongside project-level docs" but doesn't specify which epic subdirectories to scan. Epics have `architecture/`, `slices/`, `research/`, `brainstorm/` -- the skill should specify which of these contain documentation worth auditing (at minimum `architecture/`) and which are transient artifacts (e.g., `brainstorm/`). Without this, the implementer may either over-include (auditing brainstorm scratch files as if they were authoritative docs) or under-include (missing epic architecture files). Add a brief list: "Include epic `architecture/` and `slices/` goal/plan files; exclude `research/`, `brainstorm/`, `prototypes/`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `quest:create` invocation syntax uses `--json` flag but the plan doesn't show it consistently
The plan gives this example: `echo '{"name":"fix-stale-docs","goal":"..."}' | goodplan quest:create --json`. However, `quest:create` takes JSON via stdin by default -- the `--json` flag controls *output* format, not input. This is correct for capturing the creation result, but inconsistent: the audit-tests example in Step 6 also uses `--json`, while the overview section omits it. More importantly, neither skill's plan specifies what to do with the `quest:create` output (e.g., capture the quest name for the audit report's "Side Quests Created" section). The plan should note: "Capture the quest name from the `quest:create` response to include in the audit report."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** audit-tests Step 3 coverage map schema is illustrative but could mislead
Step 3 says "illustrative schema: `{ source: string, testFile: string | null, hasTests: boolean }` -- this is a mental model, not a literal data structure." The parenthetical disclaimer is good, but an implementer might still build this as a literal in-memory structure and waste effort. Since this is a skill prompt (executed by an LLM, not compiled code), the schema notation is unusual for prose instructions. Consider rephrasing to: "For each source file, determine whether a corresponding test file exists. Track which source files have coverage and which don't." This conveys the same intent without the pseudo-code.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Both skills' audit report paths assume `.project/audits/` exists
Both plan phases mention writing to `.project/audits/docs-<date>.md` and `.project/audits/tests-<date>.md`, but neither skill's step instructions include `mkdir -p .project/audits`. The audit-architecture skill explicitly includes this (`mkdir -p .project/audits` in Step 5). Add `mkdir -p .project/audits` to both skills' report-writing steps (audit-docs Step 6, audit-tests Step 7).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 task "Track audit-architecture divergence" is a post-completion action, not a phase task
The last task in Phase 2 says "After both skills are complete and verified, propose a side quest to update audit-architecture to use `quest:create`." This is triggered after Phase 2 verification succeeds, making it a follow-up action rather than a build task. It's already well-documented in the overview's "Key design decisions" section. Having it as a checkbox task in Phase 2 is slightly confusing -- an implementer might think it blocks Phase 2 completion. Consider moving it to a "Post-Completion" note after Phase 2's Verification section, or marking it clearly as "non-blocking follow-up."
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-2 issues have been addressed effectively. The graceful stop sections now have detailed per-step markers matching audit-architecture's specificity. The batch-rejection path for audit-docs is clearly documented (skip all, note as deferred). Epic scope resolution is present in Steps 2 of both skills. Activity-log queries now specify filters. The plan is well-structured, complete, and closely follows the audit-architecture pattern while making deliberate, justified divergences (quest:create modernization). The remaining issues are minor specificity improvements that won't block implementation.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
