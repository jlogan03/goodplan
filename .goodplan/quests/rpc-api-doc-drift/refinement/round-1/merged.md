# Merged Feedback: rpc-api-doc-drift (Round 1)

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1: rollupTo type contradiction -- plan would introduce a new divergence**
The plan's gap 9 task says "Document `rollupTo` as `'epic' | 'project'` (strict enum)" but the actual `learningInputSchema` uses `z.array(z.string())` -- an open string array. The divergence investigation flagged this as UNCLEAR. The plan silently resolves the ambiguity by choosing the strict enum without justification. Fix: either (a) document as `string[]` with a note that only `'epic'` and `'project'` are currently supported, or (b) explicitly justify the tighter doc type as the intended contract.
*(Flagged by both holistic and repo-tooling-docs; repo-tooling-docs version kept as more specific.)*

**IMP-2: LearningInput inline definition update is underspecified**
The plan task says "Change `Learning[]` to `LearningInput[]`" but the inline `Learning` interface definition block (lines 246-259) also needs updating to match the new name and actual schema fields. The `category` field uses `z.enum(...)` in `learningInputSchema` but `string` in `learningEntrySchema` -- the doc must reflect the input schema. As written, the task could be interpreted as a name-only change, missing structural differences.
*(Flagged by repo-tooling-docs only.)*

**IMP-3: Verification checks are too shallow for a doc-correctness quest**
The Expected Behavior section uses `grep -c` checks for keyword presence but not structural correctness. For a quest whose purpose is doc-code alignment, verification should include at least one structural check -- e.g., extract documented signatures and compare against actual code, or confirm specific incorrect types are absent after the update. The final "Verify consistency" task relies on manual reading which could miss subtle type mismatches.
*(Flagged by both reviewers; holistic version kept as more specific on the structural check suggestion, supplemented by repo-tooling-docs' concrete method proposal.)*

### MINOR Issues

**MIN-1: Missing specification of Interface section's post-edit shape**
The plan says to "relocate" status() and startContext() but doesn't specify what the Interface section's prominent function listing (lines 11-17) should look like afterward. Should relocated functions still appear with a cross-reference? Should the listing shrink to just `begin`, `complete`, `submit`? A brief note on the target state would help implementers.
*(Flagged by both reviewers; repo-tooling-docs version kept as more specific.)*

**MIN-2: Before-implementation checks are asymmetric**
The plan has only 2 "before" checks (for `projectDir` and `RollupResult` absence). Adding checks for other key divergences (e.g., `grep 'superseded'`, `grep 'StatusOptions'`) would make verification more robust and symmetric with the "after" checks.
*(Flagged by repo-tooling-docs only.)*

**MIN-3: No task for updating the Command-to-RPC routing table**
The doc has a "Command-to-RPC routing table" that references `begin('rollup', ...)`. If begin()'s signature changes, the routing table examples may need updating. The plan doesn't mention this table.
*(Flagged by holistic only.)*

### DIRECTLY_ACTIONABLE

1. **IMP-1**: Fix rollupTo type documentation to match actual schema or explicitly justify the tighter type
2. **IMP-2**: Expand LearningInput task to cover inline definition block update with correct schema fields
3. **IMP-3**: Add at least one structural verification check (signature/type comparison against source)
4. **MIN-1**: Specify the target state of the Interface section after relocating status() and startContext()
5. **MIN-2**: Add symmetric "before" checks for additional divergences
6. **MIN-3**: Investigate whether the Command-to-RPC routing table needs updating

### RESEARCH_NEEDED

1. **MIN-3**: Verify whether the Command-to-RPC routing table references signatures that would be affected by plan changes (tagged CODEBASE_EXPLORATION by holistic reviewer)

### Contradictions Resolved

None. Both reviewers agreed on all overlapping issues. The rollupTo type issue (IMP-1) was flagged independently by both with compatible recommendations.

### Unresolved (USER_INPUT required)

None.
