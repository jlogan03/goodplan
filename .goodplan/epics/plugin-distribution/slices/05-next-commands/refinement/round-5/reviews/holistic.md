# Holistic Review — Round 5

## Plan Location

`/Users/iwhite/Repos/goodplan/.goodplan/epics/plugin-distribution/slices/05-next-commands/plan-refining.md`

---

## Issues

**[MINOR]** Decision status wildcard expansion cannot use `.options` — no named Zod schema

Phase 1 task 3 specifies: "Use `.options` from the entity's Zod status enum schema (e.g., `epicStatusSchema.options`) as the canonical runtime status set for wildcard expansion." This works for epic, slice, quest, and task — all have a named `z.enum(...)` export (`epicStatusSchema`, `sliceStatusSchema`, `questStatusSchema`, `taskStatusSchema`). Decisions are different: `src/schemas/records/decision.ts` exports `decisionStatusValues` as a plain `as const` tuple (not a Zod schema object), and the `z.enum(decisionStatusValues)` call is anonymous inside the schema definition. There is no exported `decisionStatusSchema` with `.options`. Since `decisionTransitions` uses no wildcard `from` values (all rows are concrete: `from: "active"`, `from: "revisiting"`, `from: "(none)"`), this is not a runtime blocker — decision transitions don't need wildcard expansion. However, the plan's language implies `.options` is universally available across all entity types, which is misleading. An implementer following the pattern naively might write a case for decisions that fails to compile.

Fix: Add a note to Phase 1 task 3: "Decision status does not have a named Zod schema export — use `decisionStatusValues` from `src/schemas/records/decision.ts` directly for the decision status set. Wildcard expansion is not needed for decision transitions (all `from` values are concrete), so this is only relevant if decision transitions are ever extended to use wildcards."
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** INV-008 documented in epic architecture but not in `architecture/invariants.md` — plan should add it

The epic architecture (`_overview.md`) defines INV-008: "Single Transition Per Command — Every CLI mutation command maps to exactly one state machine transition." This is a system-level invariant that the `nextCommands` feature depends on for correctness (the derivation assumption: one command = one event = one transition). However, INV-008 is absent from `architecture/invariants.md`, which documents INV-001 through INV-007. Phase 3 includes updating `rpc-layer-api.md` and `commands-api.md` but does not include adding INV-008 (and INV-009, which is also in the epic architecture) to `architecture/invariants.md`.

Fix: Add a task to Phase 3: "Update `architecture/invariants.md` — add INV-008 (Single Transition Per Command) from the epic architecture, which is the foundational assumption enabling `nextCommands` derivation. Also add INV-009 (State File Integrity via Embedded Signature) if it is not already present when this slice is implemented."
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 E2E verification for `decision:update` is incomplete — tests existence but not `commandToEvent` correctness

Phase 3 task list includes `decision:create` → verify `nextCommands` includes `decision:update`, but does not include verifying `decision:update` → verify `nextCommands` includes... (what is valid after update when status stays `active`?). More importantly, the E2E verification for decisions does not confirm the `{id}` interpolation in templates works correctly. Decision commands use `target.id` (not `target.name`) for entity resolution, which is an exception to the standard pattern. The E2E walkthrough in Phase 3's Expected Behavior section also omits decisions entirely.

Fix: Add a decision E2E step to Phase 3 Expected Behavior: `decision:create --id arch-choice-1 ... --json` → verify `nextCommands.entity` includes `gp decision:update --id arch-choice-1` (confirms `{id}` interpolation works correctly via `resolveEntityName`). This is a low-effort addition that validates the one case where identifier resolution differs from all other entity types.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `epicPhaseTransitions` has no `(same)` rows in practice — plan's generic rule is correct but the motivation example is soft

Phase 1 task 3 documents `(same)` expansion as a generic rule, noting that "`epicPhaseTransitions` includes `(same)` in its type union." Codebase verification confirms this is true at the TypeScript type level — the exported array is typed `to: EpicStatus | "(same)" | "(error)"` — but none of the 10 concrete rows actually use `to: "(same)"`. Only `epicVerifyTransitions` uses `(same)` at runtime. The round-4 merged review (I2) confirmed this as an important issue to fix generically, and the plan now correctly handles it as a generic rule. No plan change is needed, but the implementer should know that at the time of implementation, only `epicVerifyTransitions` requires `(same)` expansion. The type union exists to allow future tables to adopt the sentinel without changing the derivation logic — this is the correct design.

Fix: Add a brief implementation note to Phase 1 task 3: "At the time this plan was written, only `epicVerifyTransitions` has rows with `to: '(same)'`. `epicPhaseTransitions` includes `(same)` in its TypeScript type union but no concrete rows use it. Implement the rule generically regardless — the type union signals intent."
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

The plan is in excellent shape after four rounds of refinement. All critical and important issues from R4 are resolved in the plan text. The remaining issues are all minor: one implementation precision note about decision status schemas (won't cause bugs, just misleading language), one documentation gap (invariant not recorded in the canonical file), one minor E2E coverage gap for decision `{id}` interpolation, and one clarifying note for implementers about which tables actually use `(same)` vs. just typing for it.

The plan is thorough, well-phased, and implementer-ready. Phase 1 builds a solid foundation before any wiring. Phase 2 is 3 integration points with zero command-file changes. Phase 3 provides complete E2E validation. Fitness tests are well-specified and cover bidirectional correctness. No invariant violations. Subsystem maturity appropriately treated as Developing throughout.

What would bring it to 10: Address the four minor items above.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
