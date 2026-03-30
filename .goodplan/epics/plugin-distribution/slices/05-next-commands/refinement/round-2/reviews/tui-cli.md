# TUI and CLI Review — Slice 05: Next Commands (Round 2)

## Issues

**[IMPORTANT]** Mutation file inventory is inaccurate — several commands missing or phantom

The plan's "Mutation File Inventory" section lists 36 total (25 begin + 8 submit + 3 complete), with 35 wired after excluding rollup. The actual codebase has 37 total (26 begin + 8 submit + 3 complete):

**Missing from the plan's begin list:**
- `epic/abandon.ts`, `epic/activate.ts`, `epic/define-slices.ts`, `epic/refine-slices.ts` — all call `begin()` and are real mutation commands
- `quest/abandon.ts`, `quest/refine-plan.ts` — call `begin()`, not listed
- `slice/abandon.ts` — calls `begin()`, not listed

**Listed in plan but do not exist:**
- `epic/refine-implementation.ts` — no such file (epic has no refine-implementation phase)
- `slice/refine-implementation.ts` — no such file (slice refine goes through `submit-refinement`)
- `decision/supersede.ts` — no such file; only `decision/create.ts` and `decision/update.ts` exist
- `quest/explore.ts` — no such file; quests have no explore phase

The plan says 25 begin commands, but the actual count is 26 (including `learning/rollup.ts`, which is correctly excluded from wiring). With rollup excluded, there are 25 begin commands to wire, plus 8 subagent submit + 3 complete = 36 total to wire (not 35).

This matters for the fitness test's forward check — it needs the correct set of mutation files to verify coverage. An inaccurate inventory will cause either false passes or false failures.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 E2E verification commands reference `./gp` but the plan uses `gp` inconsistently

Phase 3 tasks reference `./gp init`, `./gp epic:create --json`, etc., which is the local build binary. But `bun run build` produces output at a location that may or may not be `./gp` — this depends on the build target configuration. The plan's Phase 2 Expected Behavior references `./gp` in the after-implementation check, while Phase 1 uses `bun -e` for direct import testing. This inconsistency could cause confusion during implementation.

More importantly, the Phase 3 E2E test creates a temp project at `/tmp/gp-e2e-test` but then calls `./gp` — which would resolve relative to the temp directory, not the repo. The implementer would need to use an absolute path to the built binary or copy it into the temp directory.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan does not address `--json` output shape consistency with existing commands

The plan adds `nextCommands` to all mutation results via the RPC layer, which is clean. But it doesn't specify what happens in the human-readable (non-`--json`) output path. Currently, commands like `epic:create` display `entity: previousStatus -> newStatus`. The plan doesn't mention whether `nextCommands` should be displayed in the human-readable output (e.g., "Next: gp epic:explore --epic test") or only in `--json` mode. Since command files don't change (they already pass the RPC result to `output()`), the human-readable formatters in each command file format the result manually with `pc.bold()` etc., and would ignore the `nextCommands` field. This is probably correct behavior (keep terminal output clean, rich data in `--json`), but should be stated explicitly to avoid implementation ambiguity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Subagent submit commands not discussed re: `userFacing` flag

The plan defines `userFacing: boolean` on `CommandMetadataEntry` and mentions filtering by `userFacing: true` in `computeNextCommands()`. The 8 subagent submit commands (`submit-plan`, `submit-refinement`, etc.) live in `src/commands/subagent/` and are called by skills/orchestrators, not by users directly. The plan should clarify that these commands have `userFacing: false` in the `commandToEvent` mapping. This is implied by the plan's "user-facing command" language but never explicitly stated. The fitness test's forward check needs to know whether to include subagent commands or skip them.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `decision:update` uses `id` not `name` — template interpolation needs special handling

The plan's Phase 1 Task 4 says "Interpolate `{name}` -> `target.name`" but decisions use `target.id`, not `target.name`. The edge cases section (Phase 2) mentions this: "entityType is `"decision"`, entity identifier is `id` not `name`". However, the `computeNextCommands` function signature accepts `target: { type: Target["type"]; name: string }` which won't have an `id` field. Either the function needs access to the full `Target` discriminated union (to extract `id` from decision targets), or the caller needs to pass the resolved entity name (which `resolveEntityName()` already does — for decisions, it returns `target.id`). The plan should clarify which approach to use and ensure the template for decision commands uses the right placeholder.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is significantly improved from round 1 — C1 (derived registry) and C2 (RPC-layer integration) are well-addressed, and the overall architecture is sound. The main remaining issue is the inaccurate mutation file inventory, which affects both implementation correctness and fitness test reliability. The inventory lists phantom commands that don't exist (`refine-implementation`, `decision:supersede`, `quest:explore`) and misses real ones (`abandon` commands for epic/slice/quest, `activate`, `define-slices`, `refine-slices`). Fixing the inventory and clarifying the minor output/template concerns would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
