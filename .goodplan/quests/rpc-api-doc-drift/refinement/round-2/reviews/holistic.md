# Holistic Review: RPC API Doc Drift (Round 2)

## Issues

**[MINOR]** Structural verification checks could specify the extraction method

The new structural verification items (lines 32-33) say "Extract documented `begin()` signature from the updated doc and compare against `src/core/rpc/begin.ts` export" and similarly for `StatusResult`. These are a significant improvement over the round-1 keyword-only checks. However, they don't specify *how* to extract -- e.g., `grep 'function begin'` from the doc vs reading the TypeScript block. An implementer will likely figure this out, but a one-liner like "grep the doc's code block for the `begin` function line and diff against the export in begin.ts" would remove ambiguity. This is minor because any competent implementer can interpret the intent.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All four round-1 issues have been addressed well:

1. **rollupTo type (was IMPORTANT):** Fixed. The plan now explicitly acknowledges the schema uses open `string[]` for forward-compatibility, documents only `'epic'` and `'project'` as supported values per design intent, and notes the quest-specific guidance. This resolves the contradiction between the UNCLEAR verdict and the plan's definitive choice.

2. **Verification depth (was IMPORTANT):** Fixed. Two structural verification items added comparing documented signatures and type shapes against actual source files. This goes beyond keyword presence to test actual doc-code alignment.

3. **Interface section editing clarity (was MINOR):** Fixed. The relocate task now explicitly states that after relocation the Interface section should list only `begin`, `complete`, `submit` and include a cross-reference note to Commands Layer and Context Bundling sections.

4. **Routing table (was MINOR):** Fixed. A new task explicitly addresses updating the routing table entries and inline examples to use the new `begin(projectDir, phase, target, payload, options?)` signature.

The plan is well-structured, thorough, and complete for its scope. Every divergence from the investigation maps to a concrete task. File references are all verified against the actual codebase. The single-phase structure is appropriate for a doc-only quest. No invariant violations. No fitness function impacts (doc-only change to a Developing subsystem). The one remaining minor is cosmetic -- extraction method for structural checks.

## Summary
- Critical: 0
- Important: 0
- Minor: 1
