## Issues

**[MINOR] `serializeStateTree` return type `Record<string, unknown>` loses the ability to express that the root is always a directory**

Phase 1's first task specifies the return type as `Record<string, unknown>`. This is correct for the top-level (always an object), but consumers of the serialized tree who want to narrow specific values (e.g., checking if a key maps to an object vs. `true` vs. an array) will need to do runtime type narrowing anyway. The return type is pragmatically correct. However, the plan should note in the task description that the serialized tree's shape is a public API contract -- any future changes to how `StateEntry` variants serialize would be a breaking change. A brief code comment on `serializeStateTree` noting "output shape is a public API contract per cli-changes.md" would suffice.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Convention doc `--inline` documentation could create confusion about the type change in the output contract**

Phase 2 task 8 says: "Include a concrete example showing the same query path with and without `--inline` to illustrate the type change." This is good. However, the plan should also ensure the convention doc explicitly states that the type change (`true` vs. string for markdown entries) means skills cannot blindly assume a consistent type for all state tree entries -- they must check whether `--inline` was used. This is especially important for skills that cache or compare state tree outputs across calls. A single sentence in the convention doc is sufficient: "The type of markdown entries in the state tree depends on whether `--inline` is passed. Do not cache or compare state tree outputs across calls with different `--inline` settings."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 1 verification step 2 uses jq pipe syntax that may not be supported by jqjs**

Verification step 2: `goodplan state --json --query '.epics["__active__skills-cli-integration"].slices | keys'`. This assumes the state tree nests slices under epics. Looking at the actual `assembleState()` in `src/core/data/assemble.ts` and the tree structure from `cli-changes.md`, the top-level keys mirror the `.project/` directory layout. Slices are at `.slices`, not `.epics[...].slices`. The correct query would be something like `.slices | keys` or if the epic has its own slices directory, `.epics["__active__skills-cli-integration"].slices | keys`. The plan should verify this query against the actual state tree shape during implementation. This is a verification script issue, not an API contract issue, but incorrect verification commands undermine confidence.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-2 issues have been addressed. The plan's API contract design is now well-documented: the `state` command's always-JSON exception is explicitly called out, pagination semantics are documented for convention doc coverage, `--version --json` schema limitations are acknowledged, completion payload shapes are included, and the negative indexing fallback is specified. The remaining issues are minor documentation suggestions that improve clarity but do not affect correctness. The public API surface (serialization format, error shapes, pagination behavior, `--inline` type contract) is clean and consistent with existing CLI conventions.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
