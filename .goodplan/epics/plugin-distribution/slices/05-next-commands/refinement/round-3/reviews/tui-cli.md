# TUI and CLI Review — Round 3

## Issues

**[IMPORTANT] Plan proposes `resolveEntityName` in `next-commands.ts` but it already exists in `types.ts`**
The plan (Phase 1, task item 4) says to export a `resolveEntityName(target: Target): string` helper from `src/core/rpc/next-commands.ts`. However, `resolveEntityName` already exists in `src/core/rpc/types.ts` (lines 206-223) and is already imported by `begin.ts`, `submit.ts`, and `complete.ts`. Creating a second one would be confusing and redundant. The existing function handles all Target variants including `decision` (returns `target.id`), `rollup`, and `project`. The plan should reuse the existing `resolveEntityName` from `types.ts` rather than creating a new one. The only difference is that the existing one doesn't throw for `rollup`/`project` — it returns a string for all variants. Since `computeNextCommands` already constrains to `NextCommandsEntityType` (excluding `project` and `rollup`), the existing function is sufficient and the throw behavior is unnecessary.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Plan says "Pull `description` from the existing `commandRegistry`" but `commandRegistry` descriptions are command-level, not template-level**
Phase 1, task item 2 states: "Pull `description` from the existing `commandRegistry` (in `src/commands/global/schema.ts`) at module init rather than duplicating descriptions." The `commandRegistry` stores descriptions like `"Create a new epic. Stdin: {name, goal}."` — these are schema/help descriptions meant for `gp schema` output. They include stdin format hints and implementation details that are inappropriate for `nextCommands` suggestions shown to users/skills. The `nextCommands` descriptions need to be action-oriented and concise (e.g., "Explore this epic" or "Begin planning"), not schema-level. The plan should define `description` directly in the `commandToEvent` array rather than pulling from `commandRegistry`. This was flagged as M7 in round 2 but the resolution only addressed documenting the `command` field, not this description source mismatch.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 3 E2E verification lacks `--query` flag testing**
The plan's E2E validation in Phase 3 verifies `--json` output but never tests `--query`. Since `output()` in `src/util/output.ts` passes the full result object through `applyQuery()`, and `nextCommands` is a new nested object with `entity` and `other` arrays, the `--query` path should be verified at least once (e.g., `gp epic:create --json --query '.nextCommands.entity | length'`). This ensures the `nextCommands` structure is properly queryable and that `deterministicStringify` handles the nested arrays correctly. The existing `--query` machinery should handle it fine, but an explicit E2E check for this common consumer path is worthwhile.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 E2E verification command is fragile — `echo '{"name":"test-nc",...}' | $GP_BIN epic:create --json | jq ...`**
The Phase 2 Expected Behavior includes a piped `echo | $GP_BIN | jq` command. If the echo content doesn't match the current `createEpicInputSchema` (which requires `name` and `goal`), the command will fail with a validation error rather than testing `nextCommands`. The round-2 merged feedback flagged M8 (fragile Python one-liner) but this replacement jq pipeline has the same fragility class. The verification command should use a complete valid input: `echo '{"name":"test-nc","goal":"testing nextCommands"}' | $GP_BIN epic:create --json | jq '.nextCommands'`. The plan already has this partially correct but the `goal` field in the example is important since `createEpicInputSchema` requires it.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] No mention of how `nextCommands` interacts with `--quiet` mode**
The plan states `nextCommands` appears in `--json` output only and human-readable formatters ignore it (addressing M9 from round 2). However, it doesn't address `--quiet` mode behavior. Looking at `output()` in `src/util/output.ts`, `--quiet` suppresses all output (returns early). This means `--quiet` + `--json` would suppress `nextCommands` too, which is correct for scripting. But `--query` overrides `--quiet` (line 25-28 in output.ts). The plan should note that the existing `output()` precedence rules handle `nextCommands` correctly without any changes — this is a no-op, but worth documenting in the plan so the implementer doesn't second-guess it.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Unit test for "unknown entityType / unknown status" may not compile**
Phase 1 test item 4 says to test "unknown entityType" returning empty `{ entity: [], other: [] }`. But `computeNextCommands` accepts `Target` (a discriminated union) — you can't pass an unknown entityType without a type assertion. The plan should clarify this test uses a valid Target with an unknown status string (e.g., `computeNextCommands({ type: "epic", name: "x" }, "nonexistent-status")`) rather than an unknown entity type. Testing unknown entity type would require `as Target` casting, which is the wrong test — it's testing TypeScript escape hatches, not runtime behavior.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is solid from a CLI perspective after incorporating round-2 feedback. The `--json`-only approach is correct, the `output()` function passes through the full RPC result without command-level changes, and the 3-point RPC integration (begin/submit/complete) is clean. The duplicate `resolveEntityName` and the `commandRegistry` description source mismatch are the most significant remaining issues — both are straightforward to fix but would cause confusion or poor UX if shipped as-is. To reach 9+: reuse the existing `resolveEntityName`, define descriptions directly in `commandToEvent` with action-oriented phrasing, and tighten the E2E verification commands.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
