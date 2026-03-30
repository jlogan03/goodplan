# Risk/Dependency Analysis Review

## Summary

The sequencing is strong. High-risk unknowns are correctly front-loaded in slice 01, the dependency graph is acyclic and minimal, and the mechanical rollout slices (04, 05) are well-insulated from each other. The main concerns are around slice 02's scope (it bundles several unrelated changes) and assumptions about CLI code completeness after slice 02.

**Score: 8/10**

---

## Issues

### IMPORTANT: `sequencing-refining.md` — Slice 02 bundles unrelated risk domains, masking dependency granularity

Slice 02 combines five distinct deliverables: `show --json` artifacts enrichment, `status --json` file arrays, `begin()` RPC factoring, result type `context?`/`paths?` fields, and semver compatibility checking. These have different risk profiles and different downstream consumers. The RPC factoring is a refactoring with regression risk (the learning "Non-entity RPC operations need dedicated return types" from slice 06 confirms this was contentious). Semver checking is a cross-cutting concern that touches the command dispatcher. Bundling them means a failure in RPC refactoring blocks the ergonomic enrichments that slices 03-05 actually depend on.

**Recommendation:** Consider whether the RPC factoring (`begin()` extraction) could be split out or explicitly sequenced within slice 02's plan so that `show --json` artifacts and `status --json` enrichments land first. Slices 03-05 depend on the enrichments, not the RPC factoring. At minimum, the plan for slice 02 should sequence enrichments before refactoring.

### IMPORTANT: `goal-refining.md [03]`, `goal-refining.md [04]`, `goal-refining.md [05]` — "CLI code changes should be complete" assumption is fragile

Slices 03, 04, and 05 all state that CLI code changes should be complete from slices 01-02. But slices 03-05 are migrating 13 skills that exercise the full breadth of CLI interactions. The key constraint "CLI conforms to skills, not the reverse" (architecture overview) means CLI gaps discovered during skill migration require CLI changes. The convention doc and architecture explicitly anticipate this.

The risk: if slice 03 discovers a CLI gap (e.g., a missing `paths` field, an error code not surfaced, a `start-*` command that doesn't return expected context), it must either fix it inline (expanding scope) or create a side quest (adding coordination overhead). Neither is acknowledged.

**Recommendation:** Each of slices 03, 04, and 05 should explicitly include "CLI gap fixes" in their scope boundaries as in-scope, and their success criteria should not assume zero CLI changes. The convention doc update task in each slice partially covers this, but CLI code changes are a different category from doc updates.

### IMPORTANT: `goal-refining.md [01]` — jqjs library risk is unacknowledged

The `state --json --query` command depends on jqjs for server-side jq evaluation. The architecture mentions "jqjs (already implemented for other commands)" but this is a novel usage pattern: applying jq to the full `assembleState()` tree, which can be large. Performance characteristics of jqjs on large trees, correctness of complex jq expressions (the examples include `select`, `to_entries`, pipe chains), and edge cases (empty results, type mismatches) are all unknowns. The learnings file notes "Skills that propose tools/libraries need a research step" — yet no research or spike is mentioned for jqjs at scale.

**Recommendation:** Slice 01 should include a verification step that runs the specific jq expressions from the success criteria against a realistic state tree (the goodplan repo itself) and confirms performance is acceptable. This is partially covered by the verification section but could be more explicit about tree size concerns.

### MINOR: `goal-refining.md [04]`, `goal-refining.md [05]` — Parallel slices share a dependency but no coordination protocol

Slices 04 and 05 both depend on slice 03 and can run in parallel per the dependency graph. Both may discover convention doc gaps and both list "convention doc updates" as in scope. If both run concurrently (or overlap), they could produce conflicting convention doc updates.

**Recommendation:** Add a note in sequencing-refining.md that if slices 04 and 05 run concurrently, convention doc updates should be coordinated (e.g., one slice owns the doc, the other submits changes as suggestions, or they run sequentially).

### MINOR: `goal-refining.md [06]` — Dogfooding scope is open-ended with no exit criteria bound

Slice 06 says "fix issues as they're discovered" with success criteria including "all friction points documented as issues and resolved." This is an unbounded scope. A dogfooding cycle on a real project could surface an arbitrary number of issues, from minor ergonomic complaints to fundamental design gaps requiring architectural changes.

**Recommendation:** Add exit criteria bounds: e.g., "one full workflow cycle completes end-to-end; critical issues (blocking workflow) are fixed; non-critical issues are logged as deferred work for a future epic." This prevents slice 06 from becoming an open-ended maintenance phase.

### MINOR: `goal-refining.md [01]` — Convention doc is both deliverable and dependency, creating a chicken-and-egg risk

Slice 01 writes the convention doc (`skills/_shared/references/cli-interaction.md`) and also migrates `project-status` against it. But the convention doc adapts `cli-interaction-conventions.md` from the architecture, which itself may need revision as the actual CLI implementation reveals gaps. If the convention doc needs significant revision during slices 02-03, all skills migrated against the original version may need updates.

The sequencing rationale correctly identifies this: "Validates on 2-3 core skills, then mechanical rollout." But the goal for slice 03 says "Convention doc updated with any patterns discovered during migration" — meaning the doc is expected to evolve. Skills migrated in slices 04-05 against a stale convention doc could embed outdated patterns.

**Recommendation:** This is already mitigated by the "convention doc updates" task in each slice. No action needed, but note that convention doc stability is the primary risk to the "mechanical rollout" assumption in slices 04-05. If slice 03 produces major convention doc revisions, the "mechanical" characterization of 04-05 may not hold.

---

## Strengths

- **Unknown front-loading is excellent.** Slice 01 tackles the highest-risk unknown (state command + jqjs query + convention doc authoring) with the simplest skill (project-status) as the tracer bullet. This is textbook risk management.
- **Dependency graph is clean.** Linear chain 01 -> 02 -> 03, then 04 and 05 fan out from 03, and 06 joins both. No circular dependencies. Each slice has explicit, minimal predecessor requirements.
- **Failure isolation is good.** If slice 04 fails, slice 05 is unaffected (they share no dependency beyond 03). If slice 06 reveals gaps, the earlier slices' core deliverables remain valid.
- **The "CLI conforms to skills" constraint is the right escape valve.** It prevents the plan from being invalidated by skill-side discoveries, since the CLI is the flexible component.
- **Learnings integration is strong.** The plan clearly applies past learnings: convention-first ordering (from initiatives-infrastructure), dedicated return types for non-entity operations (from decisions-learnings), and binary-spawning test requirements (from integration-test).
