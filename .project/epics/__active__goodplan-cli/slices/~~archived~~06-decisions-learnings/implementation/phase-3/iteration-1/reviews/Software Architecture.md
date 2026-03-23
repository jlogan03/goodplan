# Software Architecture Review — Phase 03: Full Status Command

## Issues

**[MINOR]** Unused `getDir` import
`getDir` is imported from `../../core/data/tree.js` but never called in the file. Under `verbatimModuleSyntax` this is not a runtime problem since it would need `import type` to be type-only, but it is dead code that should be removed to keep imports clean.
File: src/commands/global/status.ts:7
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Inline `import("../../core/tree.js").ProjectState` type references instead of top-level import
Five functions use `import("../../core/tree.js").ProjectState` as inline type imports in their parameter signatures (lines 74, 84, 94, 107, 217). The codebase convention is explicit named imports at the top of the file. Since `ProjectState` is a type, use `import type { ProjectState } from "../../core/tree.js"` at the top and reference `ProjectState` directly in signatures. This improves readability and consistency with the rest of the codebase.
File: src/commands/global/status.ts:74
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `countFiles` is non-recursive but architecture/research directories can have subdirectories
The `countFiles` helper in `src/core/data/files.ts` only counts direct children (`readdirSync` without recursion). The architecture doc notes that "within those directories, the LLM is free to create whatever file and subdirectory structure it needs." If the LLM creates subdirectories (e.g., `architecture/subsystem/data-model.md`), those files won't be counted. This may be intentional (count top-level docs only) but should be documented in the function's JSDoc to make the design choice explicit. If recursive counting is desired, add a recursive option.
File: src/core/data/files.ts:19
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation. The architecture is well-aligned with the four-layer stack: the status command correctly bypasses RPC as a read-only command, filesystem I/O is properly delegated to the Data Layer via the new `countFiles` helper, and the state tree is navigated through the existing `getJson`/`getJsonl` helpers rather than ad-hoc filesystem reads. The `countFiles` helper is appropriately placed in `src/core/data/files.ts` rather than inline in the command handler, maintaining the boundary that command handlers don't do raw filesystem I/O.

Module depth is good: `buildStatusResult` is a deep function that hides entity resolution, artifact counting, recommendation generation, and staleness detection behind a single call. The schema changes (removing `phase` from `activeEntityProjection`, tightening `artifacts` from `z.record` to a concrete object) are correct narrowings that improve the contract.

No invariant violations detected. No new public APIs or data contracts beyond what the plan specified. Tests cover artifact counting, entity detection, recommendations, warnings, query integration, and both output modes. The only issues are cosmetic (unused import, inline type references, undocumented non-recursive counting).

## Summary
- Critical: 0
- Important: 0
- Minor: 3
