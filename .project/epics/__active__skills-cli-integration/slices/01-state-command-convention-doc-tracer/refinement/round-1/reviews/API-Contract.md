## Issues

**[CRITICAL]** State command `--offset`/`--limit` are not registered in the command schema registry

The plan registers the `state` command in `src/commands/global/schema.ts` but the task description only says to register with `globalArgs` + state-specific flags `inline`, `offset`, `limit`. However, the `registerCommand()` call is not explicitly listed in the Tasks section — only "Register in command registry (`src/commands/global/schema.ts`) per INV-006" appears as a bullet under the state command file task. More critically, the plan does not specify the `ArgDefinition` entries for `offset` and `limit` (type, description, required/default). These flags are state-command-specific and must be registered in the schema registry with correct metadata so that `goodplan schema --command state --json` accurately reflects the command's interface. Without this, INV-006 (schema output reflects actual command signatures) is violated and LLM consumers using `schema` for self-discovery will not know about pagination.

Add an explicit task: register `state` in the command registry with `{ ...globalArgDefs, inline: { type: "string", description: "Include markdown content in state tree" }, offset: { type: "string", description: "Skip N entries when result is an array" }, limit: { type: "string", description: "Return at most N entries when result is an array" } }`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Pagination semantics are ambiguous when `--query` is absent

The plan says `--offset`/`--limit` apply after `--query` and are "ignored if result is not an array." But what happens when `--query` is absent and the user runs `goodplan state --json --limit 5`? The serialized state tree is an object (not an array), so pagination is silently ignored. This is reasonable, but the plan should explicitly state this behavior so the convention doc and tests cover it. Without clarity, Phase 2's convention doc may document pagination incorrectly, and Phase 3 or future skills may attempt to use `--limit` without `--query` and be confused by the no-op.

Add a note to the state command task: "When `--query` is absent, `--offset`/`--limit` are silently ignored (the full state tree is always an object, not an array)." Add one unit test case verifying this no-op behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan verification queries use non-existent jq paths

Several verification queries assume a state tree structure that does not match `assembleState()` output:
- Verification step 2: `.slices | keys` — but the state tree key is literally `slices` as a directory entry. This works only if a `slices/` directory exists in `.project/`. For the goodplan repo this should exist, but the plan should note this assumption.
- Verification step 6: `.architecture["_overview.md"]` — assumes the architecture directory is at the top level of the state tree. Confirmed: `assembleState()` walks `.project/` recursively, so `.project/architecture/` becomes `architecture` key in the root DirectoryEntry. This is correct.

The more significant issue is verification step 2: `.slices | keys` would return slice directory names (e.g., `["01-state-command-convention-doc-tracer", "overview.json"]`) including `overview.json` — which is a JSON file in the slices directory, not a slice. The verification description says "returns slice directory names" but the actual result includes non-directory children. Consider using `.slices | to_entries | map(select(.value | type == "object")) | map(.key)` or acknowledge the current behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `--inline` flag type mismatch between plan and `globalArgs`

The plan says the state command defines `inline` as `{ type: "string" }` (citty string type, parsed with `parseInlineBudget`). But `parseInlineBudget` returns `boolean | number | undefined`. The plan says "boolean toggle only for this slice" — meaning the state command in this slice only uses the boolean path. However, the convention doc (Phase 2) describes `--inline[=<bytes>]` for `start-*` commands and should describe the state command's `--inline` consistently.

The plan should clarify: is the state command's `--inline` flag a boolean-only toggle (`--inline` present = true, absent = false), or does it support the budget syntax (`--inline=500`) for future use? If boolean-only, the plan should say so and note that budget support is deferred. If it supports budgets from day one, the `serializeStateTree` function signature needs a `budget: number` option, not just `inline: boolean`.

Given the decision doc says budget-based is deferred, the plan's current approach (boolean-only) is correct. But make the `serializeStateTree` options type explicit: `{ inline: boolean }` in this slice, expandable to `{ inline: boolean | number }` later.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `--version --json` version string not sourced from a single location

The plan says to check `rawArgs.includes("--json")` in the `--version` handler and output `{ version: "0.0.1" }`. But the version string `"0.0.1"` is hardcoded in `src/index.ts`. The plan also mentions "Read version from `package.json` at build time or hardcode (match existing pattern)." The existing pattern is a hardcoded string. If Phase 2's convention doc tells skills to check `--version --json` for compatibility, and the version string is hardcoded in two places (the plain text output and the JSON output), this creates a drift risk.

The plan should specify: use a single `const VERSION = "0.0.1"` (or import from `package.json`) and reference it in both the plain text and JSON output paths. This prevents the two outputs from diverging.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Convention doc (Phase 2) references `show --json` `artifacts` field that doesn't exist yet

The plan's Phase 2 convention doc tasks reference `show --json` with an `artifacts` field (section 7: "Deriving Workflow Phase — use `show --json` artifacts field (planned for slice 02, note as upcoming)"). The plan correctly notes this is "planned for slice 02." However, the convention doc should be clear about which features are available now vs. upcoming, and the Phase 2 verification step ("Spot-check 3 CLI commands from the doc against the actual CLI") will fail if any of the spot-checked commands use `artifacts`.

Ensure the convention doc clearly marks `show --json` `artifacts` sections with a callout like "Available in CLI >= 1.1.0 (slice 02)" so skills don't try to use it prematurely.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior exit code for missing command may not match

The "Before implementation" check says `goodplan state --json` exits with `E_UNKNOWN_COMMAND` or equivalent. The actual behavior in `src/index.ts` (lines 80+) is that unknown subcommands are detected before dispatch and produce a `VALIDATION_UNKNOWN_COMMAND` error with exit code 2. The expected behavior should use the actual error code (`VALIDATION_UNKNOWN_COMMAND`) for precision, especially since this is a public API contract check.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `applyQuery()` result semantics interact unexpectedly with pagination

`applyQuery()` returns: 0 results -> `null`, 1 result -> value, multiple results -> array. If a jq query returns exactly one array value (e.g., `.["activity-log.jsonl"]`), the result is that array (unwrapped from the single-result case). Pagination works correctly here. But if a query returns multiple scalar values (e.g., `.slices[][] | .name`), the result is an array of scalars, and pagination also applies. The plan should note that `--offset`/`--limit` applies to ANY array result, not just "JSONL arrays" — it's the structural shape that matters, not the semantic origin.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Convention doc Phase 2 task list omits `--inline` documentation for `state` command

The convention doc task list (section 8) says "Note `--inline` for markdown content" but doesn't specify that the state command's `--inline` flag changes markdown serialization from `true` to actual content. The architecture's `cli-interaction-conventions.md` (Deep Dives section) doesn't mention `--inline` for `state` either — it only shows `state --json --query` examples. Since `--inline` changes the state command's output contract, the convention doc must explicitly document this.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan demonstrates solid understanding of the existing codebase and correct architectural routing (read-only command bypassing RPC). The three-phase structure is logical and the tracer bullet approach is sound. However, several API contract issues need attention: the schema registry gap for pagination flags violates INV-006, the pagination semantics need tightening, and the version string sourcing creates drift risk. Fixing the CRITICAL issue and the IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 1
- Important: 5
- Minor: 3
