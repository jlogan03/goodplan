# Tracer Bullet Quality Review — Round 3

**Score: 9/10** | Critical: 0, Important: 1, Minor: 2

## Summary

All three round-2 important issues are resolved. The binary smoke test is now explicit in slice 04 verification (step 6). The slice 06 lifecycle walkthrough now includes the full refinement loop (steps 8-9) and implementation loop (steps 10-12) with concrete assertions. Slice 08 now opens with a binary compilation step before running integration tests. The three round-2 minor issues are also resolved: the jqjs smoke test specifies a concrete expected value and explicitly notes exclusion from schema output; the state machine fitness function cross-validates the discriminated union against transition table row count; and `--quiet` mode has a concrete success criterion. One important issue and two minor issues remain.

## Critical Issues

None.

## Important Issues

### 06-commands-mutate/goal-refining.md: `submit-plan` mandatory status not reflected in lifecycle verification step 6

Behavior item 3 states "submit-* commands read content from stdin and trigger state transitions" and the success criteria explicitly include `submit-plan --slice 01-auth` advancing to `plan-created`. The numbered verification walkthrough (step 6) says "Pipe plan content to `submit-plan --slice 01-test` — assert: exit 0, plan file written." The assertion stops at "plan file written" without verifying the state transition — step 7 (`goodplan status --json`) is a separate step that asserts `slice status = "plan-created"`. This is correct but the gap between step 6 and step 7 means a broken state transition (plan file written but state not advanced) could pass step 6 and only fail on step 7's status check. More critically: the `submit-plan` command is described in behavior as mandatory for advancing state, but verification step 5 (`slice:plan`) doesn't assert a blocking state (e.g., status = "planning" not "plan-created") before step 6 runs — so a regression where `slice:plan` itself advances to `plan-created` (skipping `submit-plan`) would not be caught. Step 7 only checks the final state, not that submit-plan was the mechanism.

**Recommendation:** Split the assertion in step 6 to be two-part: "assert: exit 0, plan file written AND `goodplan status --json` shows slice status = `plan-created`." Also add an assertion after step 5 that slice status is `planning` (not yet `plan-created`) before submit-plan runs — this confirms submit-plan is the causal mechanism.

## Minor Issues

### 03-state-machine/goal-refining.md: Blocking gate wording creates ambiguity about when enum reconciliation must complete

The blocking gate at the end of the file states: "EpicStatus/SliceStatus/QuestStatus enum values MUST be reconciled between `state-machine-api.md` and `transition-tables.md` before any state machine code is written." The success criteria also include this as an item: "EpicStatus/SliceStatus/QuestStatus enum values reconciled — transition tables are source of truth, reconciliation documented before any code written." Both say the same thing in slightly different words. The duplication is not harmful, but neither location specifies who does the reconciliation or where the output is documented. An implementer could plausibly write the reconciliation inline in a code comment and consider it "documented" — missing the intent that the architecture documents (not source code) should be updated.

**Recommendation:** Clarify the output artifact. Either add "document reconciliation in `architecture/state-machine-api.md` before implementation begins" or collapse the two statements into one with an explicit deliverable.

### 08-integration-test/goal-refining.md: Fitness function test count verification uses markdown parsing despite slice 03 establishing a code-derived method

Success criteria item 6 says "Fitness: count of transition test cases matches count derived from the `StateEvent` discriminated union (same counting method as slice 03's fitness function — do not parse markdown separately)." The verification step 4 then says "Verify test count matches transition table: count lines in transition-tables.md with `"entity":"entity"|...` and `"to"` field, compare to test case count." This verification step contradicts the success criterion — it describes parsing the markdown file, which the success criterion explicitly prohibits. A passing implementation could satisfy the success criterion (code-derived count) while verification step 4 is describing a different (invalid) counting approach. The inconsistency creates confusion about which method is authoritative at review time.

**Recommendation:** Replace verification step 4 with: "Run `bun test tests/fitness/` — the fitness function derives expected count from `StateEvent` discriminated union and asserts test count matches. Verify the fitness test itself does not import or parse `transition-tables.md`."

## What Works Well

- **Slice 04** binary smoke test in verification step 6 is concrete and correct: compile binary, run `goodplan status --json`, verify correct JSON with full RPC wired. Fully resolves the round-2 issue.
- **Slice 06** lifecycle verification now covers the full loop: steps 8-12 add start-refinement, submit-refinement with scores above threshold, start-implementation, submit-implementation, and slice:complete with verificationPassed — all with concrete assertions. The refinement and implementation loops are now exercised.
- **Slice 08** binary compilation is now step 1 in verification, with exit code and size checks before integration tests run.
- **Slice 01** jqjs smoke test now specifies concrete expected output (project name returned), explicitly notes exclusion from schema output, and notes removal in slice 05 — all three round-2 minor concerns addressed.
- **Slice 03** fitness function cross-validates discriminated union member count against transition table row count — the undercounting risk is explicitly guarded.
- **Slice 05** `--quiet` mode now has a concrete success criterion: one line per epic with name and status only, no headers, no formatting. Unambiguous.
- **Sequencing** remains correct. 02/03 parallelism, 05 partial dependency on 04, and 07 soft dependency on 06 are all accurately described.
- **Slice 06 prerequisites** correctly flag the `learning:rollup` routing ambiguity as a pre-slice-03 blocking decision.
