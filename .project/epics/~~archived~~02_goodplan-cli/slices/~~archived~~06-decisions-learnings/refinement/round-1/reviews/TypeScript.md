# TypeScript Review — Decisions, Learnings & Full Status

## Issues

**[CRITICAL]** Plan Phase 4 uses wrong function name: `z.toJsonSchema()` vs `z.toJSONSchema()`

Phase 4 task for the schema command says: "derive JSON Schema from the actual Zod schema objects using `z.toJsonSchema()` (Zod v4 built-in)". The research file (`zod-v4-toJsonSchema.md`) explicitly documents that the correct name is `z.toJSONSchema()` (all-caps JSON). Calling `z.toJsonSchema` will be `undefined` at runtime. The plan text must use the correct function name to avoid a runtime crash.

Additionally, the plan should specify `unrepresentable: "any"` since some schemas may contain types that don't map cleanly to JSON Schema, and the default `"throw"` behavior would crash the command.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 ROLLUP_LEARNINGS handler description conflates source/target semantics

The Phase 1 task for `rollup-learnings.ts` says: "filter entries whose `rollupTo` array includes the target scope" — but `rollupTo` contains abstract labels like `"project"` or `"epic"`, not filesystem paths. The `from` and `to` parameters in the ROLLUP_LEARNINGS event are filesystem-relative paths (e.g., `slices/01-auth`, `project`). The plan should clarify the mapping: entries in the source `learnings.jsonl` where `rollupTo` includes a label corresponding to the `to` target (e.g., `to === "project"` matches `rollupTo: ["project"]`) should be copied. The current wording could lead an implementer to compare `rollupTo` entries against filesystem paths directly, which won't match.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 UPDATE_DECISION payload uses `Partial<DecisionEntry>` — loses type safety for status transitions

The `StateEvent` union in the architecture spec defines `UPDATE_DECISION` with `changes: Partial<DecisionEntry>`. This means `changes.status` is typed as `"active" | "superseded" | "revisiting" | undefined` — which is fine. However, the plan's Phase 2 `updateDecisionInputSchema` also lists `supersededBy` in the changes object. Per the `DecisionEntry` schema, `supersededBy` is `z.string().nullable()`. The plan should clarify that `supersededBy` is only valid when transitioning to `superseded` status, and the handler should guard against setting `supersededBy` without a status change to `superseded`. Without this guard, a caller could set `supersededBy` on an active decision, creating an inconsistent state.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 `learning:show` and `learning:list` have overlapping semantics

Phase 2 defines `learning:list` with optional `--scope` (without scope: project-level, with scope: reads `<scope>/learnings.jsonl`) and `learning:show` with required `--scope` that "returns scope-level learnings.jsonl entries." These two commands do the same thing when `--scope` is provided to `learning:list`. The plan should either differentiate them (e.g., `show` returns a single learning by index/id, `list` returns all at a scope) or merge them into one command. Every other entity namespace differentiates `list` (returns collection summary) from `show` (returns single item detail). As written, `learning:show` duplicates `learning:list --scope`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 `buildBeginResult` needs a decision branch — plan references it in research but doesn't task it

The codebase context research (Potential Issue #2) correctly identifies that `buildBeginResult` in `src/core/rpc/begin.ts` only handles project/epic/slice/quest targets, not decision targets. Phase 2 tasks wire `begin()` for decision events but don't include a task to add the decision branch to `buildBeginResult`. Without this, `begin('create', {type:'decision'}, ...)` will return `previousStatus: "none"`, `newStatus: "unknown"` — the decision has no `.status` field on a JSON entity file (decisions live in JSONL). The plan should add a task to handle this: read the decision entry from `decisions.jsonl` in the new state and extract its status.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 missing `StateErrorCode` additions for decision-specific errors

The plan's Phase 1 decision handler needs to guard against duplicate decision IDs and updating superseded decisions (terminal state). The existing `StateErrorCode` union in `src/schemas/state-events.ts` has 9 codes, none specific to decisions. The plan should explicitly task adding new error codes (e.g., `STATE_DUPLICATE_DECISION`, `STATE_DECISION_TERMINAL`) or document that existing codes like `STATE_INVALID_TRANSITION` will be reused. The `GoodplanErrorCode` type automatically picks up `StateErrorCode` changes, so adding new codes won't break the error system. But the decision needs to be explicit in the plan to avoid ambiguity during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 schema command introspection approach is underspecified

The plan says to "introspect citty command definitions registered in main.ts" but citty's `defineCommand` returns opaque objects. The plan should clarify whether it will iterate `subCommands` keys from the main command definition (which is accessible since `mainCommand` is exported) and read `.meta` and `.args` from each, or use some other approach. Since citty doesn't expose a public introspection API, the plan should note that this reads internal properties of citty command objects, which could break on citty version upgrades. A defensive approach: extract command metadata into a parallel registry at registration time rather than relying on runtime introspection.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `assembleState` vs `loadState` inconsistency

Phase 3 says the status command handler should "load state via `assembleState`" but the existing status command already uses `assembleState` (line 24 of `status.ts`). Meanwhile, other read-only commands like `epic:list` use `loadState`. The codebase has both — `assembleState` handles uninitialized projects by returning zero state, while `loadState` may throw. The plan should be consistent about which to use. Since status must work on fresh projects (where no `.project/` exists yet), `assembleState` is correct, but the plan should make this deliberate choice explicit rather than leaving it ambiguous.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `--query` auto-implies `--json` may break `--quiet` semantics

Phase 4 says `--query` auto-implies `--json`. But if a user passes `--quiet --query '.x'`, the current `output()` function returns early when `args.quiet` is true (line 18-20 of `output.ts`). The plan should specify precedence: does `--query` override `--quiet`? Or does `--quiet` take precedence and suppress even query output? The current status command handles this by checking `useJson` before quiet, but the shared `output()` function checks quiet first. The plan should document the intended behavior.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured and aligns closely with the existing codebase patterns. The critical issue (wrong `toJSONSchema` function name) would cause a runtime crash. The important issues around `buildBeginResult` missing a decision branch, learning command overlap, and underspecified error codes could each cause implementation confusion or bugs. Fixing all issues would bring this to 9+.

## Summary
- Critical: 1
- Important: 5
- Minor: 3
