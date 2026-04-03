# Agent Skill Review — Plan-Slice PoC (Round 4)

## Issues

**[IMPORTANT] Plan-phase agent should NOT have AskUserQuestion in allowedTools**
Phase 3 line 126 gives the plan-phase agent `allowedTools: ["Read", "Grep", "Glob", "Write", "AskUserQuestion"]` with the rationale "needs user interaction during Q&A capture." However, the plan-phase agent does NOT run Q&A. Phase 1 (interactive Q&A, lines 129-134) is run by the **orchestrator itself** using AskUserQuestion directly. The plan-phase agent is spawned in Phase 2 (line 136) as an autonomous agent that drafts the implementation plan from Q&A output + architecture files. The epic architecture overview (line 58-59) explicitly states: "Sub-agents cannot use AskUserQuestion — all user interaction happens in the orchestrator." Giving AskUserQuestion to the plan-phase agent violates this constraint and could cause unexpected user prompts during autonomous execution. Fix: change plan-phase allowedTools to `["Read", "Grep", "Glob", "Write"]` and remove the rationale about user interaction.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Reviewer agents write review files but allowedTools omits Write**
Phase 3 line 140 says each reviewer agent "writes its review to the specified output path." But line 123 restricts reviewer agents to `allowedTools: ["Read", "Grep", "Glob"]` — no Write access. These two statements contradict. Either reviewers write files (add Write to allowedTools) or they return JSON only and the orchestrator/synthesis agent reads from their return values (current allowedTools are correct but line 140 must be updated). Given that reviewer agents in the round 3 fix were designed to "return JSON via agent return" (the parenthetical on line 123), the fix should be to update line 140 to say reviewers return JSON only and the orchestrator writes their output to `<tmpdir>/reviews/<domain>.md` before passing paths to synthesis. This keeps reviewers read-only as intended.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `@` reference validation regex doesn't account for trailing punctuation**
Phase 2 line 85 specifies a regex `@\$\{CLAUDE_PLUGIN_ROOT\}/[^ )\n]+` for extracting `@` references from agent bodies. In markdown, references often appear at the end of a sentence or inside parentheses, e.g., `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md.` (trailing period) or `(@${CLAUDE_PLUGIN_ROOT}/path)` (trailing paren). The regex would capture trailing punctuation as part of the path. The character class `[^ )\n]+` already excludes `)` but not `.` at end-of-path or other trailing markdown punctuation. This is a minor robustness concern — most agent `.md` files use references on their own line. A simple strip of trailing `.,:;` after capture would make the validation more robust, but this is not blocking.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All three IMPORTANT issues from round 3 have been thoroughly and correctly addressed. Sub-agent tool restrictions are now explicit with per-category allowedTools/disallowedTools. The `gp start-plan` return shape is specified as a `ContextBundle` with field descriptions matching the actual `src/core/context/types.ts` definition. The score channel ambiguity is resolved — synthesis return is the single source of truth for exit decisions. The remaining IMPORTANT issue (plan-phase having AskUserQuestion) is a direct contradiction with the architecture's sub-agent constraint and is a simple fix. The two MINOR items are consistency nits that won't block implementation.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
