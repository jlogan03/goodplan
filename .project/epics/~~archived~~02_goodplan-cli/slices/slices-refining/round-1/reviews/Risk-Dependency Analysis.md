# Risk/Dependency Analysis Review

## Issues

**[IMPORTANT]** `sequencing-refining.md`: Slice 02 is the highest-risk slice but has no fallback if the recursive tree model fails

Slice 02 (project-init) is explicitly described as validating "the hardest architectural question (does the recursive tree model work?)." This is correct front-loading. However, the sequencing document does not address what happens if this architectural bet fails or needs significant rework. Every subsequent slice (03-08) depends on the recursive tree model, `assembleState()`, `commitState()`, and the `reduce()` function scaffold. If slice 02 reveals that the recursive tree diff approach is too complex or has performance issues (e.g., large `.project/` trees with many markdown files), the entire sequence stalls. The slice goal itself is extremely large in scope (recursive tree types, tree navigation, schema registry, assembleState with zero-state and filesystem scanning, commitState with recursive diff, loadState with cache, concurrent modification detection, atomic writes, debug logging, reduce scaffold, ALL Zod entity schemas, refactored init command). Consider: (a) noting the risk explicitly in the sequencing rationale, and (b) identifying which parts of slice 02 could be cut if the tree model needs iteration (e.g., cache, concurrent modification detection could move to a later slice).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [02-project-init]`: Scope is very large for a single slice, increasing delivery risk

Slice 02's in-scope list includes: recursive tree types (4 entry types + union), tree navigation helpers (6 functions), schema registry, assembleState (with zero-state + filesystem scanning), commitState (with recursive diff + directory creation + concurrent modification detection + atomic writes), loadState with cache, debug logging infrastructure, reduce function scaffold with INIT_PROJECT handler, ALL Zod entity schemas (project, epic, slice, quest, overview, activity-log, decision, learning, architecture-delta -- 9+ schemas), refactored init command, and reconciling conventions.md. This is effectively building the entire data layer, state machine scaffold, AND all entity schemas in one slice. If any part takes longer than expected, the entire slice blocks. The architecture overview lists the data layer and state machine as separate subsystems -- this single slice builds both foundations simultaneously.

Resolution: USER_INPUT

---

**[IMPORTANT]** `goal-refining.md [05-sub-agent-commands]`: Dependency on slice 04 is stated, but the actual dependency is broader

Slice 05 depends on slice 04 (slice lifecycle), but the context bundling feature (`--inline` budget, MarkdownEntry traversal) also requires the recursive tree model from slice 02 to be stable and performant. The `--inline` feature reads MarkdownEntry nodes from the state tree -- if the tree contains many large markdown files (architecture docs, research, brainstorm), the budget logic needs to handle content that could be megabytes in aggregate. The sequencing rationale says "Sub-agent integration requires slice lifecycle to be in place" but the real risk is in the content inlining budget logic, which is a novel feature with no precedent in the tracer bullet. The dependency chain is: 02 (tree model) -> 03 (epic with directory structure for markdown) -> 04 (slice with plan.md) -> 05 (context bundling reads all of these). This is correct ordering but the dependency depth means any tree model issues in 02 compound through to 05.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `sequencing-refining.md`: Slice 08 depends on 06, but should also depend on 05

Slice 08 (integration tests) lists dependency on 06 only. However, the success criteria include "Full quest lifecycle integration test passes alongside an active epic" -- quest lifecycle is implemented in slice 05, not 06. The full workflow test (init -> create epic -> ... -> plan -> refine -> implement -> complete) also exercises start-*/submit-* commands from slice 05 (the sub-agent flow is the canonical way plan/refine work). Additionally, fitness function "state machine completeness" requires testing all (status, event) pairs from the StateEvent union, which includes quest events from slice 05. The dependency should be explicitly `05, 06` or just `06` with a note that 05 is transitively included.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [07-skills-migrate]`: "Soft dep on 06" is ambiguous and could cause ordering confusion

Slice 07 says `None (soft dep on 06)` in sequencing. This means it could theoretically be done in parallel with slices 05-06. However, the goal says "Completing after 06 avoids rework from command surface changes." If the command surface changes during slices 03-06 (which is likely -- new commands are added in every slice), then starting 07 early would definitely cause rework. The "soft" dependency is effectively a hard dependency on the command surface being stable. Consider either: (a) making it a hard dependency on 06, or (b) explicitly stating that 07 can start after 04 if the implementer accepts the risk of command name changes.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [06-decisions-learnings]`: Dependency stated as 04 but some features depend on 05's quest lifecycle

Slice 06 depends on 04, but the full status command needs to show quest information (active quest, quest counts). The `learning:rollup` feature description says it rolls up from "slice/quest level to epic/project level" -- quest learnings are implemented in slice 05. If slice 06 is implemented before 05, the learnings rollup and full status would need to handle the case where quests don't exist yet, or be incomplete. The sequencing has 06 after 05 in the table order, and since 05 depends on 04, the transitive ordering is correct (05 before 06). But the explicit dependency should say `04, 05` or `05` to avoid confusion about whether 06 could be parallelized with 05.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `sequencing-refining.md`: No explicit mention of cascade failure mitigation

The sequencing rationale describes the ordering logic but doesn't address what happens if a middle slice (e.g., 03 or 04) takes much longer than expected or reveals an architectural issue. Slices 03-06 form a strict sequential chain (each depends on the previous). If slice 03 stalls, slices 04-06 are all blocked. Slice 07 is the only one that could proceed independently. Consider noting that slice 07 (skills migrate) is the "escape valve" that can be done in parallel if the main chain stalls, and whether any parts of slices 05-06 could be started with stubs if 04 is delayed.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [03-epic-lifecycle]`: Phase transition chain is long and has implicit sub-phases

The epic lifecycle includes: created -> exploring -> explored -> defining-architecture -> architecture-defined -> refining-architecture -> architecture-refined -> defining-slices -> slices-defined -> refining-slices -> slices-refined -> activated -> completed/abandoned. That's 12+ statuses with transitions between them, plus verification management (add/update). This is described as the "first full entity lifecycle" but it's actually the most complex entity lifecycle (more states than slice). The rationale says "First full entity lifecycle. Proves CRUD + guards + multi-status transitions through the stack." The risk is that this is actually a very large number of state machine transitions to implement and test in one slice. The transition table shows ~20 rows for epic alone.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The sequencing is fundamentally sound -- the hardest architectural question (recursive tree model) is front-loaded in slice 02, entity lifecycles build in order of dependency (epic before slice before quest), and cross-cutting concerns land after the entities they span. The main weaknesses: (1) slice 02 is scope-heavy and represents a single point of failure for the entire chain, (2) several dependencies are implicit or understated (05->08, 05->06), and (3) there's no documented mitigation for cascade failures in the 03-06 sequential chain. To reach 9+: explicitly document all transitive dependencies, consider splitting slice 02 into "core data layer + schemas" and "state machine scaffold + init refactor," and add a brief cascade failure mitigation note to the sequencing rationale.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
