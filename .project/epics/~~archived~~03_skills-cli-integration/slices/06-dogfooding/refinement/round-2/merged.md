# Merged Feedback — Round 2

## Round 1 Remediation

All round-1 critical issues confirmed resolved by all reviewers: `__active__` prefix removed, `side-quests/` -> `quests/`, `/start-epic` replaced with `epic:activate`, CLI-based verification adopted.

---

### CRITICAL Issues

**C1. `epic:activate` called at wrong lifecycle point in Phase 4**
Sources: software-architecture, tui-cli, agent-skill

Phase 4 calls `epic:activate` immediately after `/create-architecture`, before slicing. The state machine requires `slices-refined` status for `ACTIVATE_EPIC` (guarded in `epic-lifecycle.ts:28`). Current sequencing will fail with `STATE_INVALID_TRANSITION` (exit code 3).

Additionally, `ACTIVATE_EPIC` requires `epic.verifications.length > 0` — the plan never adds verifications via `epic:add-verification` before activation.

Fix: Move `epic:activate` to after `/create-slices` + `/refine-slices` complete, before slice planning begins. Add an explicit verification submission step (`epic:add-verification`) before `epic:activate`. Restructure Phase 4 sections accordingly.

Resolution: DIRECTLY_ACTIONABLE

---

**C2. Phase 2 never activates the first epic**
Sources: software-architecture, agent-skill (minor), tui-cli (implicit)

Phase 2 runs the entire first epic lifecycle but never calls `epic:activate`. `CREATE_EPIC` sets status to `created` with `activeEpic: null`. Without activation, `COMPLETE_EPIC` will fail (requires `activated` status). The same verification requirement applies here.

Fix: Add `epic:activate` in Phase 2 after slice refinement is complete, before slice planning/implementation. Add `epic:add-verification` before it. Verify via `goodplan status --json` that `activeEpic.name === "core-provider"`.

Resolution: DIRECTLY_ACTIONABLE

---

**C3. Phase 1 expected behavior incorrectly claims `activeEpic` is present after `create-epic`**
Source: agent-skill

Phase 1 expected behavior says `goodplan status --json` should return `activeEpic` present after `create-epic`, and verification #1 repeats this. But `CREATE_EPIC` sets `activeEpic: null` — activation happens later.

Fix: Change Phase 1 expected behavior to `activeEpic === null`. Remove "active epic" claim from verification.

Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT Issues

**I1. Phase 4 approval workflow is architecturally ambiguous — needs concrete manual steps**
Sources: holistic, software-architecture, agent-skill

The "Handle skill-layer operations separately" task is too vague. `/start-epic` is un-migrated and will corrupt CLI state if exercised (creates `__active__`-prefixed directories, writes `state.md` directly). The plan must specify the concrete manual fallback.

Fix: Replace ambiguous task with: (1) After `/create-architecture` writes proposal, manually copy `architecture-proposal/` to `architecture/` and write `approved.md`. (2) Do NOT exercise `/start-epic` during dogfooding. (3) Log as friction: approval workflow needs CLI migration. Explicitly note that `architecture-proposal` is invisible to the CLI — it just sees `COMPLETE_ARCHITECTURE` transitions.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. Missing `slice:plan` and `quest:plan` CLI transitions before `/create-plan`**
Sources: tui-cli (both slice and quest), agent-skill (quest)

Phase 2 jumps from slice creation to `/create-plan` without calling `slice:plan` to transition from `created` to `planning`. Phase 3 similarly skips `quest:plan`. These are required CLI state transitions — without them, `/create-plan` (which internally calls `start-plan`) will fail.

Fix: In Phase 2, add `stdin: "" | goodplan slice:plan --slice <name> --json` before each `/create-plan`. In Phase 3, add `stdin: "" | goodplan quest:plan --quest <name> --json` before each `/create-plan`.

Resolution: DIRECTLY_ACTIONABLE (tui-cli marked slice:plan as CODEBASE_EXPLORATION, but given quest:plan is confirmed required and the pattern is identical, this is directly actionable)

---

**I3. Missing epic verification submission step (both Phase 2 and Phase 4)**
Source: software-architecture

The `ACTIVATE_EPIC` guard requires `epic.verifications.length > 0`. Neither phase adds verifications. This is related to C1/C2 but is a distinct step.

Fix: Before each `epic:activate`, add `echo '{"description":"...","command":"..."}' | goodplan epic:add-verification --epic <name> --json`.

Resolution: RESEARCH_NEEDED — Check whether `/create-slices` or `/refine-slices` skills submit epic verifications automatically. Grep skill files for `add-verification` or `ADD_VERIFICATION`.

---

**I4. Skills hardcode `~/.claude/skills/_shared/references/` as absolute paths — in-project copy is never read**
Sources: software-architecture, agent-skill

All skills use absolute paths to `~/.claude/skills/_shared/references/`. The in-project `_shared/` copy is dead code. User-level install is mandatory for reference freshness. Edits during dogfooding must target the user-level copy.

Fix: Update Phase 1 user-level install task to explain the real reason (hardcoded absolute paths). Add verification that skills can load references from user-level path. Log as architectural friction: skills should use relative or configurable paths.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Phase 1 does not specify `"type": "module"` in package.json for ESM compatibility**
Source: typescript

`bun init` task does not mention `"type": "module"`, which is required for `verbatimModuleSyntax` to work correctly.

Fix: Add `"type": "module"` to the "Initialize TypeScript project" task.

Resolution: DIRECTLY_ACTIONABLE

---

**I6. Phase 1 does not specify Promptfoo as a dependency**
Source: typescript

Phase 2's `/implement-plan` will write code importing Promptfoo, but Phase 1 bootstrap does not install it. `bun tsc --noEmit` will fail with unresolved modules.

Fix: Add a task in Phase 1 to install known dependencies (`bun add promptfoo @anthropic-ai/sdk`), or add a note that dependency installation is part of `/implement-plan` and should not be logged as friction.

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**M1. Phase 2 before-check `architectureDefined` is nested under `artifacts`, not top-level**
Source: holistic

`epic:show --json` returns `{ ...epic, artifacts }` — the `architectureDefined` and `slicesDefined` fields are under `artifacts`, not top-level. Should reference `artifacts.architectureDefined`.

Resolution: RESEARCH_NEEDED — Verify exact field names in `epic:show` response. software-architecture suggests these may not be booleans at all (may need to use `status` field instead). Check `src/schemas/entities/epic.ts` and `src/commands/epic/show.ts`.

---

**M2. Phase 2 before-check uses `ls` instead of CLI command (redundant)**
Source: holistic

`ls .project/epics/core-provider/architecture/` is redundant with the CLI-based `architectureDefined` check. Remove the `ls` line.

Resolution: DIRECTLY_ACTIONABLE

---

**M3. Phase 1 "Build goodplan binary" task is ambiguous about PATH setup**
Source: holistic

Should specify one concrete approach (e.g., `ln -sf` or `export PATH`).

Resolution: DIRECTLY_ACTIONABLE

---

**M4. Phase 2 does not specify slice execution order**
Source: holistic

Slices must be executed in sequencing order. Add a note that slices execute in the order defined by `/create-slices`.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Phase 3 organic quest creation from `/complete` lacks specificity**
Source: holistic

Add guidance on what section of `/complete` output contains quest suggestions.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. No explicit task to capture dogfooding learnings into `.project/learnings.md`**
Source: holistic

The `/complete` skill may handle this, but an explicit task would ensure nothing is lost.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. Phase 5 cross-skill grep should exclude `start-epic` directory**
Source: software-architecture

The un-migrated `start-epic` skill will have legitimate old-pattern references. Exclude it or note hits are expected.

Resolution: DIRECTLY_ACTIONABLE

---

**M8. Phase 1 `ls` checks for nondet-eval absence should specify expected exit code**
Source: tui-cli

`ls` to verify directory absence is appropriate here (no project exists yet), but should specify "should return non-zero exit."

Resolution: DIRECTLY_ACTIONABLE

---

**M9. Phase 3 quest verification should check quest-specific status transitions**
Source: agent-skill

Add `quest:show --quest <name> --json` verification between quest skill invocations.

Resolution: DIRECTLY_ACTIONABLE

---

**M10. Phase 1 `cp -r` copies `migrate/` stub skill**
Source: agent-skill

`migrate/` is a stub — may confuse during dogfooding. Add a note or exclude from copy.

Resolution: DIRECTLY_ACTIONABLE

---

**M11. Phase 3 deliberate quest example "add type-check CI step" may be out of scope**
Source: typescript

Suggest a simpler quest that stays within TypeScript domain (e.g., "add Zod schemas for config validation").

Resolution: DIRECTLY_ACTIONABLE

---

**M12. Phase 2 `bun tsc --noEmit` may hit Promptfoo-specific type errors**
Source: typescript

Note that third-party type errors should be distinguished from generated code errors in friction logging.

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE

- C1: Move `epic:activate` after slicing in Phase 4, add verification submission
- C2: Add `epic:activate` to Phase 2 after slice refinement
- C3: Fix Phase 1 expected behavior — `activeEpic === null` after create
- I1: Replace ambiguous approval workflow with concrete manual steps, skip `/start-epic`
- I2: Add `slice:plan` and `quest:plan` transitions before `/create-plan`
- I4: Explain hardcoded reference paths, update install rationale
- I5: Add `"type": "module"` to package.json setup
- I6: Add Promptfoo dependency installation to Phase 1
- M2-M12: All minor issues listed above

Total: 18

### RESEARCH_NEEDED

- I3: Whether `/create-slices` or `/refine-slices` skills auto-submit epic verifications (grep for `add-verification` / `ADD_VERIFICATION`)
- M1: Exact field names in `epic:show --json` response — are `architectureDefined`/`slicesDefined` real fields under `artifacts`, or should `status` be used instead?

Total: 2

### Contradictions Resolved

1. **`epic:activate` missing vs misplaced**: software-architecture flagged Phase 2 missing activation as CRITICAL and Phase 4 wrong sequencing as CRITICAL. agent-skill flagged Phase 2 as MINOR ("does not specify when") and Phase 4 as part of a combined CRITICAL. tui-cli combined both into one CRITICAL. Resolution: These are two distinct issues (C1 and C2) both at CRITICAL severity — software-architecture's granularity is correct because the fixes are different (add vs move).

2. **Phase 1 `activeEpic` claim**: agent-skill flagged this as part of their CRITICAL (Phase 1 expected behavior + Phase 4 sequencing). No other reviewer caught the Phase 1 expected behavior issue specifically. Resolution: Separated as C3 since the fix is distinct from C1/C2.

3. **`architectureDefined` field naming**: holistic says it's under `artifacts` (MINOR). software-architecture and tui-cli say the field names themselves may be wrong (should be `status`). Resolution: Merged into M1 with RESEARCH_NEEDED — need to check actual response shape before fixing.

4. **`slice:plan` transition**: tui-cli marked as CODEBASE_EXPLORATION, but the same reviewer confirmed `quest:plan` as DIRECTLY_ACTIONABLE with identical evidence. Resolution: Treat as DIRECTLY_ACTIONABLE since the pattern is confirmed.

### RESEARCH Results

**I3 — epic verifications**: No skills auto-submit verifications — `add-verification` appears only in CLI source and tests, never in skill files. The plan MUST explicitly add `epic:add-verification` before each `epic:activate`. This upgrades I3 to DIRECTLY_ACTIONABLE.

**M1 — epic:show response shape**: Response is `{ ...epic, artifacts: { architectureDefined: boolean, slicesDefined: boolean, goal: boolean, ... } }`. Fields ARE under `artifacts`, not top-level. Phase 2 before-check should use `artifacts.architectureDefined === false`. This is DIRECTLY_ACTIONABLE.

### Unresolved (USER_INPUT required)

None — all issues have clear resolution paths.
