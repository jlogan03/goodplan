# Software Architecture Review (Round 2) — audit-docs-and-tests Plan

## Issues

**[IMPORTANT] Side quest creation mechanism diverges from audit-architecture without migration path**
The plan correctly uses `goodplan quest:create` (the CLI-managed approach) for side quest proposals in both skills. However, the existing `audit-architecture` skill writes side quests to `.project/side-quests/<name>/goal.md` via filesystem mkdir+write (line 189-191 of SKILL.md). The plan's overview acknowledges this as "intentional modernization" but does not include a task to update `audit-architecture` to use the same CLI mechanism. This creates two different side quest creation patterns across the audit skill family — exactly the kind of inconsistency the plan was designed to avoid. The `audit-architecture` skill currently writes to `.project/side-quests/` which is not a CLI-managed directory. Either (a) add a task to update `audit-architecture` to also use `quest:create`, or (b) document this as a known gap with a follow-up side quest. Leaving it undocumented is the problem — the divergence itself may be fine if it's intentional and tracked.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Step numbering mismatch between the two skills breaks pattern consistency**
`/audit-docs` has Steps 0-9 (10 steps), `/audit-tests` has Steps 0-10 (11 steps). The extra step in `/audit-tests` is because it has both "Synthesize and Prioritize" (Step 5) and "Propose Side Quest" (Step 6) as separate steps, while `/audit-docs` combines classification and action (including side quest proposals) into a single Step 5. The core lifecycle steps (version check, context loading, audit report, project-health refresh, graceful stop, expertise check) should have the same step numbers across all audit skills so that the graceful stop markers and resume detection logic are pattern-matched rather than skill-specific. Consider aligning both skills to the same step numbering for the lifecycle envelope (Steps 0-1 for setup, Steps N-3 through N for teardown), with the domain-specific steps in the middle.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No scope resolution (epic vs project) in context loading**
`audit-architecture` resolves scope via `goodplan status --json` checking `.activeEpic` to determine whether to audit epic-level or project-level architecture. The new skills' Step 1 context loading loads learnings, conventions, and activity-log but does not resolve scope. For `/audit-docs`, documentation may live under `.project/epics/<name>/` when an epic is active. For `/audit-tests`, test strategy may differ per-epic. While the current goodplan repo has no active epic, this is a known convention that all skills should be aware of. Since the plan's overview says "no CLI code changes" and the skills are pure markdown, this is a documentation/awareness gap rather than a code gap. Add a note in each skill's Step 2 (discovery) to check for active epic context and adjust discovery scope accordingly, or note it as a future enhancement.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `/audit-tests` Step 3 coverage map type signature uses TypeScript syntax in a skill markdown file**
Step 3 specifies a "coverage map: `{ source: string, testFile: string | null, hasTests: boolean }`". Skills are markdown instructions executed by an LLM, not TypeScript code. The type annotation is fine as illustrative, but calling it a "coverage map" with a concrete type signature may lead the implementer to think it needs to be a structured data artifact rather than a mental model for the sub-agent exploration. Consider clarifying this is the conceptual shape of the analysis, not a literal data structure to emit.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Verification steps for both skills rely on end-to-end invocation but don't specify failure criteria**
Both phases have "End-to-end: invoke `/audit-docs` (or `/audit-tests`) on the goodplan repo" as a verification item. This is good (direct verification). However, the Expected Behavior items don't define what "produces findings" means in terms of pass/fail. What constitutes a successful end-to-end run? The audit report file existing at the expected path is necessary but not sufficient. Consider adding: "audit report contains at least one finding" or "reviewer sub-agents each return structured findings" as concrete success criteria. Without these, a run that silently produces an empty report would pass verification.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1's major issues (missing lifecycle steps, missing install-skills.sh registration, vague side quest invocation, missing sub-agent model specification, reference file naming inconsistency) have all been addressed well. The plan now follows the full audit-architecture lifecycle pattern with explicit step numbering, context loading, graceful stop, expertise check, audit report writing, and project-health refresh. The remaining issues are: (1) the side quest creation divergence with audit-architecture should be acknowledged rather than silently left inconsistent, (2) step numbering should align across the audit family for consistent lifecycle envelope, and (3) minor documentation clarity items. To reach 9+: acknowledge the audit-architecture side quest mechanism divergence (either fix it or track it), align step numbering across both skills, and add concrete success criteria to the verification steps.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
