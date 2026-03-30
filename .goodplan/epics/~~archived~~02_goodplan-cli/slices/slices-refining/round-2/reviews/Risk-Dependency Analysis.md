# Risk/Dependency Analysis Review — Round 2

## Round 1 Corrections Verification

Round 1 raised 3 IMPORTANT dependency issues. Verified status:

- **I2 (slice 06 dep should be 05, not 04):** FIXED. `sequencing-refining.md` row 22 now lists dep `05` with note "Depends on quest lifecycle (slice 05) for full status and quest-level learnings rollup." `06-decisions-learnings/goal-refining.md` scope boundaries confirm this. Confirmed.
- **I3 (slice 08 dep should include 05):** FIXED. `sequencing-refining.md` row 24 now reads `06 (transitively includes 05)`. Confirmed.
- **M6 (slice 07 soft dep on 06 is effectively hard):** FIXED. `sequencing-refining.md` now explicitly states "hard dependency on 06" with rationale. Row 23 dep is `06`. Confirmed.

## Issues

**[IMPORTANT]** `sequencing-refining.md` / `goal-refining.md [03-epic-lifecycle]`: Submit-* command dependency between slices 03 and 05 is incompletely documented

Slice 03 goal-refining.md lists submit-plan, submit-refinement, and submit-implementation in scope. Slice 05 sub-agent-commands goal-refining.md says "submit-plan, submit-refinement, and submit-implementation were implemented in slice 03." The sequencing table row for 05 says "submit-plan/submit-refinement/submit-implementation already in 03." This is all consistent.

However, the dependency arrow runs in the opposite direction from what might be expected: slice 05 depends on 04 (not 03 directly), yet it relies on the submit-* commands placed in 03. This is fine since 04 depends on 03, making 03's work transitively available to 05. But the sequencing rationale for slice 05 reads "Sub-agent integration requires slice lifecycle to be in place" — which is correct but undersells that slice 05 also requires the submit-* command infrastructure from slice 03 (now documented as being in 03 vs. the original design). This implicit intra-slice placement contract is not documented in either the sequencing rationale or slice 05's scope boundaries as a dependency note.

This matters because if slice 03 scope is trimmed during implementation (submit-* commands moved back to 05 for scope reduction), slice 04's verification becomes unexecutable (as the original C3 critical issue identified).

Resolution: DIRECTLY_ACTIONABLE — Add a one-line note to slice 05's scope boundaries: "Depends on submit-plan, submit-refinement, submit-implementation being available (from slice 03)." Also add to sequencing row 05's rationale: "Also requires submit-* infrastructure from slice 03 for verification."

---

**[IMPORTANT]** `goal-refining.md [02-project-init]`: Cache and concurrent modification detection deferred but scope remains very large

Round 1 I1 (slice 02 scope too large) was marked USER_INPUT and the resolution chosen was option (b) — keep unified but acknowledge risk and defer cache + concurrent modification to 03. This was applied: slice 02 out-of-scope now lists "`.state-cache.json` / `loadState()` with cache (slice 03), concurrent modification detection in `commitState` (slice 03)." Slice 03 in-scope lists both.

This is the correct mitigation. However, the slice 02 goal still bundles: 4 recursive tree types + union, 6 tree navigation helpers, schema registry, assembleState (zero-state + filesystem scanning), commitState (recursive diff + directory creation + atomic writes), debug logging, reduce scaffold + INIT_PROJECT handler, 9+ Zod entity schemas, and the refactored init command. That is still a very large surface for a single slice.

The risk is unchanged in magnitude — every subsequent slice remains blocked if slice 02 stalls. What has improved is that the two heaviest deferrable items (cache, concurrent modification) have been moved. What hasn't changed: the risk is now explicitly acknowledged in the scope boundaries ("Cache and concurrent modification detection are deferred to a later slice to reduce scope risk" — in the What We're Building section), and the scope note says "Success criterion: update `.project/conventions.md` to reflect the actual `src/` directory structure after this slice."

This is acceptable mitigation given that splitting further would create a "scaffolding slice" with no runnable verification (the tree types and schemas alone aren't end-to-end exercisable). Flagging as IMPORTANT because the risk remains real and no further mitigation is available short of USER_INPUT about splitting.

Resolution: USER_INPUT — Is the current scope acceptable given the deferral of cache/concurrent-modification? If the implementer stalls on any part of the remaining scope (e.g., `assembleState()` filesystem scanning, or `commitState()` recursive diff), the entire chain blocks. Options: (a) accept as-is (the deferral is sufficient), (b) further reduce by deferring debug logging to slice 03 as well, (c) accept and explicitly add a "if tree model fails, fallback plan" note to the sequencing rationale.

---

**[MINOR]** `sequencing-refining.md`: Slice 07 escape valve note is in slice 08's rationale column, not the sequencing rationale section

The sequencing rationale paragraph correctly says "Slice 07 (skills-migrate) is the 'escape valve' for parallel work if the main chain stalls." This addresses round-1 M8. However, the table row for slice 08 also contains: "Slice 07 is the 'escape valve' for parallel work if the main 02→03→04→05→06 chain stalls." This is redundant — the escape valve note now appears in both the rationale section (correct) and inside the slice 08 table row (confusing placement, since it's about slice 07's role, not slice 08's scope). The table row for slice 07 itself does not mention this escape valve role.

Resolution: DIRECTLY_ACTIONABLE — Remove the escape valve sentence from slice 08's table rationale column (it doesn't describe slice 08). Optionally add a brief note to slice 07's table rationale column: "Also serves as escape valve for parallel work if the main 02→06 chain stalls."

---

**[MINOR]** `goal-refining.md [05-sub-agent-commands]`: `--inline` budget risk is unstated despite being the highest-risk novel feature in slice 05

Round-1 raised this as IMPORTANT (slice 05 dependency depth compounds tree model risk). The goal-refining.md has added concrete success criteria for budget testing (default ~20KB, custom value, decisions/learnings inclusion). However, the `--inline` budget logic is a novel feature with no tracer bullet precedent — the tracer bullet proved jqjs and citty but not MarkdownEntry tree traversal with size budgeting. The slice 05 scope boundaries do not acknowledge this as a risk area.

The feature is correctly ordered (after slice 03 which gives epic directory structure with markdown) and the success criteria are concrete. The gap is that if the budget logic turns out to require significant iteration, the slice 05 verification (which exercises all start-*/submit-* pairs) cannot be completed, and quest lifecycle verification in the same slice is blocked. These two features (context bundling and quest lifecycle) are bundled together with no stated mitigation if one stalls.

Resolution: DIRECTLY_ACTIONABLE — Add a scope note to slice 05: "Risk: --inline budget logic is novel (no tracer bullet precedent). If budget implementation takes significantly longer, quest lifecycle commands can be verified independently without --inline. The two features are independent in implementation."

---

**[MINOR]** `goal-refining.md [03-epic-lifecycle]` / `goal-refining.md [04-slice-lifecycle]`: No explicit statement of what constitutes "blocking" for sequential dependency

Slice 04 depends on slice 03. Slice 03 is the most complex entity lifecycle (~20 transition rows, 12+ statuses). The slice 04 sequencing note says "Depends on epic (slices belong to epics)." This is accurate but underspecifies what "depends on" means at the implementation boundary — specifically, does slice 04 require all 20 transition rows of slice 03 to be complete, or only the minimal set (create, activate) needed to establish an active epic context?

In practice, slice 04 verification (step 1: "Initialize project, create epic, activate, create slice...") requires only epic:create and epic:activate to work. The full epic phase chain (explore → architecture → slicing) is not needed for slice 04 verification. This means if slice 03 completes create/activate but stalls on the phase chain, slice 04 could still proceed.

This unacknowledged partial-dependency option is not documented, which means an implementer reading the sequencing would wait for all of slice 03 before starting slice 04, when in practice the minimal dependency is much smaller.

Resolution: DIRECTLY_ACTIONABLE — Add a note to slice 04's scope or sequencing row: "Minimal dependency on slice 03: requires only epic:create and epic:activate. Full phase chain not needed for slice 04 verification. Slice 04 can begin once epic:create + epic:activate are working."

## Score: 8/10

The three IMPORTANT dependency corrections from round 1 are all verified fixed. The sequencing is fundamentally sound: unknowns front-loaded (recursive tree model in 02), entity lifecycles build in order of dependency (epic before slice before quest), cross-cutting features after the entities they span (06 after 05), skills audit after command surface stabilizes (07 after 06), integration tests last (08). The remaining issues are about documentation completeness and risk acknowledgment rather than structural problems. To reach 9+: document the submit-* intra-slice contract in slice 05's scope boundaries (IMPORTANT above), add the partial-dependency note for slice 04 (MINOR above), and resolve the user input on slice 02 scope.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
