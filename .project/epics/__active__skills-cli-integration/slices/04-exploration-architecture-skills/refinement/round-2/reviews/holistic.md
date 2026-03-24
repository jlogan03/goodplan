## Issues

**[IMPORTANT]** Phase 3 refine-architecture reference file task is vague despite codebase showing no hits
The plan says "Update reference files if they contain eliminated patterns -- check `references/sub-agent-prompts.md` for activity-log references, check for `state-and-activity-formats` references in all reference files." Codebase exploration confirms `refine-architecture/references/sub-agent-prompts.md`, `guidance.md`, and `reviewer-registry.md` all have zero hits for `state.md`, `activity-log`, or `state-and-activity-formats`. Only `SKILL.md` itself has references (2 hits for `state-and-activity-formats`). The task should state this explicitly: "Verify reference files are clean (currently no hits expected) and update only `SKILL.md`." The vague "check and update if needed" wording forces the implementer to do the same grep exploration I just did, with no guidance on expected outcome. Phase 1 (audit-architecture) has the same issue -- `references/sub-agent-prompts.md` and `references/guidance.md` should be checked but the plan doesn't inventory expected hits.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 create-architecture ignores the existing `start-architecture` sub-agent command
The plan says "Conventions research sub-agent stays as regular Agent tool call (one-off research, not CLI context bundling)." However, `src/commands/subagent/start-architecture.ts` exists in the codebase. The plan should explicitly acknowledge this command exists and explain WHY it is not used for the conventions research sub-agent (presumably because the research is a one-off codebase read, not an architecture-phase sub-agent that needs the full context bundle). Without this note, the implementer may discover `start-architecture` and be confused about whether to use it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 audit-architecture references/ not inventoried for cleanup
Phase 2 and 3 now have explicit reference file inventories (explore-logic.md line 1, guidance.md lines 56-63). Phase 1 says "Update audit-architecture references/ if needed" but doesn't specify which files to check. Codebase shows `references/sub-agent-prompts.md` and `references/guidance.md` exist. Grep confirms neither contains `state.md`/`activity-log` patterns, so the task should say: "Check `references/sub-agent-prompts.md` and `references/guidance.md` for eliminated patterns (expected: zero hits, no changes needed)."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 smoke test does not verify `decision:create`
The explore skill's migration includes replacing `mkdir -p .project/decisions/` with `decision:create --json`. The Phase 4 smoke test exercises the full epic lifecycle but never tests `decision:create`. Since this is a distinct command outside the epic lifecycle flow, it should be tested separately (e.g., `echo '{"id":"test-dec","domain":"test","title":"Test","summary":"Test decision"}' | goodplan decision:create --json`).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 "Before" check pattern `.project/.*\.json` may produce false positives
The grep pattern `\.project/.*\.json` in Phase 4 will match references to `project.json` in comments or documentation within skill files. If the intent is to catch direct JSON file access patterns, the pattern should be more specific (e.g., targeting `state.md`, `activity-log.jsonl`, and specific entity JSON paths) or the task should note expected false positives and how to distinguish them from real issues.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is substantially improved from round 1. Start-epic retirement is cleanly handled with clear rationale and delegation to slice 05. Phase ordering is logical (simple read-only -> begin/submit -> iterative). All CLI commands referenced exist in the codebase. The round 1 critical and important issues are thoroughly addressed: smoke test now includes full lifecycle steps 9-14, reference file inventories are explicit for Phase 2, graceful stop redesign is specified, skip flow is documented, activity query is scope-filtered.

To reach 9+: (1) Make the Phase 3 reference file task concrete instead of "check if needed" -- the implementer shouldn't have to re-discover what I verified (zero hits in reference files). (2) Acknowledge the `start-architecture` command exists and explain why it's not used for create-architecture's conventions sub-agent. Both are quick fixes.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
