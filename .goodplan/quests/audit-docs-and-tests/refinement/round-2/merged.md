# Merged Feedback (Round 2) -- audit-docs-and-tests

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: Graceful Stop lacks per-step detail for both skills**
(Flagged by: holistic, agent-skill)
The audit-architecture skill's Graceful Stop has detailed per-step markers specifying exactly what to write for interruptions during each domain step. Both audit-docs and audit-tests simply say "write partial report with `<!-- partial -- interrupted during <step>` marker." The `/audit-docs` skill has 6 interruptible domain steps (discover sources, read codebase, spawn reviewers, classify findings, write report, refresh health); `/audit-tests` has a similar set. At minimum, list the steps that should produce partial markers and what completed data to persist at each interruption point, so the implementer defines step-specific resume markers rather than a single generic one. Without this, interruption during sub-agent spawning might leave orphaned agents or lost findings with no guidance on what to persist.
Resolution: DIRECTLY_ACTIONABLE

**IMP-2: Side quest creation mechanism diverges from audit-architecture without tracking**
(Flagged by: software-architecture)
The plan correctly uses `goodplan quest:create` for side quest proposals, while audit-architecture writes directly to `.project/side-quests/<name>/goal.md` via filesystem operations. The plan's overview acknowledges this as "intentional modernization" but does not include a task to update audit-architecture or document the divergence as a known gap with a follow-up side quest. Either (a) add a task to update audit-architecture to also use `quest:create`, or (b) explicitly document this as a tracked gap. Leaving it undocumented creates exactly the inconsistency the plan was designed to avoid.
Resolution: DIRECTLY_ACTIONABLE

**IMP-3: Sub-agent reviewer output format not specified**
(Flagged by: agent-skill)
The plan says sub-agent prompts will be "fully self-contained templates" but doesn't define the output schema each reviewer should produce. The audit-architecture sub-agent-prompts.md has clear `{placeholders}` and a defined output format (Dimension, Severity, Evidence, Description, Suggested Action). For 3 reviewers (docs) and 4 reviewers (tests), the output format should be specified so findings can be synthesized by the orchestrator. Add a brief output format spec or state that `guidance.md` defines the shared output format.
Resolution: DIRECTLY_ACTIONABLE

**IMP-4: `guidance.md` content scope not specified for either skill**
(Flagged by: agent-skill)
Audit-architecture's `guidance.md` is 329 lines covering exploration strategy, severity definitions, fitness functions, invariant checks, maturity criteria, finding categories, side quest templates, and health refresh mappings. The docs and tests skills need much simpler guidance files -- they don't have fitness functions, invariants, or maturity checks. The plan should specify what goes in each skill's `guidance.md` (severity levels, reviewer output format, side quest proposal format). Without this, the implementer will either copy audit-architecture's guidance verbatim (inappropriate) or guess at scope (inconsistent).
Resolution: DIRECTLY_ACTIONABLE

**IMP-5: Step numbering mismatch breaks pattern consistency across audit skill family**
(Flagged by: software-architecture, agent-skill)
`/audit-docs` has Steps 0-9 (10 steps), `/audit-tests` has Steps 0-10 (11 steps). The extra step in `/audit-tests` is "Synthesize and Prioritize" (Step 5) as a separate step, while `/audit-docs` combines classification and action into a single Step 5. The core lifecycle steps (version check, context loading, audit report, project-health refresh, graceful stop, expertise check) should have the same step numbers across all audit skills so graceful stop markers and resume detection logic are pattern-matched rather than skill-specific. Align both skills to the same step numbering for the lifecycle envelope (Steps 0-1 for setup, Steps N-3 through N for teardown), with domain-specific steps in the middle.
Resolution: DIRECTLY_ACTIONABLE

**IMP-6: audit-docs Step 5 auto-fix rejection path unspecified**
(Flagged by: holistic)
Step 5 describes a batch-approval flow via `AskUserQuestion` ('Apply these N trivial fixes?'). The plan says "do NOT auto-fix without approval," but there's no guidance on what happens if the user says "no" to the batch -- does it skip all, allow individual selection, or defer to a side quest? Add a brief note on the rejection path.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: No scope resolution (epic vs project) in context loading**
(Flagged by: holistic, software-architecture)
`audit-architecture` resolves scope via `goodplan status --json` checking `.activeEpic`. The new skills' Step 1 does not resolve scope. For `/audit-docs`, documentation may live under `.project/epics/<name>/` when an epic is active. Add a note in each skill's discovery step to check for active epic context and adjust scope accordingly, or note it as a future enhancement.
Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Step 1 `goodplan state --json --query` missing jq filter specification**
(Flagged by: holistic)
The audit-architecture skill specifies an exact jq filter for activity-log loading. The new skills just say "Load recent activity-log via `goodplan state --json --query`" without specifying the filter. Provide the filter or say "filter for recent entries" with enough specificity.
Resolution: DIRECTLY_ACTIONABLE

**MIN-3: Verification steps lack concrete failure criteria**
(Flagged by: software-architecture)
Both phases have end-to-end verification items but don't define what constitutes a successful run beyond "produces findings." Add criteria such as: "audit report file exists at expected path," "report contains at least one finding," or "reviewer sub-agents each return structured findings."
Resolution: DIRECTLY_ACTIONABLE

**MIN-4: `/audit-tests` Step 3 coverage map uses TypeScript syntax in skill markdown**
(Flagged by: software-architecture)
The type signature `{ source: string, testFile: string | null, hasTests: boolean }` may lead implementers to think a literal data structure is needed rather than a conceptual model. Clarify this is illustrative.
Resolution: DIRECTLY_ACTIONABLE

**MIN-5: Description field lengths longer than audit-architecture convention**
(Flagged by: agent-skill)
Both skill descriptions (~370-390 chars) are within the 1024-char limit but notably longer than audit-architecture's ~270 chars. Trimming for consistency is optional. Not blocking.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (loop exit eligible)

All 11 issues (6 IMPORTANT + 5 MINOR) are DIRECTLY_ACTIONABLE. No issues require research, codebase exploration, or user input to resolve.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **Graceful stop detail** -- holistic flagged this broadly for both skills; agent-skill flagged it specifically for the docs skill with concrete step enumeration. Merged into a single issue (IMP-1) using agent-skill's specificity applied to both skills.
2. **Step numbering** -- software-architecture framed this as a lifecycle pattern consistency issue; agent-skill noted it as a minor asymmetry to document. Elevated to IMPORTANT (IMP-5) per software-architecture's framing, since consistent lifecycle envelope numbering is an architectural concern.
3. **Scope resolution** -- holistic and software-architecture both flagged this identically. Merged into MIN-1 using software-architecture's more specific framing (references `.activeEpic` check).

## Unresolved (USER_INPUT required)

None.
