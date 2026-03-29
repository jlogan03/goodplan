## Issues

**[CRITICAL]** Missing `GLOBAL_FLAG_KEYS` update for `limit` and `offset`

The plan adds `limit` and `offset` to `globalArgs` in Phase 1 but does not include a task to update `GLOBAL_FLAG_KEYS` in `src/util/validate.ts`. This set is used by `validateInput()` to strip global flags before Zod schema validation on mutating commands. Without this update, any mutating command that receives `--limit` or `--offset` (even accidentally) will fail Zod validation with a spurious error. The research doc explicitly flagged this (Concern #1) but the plan did not incorporate it.

Fix: Add a task in Phase 1 to add `"limit"` and `"offset"` to the `GLOBAL_FLAG_KEYS` set in `src/util/validate.ts`. Add a unit test confirming `validateInput` strips these flags.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** JSON output shape change (`total` always present) is a breaking change for consumers

The plan adds `total` to JSON output for all 6 list commands even when no pagination flags are used. The confirmed goal says "JSON output always includes total." This is an additive field addition, which is generally non-breaking for well-behaved consumers. However, the `schema` command (INV-006) exposes command output shapes to LLM orchestrators and skills. Adding `total` changes the contract. The plan should acknowledge this as an intentional contract change and note that the `schema` command output will reflect it automatically (since it reads from the same command definitions).

Additionally, the plan says `offset` and `limit` appear in JSON "only when flags are used," but the Expected Behavior in Phase 1 shows `"offset": 0` when only `--limit` is specified (`{ items: [...], total: N, limit: 5, offset: 0 }`). This contradicts the overview's statement that offset appears "only when flags are used" -- if only `--limit` is passed, should `offset` be included or not? The `state` command's existing behavior omits `offset` when not specified. Pick one and be consistent.

Fix: (1) Add a note acknowledging the JSON contract change. (2) Clarify: when only `--limit` is passed, omit `offset` from JSON output (consistent with overview and with the `state` command pattern). Update the Phase 1 Expected Behavior to show `{ items: [...], total: N, limit: 5 }` (no offset).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `slice:list --all` human-mode pagination will break epic grouping

The plan (Phase 2) says "pagination applies to the flattened list" for `slice:list`. In JSON mode this is fine. But in human mode, `slice:list --all` groups slices by epic with headers (confirmed by reading `src/commands/slice/list.ts` lines 77-93). Paginating the flat array and then displaying with epic grouping will produce confusing output -- partial epic groups, possibly a group header with no slices if the page boundary falls right after a header.

The research doc flagged this (Concern #4) but the plan did not address it. Options: (1) paginate the flat list and suppress epic grouping when pagination is active, (2) paginate the flat list but keep grouping (accept partial groups), or (3) document this as a known limitation.

Fix: Add a note to the `slice:list` task in Phase 2 specifying the chosen behavior. Recommendation: keep grouping, accept partial groups -- it's the simplest approach and the footer ("Showing X-Y of Z") makes the truncation clear.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `task:list` pagination ordering relative to `--all` filter needs explicit specification

The plan says "pagination applies after filtering" for `task:list`. This is correct and matches the natural flow. But the plan should also specify the JSON envelope shape: `task:list` currently outputs `{ items, filter }`. With pagination, it should be `{ items, filter, total, [limit], [offset] }`. The plan's generic "same pattern" phrasing doesn't account for `task:list`'s extra `filter` field.

Fix: Update the `task:list` task in Phase 2 to note that the `filter` field is preserved alongside pagination fields in the JSON envelope.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `parseNonNegativeInt` extraction approach should be specified

The plan says "reuse or adapt `parseNonNegativeInt` from `state.ts` -- move to a shared location if it's not already shared." This is vague. The function is definitively local to `state.ts` (confirmed by codebase exploration). The plan should specify: extract to `src/util/pagination.ts`, update `state.ts` to import from the new location. This avoids duplication and keeps a single implementation.

Fix: Change the task to: "Extract `parseNonNegativeInt` from `src/commands/global/state.ts` to `src/util/pagination.ts`. Update `state.ts` to import from the new location."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Pagination semantics difference with `state` command should be documented

The `state` command applies pagination **after** `--query`. List commands will apply pagination **before** `--query` (pagination on the items array, then `output()` applies query to the paginated envelope). Both are correct for their use cases, but the difference should be documented in a code comment or in the `pagination.ts` module doc to prevent future confusion.

Fix: Add a task to include a doc comment in `pagination.ts` explaining that list commands paginate before query (user wants page N of the items list) while `state` paginates after query (user queries into state tree, then paginates the result array).

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has the right overall shape -- shared helper, first consumer, then rollout. The phasing is sound and the test strategy is reasonable. However, it misses a critical integration point (`GLOBAL_FLAG_KEYS`), has an internal contradiction in the JSON output contract, and doesn't address edge cases that the research doc explicitly flagged. These are all straightforward fixes. Addressing all issues above would bring this to 9+.

## Summary
- Critical: 1
- Important: 3
- Minor: 2
