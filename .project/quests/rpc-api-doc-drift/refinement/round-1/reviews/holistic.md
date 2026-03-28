# Holistic Review: RPC API Doc Drift

## Issues

**[IMPORTANT]** Gap 9 rollupTo type needs explicit resolution in plan tasks

The divergence investigation flags gap 9 (rollupTo type) as UNCLEAR -- the schema uses `z.array(z.string())` but the plan task (Fix CompleteInput type names) says to document `rollupTo` as `'epic' | 'project'` (strict enum). The plan should not silently resolve an UNCLEAR verdict without calling it out. The plan task says: "Document `rollupTo` as `'epic' | 'project'` (strict enum)". This contradicts the actual schema which is `z.array(z.string())`. The plan should either (a) document the open `string[]` type with a note that only `'epic'` and `'project'` are currently supported, or (b) explicitly note this is a deliberate choice to document the contract rather than the schema, and why.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Verification checks are too shallow for a doc-correctness quest

The Expected Behavior section uses `grep -c` checks for keyword presence (e.g., `grep -c 'projectDir'`). These verify that words appear in the doc but not that the types/signatures are correct. For a quest whose entire purpose is doc-code alignment, the verification should include at least one structural check -- e.g., extracting the documented `begin()` signature and comparing it against the actual code signature. A simple approach: after the update, run a diff-like check that extracts all `function` and `interface` lines from the doc and confirms key elements match the source files. Alternatively, the "Verify consistency" task at the end could be promoted to an explicit verification step with concrete checks (e.g., "grep the doc for `BeginResult` and confirm it does NOT contain `context?`").

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing explicit mention of what happens to the doc's existing structure

The plan says to "relocate" status() and startContext() but doesn't specify whether the current Interface section's code block gets rewritten entirely or just has those two lines removed. Since this is a single-phase plan with many interleaved edits to the same file, an implementer might wonder about ordering. A brief note like "Edit the Interface code block to remove lines 15-16, then add corresponding sections below" would help.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No task for updating the Command-to-RPC routing table

The codebase context mentions the doc has a "Command-to-RPC routing table" that references `begin('rollup', ...)`. If begin()'s signature changes to include `projectDir` and `payload`, the routing table examples may also need updating. The plan doesn't mention this table.

Resolution: CODEBASE_EXPLORATION

## Score: 8/10

Well-structured single-phase plan for a straightforward doc update. Research is thorough -- every divergence was traced through git history. The gap-to-task mapping is clear and complete. Two issues hold it back from 9+: (1) the rollupTo type contradiction between the investigation's UNCLEAR verdict and the plan's definitive enum, and (2) verification checks that test keyword presence rather than structural correctness. Fixing those two IMPORTANT issues would bring it to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
