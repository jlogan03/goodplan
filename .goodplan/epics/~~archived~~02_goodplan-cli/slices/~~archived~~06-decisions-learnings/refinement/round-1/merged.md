# Merged Feedback — Round 1

## CRITICAL Issues

### C1. Phase 4 uses wrong function name: `z.toJsonSchema()` vs `z.toJSONSchema()`
**Flagged by:** TypeScript (CRITICAL), Holistic (IMPORTANT), Software Architecture (IMPORTANT), TUI/CLI (IMPORTANT)
**File:** `04-universal-query-and-schema.md`

Phase 4 task references `z.toJsonSchema()` but the correct API is `z.toJSONSchema()` (all-caps JSON). The research file explicitly warns that `toJsonSchema` does not exist and will be `undefined` at runtime, causing a crash. Additionally, the plan should specify `unrepresentable: "any"` since some schemas may contain types that don't map cleanly to JSON Schema, and the default `"throw"` behavior would crash the command.

Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

### I1. Phase 2 `buildBeginResult` missing decision branch
**Flagged by:** Holistic, Software Architecture, TypeScript
**File:** `02-decision-and-learnings-cli.md` (task list), `src/core/rpc/begin.ts` (implementation target)

`buildBeginResult` in `begin.ts` only handles project/epic/slice/quest targets — no `decision` branch. Phase 2 wires `begin()` for decisions but never tasks updating `buildBeginResult`. Decisions live in JSONL (not individual JSON files), so the result builder needs a new branch that reads the decision entry from `decisions.jsonl` by id to extract `previousStatus` and `newStatus`. Without this, decision commands return incorrect `previousStatus: "none"`, `newStatus: "unknown"`.

Resolution: DIRECTLY_ACTIONABLE

---

### I2. Phase 2 `decision:create` payload type mismatch with `BeginPayloadMap["create"]`
**Flagged by:** Software Architecture
**File:** `02-decision-and-learnings-cli.md`, `src/schemas/state-events.ts` (type target)

`BeginPayloadMap["create"]` is `{ name: string; goal?: string; epic?: string }`, but CREATE_DECISION needs `{ id, domain, title, summary }` — completely different fields. The plan routes `decision:create` through `begin('create', {type:'decision'}, payload)` without addressing the type mismatch. Fix: add a new phase `"create-decision"` to `BeginPhase` and `BeginPayloadMap` (follows the `"update-decision"` pattern already in the plan).

Resolution: DIRECTLY_ACTIONABLE

---

### I3. Phase 1 O(n^2) fix description incomplete — misses epic-rollup case
**Flagged by:** Holistic, Software Architecture
**File:** `01-learnings-and-decisions-state-machine.md`, `src/core/state-machine/handlers/slice-complete.ts` (implementation target)

The task says "collect all project-rollup `LearningEntry` items" and references "lines ~93-100", but the actual O(n^2) loop spans lines 89-106 and includes both `epic` and `project` rollup targets in a nested `for (const target of entry.rollupTo)` loop. The task mentions "Same for epic-rollup entries" in passing but the main description could be misread as only fixing the project-rollup case. Fix: make explicit that both epic-rollup and project-rollup paths need batch operations — collect entries into separate arrays per target scope, then one `getJsonl` + concat + `setEntry` per target.

Resolution: DIRECTLY_ACTIONABLE

---

### I4. Phase 2 `learning:show` overlaps with `learning:list --scope` / deviates from architecture
**Flagged by:** Holistic, Software Architecture, TypeScript, TUI/CLI
**File:** `02-decision-and-learnings-cli.md`, `commands-api.md`

All four reviewers flagged this. `learning:show --scope` as described returns plural entries from `learnings.jsonl` — identical to `learning:list --scope`. The architecture (`commands-api.md`) specifies `learning:show --id <id>` (single entry by ID). The plan either needs to: (a) follow the architecture and implement `learning:show --id <id>` with an id field on `LearningEntry`, (b) drop `learning:show` and enhance `learning:list`, or (c) document the deviation.

Resolution: USER_INPUT

---

### I5. Phase 1 ROLLUP_LEARNINGS handler — semantics of filtering by `rollupTo` vs moving all entries
**Flagged by:** Software Architecture (USER_INPUT), TypeScript (DIRECTLY_ACTIONABLE)
**File:** `01-learnings-and-decisions-state-machine.md`

Two concerns raised:
1. **Software Architecture:** The handler description says "filter entries whose `rollupTo` includes target scope" but ROLLUP_LEARNINGS is a manual operation with `{from, to}` payload. Should it move ALL entries from source, or only entries tagged with matching `rollupTo`? If filtering is intentional, the plan should explain why.
2. **TypeScript:** `rollupTo` contains abstract labels like `"project"` or `"epic"`, not filesystem paths. The plan must clarify the mapping between `to` (a path-based scope) and `rollupTo` labels to avoid implementer confusion.

Resolution: USER_INPUT

---

### I6. Flag naming inconsistencies with architecture spec
**Flagged by:** TUI/CLI
**File:** `02-decision-and-learnings-cli.md`, `commands-api.md`

Three flag naming mismatches:
1. `decision:show --decision` should be `--id` (per `commands-api.md` line 109 and consistency with `decision:update --id`)
2. `learning:list --scope` should be `--source` (per `commands-api.md` line 118)
3. `learning:show --scope` should be `--id` (per `commands-api.md` line 119) — but this ties into I4 above

These matter especially because Phase 4's `schema` command introspects flag definitions for LLM consumers.

Resolution: DIRECTLY_ACTIONABLE

---

### I7. Phase 1 UPDATE_DECISION needs guard: `supersededBy` only valid with status `superseded`
**Flagged by:** TypeScript
**File:** `01-learnings-and-decisions-state-machine.md`

`changes: Partial<DecisionEntry>` allows setting `supersededBy` without changing status to `superseded`. The handler should guard against this to prevent inconsistent state (e.g., an active decision with `supersededBy` set).

Resolution: DIRECTLY_ACTIONABLE

---

### I8. Phase 1 missing explicit `StateErrorCode` additions for decision guards
**Flagged by:** TypeScript, Software Architecture
**File:** `01-learnings-and-decisions-state-machine.md`, `src/schemas/state-events.ts`

Phase 1 needs guards for "duplicate decision id" and "can't update superseded decision." The plan doesn't specify which `StateErrorCode` to use. `STATE_INVALID_TRANSITION` could cover the terminal state case, but "duplicate decision id" is a different class of error (data conflict). The plan should explicitly task adding new error codes or document reuse of existing ones.

Resolution: DIRECTLY_ACTIONABLE

---

### I9. Phase 4 before-check for `--query` is unreliable
**Flagged by:** TUI/CLI
**File:** `04-universal-query-and-schema.md`

The "Before implementation" check says `epic:list --json --query '.items[0].name'` should fail. But citty silently ignores unknown flags rather than erroring. The before-check should verify unfiltered output instead (full JSON returned, not just the name).

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1. Phase 3 `assembleState` vs `loadState` — make the choice explicit
**Flagged by:** Software Architecture, TypeScript
**File:** `03-full-status-command.md`

Status must work on fresh projects, so `assembleState` is correct (handles zero-state). The plan should make this deliberate choice explicit to avoid implementers switching to `loadState` for consistency with other read-only commands.

Resolution: DIRECTLY_ACTIONABLE

---

### M2. Phase 3 status command needs filesystem `readdir` for artifact counting, not just `assembleState`
**Flagged by:** Holistic
**File:** `03-full-status-command.md`

The task says "walk tree to count artifacts" and "count markdown files under `architecture/`, `research/`, etc." but `assembleState()` reads structured state (JSON/JSONL) — it doesn't enumerate markdown files. Clarify that artifact counting requires direct filesystem `readdir` calls alongside `assembleState()`.

Resolution: DIRECTLY_ACTIONABLE

---

### M3. Phase 1 overview text contradicts Phase 2 re: ROLLUP_LEARNINGS visibility
**Flagged by:** Holistic
**File:** `01-learnings-and-decisions-state-machine.md` (overview section)

Overview says "ROLLUP_LEARNINGS is invisible to RPC" but Phase 2 wires `begin('rollup', ...)` through RPC with a `learning:rollup` CLI command. Fix the overview text.

Resolution: DIRECTLY_ACTIONABLE

---

### M4. Phase 3 before-check is fragile / depends on Phase 2 state
**Flagged by:** Holistic
**File:** `03-full-status-command.md`

The before-check `status --json | jq '.artifacts.decisions'` returns "null or 0" — but if run without Phase 2 state, it fails for a different reason (no decisions.jsonl). Make it independent: check that `artifacts` is `{}` (current stub behavior).

Resolution: DIRECTLY_ACTIONABLE

---

### M5. Phase 2 `decision:list` read pattern should be clarified
**Flagged by:** Software Architecture
**File:** `02-decision-and-learnings-cli.md`

Should `decision:list` read from assembled state tree (via `loadState` + `getJsonl`) or directly from filesystem? The existing `epic:list` pattern uses `loadState` + `getJson`, so `decision:list` should follow the same pattern with `getJsonl`.

Resolution: DIRECTLY_ACTIONABLE

---

### M6. Phase 4 schema command introspection approach is underspecified
**Flagged by:** TypeScript
**File:** `04-universal-query-and-schema.md`

citty doesn't expose a public introspection API. The plan should clarify whether it reads internal properties of citty command objects (fragile) or extracts command metadata into a parallel registry at registration time.

Resolution: DIRECTLY_ACTIONABLE

---

### M7. Phase 4 `--query` vs `--quiet` precedence unspecified
**Flagged by:** TypeScript
**File:** `04-universal-query-and-schema.md`

If `--quiet --query '.x'` is passed, does `--query` override `--quiet`? The current `output()` function checks quiet first and returns early. The plan should document intended precedence.

Resolution: DIRECTLY_ACTIONABLE

---

### M8. Phase 3 status human output doesn't specify empty-state handling
**Flagged by:** TUI/CLI
**File:** `03-full-status-command.md`

Plan doesn't specify what to show when sections are empty. Should carry forward existing "No active work" pattern rather than showing verbose zero-filled tables.

Resolution: DIRECTLY_ACTIONABLE

---

### M9. Phase 2 `--quiet` mode unspecified for new commands
**Flagged by:** TUI/CLI
**File:** `02-decision-and-learnings-cli.md`

Existing pattern: `output()` returns early on quiet = no output. Plan should be explicit that new commands follow this pattern.

Resolution: DIRECTLY_ACTIONABLE

---

### M10. No documentation update task in Phases 1-3
**Flagged by:** Holistic
**File:** all phase files

Phase 4 includes updating `.project/conventions.md`, but no phase includes verifying architecture doc accuracy post-implementation. Low risk since docs are noted as "fresh," but a verification task would be prudent.

Resolution: DIRECTLY_ACTIONABLE

---

### M11. Phase 4 schema human-mode output format unspecified
**Flagged by:** TUI/CLI
**File:** `04-universal-query-and-schema.md`

Plan says "human-readable formatting by default, raw with `--json`" but doesn't specify what human-readable means for JSON Schema output. Should clarify: indented JSON via `JSON.stringify(data, null, 2)` or a custom formatter.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

1. **C1 — Fix `z.toJsonSchema()` to `z.toJSONSchema()`** in `04-universal-query-and-schema.md`. Also add `unrepresentable: "any"` option.

2. **I1 — Add `buildBeginResult` decision branch task** to Phase 2 in `02-decision-and-learnings-cli.md`. Task: add `target.type === "decision"` branch in `buildBeginResult` that reads decision entry from `decisions.jsonl` by id to extract status before/after.

3. **I2 — Add `"create-decision"` phase to `BeginPhase`/`BeginPayloadMap`** in `02-decision-and-learnings-cli.md`. Don't route through `begin('create', {type:'decision'})` — add a new phase following the `"update-decision"` pattern.

4. **I3 — Clarify O(n^2) fix** in `01-learnings-and-decisions-state-machine.md`. Make explicit: both epic-rollup AND project-rollup paths need batch operations. Collect entries into separate arrays per target scope, then one `getJsonl` + concat + `setEntry` per target.

5. **I6 — Fix flag names** in `02-decision-and-learnings-cli.md`: `decision:show --decision` -> `--id`, `learning:list --scope` -> `--source`.

6. **I7 — Add `supersededBy` guard** to Phase 1 task in `01-learnings-and-decisions-state-machine.md`. UPDATE_DECISION handler must reject `supersededBy` being set without status changing to `superseded`.

7. **I8 — Specify `StateErrorCode` additions** in `01-learnings-and-decisions-state-machine.md`. Add `STATE_DUPLICATE_DECISION` (or similar) and document reuse of `STATE_INVALID_TRANSITION` for terminal-state guard.

8. **I9 — Fix Phase 4 before-check** in `04-universal-query-and-schema.md`. Change to verify unfiltered output rather than expecting citty to error on unknown flags.

9. **M1 — Make `assembleState` choice explicit** in `03-full-status-command.md`.

10. **M2 — Clarify artifact counting needs `readdir`** in `03-full-status-command.md`.

11. **M3 — Fix overview text** in `01-learnings-and-decisions-state-machine.md`: remove "invisible to RPC" claim about ROLLUP_LEARNINGS.

12. **M4 — Fix Phase 3 before-check** in `03-full-status-command.md` to be independent of Phase 2 state.

13. **M5 — Clarify `decision:list` read pattern** in `02-decision-and-learnings-cli.md`: use `loadState` + `getJsonl` per existing patterns.

14. **M6 — Clarify schema introspection approach** in `04-universal-query-and-schema.md`.

15. **M7 — Specify `--query` vs `--quiet` precedence** in `04-universal-query-and-schema.md`.

16. **M8 — Add empty-state handling guidance** to `03-full-status-command.md`.

17. **M9 — Make `--quiet` behavior explicit** in `02-decision-and-learnings-cli.md`.

18. **M10 — Add doc verification task** (any phase file or cross-cutting).

19. **M11 — Specify schema human-mode output format** in `04-universal-query-and-schema.md`.

## RESEARCH_NEEDED

None identified.

## Contradictions Resolved

1. **`z.toJsonSchema` severity:** TypeScript rated this CRITICAL; Holistic, Software Architecture, and TUI/CLI rated it IMPORTANT. Trusted TypeScript (domain specialist) — elevated to CRITICAL since it's a definite runtime crash with no fallback.

2. **ROLLUP_LEARNINGS filtering semantics:** Software Architecture flagged as USER_INPUT (should handler filter by `rollupTo` or move all entries?). TypeScript flagged a related but different concern about label-vs-path mapping (DIRECTLY_ACTIONABLE). These are complementary, not contradictory. The USER_INPUT question (filter vs move-all) must be answered first; the label mapping concern applies to whichever answer is chosen. Merged into I5.

3. **`learning:show` overlap:** All four reviewers flagged this. Software Architecture and TUI/CLI noted it deviates from `commands-api.md` spec (`--id` not `--scope`). Holistic and TypeScript focused on the functional duplication with `learning:list`. These are the same issue from different angles. Elevated to USER_INPUT since the resolution depends on whether learnings should have individual IDs.

## Unresolved (USER_INPUT required)

### U1. `learning:show` design — follow architecture spec or drop the command?
**Context:** Architecture spec (`commands-api.md`) defines `learning:show --id <id>`. Plan implements `learning:show --scope` which duplicates `learning:list --scope`. All four reviewers flagged this.
**Question:** Should learnings have individual IDs, enabling `learning:show --id <id>` per the architecture? Or should `learning:show` be dropped/merged into `learning:list`?
**Flagged by:** Holistic, Software Architecture, TypeScript, TUI/CLI

### U2. ROLLUP_LEARNINGS semantics — filter by `rollupTo` tag or move all entries?
**Context:** The handler description says "filter entries whose `rollupTo` includes target scope" but ROLLUP_LEARNINGS is a manual `{from, to}` operation. Moving only tagged entries means un-tagged learnings stay behind; moving all entries ignores the `rollupTo` field.
**Question:** Should manual rollup move ALL learnings from source to target, or only those whose `rollupTo` includes the target?
**Flagged by:** Software Architecture, TypeScript

---

## USER_INPUT Resolved

### U1. `learning:show` — Drop the command
**Answer:** Drop `learning:show`. Merge any unique functionality into `learning:list`. This reduces the command count from 7 to 6 (4 decision + 2 learning). Update the overview, Phase 2 tasks, and test lists accordingly.

### U2. ROLLUP_LEARNINGS — Filter by `rollupTo` tag
**Answer:** Only roll up entries whose `rollupTo` array includes a label matching the target scope. This is intentional — the `rollupTo` field exists precisely to control which learnings propagate and where. Entries without matching tags stay in their source scope. The plan should clarify the mapping between `to` path (e.g., `project`) and `rollupTo` labels (e.g., `"project"`, `"epic"`).
