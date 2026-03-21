# Risk/Dependency Analysis Review

## Summary

The sequencing is well-designed. The tracer bullet correctly front-loads the highest-risk unknowns (Bun compilation, citty colon-namespaces, jqjs in binary). The dependency graph is a clean DAG with no cycles. Slice 07 (skills migration) is correctly identified as parallel. The main concerns are: slice 01 takes on too much scope for a tracer bullet, the 02/03 parallel opportunity is underexploited, and slice 05's dependency on 04 appears unnecessary.

## Criterion 1: Unknown Front-Loading

**Score: 8/10**

Slice 01 correctly targets the riskiest unknowns first: Bun compilation with all deps, citty colon-namespace routing, jqjs in compiled binary, and Zod integration. Research files confirm these are genuinely uncertain (jqjs has only 97 GitHub stars, citty is v0.x, WASM alternatives were eliminated). This is textbook tracer bullet design.

### Issues

- **[01-tracer-bullet/goal-refining.md] Important: Tracer bullet scope creep risks diluting its purpose.** The slice includes `goodplan schema --json`, `--query` via jqjs, `--quiet` mode, structured error JSON with exit codes, and full output formatting. A true tracer bullet should prove the riskiest integration points with minimal surface area. If citty colon-namespaces don't work, the effort spent on schema/query/quiet is wasted. Consider: init + status + compile = tracer bullet. Move schema, --query, --quiet to slice 05 where they belong with the read surface.

- **[sequencing-refining.md] Minor: No explicit risk identification for state machine complexity.** The transition tables in architecture are extensive (multiple entity types, cross-entity guards, circuit breakers, override paths). Slice 03 is sequenced early enough, but the sequencing rationale doesn't acknowledge that getting the guard/transition design right is a significant design risk -- not just an implementation task.

## Criterion 2: Circular Dependencies

**Score: 10/10**

No circular dependencies. The dependency graph is:

```
01 (tracer) -----> 02 (data) -----> 04 (rpc) -----> 05 (read) -----> 06 (mutate) -----> 08 (integration)
      \                               ^
       `---------> 03 (state) -------'
07 (skills) -- independent
```

This is a clean DAG. Each node has at most two parents. No implicit dependencies detected.

## Criterion 3: Ordering Robustness

**Score: 7/10**

### Issues

- **[sequencing-refining.md] Critical: Slice 05 declares dependency on 04 (RPC), but read commands bypass RPC.** The architecture overview explicitly states: "Read-only commands (list, show) bypass the RPC layer and go directly from Commands to the Data Layer." The flows doc confirms `status` goes through RPC, but list/show commands don't. Slice 05's dependency should be on 02 (data layer) only, with 04 as a dependency only for the deepened `status` command. This false dependency means slice 05 is blocked longer than necessary -- it could start as soon as slice 02 completes, in parallel with slice 04.

- **[sequencing-refining.md] Important: Slice 03 (state machine) and 02 (data layer) could run in parallel but are both listed as depending only on 01.** The sequencing table implicitly sequences them (02 before 03 by number), but they have no dependency on each other. Slice 03 depends on 01 for schemas only; slice 02 depends on 01 for the minimal data layer. These are independent work streams. Making this explicit in the rationale would clarify that 02 and 03 can proceed concurrently, potentially shortening the critical path.

- **[08-integration-test/goal-refining.md] Minor: Integration tests depend only on 06, but fitness functions reference slice 02-04 internals.** Fitness functions for state machine purity and data layer determinism could be written and run much earlier (after slices 03 and 02 respectively). Bundling them into slice 08 means these quality signals arrive late. Consider splitting fitness functions into their respective slices and keeping only end-to-end integration tests in slice 08.

## Criterion 4: Dependency Minimality

**Score: 8/10**

Inter-slice coupling is generally minimal and explicit. Each slice defines a clean subsystem boundary matching the architecture's four-layer model. The sequencing table makes dependencies visible.

### Issues

- **[04-rpc-core/goal-refining.md] Important: RPC slice bundles too many concerns, creating a wide dependency surface.** Slice 04 includes: begin/complete/submit/startContext, load-reduce-commit cycle, context bundling with inline budget, activity logging, state diff logging, AND dry-run mode. Context bundling is called out as a "distinct concern" in the architecture overview (`src/core/context/`). If context bundling proves harder than expected (priority ranking, budget management, inline serialization), it could delay all of slices 05-08. Consider whether context bundling could be a separate slice or at least explicitly called out as a risk within slice 04.

- **[06-commands-mutate/goal-refining.md] Minor: Depends on 05 (read commands), but the dependency isn't structurally necessary.** Mutation commands route through RPC (slice 04). The dependency on slice 05 appears to be for shared output formatting infrastructure, but this could be extracted as a shared module during slice 05 without creating a hard dependency. If read commands hit unexpected issues, mutation commands are blocked unnecessarily.

## Overall Assessment

| Criterion | Score |
|---|---|
| Unknown front-loading | 8/10 |
| Circular dependencies | 10/10 |
| Ordering robustness | 7/10 |
| Dependency minimality | 8/10 |
| **Overall** | **8/10** |

## Issue Summary

| Severity | Count | Key Issues |
|---|---|---|
| Critical | 1 | Slice 05 false dependency on 04 blocks parallelism |
| Important | 3 | Tracer bullet scope creep; 02/03 parallelism not explicit; RPC bundles too many concerns |
| Minor | 3 | Late fitness functions; 06->05 dependency unnecessary; state machine design risk unacknowledged |
