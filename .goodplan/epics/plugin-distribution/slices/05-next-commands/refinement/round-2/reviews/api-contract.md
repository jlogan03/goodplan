# API Contract Review — Slice 05: Next Commands (Round 2)

## Issues

**[IMPORTANT]** Mutation file inventory lists nonexistent commands
The plan's "Mutation File Inventory" in Phase 2 lists `decision/{create,update,supersede}.ts` — but `decision/supersede.ts` does not exist. Superseding is done via `decision/update.ts` with a status change + `supersededBy` field. Similarly, `epic/refine-implementation.ts`, `slice/refine-implementation.ts`, and `quest/explore.ts` are listed in the begin inventory but do not exist in the codebase. The actual begin callers number 26 (not 25 as stated), submit callers number 8 (the plan says 8 but lists wrong names like `submit-verification.ts` which doesn't exist and omits `submit-slices.ts`, `submit-refine-architecture.ts`, `submit-refine-slices.ts`), and complete callers are 3. Total: 37 files (26+8+3), minus rollup exclusion = 36 wired — not 35 as the confirmed goal states and not matching the "35 wired" claim. The `commandToEvent` mapping and fitness test will fail if entries reference phantom commands or miss real ones.
Resolution: DIRECTLY_ACTIONABLE

Correct the inventory:
- **begin (26)**: epic/{create,explore,define-architecture,refine-architecture,define-slices,refine-slices,activate,abandon,add-verification,update-verification}.ts, slice/{create,plan,refine-plan,implement,abandon}.ts, quest/{create,plan,refine-plan,implement,abandon}.ts, task/{create,drop,convert}.ts, decision/{create,update}.ts, learning/rollup.ts
- **submit (8)**: subagent/{submit-explore,submit-architecture,submit-slices,submit-refine-architecture,submit-refine-slices,submit-plan,submit-refinement,submit-implementation}.ts
- **complete (3)**: epic/complete.ts, slice/complete.ts, quest/complete.ts
- **Excluded (1)**: learning/rollup.ts
- **Total wired**: 36 (not 35)

---

**[IMPORTANT]** `nextCommands` optionality creates ambiguous contract for consumers
The plan adds `nextCommands?: NextCommands` as optional on `BeginResult`, `SubmitResult`, and `CompleteResult`. Since every mutation (except rollup) will populate this field, and `RollupResult` is a separate type that doesn't include it, there is no case where a `BeginResult`/`SubmitResult`/`CompleteResult` would lack `nextCommands`. Making it optional means every consumer must guard against `undefined` unnecessarily. The `paths` field precedent uses optional "for backward compatibility with consumers that don't expect it" — but `nextCommands` is brand new, so there are no existing consumers to preserve compatibility with.
Resolution: DIRECTLY_ACTIONABLE

Make `nextCommands` required (non-optional) on `BeginResult`, `SubmitResult`, and `CompleteResult`. The `RollupResult` type already excludes it by being a separate interface. This gives consumers a clean contract: every mutation result includes `nextCommands`, period. If a future edge case needs omission, that is the time to introduce optionality.

---

**[IMPORTANT]** `computeNextCommands` signature uses `string` for `newStatus` — no type narrowing possible
The plan specifies `computeNextCommands(target: { type: Target["type"]; name: string }, newStatus: string, parentEpic?: string)`. While `Target["type"]` is good, `newStatus: string` misses an opportunity. More importantly, the `target` parameter shape `{ type: Target["type"]; name: string }` doesn't match the `Target` union — `Target` for decisions uses `id` not `name`, and for slices includes `epic`. The RPC functions (`begin`, `submit`, `complete`) already have the full `Target` object. The function should accept `Target` directly and extract what it needs internally.
Resolution: DIRECTLY_ACTIONABLE

Change signature to `computeNextCommands(target: Target, newStatus: string)`. The function extracts `type` and `name`/`id` from the `Target` discriminated union. For slices, it reads `target.epic` for `parentEpic` interpolation — no separate `parentEpic` parameter needed. This eliminates the mapping error risk at every call site (3 RPC functions).

---

**[MINOR]** `commandToEvent` mapping array conflates contract metadata with derivation data
The `commandToEvent` type is `Array<{ command: string; event: string; entityType: Target["type"]; template: \`gp ${string}\`; description: string; userFacing: boolean }>`. This mixes three concerns: (1) the derivation link (`command` + `event` + `entityType`), (2) display metadata (`template`, `description`), and (3) visibility (`userFacing`). While pragmatic for a single array, the `command` field is ambiguous — is it the CLI command name (e.g., `epic:create`), the `BeginPhase` value (e.g., `create`), or the command file path? The fitness test needs to match entries to command files, so the convention matters.
Resolution: DIRECTLY_ACTIONABLE

Document what `command` represents (recommend the citty command name, e.g., `epic:create`, since that is what appears in `--help` output and what the fitness test can match against file paths via convention). Add a JSDoc comment on the `command` field specifying the expected format.

---

**[MINOR]** Phase 2 E2E verification pipe is fragile and hard to debug
The Phase 2 "After implementation" check pipes `./gp epic:create --json` through `python3 -c "import json,sys; ..."`. This is a complex one-liner that swallows errors (the `2>/dev/null` discards all stderr, including legitimate failures). If the assertion fails, the error message won't indicate which part broke.
Resolution: DIRECTLY_ACTIONABLE

Replace the Python one-liner with a multi-step verification or use `jq` for JSON field extraction (e.g., `./gp epic:create --json | jq '.nextCommands | keys'`). If `jq` is not guaranteed to be available, use `bun -e` with a script that provides clear error messages. Remove `2>/dev/null` or redirect only expected noise.

---

**[MINOR]** Submit commands live under `subagent/` not at top level — plan inventory is misleading
The plan's Phase 2 inventory says `submit-{explore,architecture,plan,refinement,implementation,verification}.ts` and `quest/submit-{explore,plan}.ts`. The actual files are all under `src/commands/subagent/` (e.g., `subagent/submit-explore.ts`, `subagent/submit-plan.ts`). There is no `quest/submit-explore.ts` or separate quest submit file — the subagent submit commands handle both slice and quest targets via the `Target` discriminated union. The `submit-verification.ts` file does not exist at all.
Resolution: DIRECTLY_ACTIONABLE

Update the inventory to reflect actual paths under `src/commands/subagent/`. List all 8: `submit-explore.ts`, `submit-architecture.ts`, `submit-slices.ts`, `submit-refine-architecture.ts`, `submit-refine-slices.ts`, `submit-plan.ts`, `submit-refinement.ts`, `submit-implementation.ts`.

## Score: 7/10

The plan is well-structured and the round-1 critical issues (derived registry, RPC-layer integration) are fully addressed. The API contract design is sound in principle — `computeNextCommands` as a pure function, `NextCommands` as an additive field on result types, and the `commandToEvent` mapping as the single manually-maintained source. However, the mutation file inventory contains multiple phantom command references (supersede, refine-implementation, explore for quest, submit-verification) that will cause the fitness test to produce false failures or miss real gaps. The `nextCommands` optionality creates an unnecessarily weak contract for a field that will always be present. The function signature doesn't align with the actual `Target` type. To reach 9+: fix the inventory to match real files, make `nextCommands` required, and accept `Target` directly.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
