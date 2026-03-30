# Phase 1 Review: Initiative Conventions

**Reviewer**: Generalist
**Score**: 9/10

## Summary

The `initiative-conventions.md` file is well-structured, comprehensive, and faithfully implements the plan. The state machine, transition tables, two-layer architecture model, and consumer guide all align with `workflow.md`. The `state-and-flow-formats.md` update is minimal and correct.

## Plan Adherence

All plan tasks are completed:
- [x] Directory structure (first + subsequent variants)
- [x] `__active__` prefix convention
- [x] State machine with first-match-wins ordering
- [x] State transition tables (both initiative types)
- [x] First initiative special cases
- [x] Two-layer architecture model with reader/writer table
- [x] Rollback / unapproval section
- [x] Archive numbering
- [x] Consumer guide
- [x] `state-and-flow-formats.md` updated with initiative scope values

The plan's note about `abandoned.md` precedence ordering (row #1 vs workflow.md's parenthetical) is correctly implemented and documented with a callout explaining the intentional difference.

## Cross-File Integration

### initiative-conventions.md vs workflow.md

State machine conditions match workflow.md's "File Existence as State Machine > Per Initiative" section with one structural improvement (first-match-wins ordering for `abandoned.md`). Verified:

- First initiative states 5-8 match workflow.md's first-initiative conditions
- Subsequent initiative states 5-9 match workflow.md's subsequent-initiative conditions
- Shared states 1-4 match workflow.md's terminal/late-stage conditions
- Directory structure matches workflow.md's file tree under `initiatives/`
- Two-layer architecture description is consistent with workflow.md's "Two-Layer Architecture" section
- Archive naming convention (`~~archived~~NN_<name>`) matches workflow.md

### initiative-conventions.md vs status-logic.md

The convention file correctly mirrors status-logic.md's pattern:
- First-match-wins ordering
- Table format with numbered rows
- Same structural approach (check order matters)

### state-and-flow-formats.md update

The added line `For initiative-scoped slices, use initiatives/<name>/vertical-slices/<name> as the scope value.` correctly extends the existing scope convention without disrupting the existing format.

## Findings

### Minor Issues

**1. Skill name inconsistency: `/start-project` vs `/create-initiative`**

The plan says Phase 2 will rename `/start-project` to `/create-initiative`. But in `initiative-conventions.md`:
- Line 11: "Created by `/start-project` as `__active__initial/`"
- Line 87: "First initiative: created as `__active__initial/` by `/start-project`"
- Consumer guide line 234: "`/create-initiative`, `/start-project`"

The transition table (line 137) uses `/create-initiative`. The convention file uses both names, which is technically correct for now (the rename hasn't happened yet), but creates a document that will need updates in Phase 2. The plan didn't explicitly say "use future names" or "use current names" — this is a judgment call. However, since this is a reference document that future phases will consume, using the future name consistently would have been cleaner. The consumer guide listing both names is fine.

**Severity**: Minor — will be naturally resolved in Phase 2.

**2. State machine row 3: "All slices complete" is ambiguous before slices exist**

Shared state row 3 says: "All slices complete, no `completion/`". If `vertical-slices/sequencing.md` exists but contains zero slices (or the directory is empty), does "all slices complete" vacuously hold true? In practice this shouldn't happen (define-slices would create at least one slice), but the condition could be more precise: "All defined slices complete" or add "at least one slice exists."

**Severity**: Minor — edge case that won't occur in normal workflow.

**3. Subsequent initiative: `architecture/` population timing unclear**

The directory structure shows subsequent initiatives have an `architecture/` directory (line 71-72: "target architecture (populated after approval)"). The two-layer architecture table says `/start-initiative` "Reads proposal, writes `approved.md`" but doesn't mention populating `architecture/` from the proposal. Who creates the `architecture/` directory for subsequent initiatives? The transition table says `/start-initiative` writes `approved.md` and renames to `__active__`, but doesn't mention creating `architecture/`.

This might be intentionally deferred to Phase 3 (the `/start-initiative` skill), but the convention file implies `architecture/` exists for subsequent initiatives without documenting who creates it.

**Severity**: Minor — likely a Phase 3 concern, but worth noting for that phase's implementation.

## Verification Cross-Check

The implementation agent reported a smoke test simulating 8 stages of first-initiative progression. The state machine has 8 first-initiative states (shared 1-4 + first-init 5-8), so coverage looks correct. No way to independently verify the simulation without the test artifacts, but the state machine logic is straightforward and manually traceable.

## Verdict

Solid implementation. The convention file is comprehensive, well-organized, and faithful to both the plan and workflow.md. The three minor issues are all edge cases or cross-phase concerns that don't affect the document's correctness for its intended purpose. No critical or important issues found.
