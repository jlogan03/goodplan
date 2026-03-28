# Learnings — 07-complete-slice

## Auto-detect conditions must account for optional workflow files

The auto-detect for finding completion-ready slices initially required `after-implementation-fixes-and-polish.md`, but clean implementations won't have it. Auto-detect should use the minimal set of files that definitively indicate a phase is complete (plan-refined + implementation/ content), not optional files that may or may not exist.

## Cross-project tool learnings should persist in user memory

When a slice surfaces learnings about general-purpose tools (not project-specific), saving them to the user's auto memory system means the agent gets smarter across projects. Example: "pnpm 10 replaces corepack" is useful in any Node.js project, not just this one.

## Complete-slice is the natural reflection point for architecture drift

Comparing what was built against canonical architecture files is most valuable right after implementation — the divergences are fresh and the context is loaded. This is better than deferring all architecture review to a standalone audit.
