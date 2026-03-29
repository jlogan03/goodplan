# Holistic Review — Epic Lifecycle Plan (Round 2)

## Issues

**[IMPORTANT]** Phase 1 `CREATE_EPIC` event type missing `ts: string` but plan overview says it carries `ts`
The plan overview states "`ts: string` is included only on events that set timestamp fields (CREATE_EPIC, ACTIVATE_EPIC, and events updating `updated`)." Phase 1's task correctly notes CREATE_EPIC "sets `created`" and ACTIVATE_EPIC "sets `activated`". However, the canonical union in state-machine-api.md shows `CREATE_EPIC` as `{ type: 'CREATE_EPIC'; name: string; goal: string }` with NO `ts` field. Only `INIT_PROJECT` carries `ts` in the architecture. If CREATE_EPIC needs to set the `created` timestamp, either the architecture's canonical union must be amended to include `ts` on CREATE_EPIC and ACTIVATE_EPIC, or the plan must document how `created`/`activated` timestamps are set without `ts` on those events. The current plan says these events carry `ts` but the architecture disagrees — this was flagged as C1 in round 1 and the fix only partially addresses it. The plan now specifies per-event `ts`, but the architecture's canonical union still lacks `ts` on CREATE_EPIC/ACTIVATE_EPIC, creating a specification mismatch.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a task to Phase 1 (or a preliminary step) to amend state-machine-api.md's canonical StateEvent union, adding `ts: string` to CREATE_EPIC and ACTIVATE_EPIC. Alternatively, have the reducer derive timestamps from a different mechanism and remove the plan's claim that these events carry `ts`.

**[IMPORTANT]** Phase 3 `COMPLETE_EXPLORE` skip path guard mismatch with transition-tables.md
Transition-tables.md row 3 says `COMPLETE_EXPLORE` from `created` status transitions directly to `explored` (skip explore path). Phase 3's `epic-phase.ts` task says "COMPLETE_EXPLORE: guard status == created OR exploring, set explored (skip path from created)." This is correct on the surface, but the task bundles the skip path and normal path into a single handler description. The transition tables show these as two distinct rows: row 3 (from: created -> explored) and row 4 (from: exploring -> explored). The plan should make clear that there are two transition rows with different `from` states, not a single handler with an OR guard. The OR-guard approach conflates what should be separate rows (the architecture uses multi-row dispatch where each row has a single `from` state).
Resolution: DIRECTLY_ACTIONABLE
Fix: Rewrite the COMPLETE_EXPLORE task to follow the transition table structure: two rows (from: created -> explored, from: exploring -> explored), not one handler with an OR guard. This preserves the declarative table pattern specified in state-machine-api.md.

**[IMPORTANT]** Phase 2 `loadState()` incremental update semantics unclear for markdown entries
Phase 2 says "For each new file: fully read and parse it, add to the cached tree as the appropriate entry type (MarkdownEntry for .md, JsonEntry for registered .json, etc.)." However, new .json files that are NOT in the schema registry are silently skipped by `assembleState()` (line 119: `if (schema === undefined) { return undefined; }`). The `loadState()` incremental path must replicate this behavior — skip unregistered JSON files, skip non-.json/.jsonl/.md files. The plan does not specify this parity requirement, risking divergence between full assembly and incremental update.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a note to Phase 2's loadState task specifying that the incremental file-reading path must replicate `assembleState()`'s skip rules: unregistered JSON files are skipped, unknown file types are skipped, only `.json` (with schema), `.jsonl` (with schema), and `.md` files are added to the tree.

**[MINOR]** Phase 3 `epic-lifecycle.ts` ACTIVATE_EPIC guard list incomplete vs transition-tables.md
Phase 3 says ACTIVATE_EPIC: "guard status == slices-refined, guard project.activeEpic == null, guard verifications.length > 0." Transition-tables.md row for ACTIVATE_EPIC says from: slices-refined, guard: `project.activeEpic == null AND epic.verifications.length > 0`. The plan matches this correctly. No issue — confirmed correct after cross-referencing.
Resolution: N/A (verified correct)

**[MINOR]** Phase 6 end-to-end walkthrough step 4 uses empty stdin for `submit-refine-slices`
Step 4: `echo '{}' | goodplan submit-refine-slices --epic my-epic`. The `submit-refine-slices` command requires `{scores}` in stdin per Phase 6's own task definition ("Reads stdin JSON `{scores}`"). Empty `{}` will fail Zod validation since `scores` is required. The walkthrough should use realistic scores input.
Resolution: DIRECTLY_ACTIONABLE
Fix: Change step 4 to `echo '{"scores":{"completeness":9,"clarity":9}}' | goodplan submit-refine-slices --epic my-epic` or similar valid scores payload.

**[MINOR]** Phase 6 end-to-end walkthrough missing intermediate submit-* steps for epic phase chain
Step 3 says "CLI phase chain: explore -> define-architecture -> refine-architecture -> define-slices -> refine-slices (each command verifies status advance)." But several of these transitions require completing the prior phase first. For example, `epic:explore` sets status to `exploring`, but advancing to `explored` requires `submit-explore` (COMPLETE_EXPLORE). The walkthrough jumps from `epic:explore` to `epic:define-architecture` without the submit-explore step that transitions from `exploring` to `explored`. The full chain should be: `epic:explore` -> `submit-explore` -> `epic:define-architecture` -> `submit-architecture` -> `epic:refine-architecture` -> `submit-refine-architecture` -> `epic:define-slices` -> `submit-slices` -> `epic:refine-slices` -> `submit-refine-slices`.
Resolution: DIRECTLY_ACTIONABLE
Fix: Expand step 3 to include the submit-* commands between each begin/define command, or explicitly note that the chain includes both begin and submit steps at each phase.

**[MINOR]** Phase 3 transition table export alternative noted but not resolved
Phase 3 says "Export transition tables from handler files as `export const epicTransitions`... Note: an alternative approach (having fitness functions enumerate by calling `reduce()` on all (status, event) combos) avoids coupling — consider this during implementation." This defers a design decision to implementation time. For a plan review, this is acceptable since it notes both options. However, the plan should pick one approach and commit to it, or explicitly defer the decision to implementation with a note that either approach satisfies the fitness function requirement.
Resolution: DIRECTLY_ACTIONABLE
Fix: Either commit to one approach or explicitly state the decision is deferred to implementation, with both options documented as acceptable.

**[MINOR]** Phase 5 `epic:complete` reads stdin but `epic:abandon` uses flags — inconsistent input patterns
Phase 5 says `epic:complete` "reads stdin JSON `{verificationResults}`" while `epic:abandon` "requires `--epic` and `--reason` flags." This is architecturally correct (abandon has a single string payload suitable for a flag, while complete has complex structured input requiring stdin). However, the plan could note why the input patterns differ to aid implementers.
Resolution: DIRECTLY_ACTIONABLE
Fix: Add a brief note explaining the flag-vs-stdin choice: simple scalar payloads use flags, complex structured payloads use stdin. This is consistent with commands-api.md patterns.

## Score: 9/10

The plan has substantially improved from round 1. All critical issues (C1: universal `ts`, I1: missing refinement field, I2: false Before check, I3: begin() payload gap, I5: assembleState vs loadState, I6: scope crossing note, I7: deferred event list, I8: submit mapping, I9: flat registration, I10: TTY validation, I11: override flags, I12: handler Map pattern, I13: loadState wiring, I14: missing submit commands) have been addressed. The remaining issues are: one IMPORTANT item about the `ts` field specification mismatch between plan and architecture that was only partially fixed, one IMPORTANT item about transition row structure, one IMPORTANT item about loadState incremental update parity, and several MINOR items about end-to-end walkthrough accuracy and deferred design decisions. To reach 10: resolve the `ts` architecture mismatch cleanly, fix the e2e walkthrough steps, and specify the loadState skip-rule parity.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
