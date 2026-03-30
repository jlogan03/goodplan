# Holistic Review — Round 4

## Issues

**[IMPORTANT] `(error)` transition rows must be filtered during derivation**
The plan's Phase 1 task 3 describes building `commandMappings` by iterating all `*Transitions` arrays and matching `{ from, event, to }` entries against `commandToEvent`. However, the exported transition arrays include `(error)` rows (e.g., `{ from: "slices-refined", event: "ACTIVATE_EPIC", to: "(error)" }` in `epicLifecycleTransitions`, `{ from: "created", event: "BEGIN_PLAN", to: "(error)" }` in `beginPlanTransitions`). These represent guard failures, not valid target statuses. If the derivation logic does not explicitly filter out `to: "(error)"` entries, the `commandMappings` map will contain an `"(error)"` status key with commands mapped to it — producing nonsensical `nextCommands` output when `computeNextCommands` is called with `"(error)"` as the status. The plan mentions wildcard expansion for `*(non-terminal)` and `*(pre-activated)`, and `(same)` expansion for `epicVerifyTransitions`, but never mentions `(error)` filtering. Every transition file except `decision.ts`, `task-create.ts`, `task-lifecycle.ts`, `quest-create.ts`, `epic-create.ts`, and `epic-verify.ts` contains `(error)` rows.

Fix: Add an explicit step in Phase 1 task 3: "Filter out transition entries where `to` is `(error)` before matching — these represent guard failure paths, not reachable target statuses." Also update the fitness test's transition reachability check (task 4) to assert that `commandMappings` contains no `(error)` key.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `(same)` expansion is documented only for `epicVerifyTransitions` but the pattern may appear elsewhere**
The plan says: "epicVerifyTransitions uses `from: '*(pre-activated)'` with `to: '(same)'` — expand to each pre-activation status with `to` set equal to `from`." However, `epicPhaseTransitions` also includes `(same)` in its `to` type union (`to: EpicStatus | "(same)" | "(error)"`). If any rows in `epicPhaseTransitions` use `to: "(same)"`, the derivation logic needs to handle it there too. The plan treats `(same)` expansion as specific to `epicVerifyTransitions`, but the derivation should handle `(same)` generically — for any transition where `to === "(same)"`, set `to = from`.

Fix: Change Phase 1 task 3's `(same)` documentation from being `epicVerifyTransitions`-specific to a generic rule: "For any transition entry where `to` is `(same)`, set `to` equal to `from` before building `commandMappings`."

Resolution: CODEBASE_EXPLORATION
Research: Read `epicPhaseTransitions` in `src/core/state/transitions/epic-phase.ts` to confirm whether any rows actually use `to: "(same)"`. If they do, this is IMPORTANT; if the union type is defensive-only and no rows use it, demote to MINOR documentation improvement.

---

**[MINOR] `* (non-terminal)` vs `*(non-terminal)` whitespace inconsistency in wildcard patterns**
The plan references `*(non-terminal)` and `*(pre-activated)` as wildcard patterns. However, the actual transition arrays use inconsistent spacing: `epicLifecycleTransitions` uses `"*(non-terminal)"` (no space), while `abandonSliceTransitions` and `abandonQuestTransitions` use `"* (non-terminal)"` (with space). The derivation logic must handle both spellings or it will miss wildcards from some transition tables. The plan does not acknowledge this inconsistency.

Fix: Add a note in Phase 1 task 3 under wildcard expansion: "Wildcard patterns may appear with or without a space (e.g., `*(non-terminal)` and `* (non-terminal)`). Normalize before matching — strip spaces or match both variants."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `* (terminal)` wildcard rows should be filtered (not expanded)**
The `abandonSliceTransitions` and `abandonQuestTransitions` arrays include `{ from: "* (terminal)", event: "ABANDON_*", to: "(error)" }` entries. These represent invalid transitions (abandoning an already-terminal entity). The plan's wildcard expansion section mentions `*(non-terminal)` and `*(pre-activated)` but not `* (terminal)`. If the derivation logic tries to expand `* (terminal)`, it would incorrectly produce entries mapping terminal statuses to `(error)`. These rows should be filtered out (they combine a terminal wildcard `from` with an `(error)` `to`, both of which should be excluded).

Fix: The `(error)` filtering from the first issue handles this implicitly (all `* (terminal)` rows have `to: "(error)"`). But add a brief note: "`* (terminal)` wildcards are always paired with `to: '(error)'` and are filtered out by the `(error)` exclusion rule."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Description drift fitness test creates a layering violation in the test layer**
Phase 1 task 5.5 says: "import `commandRegistry` from `src/commands/global/schema.ts` and verify that every `commandToEvent` entry has a description that differs from the `commandRegistry` help text." Importing `commandRegistry` in a test is fine from a layering perspective (tests can cross layers), but `commandRegistry` is populated via `registerCommand()` side effects — importing `schema.ts` triggers imports of all command schemas. This is acceptable for a test file but worth noting: the test must either import `schema.ts` directly (triggering registration) or manually register commands. If the project later moves to lazy registration, this test will break silently. Consider adding a comment in the test noting the side-effect dependency.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 3 E2E lifecycle is long and fragile — consider a shell script**
Phase 3 tasks list 9 sequential E2E verification steps, each piping JSON through `jq` in an interactive temp directory session. This is brittle for an implementer to run manually — any failure mid-chain leaves partial state. The plan mentions a `trap` for cleanup but does not suggest wrapping the E2E steps in a script. A simple shell script in `/tmp` would make the E2E validation reproducible and reduce manual error.

This is a style suggestion, not a structural issue. The plan's current approach works.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Fitness test file path uses `tests/fitness/` but existing pattern should be confirmed**
Phase 1 task 4 creates `tests/fitness/command-metadata-coverage.test.ts`. The existing fitness tests confirmed at `tests/fitness/mutation-through-state-machine.test.ts` match this path. No issue — just confirming the path is correct. (The `mutation-through-state-machine.test.ts` file does not yet exist in the repo based on the grep, but the architecture overview references it.)

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

The plan is well-structured with clear phasing, strong verification at each phase, and thorough edge case documentation. Round 3 feedback was cleanly incorporated — `resolveEntityName` reuse, manual descriptions in `commandToEvent`, `_testing` export narrowing, ordering, success-only contract, and `--query` verification are all present.

The two IMPORTANT issues are the main gaps: `(error)` rows in transition arrays will produce incorrect `commandMappings` entries if not filtered, and `(same)` expansion needs to be generic rather than epicVerify-specific. Both are straightforward to fix. The MINOR issues around wildcard spacing inconsistency and terminal wildcard handling are small but could cause subtle bugs during implementation.

To reach 9+: fix the `(error)` filtering gap and confirm the `(same)` expansion is generic.

## Summary
- Critical: 0
- Important: 2
- Minor: 5
