# Repo, Tooling, & Docs Review: rpc-api-doc-drift

## Issues

**[IMPORTANT]** Plan task for `rollupTo` type says `'epic' | 'project'` but actual schema uses open `z.array(z.string())`
The plan's gap 9 task says: "Document `rollupTo` as `'epic' | 'project'` (strict enum)." However, the actual `learningInputSchema` uses `z.array(z.string())` -- an open string array. The divergence investigation flagged this as UNCLEAR (item 9), noting the schema comment pattern suggests intentional openness for forward-compatibility. The plan resolves this ambiguity by choosing the strict enum without noting this is a documentation-level simplification of the actual schema type. The doc update should either: (a) match the actual schema (`string[]`) with a note that only `'epic'` and `'project'` are currently supported, or (b) explicitly note the discrepancy and justify the tighter doc type as the intended contract. As written, the plan would create a new doc/code divergence on the same day it fixes ten others.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `LearningInput` in plan uses `detail` field but plan task doesn't mention documenting it
The plan's gap 9 task says to change `Learning[]` to `LearningInput[]` in `CompleteInput`, but the inline `Learning` interface in the current doc (lines 253-259) has a `detail: string` field. The actual `LearningInput` type also has `detail: string` (from `learningInputSchema`). The plan should explicitly state whether to keep or update the inline type definition block that currently shows the `Learning` interface -- since the type name is changing from `Learning` to `LearningInput`, the inline definition block (lines 246-259) needs updating to match the new name and the actual schema fields (`category` uses `z.enum(...)` in `learningInputSchema` but `string` in `learningEntrySchema`). The current plan task only says "Change `Learning[]` to `LearningInput[]`" which could be interpreted as a name-only change, missing the structural differences.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan's "before implementation" checks are incomplete -- could verify more divergences exist
The Expected Behavior section has only 2 "before" checks (for `projectDir` and `RollupResult` absence). Adding checks for other key divergences (e.g., `grep 'superseded'` should match before and not after, `grep 'StatusOptions'` should match before and not after) would make verification more robust. The "after" checks are good but asymmetric with the "before" set.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan doesn't specify what to put in the doc's Interface section after relocating `status()` and `startContext()`
Task "Relocate status() and startContext()" says to move these out of the RPC Interface section, but doesn't specify what the Interface section's function listing (lines 11-17) should look like afterward. Should the relocated functions still appear with a cross-reference note? Should the listing shrink to just `begin`, `complete`, `submit`? The current listing is a prominent summary block -- its post-edit shape matters for doc readability. The plan should specify the target state of this section.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Verification section doesn't include a doc self-consistency check method
The plan's Verification section says "No internal inconsistencies in the updated doc" but the only concrete method is the final task "Verify consistency: Re-read the updated doc end-to-end." For a doc-only quest, a more direct verification would be: extract all type names defined in the doc and grep the codebase to confirm each exists; extract all function signatures and compare parameter counts/types against the actual code. The current approach relies on manual reading which could miss subtle type mismatches.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-researched and thorough -- the divergence investigation and codebase context are excellent. The 10 gaps are correctly identified and the tasks are clearly scoped. Two issues prevent a 9: (1) the `rollupTo` type decision would introduce a new divergence, and (2) the `LearningInput` inline definition update is underspecified. Both are straightforward to fix. The minor items are polish.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
