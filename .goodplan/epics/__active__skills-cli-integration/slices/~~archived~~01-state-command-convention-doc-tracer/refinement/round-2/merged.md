# Merged Feedback — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Bare `state` (no `--json`) must explicitly bypass `output()` — not depend on fallback behavior**
Sources: Holistic, TypeScript, API-Contract

The state command always outputs JSON, but the plan does not explicitly state it bypasses `output()`. The non-query path would accidentally produce correct output via `output()`'s fallback `deterministicStringify` path — but this is coincidental. The plan should state: "The state command does not use the shared `output()` function. All code paths write directly via `deterministicStringify()` + `process.stdout.write()`." Additionally, the convention doc (Phase 2) must document `state` as an explicit exception to the "no `--json` = human-readable" convention, so skills know `state` always returns JSON regardless of `--json`.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. Phase 3 activity-log "last N entries" query requires concrete approach**
Sources: Holistic, Software-Architecture, Agent-Skill, API-Contract

The plan suggests `--offset <len-5> --limit 5` but the skill cannot know the total length without a prior query. The plan notes jqjs negative indexing `.[-5:]` "may not be supported" but provides no resolution. The jqjs research doc confirms array slicing is supported. Recommended approach: commit to `.["activity-log.jsonl"] | .[-5:]` as primary. Add a note that if negative indexing fails at runtime, fall back to querying the full array and taking the tail. Remove the `--offset <len-5>` suggestion which is not implementable without a prior query.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. `--offset`/`--limit` flag descriptions should communicate `--query` dependency**
Source: TypeScript

The arg descriptions say "Skip N entries when result is an array" — they don't communicate that these flags only work with `--query`. An LLM agent reading schema output would reasonably try `goodplan state --json --limit 5`. Update `ArgDefinition` descriptions to include "(requires --query)". Additionally, specify validation: parse via `Number()`, validate non-negative finite integer, throw `GoodplanError('VALIDATION_INVALID_INPUT')` if invalid.

Resolution: DIRECTLY_ACTIONABLE

---

**I4. Convention doc `--inline` interaction with `state` needs precise type-change documentation**
Source: Software-Architecture

The convention doc should include the exact type change (`true` vs `string`) when `--inline` is used and show a concrete example of the same query path with and without `--inline`. Without this, skills may assume markdown entries are always `true` and break when `--inline` is used.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Phase 2 convention doc worked examples must verify commands exist before including them**
Source: Agent-Skill

Task item 5 does not instruct the implementer to verify which `start-*` and `submit-*` commands actually exist before including them as worked examples. Only include commands that currently exist (verified against `goodplan schema --json` or `src/commands/main.ts`). For commands planned but not yet implemented, list in a separate "Coming in future slices" subsection.

Resolution: DIRECTLY_ACTIONABLE

---

**I6. `parseInlineBudget` coercion loses "absent vs present-without-budget" distinction — needs code comment**
Source: TypeScript

`const inline = parseInlineBudget(args.inline) !== undefined` collapses three states (`undefined`, `true`, `number`) to two (`false`, `true`). This is intentional for this slice but needs a code comment so the future budget-feature implementer knows to revisit: `// Budget form deferred — parseInlineBudget returns true|number|undefined, collapsed to boolean here`.

Resolution: DIRECTLY_ACTIONABLE

---

**I7. `--version --json` output not registered in schema command**
Source: API-Contract

`--version` is handled pre-dispatch (not a subcommand) so `goodplan schema --json` won't advertise it. Add a comment in the implementation noting this is a known limitation. The convention doc documents it manually, which is sufficient.

Resolution: DIRECTLY_ACTIONABLE

---

**I8. Pagination semantic ambiguity: array result from data vs jq multiple outputs**
Source: API-Contract

When `applyQuery()` returns a single array result (data-originated) vs wrapping multiple scalar results in an array, pagination applies identically. The convention doc (Phase 2) should document this in the "Deep Dives" section: `--offset`/`--limit` apply to any array-valued result regardless of origin.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. Test file naming: use `state.test.ts` not `state-command.test.ts`**
Sources: Holistic, Software-Architecture, TypeScript, API-Contract

Existing test files use `status.test.ts`, `init.test.ts`, `schema.test.ts` — none use a `-command` suffix. Rename to `state.test.ts` in both unit and integration paths.

Resolution: DIRECTLY_ACTIONABLE

---

**M2. Verification step 9 (jqjs performance < 1s) is untestable as written**
Sources: Holistic, TUI-CLI

Either drop it (unlikely to be a problem for a small state tree) or add a note that it is a manual spot-check, not an automated test.

Resolution: DIRECTLY_ACTIONABLE

---

**M3. Phase 3 Step 4 wording: offset/limit should be fallback, not jqjs negative indexing**
Source: TUI-CLI

The phrasing "as fallback" implies trying `.[-5:]` first then falling back to offset/limit. Invert: use `.[-5:]` as primary (per I2 resolution), note offset/limit as the general-purpose mechanism for other cases.

Resolution: DIRECTLY_ACTIONABLE (subsumed by I2)

---

**M4. Deprecation note must go in `state-and-activity-formats.md` itself, not just convention doc**
Sources: Holistic, Agent-Skill

12 skills reference `state-and-activity-formats.md` directly. Add deprecation note at the top of its state.md section with pointer to `cli-interaction.md`. Add an explicit task for this.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Phase 2 section 5: `start-complete` does not exist — promote inline note to task bullet**
Source: Holistic

Currently an inline note that could be missed. Promote to a task-level bullet point.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. Expected Behavior "before" check for `--version --json` shows literal `\n` — potentially confusing**
Source: Holistic

Minor wording issue. Clarify that `\n` is a newline, not literal characters.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. Integration test verification section should clarify it is manual, not automated**
Source: TypeScript

Verification steps 1-9 run against the repo's live `.project/` state. Add a note distinguishing manual verification from automated fixture-based integration tests.

Resolution: DIRECTLY_ACTIONABLE

---

**M8. `serializeStateTree` should not add key-sorting logic — that's handled by `deterministicStringify`**
Source: Software-Architecture

Add a note that key ordering is handled by the output layer to prevent duplicate sorting logic.

Resolution: DIRECTLY_ACTIONABLE

---

**M9. Phase 3 Step 10 ("Offer Detail") disposition unspecified**
Source: Agent-Skill

After the rewrite, how does the agent fulfill the "show full activity-log or all slice statuses" offer? Specify whether Step 10 is kept (with CLI-based retrieval) or removed.

Resolution: DIRECTLY_ACTIONABLE

---

**M10. Convention doc should mention future `--inline=<bytes>` budget form**
Source: Agent-Skill

Document that `--inline` currently accepts bare form only, with a note that `--inline=<bytes>` budget support is coming in a future slice.

Resolution: DIRECTLY_ACTIONABLE

---

**M11. Convention doc should include completion command stdin payload shapes**
Source: API-Contract

`slice:complete` and `quest:complete` require stdin payloads. The convention doc should include the complete payload shape since skills need to construct these.

Resolution: DIRECTLY_ACTIONABLE

---

**M12. Expected Behavior hardcodes version `0.0.1` — inconsistent with "single source of truth" instruction**
Source: TypeScript

Both verification step 8 and expected behavior hardcode `0.0.1`. Use `<current version>` placeholder instead.

Resolution: DIRECTLY_ACTIONABLE

---

**M13. Bare `state` (no `--json`) should have an Expected Behavior verification line**
Source: TUI-CLI

Add: "`goodplan state` (no `--json`) — returns complete state tree as JSON (same as `--json`)" to Expected Behavior.

Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 8 IMPORTANT and 13 MINOR issues are directly actionable. Total: 21.

## RESEARCH_NEEDED

None. The jqjs negative indexing question (I2) can be resolved by testing during Phase 1 implementation; the research doc already confirms array slicing is supported.

## Contradictions Resolved

1. **Test file naming**: TUI-CLI review said round-1 M6 was addressed by using `state-command.test.ts` "matching the existing pattern." Holistic, Software-Architecture, TypeScript, and API-Contract all noted this does NOT match the existing pattern (`status.test.ts`, `init.test.ts`). Resolution: trust the majority + the TypeScript specialist — use `state.test.ts`. (1 contradiction resolved)

2. **Activity-log tail approach**: Agent-Skill says jqjs supports `.[-5:]` per research doc and recommends it as primary. Holistic and Software-Architecture hedge more cautiously. API-Contract suggests verifying during Phase 1. Resolution: trust Agent-Skill's research reference — commit to `.[-5:]` as primary with full-array fallback. (1 contradiction resolved)

3. **`--inline` documentation depth**: Software-Architecture wants precise type-change examples in convention doc. Agent-Skill wants future `--inline=<bytes>` form mentioned. These are complementary, not contradictory — both should be included. (0 contradictions, merged)

## Unresolved (USER_INPUT required)

None. All issues have clear resolutions.
