# Learnings: architecture-quality

## Shared reference files with placeholders enable partial consolidation

The `{review_context}` placeholder in `reviewers-cross-cutting.md` keeps evaluation criteria in one place while preserving skill-specific framing (refine-plan reviews "plans", implement-plan reviews "code"). This pattern — shared content with parameterized framing — is more maintainable than full duplication and more flexible than forced uniformity. Consolidation criterion should consider framing differences, not just content identity.

## Shared orchestration skeletons need explicit parameter interfaces

Creating `iteration-loop.md` as a shared reference only worked after reviewers pushed for a concrete parameter interface (Loop Parameters section listing reviewer list, exit criteria, editor prompt path, score thresholds, max iterations, scope constraints, working directory). Without the interface contract, "use the shared loop" was too vague for an implementing agent. Structural reference files need to define how they're consumed, not just what they contain.

## On-demand reference loading scales better than unconditional loading

Loading `design-tree.md` and `design-it-twice.md` at their respective steps (5, 6) rather than all at Step 1 keeps context lean. As skills accumulate reference files, unconditional loading at start pushes earlier references out of context. Pattern: Step 1 loads essentials, subsequent steps load what they need on-demand.

## In-place editing with backup is better than working copies for referenced files

Architecture files are referenced by CLAUDE.md, decisions, and plans. A separate `architecture-refining/` copy would create ambiguity about which version is canonical. In-place editing with a timestamped backup preserves the reference chain while allowing rollback. Different from plans, where `-refining` copies are safe because nothing references them mid-refinement.

## Sub-agents writing to wrong paths is a recurring implementation hazard

Multiple implementation agents wrote skill files to the goodplan repo directory instead of `~/.claude/skills/`. When the working directory and the target directory differ, the implementation prompt needs to be explicit about absolute paths. Caught during verification each time, but worth automating with a post-implementation path check.
