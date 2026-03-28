# Merged Feedback: RPC API Doc Drift (Round 2)

### CRITICAL Issues

None.

### IMPORTANT Issues

None.

### MINOR Issues

**[MINOR-1]** Structural verification checks should specify the extraction method
- Source: holistic
- The new verification items (comparing documented `begin()` signature and `StatusResult` shape against source files) don't specify *how* to extract — e.g., grep the doc's code block for the function line and diff against the export. An implementer will likely infer the intent, but a one-liner clarifying the method (e.g., "grep the doc's TypeScript block for the `begin` function signature and diff against the export in `begin.ts`") removes ambiguity.
- Resolution: DIRECTLY_ACTIONABLE

**[MINOR-2]** Structural verification doesn't cover `complete()` or `submit()` signatures
- Source: repo-tooling-docs
- The structural verification section only checks `begin()` against `begin.ts` and `StatusResult` against `status.ts`. Since `complete()` and `submit()` are also being updated (adding `projectDir`, making `options` optional), their signatures should also be cross-checked against `complete.ts` and `submit.ts`. Simpler changes, but worth a quick verification pass.
- Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE (for loop exit)

1. Clarify structural verification extraction method for `begin()` and `StatusResult` checks (MINOR-1).
2. Add structural verification checks for `complete()` and `submit()` signatures against their source files (MINOR-2).

### RESEARCH_NEEDED

None.

### Contradictions Resolved

None — both reviewers flagged distinct, non-overlapping issues. Both independently confirmed all round-1 issues were resolved correctly (rollupTo type, LearningInput inline definition, before-checks coverage, interface section post-relocation, structural verification depth).

### Unresolved (USER_INPUT required)

None.
