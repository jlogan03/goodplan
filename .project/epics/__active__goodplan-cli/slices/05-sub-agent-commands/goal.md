# Sub-Agent Commands & Quest Lifecycle

## What We're Building
The start-*/submit-* command pairs that LLM sub-agents use to interact with the CLI during workflow phases. `start-*` assembles context bundles (with `--inline` budget-based content inlining from MarkdownEntry nodes in the state tree). `submit-*` triggers state transitions after the sub-agent has written content to the filesystem. Also includes the full quest lifecycle (create through complete) — quests mirror slices but without sequential enforcement or epic association.

## Behavior
1. `goodplan start-plan --slice 01-auth --inline` assembles context: slice goal, architecture (from MarkdownEntry nodes), conventions, decisions, learnings — inlined up to budget. Returns JSON with `inline` (content map) and `references` (remaining paths).
2. `goodplan submit-plan --slice 01-auth` verifies plan.md exists in state tree (hasChild check), triggers COMPLETE_PLAN transition.
3. All start-*/submit-* pairs: start-explore, submit-explore, start-architecture, submit-architecture, start-slices, submit-slices, start-refinement, submit-refinement (with scores), start-implementation, submit-implementation, and the refine-architecture/refine-slices variants.
4. `--inline` budget: boolean true = default (~20KB), numeric = custom. Content inlined in phase-specific priority order. Tree traversal collects MarkdownEntry children from DirectoryEntry nodes.
5. Quest lifecycle: `goodplan quest:create --name fix-logging --goal "..."`, plan → refine → implement → complete. No sequential enforcement. No epic association. Learnings append at completion.

## Success Criteria
- [ ] `goodplan start-plan --slice 01-auth --inline --json` — returns ContextBundle with inlined markdown content and file references
- [ ] Inlined content respects budget — total size does not exceed default (~20KB) or custom value
- [ ] `goodplan submit-plan --slice 01-auth --json` — triggers COMPLETE_PLAN, slice transitions to plan-created
- [ ] `goodplan submit-refinement --slice 01-auth --json` (with scores stdin) — triggers COMPLETE_REFINEMENT_ROUND, records scores
- [ ] All 8 start-*/submit-* pairs work for their respective phases
- [ ] `goodplan quest:create --name fix-logging --goal "Fix logging" --json` — creates quest.json
- [ ] Full quest lifecycle: create → plan → refine → implement → complete — all transitions work
- [ ] Quest has no sequential enforcement — can plan any quest regardless of other quest states
- [ ] Quest completion appends learnings to quest-level and project-level learnings.jsonl
- [ ] Binary: compile and run start-plan + submit-plan against compiled binary

## Verification
1. Initialize project, create epic, activate, create slice.
2. Run `start-plan --slice 01-auth --inline --json` — verify context bundle has inlined content.
3. Write a plan.md manually, then `submit-plan --slice 01-auth` — verify state transition.
4. Walk through refinement: start-refinement, submit-refinement with scores.
5. Create a quest, walk through its lifecycle.
6. Test budget: `start-plan --inline=500 --json` — verify content is truncated at budget.
7. Compile and test key commands against binary.

## Scope Boundaries
**In scope:** All start-*/submit-* command pairs, context bundling module (src/core/context/), --inline budget logic, per-phase content priority tables, tree traversal for MarkdownEntry collection, quest entity lifecycle (all QuestStatus values), quest CRUD commands.
**Out of scope:** Decision commands (slice 06), learnings rollup command (slice 06), full status command (slice 06). Skills migration (slice 07).
