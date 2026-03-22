# Sub-Agent Commands & Quest Lifecycle

## What We're Building
The start-* context bundling commands and remaining submit-* commands that LLM sub-agents use to interact with the CLI during workflow phases. `start-*` assembles context bundles (with `--inline` budget-based content inlining from MarkdownEntry nodes in the state tree). The epic-phase submit commands (submit-explore, submit-architecture, submit-slices, submit-refine-architecture, submit-refine-slices) trigger state transitions after the sub-agent has written content. Note: submit-plan, submit-refinement, and submit-implementation were implemented in slice 03. Also includes the full quest lifecycle (create through complete) — quests mirror slices but without sequential enforcement or epic association.

## Behavior
1. `goodplan start-plan --slice 01-auth --inline` assembles context: slice goal, architecture (from MarkdownEntry nodes), conventions, decisions, learnings — inlined up to budget. Returns JSON with `inline` (content map) and `references` (remaining paths).
2. `goodplan submit-explore --epic my-epic` triggers COMPLETE_EXPLORE after sub-agent has written exploration artifacts.
3. All start-*/submit-* pairs: start-explore/submit-explore, start-architecture/submit-architecture, start-slices/submit-slices, start-refine-architecture/submit-refine-architecture, start-refine-slices/submit-refine-slices (epic-phase pairs), plus start-plan, start-refinement, start-implementation (context bundling for slice/quest phases — the corresponding submit-* commands are in slice 03).
4. `--inline` budget: boolean true = default (~20KB), numeric = custom. Content inlined in phase-specific priority order. Tree traversal collects MarkdownEntry children from DirectoryEntry nodes.
5. Quest lifecycle: `echo '{"name":"fix-logging","goal":"..."}' | goodplan quest:create`, plan → refine → implement → complete. No sequential enforcement. No epic association. Learnings append at completion (state machine apply function handles rollupTo writes during COMPLETE_QUEST).

## Success Criteria
- [ ] `goodplan start-plan --slice 01-auth --inline --json` — returns ContextBundle with inlined markdown content and file references
- [ ] Inlined content respects budget — total size does not exceed default (~20KB) or custom value
- [ ] `goodplan start-explore --epic my-epic --inline --json` — returns ContextBundle with exploration context
- [ ] `goodplan submit-explore --epic my-epic --json` — triggers COMPLETE_EXPLORE, epic transitions to explored
- [ ] `goodplan submit-architecture --epic my-epic --json` — triggers COMPLETE_ARCHITECTURE
- [ ] `goodplan submit-slices --epic my-epic --json` — triggers COMPLETE_SLICING
- [ ] All start-*/submit-* pairs work for their respective phases (5 epic-phase pairs + 3 start-* context bundlers for slice/quest)
- [ ] `echo '{"name":"fix-logging","goal":"Fix logging"}' | goodplan quest:create --json` — creates quest.json
- [ ] Full quest lifecycle: create → plan → refine → implement → complete — all transitions work
- [ ] Quest has no sequential enforcement — can plan any quest regardless of other quest states
- [ ] Quest completion appends learnings to quest-level and project-level learnings.jsonl
- [ ] `goodplan start-plan --slice 01-auth --inline --json` — default budget (~20KB): verify inlined content size is under default budget
- [ ] Context bundling includes decisions and learnings — manually create decisions.jsonl and learnings.jsonl entries, verify they appear in context bundle output
- [ ] Binary: compile and run start-explore + submit-explore against compiled binary

## Verification
1. Initialize project, create epic, activate, create slice.
2. Manually create decisions.jsonl and learnings.jsonl entries in .project/ to test context inclusion.
3. Run `start-plan --slice 01-auth --inline --json` — verify context bundle has inlined content including decisions and learnings.
4. Run `start-explore --epic my-epic --inline --json` — verify epic-phase context bundling works.
5. Write exploration artifacts, then `submit-explore --epic my-epic` — verify state transition to explored.
6. Walk through architecture: `start-architecture`, `submit-architecture` — verify state transition.
7. Walk through slice plan: write plan.md, `submit-plan --slice 01-auth` (from slice 03), `goodplan start-refinement --slice 01-auth --inline --json` (verify ContextBundle with `inline` map and `references` array), `submit-refinement --slice 01-auth` with scores.
8. Run `start-implementation --slice 01-auth --inline --json`, write implementation, `submit-implementation --slice 01-auth`.
9. Create a quest: `echo '{"name":"fix-logging","goal":"Fix"}' | goodplan quest:create`. Walk through its lifecycle. Complete with `echo '{"verificationPassed":true,"learnings":[{"category":"worked","summary":"Test","detail":"...","tags":[],"rollupTo":["project"]}],"architectureDelta":[]}' | goodplan quest:complete --quest fix-logging --json`.
10. Test budget: `start-plan --inline=500 --json` — verify content truncated. `start-plan --inline --json` — verify default budget (~20KB).
11. Compile and test key commands against binary.

## Scope Boundaries
**In scope:** All start-* context bundling commands, epic-phase submit commands (submit-explore, submit-architecture, submit-slices, submit-refine-architecture, submit-refine-slices), context bundling module (src/core/context/), --inline budget logic, per-phase content priority tables, tree traversal for MarkdownEntry collection, quest entity lifecycle (all QuestStatus values), quest CRUD commands. Context bundling reads decisions and learnings from state tree even though decision/learning *commands* are slice 06. Depends on submit-plan, submit-refinement, submit-implementation being available from slice 03. Risk: --inline budget logic is novel (no tracer bullet precedent). If budget implementation takes significantly longer, quest lifecycle commands can be verified independently without --inline — the two features are independent in implementation.
**Out of scope:** submit-plan, submit-refinement, submit-implementation (slice 03). Decision commands (slice 06), learnings rollup command (slice 06), full status command (slice 06). Skills migration (slice 07).
