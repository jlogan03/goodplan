# Round 2 Merged Feedback

**Scores:** SW-Arch 9/10 | Arch-Alignment 9/10 | Tracer-Bullet 8/10 | Risk/Dep 9/10
**Overall:** 9/10
**Critical:** 0 | **Important:** 4 | **Minor:** 8

---

## Round 1 Resolution

All round 1 issues are resolved. Key fixes confirmed:
- Slice 01 scope tightened: `--quiet`, full `--query`, `goodplan schema` deferred to slice 05
- Slice 02 owns all Zod schemas in `src/schemas/`; slice 03 explicitly consumes them
- Slice 03 architecture flag added for enum reconciliation (transition tables = source of truth)
- Slice 04 now includes `status()` in behavior, scope boundaries, and success criteria
- Slice 05 routing split documented: list/show → Data Layer direct, `status` → RPC
- Slice 06 verification now a numbered list of assertions with expected state after each step
- Slice 07 soft dependency on slice 06 documented; `GOODPLAN_SKILLS_DIR` override in verification
- 02/03 parallelism made explicit in sequencing rationale

---

## Important Issues

### I-1 [03-state-machine]: Enum reconciliation flag is a passive note, not an enforced gate
**Source:** SW-Arch (Important #1), Arch-Alignment (Minor #1)
**Authority:** SW-Arch

The architecture flag in slice 03 correctly identifies the inconsistency (`state-machine-api.md` uses `'executing'`/`'complete'`; `transition-tables.md` uses `'activated'`/`'completed'`; `data-model.md` example shows `"executing"`) but neither resolves it nor provides a clear indication of whether reconciliation has already happened. An implementer cannot tell whether to proceed or wait. Since enum values are a concrete implementation contract — not a style choice — this must be a blocking gate, not an informational note.

**Action:** Replace the architecture flag note with a success criterion: "EpicStatus/SliceStatus/QuestStatus enum values reconciled between `state-machine-api.md` and `transition-tables.md` — transition tables are source of truth. Note whether reconciliation is complete or pending. Do not write any state machine code until resolved."

---

### I-2 [04-rpc-core]: `status()` has no binary-level verification step
**Source:** Arch-Alignment (Important), Tracer-Bullet (Important #1, noted as unaddressed from R1)
**Authority:** Arch-Alignment (subsystem mapping), Tracer-Bullet (verifiability)

`status()` is now present in scope, behavior, and success criteria. However, the five verification steps all call RPC functions directly via `bun test` — none compile and run the binary. A regression introduced while integrating load → reduce → commit won't surface until slice 05 or 06. The architecture defines `status()` as the function the `status` CLI command routes through, so binary-level confirmation belongs here.

**Action:** Add one verification step: "Compile binary, run `goodplan status --json` — verify it returns correct JSON with the full RPC layer wired (state machine + data layer integrated)."

---

### I-3 [06-commands-mutate]: `learning:rollup` maps to `ROLLUP_LEARNINGS` which is absent from transition-tables.md
**Source:** Risk/Dep (Important, R2-1)
**Authority:** Risk/Dep

Slice 06 includes `learning:rollup` as a behavior item and success criterion, routed through `ROLLUP_LEARNINGS` per `commands-api.md`. But `transition-tables.md` — the authoritative source — has no `ROLLUP_LEARNINGS` event. The learnings rollup is handled implicitly via `COMPLETE_SLICE`/`COMPLETE_QUEST`/`COMPLETE_EPIC` responses. If slice 03 does not implement a handler for `ROLLUP_LEARNINGS` (because it doesn't exist in the tables), slice 06 will discover a missing contract at integration time, requiring retroactive changes to slices 03 and 04.

**Action:** Clarify before slice 03 begins: is `learning:rollup` a standalone state-triggered command (add event to `transition-tables.md`) or a Data Layer direct operation (remove RPC routing assumption from slice 06)? Resolve the routing decision in slice 06's scope boundaries.

---

### I-4 [06-commands-mutate]: Full lifecycle verification omits the refinement and implementation loops
**Source:** Tracer-Bullet (Important #2), Arch-Alignment (Minor #2)
**Authority:** Tracer-Bullet (verifiability)

The 7-step verification workflow runs: init → epic:create → epic:activate → slice:create → slice:plan → submit-plan → status check. It stops at `plan-created`. The refinement loop (start-refinement → submit-refinement with scores → plan-refined) and implementation loop (start-implementation → submit-implementation → slice:complete with `verificationPassed`) appear in the success criteria but are absent from the numbered verification walkthrough. The refinement circuit breaker, override flag, and score threshold guard are unverified at the binary level.

Separately, the success criteria lifecycle path lists `slice:create → slice:plan → start-plan/submit-plan → slice:refine-plan → ...` which implies `submit-plan` is an alternative to `slice:plan` rather than a required intermediate step. The transition tables require `submit-plan` (COMPLETE_PLAN) to advance to `plan-created` before `BEGIN_REFINEMENT` can fire.

**Action (primary):** Extend the numbered verification to include at minimum: one refinement round (start-refinement / submit-refinement with scores above threshold) and `slice:complete` with `verificationPassed: true`.

**Action (secondary):** Rewrite the lifecycle path in success criteria to show `submit-plan` as a mandatory step between `slice:plan` and `slice:refine-plan`, not as an alternative.

---

## Minor Issues

### M-1 [01-tracer-bullet]: jqjs smoke test expected output is unspecified
**Source:** Tracer-Bullet (Minor #1)
**Authority:** Tracer-Bullet

The smoke test ("a hidden `--query` on status for smoke testing only") doesn't specify what the expected output is. A smoke test without a concrete expected value can pass vacuously.

**Action:** Specify the smoke test input and expected output (e.g., `./goodplan status --json --smoke-jq` returns `"ok"` or a known fixed value). Explicitly note: this flag is excluded from `schema` output and removed in slice 05 when full `--query` support is added.

---

### M-2 [03-state-machine]: Fitness function may undercount if StateEvent union is incomplete
**Source:** Tracer-Bullet (Minor #2)
**Authority:** Tracer-Bullet

Deriving expected counts from the `StateEvent` discriminated union is correct, but if the union itself is incomplete (missing events present in the transition tables), the fitness function will undercount silently.

**Action:** Add a note that the fitness function must cross-validate the discriminated union count against the transition table row count, or that the enum reconciliation (I-1 above) must be resolved first so the union is known complete.

---

### M-3 [05-commands-read]: Status-specific success criteria not tagged for parallelism
**Source:** SW-Arch (Minor #2)
**Authority:** SW-Arch

Slice 05 can be implemented after slice 02 for 12 of 13 success criteria; only the `status` command requires slice 04. The dependency table documents this split, but the success criteria don't tag which ones require slice 04, creating unnecessary sequencing friction if 04 and 05 are built in parallel.

**Action:** Tag `status`-specific success criteria with "(requires 04)."

---

### M-4 [05-commands-read]: `--quiet` mode output format unspecified
**Source:** Tracer-Bullet (Minor #3)
**Authority:** Tracer-Bullet

`--quiet` is in scope for slice 05 but has no success criterion, and the verification step says only "verify minimal output" without defining the format. For a CLI consumed by LLMs, the exact output shape matters.

**Action:** Add one concrete success criterion: e.g., `goodplan epic:list --quiet` returns one line per epic with just the name (or name + status — pick one and commit).

---

### M-5 [06-commands-mutate]: Verification stdin payloads are ambiguous
**Source:** SW-Arch (Minor #3)
**Authority:** SW-Arch

The verification script says "with stdin goal" but doesn't show the exact JSON shape. For mutation commands, ambiguous stdin content could mask a validation bug.

**Action:** Replace implicit stdin descriptions with concrete JSON payloads matching the examples in `commands-api.md`.

---

### M-6 [06-commands-mutate]: Success criteria verify a subset of the claimed full scope
**Source:** Risk/Dep (Minor, R2-2)
**Authority:** Risk/Dep

Scope says "all entity mutation commands per commands-api.md" but success criteria verify only the epic:create → epic:activate → epic:complete chain. Explore/architecture/slices workflow commands are absent from verification. The slice could be marked done without all commands tested.

**Action:** Either enumerate all mutation commands in success criteria, or add an explicit statement: "commands not listed are structurally identical — one test each deferred to slice 08 integration tests."

---

### M-7 [08-integration-test]: No binary compilation step before integration tests
**Source:** Tracer-Bullet (Important #3)
**Authority:** Tracer-Bullet

The verification section jumps straight to `bun test tests/integration/` without confirming the binary was freshly compiled. Integration tests may run against a stale binary.

**Action:** Add an explicit first step: "Compile binary: `bun build --compile src/index.ts --outfile goodplan` — verify exit 0 and binary size is reasonable."

---

### M-8 [08-integration-test + 03-state-machine]: Fitness function counting method conflict
**Source:** Risk/Dep (Minor, R2-3)
**Authority:** Risk/Dep

Slice 03 derives expected transition counts from the `StateEvent` discriminated union (TypeScript). Slice 08 describes a markdown parse of `transition-tables.md` for the same count. These approaches can diverge silently — either contradicting each other or double-counting.

**Action:** Align slice 08's fitness function description to use the TypeScript-derived count from slice 03, or explicitly note that this fitness function lives in slice 03 and remove it from slice 08's list.

---

## Not an Issue

**[sequencing-refining.md]: 04 || 05 parallelism undocumented** (Risk/Dep Minor R2-4) — documenting this would be useful but it is already implied by the dependency split. Low priority; address only if sequencing rationale is being edited for other reasons.

**[05-commands-read]: `status` routing dual-path** (SW-Arch Minor #2) — the sequencing table and goal-refining.md both document this correctly; the only gap is tagging success criteria, which is captured in M-3.

---

## Conflict Resolutions

| Topic | Conflict | Resolution |
|---|---|---|
| Enum reconciliation (I-1) | SW-Arch: make it a gate criterion. Arch-Alignment: add owner/status to the note. Risk/Dep: appropriate deferral, no issue. | SW-Arch authority: convert flag to a blocking gate criterion with explicit reconciliation status. |
| `status()` verification (I-2) | Arch-Alignment: missing verification step. Tracer-Bullet: no binary-level confirmation. Risk/Dep: resolved (added to criteria). | Tracer-Bullet authority: add binary-level verification step. Risk/Dep assessment was premature — criteria coverage ≠ binary coverage. |
| Slice 06 lifecycle (I-4) | Tracer-Bullet: refinement loop absent from verification. Arch-Alignment: submit-plan ordering ambiguous. | Both concerns are valid and non-overlapping; both actions retained. |
