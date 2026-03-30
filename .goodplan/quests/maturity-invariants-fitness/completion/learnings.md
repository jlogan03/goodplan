# Completion Learnings: maturity-invariants-fitness

## Shared files should only be shared if consumers will stay aligned long-term

Sharing reviewer files across skills (e.g., `reviewers-always.md` used by both refine-plan and refine-architecture) forced context-agnostic language ("document under review" not "plan") and conditional criteria. The fix worked here, but the deeper question is whether sharing was the right call — if those skills' reviewer needs diverge over time, the shared file becomes a constraint rather than a convenience. The sharing decision should be based on expected long-term alignment, not just current similarity. When in doubt, prefer independent copies with occasional manual sync over forced generalization.

## Convention files must be loaded by all consumers, not just producers

audit-architecture initially didn't load `maturity-conventions.md`, instead duplicating promotion criteria in its guidance. The integration review caught this — consumers that read artifacts need the convention definitions to correctly interpret format and semantics, even if they don't produce the artifacts. The fix was simple (add a load step + authoritative source cross-reference), but it reveals that convention file consumer lists should be verified end-to-end during planning.

## Codebase context discovery catches structural issues early

The pre-review codebase context agent found the Step 9b numbering collision and CLAUDE.md sequencing issue before the first review round, saving at least one review iteration. These would have been CRITICAL findings regardless. For plans that modify existing skill files, codebase context discovery should always read the target files and check for structural conflicts (numbering, ordering, prerequisite chains).

## Report/output templates and analysis steps are a coupled pair

Adding Steps 3b/3c/3d to audit-architecture without updating the Step 5 report template created a gap — agents would improvise where to put findings. Any plan that adds analysis steps should include a corresponding task to update the output template. Reviewers caught this, but it should be a plan-creation convention.

## Blast radius analysis prevents silent propagation bugs

Understanding that `reviewers-cross-cutting.md` affects 4 skills while `reviewers-always.md` affects only 1, and that implement-plan has its own independent `shared-preamble.md`, prevented both over-reach and under-reach. This analysis should be standard for any quest modifying shared reference files — spawn a codebase exploration agent to map consumers before implementing changes.
