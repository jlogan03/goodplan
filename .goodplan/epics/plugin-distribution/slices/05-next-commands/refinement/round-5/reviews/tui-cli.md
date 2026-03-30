# TUI and CLI Review — Round 5
## Reviewer: tui-cli
## Plan: Next Commands (Slice 05)

---

## Issues

**[MINOR]** Plan references `resolveEntityName` from wrong import path in `next-commands.ts`

In Phase 1 task 4, the plan says: "Import `resolveEntityName` from `./types.js` (already exists, handles all Target variants including `decision` → `target.id`)". However, `resolveEntityName` lives in `src/core/rpc/types.ts` — not in a `./types.js` relative to `next-commands.ts`. Since `next-commands.ts` is also in `src/core/rpc/`, the import path `./types.js` is actually correct. This is a non-issue in practice, but the plan's parenthetical "(already exists)" without confirming the module co-location could confuse an implementer. Confirming: both files are in `src/core/rpc/` so `./types.js` is valid.

Actually this is not an issue — confirming no problem here.

**[MINOR]** `task-lifecycle.ts` has no exported transition array — plan's prerequisite task must address both `decision.ts` and `task-lifecycle.ts`

Confirmed via codebase exploration: `src/core/state/transitions/task-lifecycle.ts` has no exported `ReadonlyArray<...>` transition constant. The handler guards task lifecycle transitions via imperative checks (`isTaskTerminal`, `task.status !== "open"`), not via an exported declarative table. The plan's prerequisite task correctly identifies this. No gap in the plan here, but worth noting that the implementer must derive the `task-lifecycle.ts` transition table from the guard logic in the file itself — the plan specifies the correct entries (`DROP_TASK: open → dropped`, `CONVERT_TASK: open → converted`).

Resolution: DIRECTLY_ACTIONABLE (no plan change needed — prerequisite task already covers this)

**[MINOR]** `epicLifecycleTransitions` has two rows for the same `(slices-refined, ACTIVATE_EPIC)` transition — one success and one `(error)` — and the `(error)` filter must handle duplicates cleanly

In `src/core/state/transitions/epic-lifecycle.ts`, the export contains:
```
{ from: "slices-refined", event: "ACTIVATE_EPIC", to: "activated" },
{ from: "slices-refined", event: "ACTIVATE_EPIC", to: "(error)" },
```
Both rows have the same `from`+`event`. After filtering `(error)` rows, only the success row remains. The plan's `(error)` filter handles this, but the derivation logic must also handle the case where the same `(from, event)` pair has both a success row and an `(error)` row — the success entry should not be deduplicated away. Since the plan builds `commandMappings` keyed by `(entityType, toStatus)`, and `"activated"` and `"(error)"` are different `to` values, the filter-then-group approach naturally handles this (the `(error)` row is dropped before grouping, the success row survives). The plan does not need to explicitly call this out, but the implementer should be aware.

Resolution: DIRECTLY_ACTIONABLE — add a brief note to Phase 1 task 3 clarifying that after filtering `(error)` rows, duplicate `(from, event)` pairs with different `to` values are handled naturally by the key structure.

**[MINOR]** `epicPhaseTransitions` does not actually use `to: "(same)"` in any row — the R4 I2 fix may be over-specified

The R4 merged review identified I2 as: "`epicPhaseTransitions` includes `to: "(same)"` in its type union." This is confirmed by the TypeScript type declaration:
```typescript
to: EpicStatus | "(same)" | "(error)";
```
However, examining the actual array entries in `epicPhaseTransitions`, none of the 10 rows have `to: "(same)"` — they all have concrete `EpicStatus` values. The type union is overly broad (perhaps allowing for future rows), but no current rows use it. Only `epicVerifyTransitions` actually uses `to: "(same)"`. This means the R4 fix (making `(same)` expansion generic) is still the right call — future tables may use it — but the plan's example of "epicPhaseTransitions includes `(same)` in its type union" is slightly misleading since no actual rows use it. The generic `(same)` handling is correct as written; this is just a documentation nuance.

Resolution: DIRECTLY_ACTIONABLE — the plan can note that "no current rows in `epicPhaseTransitions` use `(same)`, but the generic expansion handles future tables correctly."

**[MINOR]** `epic:add-verification` and `epic:update-verification` use `*(pre-activated)` wildcard expansion — the plan must confirm that `add-verification` and `update-verification` appear in `commandToEvent` with the correct event strings

The plan says "Status-preserving events (e.g., `ADD_VERIFICATION`, `UPDATE_VERIFICATION`) produce entries under their `from` status (since `from === to`), making `add-verification`/`update-verification` available as commands for those statuses without needing separate status entries."

The `epicVerifyTransitions` rows are:
```
{ from: "*(pre-activated)", event: "ADD_VERIFICATION", to: "(same)" }
{ from: "*(pre-activated)", event: "UPDATE_VERIFICATION", to: "(same)" }
```

After wildcard expansion, these expand to 10 statuses (created through slices-refined) × `(same)` → set `to = from`. So `commandMappings.get("epic")?.get("created")` will include both `ADD_VERIFICATION` and `UPDATE_VERIFICATION` commands alongside other commands available at `created`. This is the correct behavior.

However, the `PRE_ACTIVATED_STATUSES` set in `epic-verify.ts` contains 10 statuses including `"slices-refined"` and `"slices-defined"` and `"refining-slices"` etc. The wildcard expansion must enumerate these 10 statuses exactly. If using `epicStatusSchema.options` (as suggested by R4 M3), the implementer needs to filter to non-terminal, pre-activation statuses. The plan's `*(pre-activated)` definition says "all statuses before `activated`" — but the `PRE_ACTIVATED_STATUSES` set in the actual code includes some statuses that might be considered "after" the initial create phase (refining-architecture, etc.). The plan should define `*(pre-activated)` more precisely: it maps to the set of statuses in `PRE_ACTIVATED_STATUSES` from `epic-verify.ts` (the 10 statuses listed there), rather than being derived by filtering `epicStatusSchema.options`.

Resolution: DIRECTLY_ACTIONABLE — add a note that `*(pre-activated)` expansion should use the exact set from `PRE_ACTIVATED_STATUSES` in `epic-verify.ts` (or inline the same set), not a computed "all statuses before activated" heuristic.

**[IMPORTANT]** Phase 3 E2E verification relies on a built binary (`./gp`) but the plan uses `$GP_BIN` in a temp directory — the binary path resolution is correct but the plan's Phase 3 task is slightly inconsistent

Phase 3 task 2 says: "Create temp project with cleanup trap: `GP_BIN="<repo-root>/gp"` (use the absolute path to the repo's built binary, e.g., `/Users/.../goodplan/gp`). Then: `mkdir -p /tmp/gp-e2e-test && cd /tmp/gp-e2e-test && trap 'rm -rf /tmp/gp-e2e-test' EXIT && "$GP_BIN" init`."

Phase 3 task 1 says "Build the binary: `bun run build` (required before any E2E commands). The built binary is at `./gp` in the project root."

The plan correctly uses `$GP_BIN` (absolute path) for temp directory testing, which aligns with the CLAUDE.md rule "Test CLI changes: Run `./gp` against a fixture repo in `/tmp`". However the plan should note that running `bun run build` will rebuild the binary to include the new `nextCommands` field — if any test commands fail because the previous binary is cached, the implementer needs to rebuild. This is implicit but worth making explicit.

More importantly: the `--json` output from commands currently passes the RPC result object directly to `output(result, args)`. Once `nextCommands: NextCommands` is added as a required field to `BeginResult`, `SubmitResult`, and `CompleteResult`, TypeScript will require all callers to populate it. The plan says "command files need zero changes" — this is only true if `nextCommands` is populated by the RPC layer before returning. This is the plan's intent, and it is correct. No plan change needed here, but it's a key implementation constraint.

Resolution: DIRECTLY_ACTIONABLE — add a note that `bun run build` must be re-run if the binary was previously built without the `nextCommands` feature, to ensure E2E tests reflect the new field.

**[MINOR]** The plan's `commandToEvent` array description says `command` uses the citty command name (e.g., `epic:create`) but the `commandRegistry` in `schema.ts` uses names like `submit-plan`, `submit-explore` (no colon namespace for subagent commands) — the plan should confirm this naming convention for subagent commands

Confirmed via codebase: subagent commands in `commandRegistry` use hyphenated names without entity namespace: `submit-plan`, `submit-refinement`, `submit-implementation`, `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`, `submit-refine-slices`. These are the `userFacing: false` entries in `commandToEvent`, so they would not appear in suggestions to users. But the fitness test's "forward check" for every user-facing command that calls `begin()`/`complete()`/`submit()` must use these exact names to match templates. The plan should explicitly state that subagent command names in `commandToEvent` use the hyphenated form (e.g., `"submit-plan"` not `"submit:plan"`).

Resolution: DIRECTLY_ACTIONABLE — add a note to Phase 1 task 2 confirming that subagent `command` values in `commandToEvent` use hyphenated names matching the `commandRegistry` keys (e.g., `"submit-plan"`, not `"submit:plan"`).

---

## Score: 9/10

The plan is well-specified and most R4 issues were correctly resolved and incorporated. The primary remaining concerns are minor implementation clarity issues:

1. The `*(pre-activated)` wildcard expansion needs to reference the exact `PRE_ACTIVATED_STATUSES` set from `epic-verify.ts` rather than a derived heuristic.
2. The subagent command naming convention should be explicit in `commandToEvent`.
3. The `epicLifecycleTransitions` duplicate-row scenario should be noted as handled.

No critical or blocking issues. The plan correctly identifies all 37 mutation files, the three RPC integration points, the fitness test structure, and the derivation constraint. The R4 IMPORTANT issues (I1/I2/I3) are all correctly resolved in the current plan text.

## Summary

- Critical: 0
- Important: 1
- Minor: 5
