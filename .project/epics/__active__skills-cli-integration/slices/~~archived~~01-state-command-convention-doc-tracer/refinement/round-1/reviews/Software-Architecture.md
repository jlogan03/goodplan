# Software Architecture Review

## Issues

**[IMPORTANT]** Pagination breaks the `output()` abstraction without a clean seam

The plan acknowledges that `output()` couples query application and stdout writing (research confirms this at section 3.1), and the plan's task says to "apply pagination manually before calling `output()`." However, the actual task description for `state.ts` says to call `output(serialized, args)` — which would apply `--query` internally — and *then* apply offset/limit. That is contradictory: `output()` writes to stdout immediately, so there is no intermediate result to paginate.

The plan needs to commit to one approach and spell it out precisely. The cleanest option (option 1 from the research: call `applyQuery()` manually, paginate, then write to stdout directly) should be the explicit task, not a parenthetical aside. Specifically:
1. The state command should NOT call `output()` when `--query` is present
2. It should call `applyQuery()`, apply `Array.slice()` if the result is an array, then call `process.stdout.write(deterministicStringify(result))` directly
3. When `--query` is absent, it can use `output()` normally (no pagination applies to the full tree)

The plan's separate "Handle `--offset`/`--limit` pagination" task partially addresses this but contradicts the earlier `run()` description. Consolidate into a single, unambiguous task.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `serializeStateTree` placed in `src/core/data/serialize.ts` — correct layer but missing public API documentation

The plan creates `serializeStateTree()` in the Data Layer (`src/core/data/`). This is architecturally correct: it transforms `ProjectState` (a Data Layer type) into a plain JSON-serializable object, and the Commands layer is the only consumer. However, this function is a new public API surface on the Data Layer. The architecture overview lists Data Layer dependents as "RPC Layer, Commands" — this adds a new dependency path (Commands -> Data Layer serialize) that is consistent with the existing read-only command pattern (Commands -> Data Layer directly).

The plan should explicitly note that `serializeStateTree` is a read-only Data Layer export, consistent with how `assembleState()` is consumed by read-only commands. No architectural change needed, but the plan should be explicit about this being a new public function so the implementation doesn't accidentally make it internal-only.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 references `show --json` artifacts field that doesn't exist yet

Phase 3's tasks reference `show --json` for entity details and phase derivation (task: "Step 6 — replace with `status --json` phase derivation + `show --json` for entity details"). The epic architecture's `cli-changes.md` section 2 specifies enriching `show` with an `artifacts` field, but this is planned for a later slice (not slice 01). The plan's Phase 2 convention doc also notes "Deriving Workflow Phase" as "use `show --json` artifacts field (planned for slice 02, note as upcoming)."

Phase 3 must not depend on `show --json` `artifacts` since it won't exist yet. The plan should clarify what Phase 3 actually uses:
- `status --json` for active entities and recommendations (available now)
- `state --json --query` for deeper lookups (delivered by Phase 1)
- Current `show --json` without artifacts for entity details (available now, returns entity JSON fields but no artifacts)

The Phase 3 tasks should explicitly list which fields from the current `show --json` response are used and note that the file-existence state machine logic is simplified but not fully replaced until slice 02 delivers the `artifacts` enrichment.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Convention doc (Phase 2) documents `start-complete` which does not exist

Phase 2's source material (`cli-interaction-conventions.md`) includes a worked example with `goodplan start-complete --slice my-slice --inline --json`. Checking `src/commands/main.ts`, the subCommands map has no `start-complete` entry. The `complete` flow uses `slice:complete` directly with stdin payload — there is no separate `start-complete` command.

The convention doc must either:
1. Omit the `start-complete` example (if the command isn't planned for this epic)
2. Note it as a future command with a "not yet available" callout

Including a non-existent command in the convention doc would cause skill failures. The plan's Phase 2 verification step ("Spot-check 3 CLI commands from the doc against the actual CLI") should catch this, but the plan should explicitly flag this as a known gap in the source material to avoid transcribing it uncritically.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification step 2 query `.slices | keys` may not match actual state tree shape

Phase 1 verification step 2: `goodplan state --json --query '.slices | keys'`. The serialized state tree structure depends on how `assembleState()` organizes the `.project/` directory. Looking at the project structure, slices live under `.project/slices/` (project-level) or `.project/epics/__active__*/slices/` (epic-scoped). The state tree serialization would have `slices` as a top-level key only if `.project/slices/` exists. For an epic-scoped project, the slices directory is nested under the epic. The verification query should account for this — it may need to be `.epics["__active__skills-cli-integration"].slices | keys` for the goodplan repo.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 doesn't address `state.md` writeback elimination

The current `project-status` SKILL.md Step 9 writes back to `state.md` and appends to `activity-log.jsonl`. The plan's Phase 3 tasks say to replace direct file reads but don't explicitly address Step 9's write operations. Since `state.md` is eliminated by this epic and `activity-log.jsonl` appending is prohibited by the convention doc, Phase 3 must explicitly remove Step 9's writeback behavior. The plan should add a task: "Remove Step 9 (state.md writeback and activity-log append) — `project-status` becomes a pure read-only skill with no side effects."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing `--json` requirement for `goodplan state` command

The plan's Expected Behavior shows `goodplan state --json` as the primary usage, but the plan doesn't specify what happens when `goodplan state` is invoked without `--json`. Since `state` is primarily an LLM-facing command (full state tree), there may be no meaningful human-readable format. The plan should specify: does `state` without `--json` show a human-readable summary, error, or implicitly enable `--json`? The `status` command has explicit human-readable formatting; `state` may not need one. Clarify to avoid implementation ambiguity.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phase boundaries and good alignment with the four-layer architecture. The read-only routing pattern (Commands -> Data Layer, bypassing RPC) is correctly applied for the `state` command. The `serializeStateTree` placement in the Data Layer is architecturally sound. The convention doc is properly sequenced before the tracer bullet.

To reach 9+: (1) Resolve the pagination/output() contradiction with a single unambiguous implementation description, (2) Fix Phase 3's dependency on non-existent `show --json` artifacts, (3) Remove the `start-complete` reference from the convention doc scope, (4) Add explicit task for state.md writeback elimination in Phase 3.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
