# Architecture Review — Round 3 Merged Feedback

**Reviewers:** Software Architecture (9/10), Holistic (9/10), API Contract (9/10)
**Previous merged.md:** superseded by this file. The prior merged.md was based on earlier review passes (`software-architecture.md`, `tui-cli.md`). Those files remain in the reviews/ directory for reference.

---

## Round 2 Verification

All reviewers confirm all round 2 issues are resolved. No regressions.

---

## Important Issues

### IMP-1 `--override` listed on `BEGIN_*` commands where it has no effect
**Reviewers:** Software Architecture, Holistic, API Contract (all three)
**Files:** `commands-api.md`

`BEGIN_REFINE_ARCHITECTURE`, `BEGIN_REFINE_SLICES`, `BEGIN_REFINEMENT`, and `BEGIN_QUEST_REFINEMENT` carry no `override` field. The `[--override]` annotation on `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, and `quest:refine-plan` is therefore incorrect — the flag is silently dropped. The Common Workflow Flags table also incorrectly lists these four begin commands as valid `--override` targets.

Fix: Remove `[--override]` from those four command definitions. Remove those four commands from the `--override` applicable-commands list. `--override` belongs only on `submit-refinement`, `submit-refine-architecture`, and `submit-refine-slices`.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-2 `decision:create` and `decision:update` route through `begin()` but `Target` has no `decision` variant
**Reviewer:** API Contract
**Files:** `rpc-layer-api.md`, `state-machine-api.md`

`rpc-layer-api.md` routes `decision:create` → `begin('create', ...)` and `decision:update` → `begin(phase, ...)`. The `Target` union has no `{ type: 'decision'; id: string }` variant. The BeginPhase mapping comments have no entries for `CREATE_DECISION` or `UPDATE_DECISION`. The Commands layer has no valid `Target` to pass for these commands.

Fix: Either (a) add `{ type: 'decision'; id: string }` to `Target` and add decision mapping entries to BeginPhase comments, or (b) introduce dedicated `createDecision()` / `updateDecision()` RPC functions — cleaner since decisions are JSONL-based with no lifecycle phases.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-3 `conventions.md` conflates read-only and mutation routing
**Reviewer:** Software Architecture
**File:** `conventions.md`

Line 13 lists `start-*` and `status` under "Workflow commands" routing to "Commands → RPC Layer → State Machine + Data Layer". Neither invokes `reduce()` or `commitState()`. The routing tables in `commands-api.md` and `rpc-layer-api.md` correctly distinguish these; `conventions.md` — the quick-reference for implementers — does not.

Fix: Split the bullet into:
- **Mutation commands** (`create`, `plan`, `complete`, `abandon`, `submit-*`): Commands → RPC Layer → State Machine + Data Layer
- **Read commands** (`start-*`, `status`): Commands → RPC Layer → Data Layer (no state machine)

Resolution: DIRECTLY_ACTIONABLE

---

## Minor Issues

### MIN-1 `plan-refining.md` lifecycle underspecified
**Reviewer:** Software Architecture
**File:** `data-model.md`

`data-model.md` line 429 has a brief comment ("working draft updated during each refinement round") but does not explain when `plan-refining.md` first appears, whether it is created from `plan.md`, or how it becomes `plan-refined.md`.

Fix: Add one sentence: "The sub-agent creates `plan-refining.md` during refinement rounds. When scores pass threshold, the sub-agent writes `plan-refined.md` directly; the CLI does not rename files."

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-2 `ContextResult` type alias adds no information
**Reviewer:** Software Architecture
**File:** `rpc-layer-api.md`

`type ContextResult = ContextBundle` with a comment noting they are identical. The alias adds a name with no semantic distinction or type safety benefit.

Fix: Either change `startContext()` return type to `ContextBundle` and remove the alias, or add a distinguishing field to `ContextResult` that makes the alias carry information.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-3 `StatusOptions` leaks Commands-layer concerns into RPC layer
**Reviewer:** Software Architecture
**File:** `rpc-layer-api.md`

`StatusOptions` carries `json?: boolean` and `query?: string`. These are output-formatting concerns handled by the Commands layer's `output()` function and should not reach the RPC layer.

Fix: Remove `json`/`query` from `StatusOptions`. Replace with domain-relevant options if needed (e.g., `scope?: string` for filtering).

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-4 `activeSlice` and `activeQuest` lifecycle undocumented
**Reviewer:** Holistic
**Files:** `data-model.md`, `transition-tables.md`, `state-machine-api.md`

`project.json` defines `activeSlice` and `activeQuest` but no transition table row documents which event sets or clears them. `activeEpic` is fully documented (set by `ACTIVATE_EPIC`, cleared by `COMPLETE_EPIC` / `ABANDON_EPIC`). No equivalent exists for slice or quest.

Fix (choose one): (a) add lifecycle notes to relevant transition rows ("Sets project.json activeSlice" on `BEGIN_PLAN`, "Clears project.json activeSlice" on `COMPLETE_SLICE`/`ABANDON_SLICE`), or (b) remove `activeSlice`/`activeQuest` if they are derivable at read time from `overview.json`.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-5 `CompleteInput` optional arrays coerced to `[]` — undocumented
**Reviewer:** API Contract
**File:** `rpc-layer-api.md`

`CompleteInput` uses optional arrays (`deferred?`, `learnings?`, `architectureDelta?`) but the corresponding state events require non-optional arrays. The RPC layer must coerce `undefined → []`; this is reasonable but not stated anywhere.

Fix: Add a one-line note to the `CompleteInput` comment block: "Undefined array fields are coerced to `[]` by the RPC layer before building the state event."

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-6 `architectureDelta` stdin examples omit required `ts` field
**Reviewer:** API Contract
**File:** `commands-api.md`

Stdin examples for `slice:complete` and `quest:complete` include `architectureDelta` entries without a `ts` field. `ArchitectureDelta` in `state-machine-api.md` defines `ts: string` as required. Ownership of `ts` is unspecified.

Fix: Clarify ownership. If caller-supplied, add `"ts": "2026-03-20T12:00:00Z"` to the examples. If RPC-injected, mark `ts` optional in `ArchitectureDelta` on input or define a separate `ArchitectureDeltaInput` type without `ts`.

Resolution: DIRECTLY_ACTIONABLE

---

## Issue Summary

| # | Severity | Title | Reviewers |
|---|---|---|---|
| IMP-1 | Important | `--override` on `BEGIN_*` commands has no effect | All three |
| IMP-2 | Important | `decision:create`/`update` — no `decision` Target variant | API Contract |
| IMP-3 | Important | `conventions.md` conflates read-only and mutation routing | Software Architecture |
| MIN-1 | Minor | `plan-refining.md` lifecycle underspecified | Software Architecture |
| MIN-2 | Minor | `ContextResult` alias adds no information | Software Architecture |
| MIN-3 | Minor | `StatusOptions` leaks output-formatting into RPC layer | Software Architecture |
| MIN-4 | Minor | `activeSlice`/`activeQuest` lifecycle undocumented | Holistic |
| MIN-5 | Minor | `CompleteInput` optional→required array coercion undocumented | API Contract |
| MIN-6 | Minor | `architectureDelta` stdin examples omit `ts` field | API Contract |

**Totals: 0 Critical, 3 Important, 6 Minor**

---

## Deduplication Notes

- IMP-1 raised independently by all three reviewers with identical diagnosis. Merged into one entry using the most specific fix description (from API Contract).
- No contradictions between reviewers on any issue.
- `software-architecture.md` and `tui-cli.md` in the reviews/ directory are from an earlier review pass. The issues they raised are captured in the prior `merged.md` (now superseded). The current three named reviewers did not re-raise those issues — they either verified fixes or are out of scope for this pass.
