# Software Architecture Review: Dogfooding Plan (Round 2)

## Round 1 Remediation Check

All three round-1 CRITICAL issues were addressed:
- `__active__` prefix references removed from entity paths (plan now uses `epics/<name>/` throughout)
- `side-quests/` replaced with `quests/`
- `/start-epic` replaced with `epic:activate` CLI command in Phase 4, with migration gap documented

The round-1 IMPORTANT issues were also addressed: CLI vs skill-layer behaviors are now distinguished (e.g., `~~archived~~` renaming noted as "skill-managed convention, not CLI behavior"), skill installation has user-level-first ordering, and the INV-004 cold-start check was added to Phase 4 verification.

## Issues

**[CRITICAL]** Phase 4 calls `epic:activate` at the wrong lifecycle point

Phase 4 places `epic:activate` in the "Exploration & Architecture Proposal" section — immediately after `/create-architecture` and before slicing. The state machine only allows `ACTIVATE_EPIC` from `slices-refined` status (confirmed in `src/core/state/transitions/epic-lifecycle.ts` line 28: `guardEpicStatus(getEpic(state, event.epic), event.epic, "slices-refined", "ACTIVATE_EPIC")`). The transition table confirms this: only `slices-refined -> activated` is a valid transition. At the point where Phase 4 calls it, the epic would be in `architecture-defined` or `architecture-refined` status. The command will fail with `STATE_INVALID_TRANSITION`.

Fix: Move the `epic:activate` task from "Exploration & Architecture Proposal" to after "Run `/create-slices`" and slice refinement in the "Slicing, Planning, Implementation" section. The correct ordering is: `/create-architecture` -> `/refine-architecture` -> `/create-slices` -> `/refine-slices` -> `goodplan epic:activate --epic llm-judge --json` -> then slice planning/implementation. Also update the "Verify activation" check to appear after slicing, not after architecture.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Phase 2 never activates the first epic

Phase 2 runs the entire first epic lifecycle (explore -> architecture -> slices -> plan -> implement -> complete) but never calls `goodplan epic:activate`. The CLI does not auto-activate epics — `CREATE_EPIC` sets status to `created` with `activeEpic: null` (confirmed in `src/core/state/transitions/epic-create.ts`). The `ACTIVATE_EPIC` event is required to transition to `activated` status and set `project.activeEpic`. Without activation, `COMPLETE_EPIC` will fail because it requires `activated` status (transition table: `activated -> completed`).

Fix: Add an `epic:activate` task in Phase 2 after slice refinement is complete, before beginning slice planning/implementation. Insert between the "Slicing" section and the "Planning & Implementation" section: `goodplan epic:activate --epic core-provider --json`. Also add a verification check: `goodplan status --json` shows `activeEpic.name === "core-provider"`. Note: verifications must be added to the epic before activation (the guard requires `epic.verifications.length > 0`), so add a task to submit verifications via `goodplan epic:add-verification` before calling `epic:activate`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 approval workflow is architecturally ambiguous

Phase 4's task "Handle skill-layer operations separately" says: "The approval workflow (copying proposal to `architecture/`, writing `approved.md`) is skill-owned behavior. If `/start-epic` is exercised, note any inconsistencies... If skipped, perform approval steps manually and note the gap." This leaves the implementer unsure what to actually do. The `/start-epic` skill is explicitly documented as NOT migrated, so exercising it will create state inconsistencies (it writes `state.md` and `activity-log.jsonl` directly, bypassing the CLI state machine). But "perform approval steps manually" is undefined — what manual steps? The plan needs a concrete fallback.

Fix: Replace the ambiguous task with a concrete sequence: (1) After `/create-architecture` writes the proposal, manually copy `architecture-proposal/` to `architecture/` and write an `approved.md` marker. (2) Log this manual approval workflow as friction — it should be a CLI command or skill operation, not manual filesystem manipulation. (3) Do NOT exercise `/start-epic` during dogfooding (it will corrupt CLI state). Note in friction log that `/start-epic` needs full CLI migration in a follow-up slice.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing epic verification submission step

The `ACTIVATE_EPIC` guard requires `epic.verifications.length > 0` (confirmed in `src/core/state/transitions/epic-lifecycle.ts` lines 49-55). Neither Phase 2 nor Phase 4 includes a task to add verification criteria to the epic before activation. Without this step, `epic:activate` will fail with `STATE_MISSING_VERIFICATIONS`.

Fix: In both Phase 2 and Phase 4, add a task before `epic:activate` to submit verification criteria: `echo '{"description":"<verification>","command":"<cmd>"}' | goodplan epic:add-verification --epic <name> --json`. The `/create-slices` or `/refine-slices` skill may handle this, but the plan should explicitly verify verifications exist before attempting activation.

Resolution: CODEBASE_EXPLORATION

Research: Check whether `/create-slices` or `/refine-slices` skills submit epic verifications via CLI. Grep skill files for `add-verification` or `ADD_VERIFICATION` to determine if this is already handled by the skill workflow or needs an explicit manual step.

---

**[IMPORTANT]** In-project skill installation actually reads shared references from user-level path

Phase 1 correctly installs user-level skills first, then copies skills in-project. However, the plan's rationale ("so goodplan's old-format skills remain usable in this repo") misrepresents why both installs are needed. The real reason is that all skills hardcode `~/.claude/skills/_shared/references/` as absolute paths for their `Read` calls (confirmed via grep: every skill references `~/.claude/skills/_shared/references/cli-interaction.md`, `epic-conventions.md`, etc.). In-project skills at `.claude/skills/` will read shared references from the user-level path regardless. The plan should make this dependency explicit so the implementer knows that: (a) user-level install is mandatory even with in-project installation, (b) the in-project `_shared/references/` directory is never actually read by skills, (c) any reference file edits during dogfooding must target `~/.claude/skills/_shared/references/`, not the in-project copy.

Fix: Update the Phase 1 user-level install task to explain the real reason: "Skills hardcode `~/.claude/skills/_shared/references/` as absolute paths. User-level install ensures these references exist." Add a note that editing shared references during Phases 2-4 requires updating the user-level copy, not just the in-project copy. Log this as friction — skills should use relative paths or a configurable base path.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 cross-skill grep patterns may produce false positives in plan-refining directory

Phase 5 runs grep against `skills/` in the goodplan repo, but the plan files themselves (under `.project/`) contain CLI command examples with `.project/` paths, `state.md` references, and `__active__` mentions. While the grep targets `skills/` specifically, the `--exclude-dir='_shared'` flag only excludes the shared references. If any skill files contain plan-related comments or examples, they could trigger false positives. The broader grep patterns (`cat .project/`, `mkdir -p .project/`) are especially prone to matching documentation or comments within skills.

Fix: Add `--exclude-dir='start-epic'` to the grep (since `start-epic` is explicitly documented as not yet migrated and will have legitimate old-pattern references). Alternatively, add a note that `start-epic` hits are expected and should be excluded from the zero-hit verification.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Expected Behavior "After" check for `architectureDefined` is not a CLI field

Phase 2 Expected Behavior "Before" checks include `architectureDefined === false` and `slicesDefined === false` from `goodplan epic:show --json`. These field names suggest boolean flags on the epic JSON, but the actual epic schema uses `status` as the lifecycle field (e.g., `status === "architecture-defined"`). The Expected Behavior should use the actual JSON field names from the epic schema.

Fix: Replace `architectureDefined === false` with `status === "created"` and `slicesDefined === false` with a check that `sliceSequence` is empty or status is pre-slicing. Use the actual field names from the epic JSON schema.

Resolution: CODEBASE_EXPLORATION

Research: Check the epic JSON schema (`src/schemas/entities/epic.ts`) to confirm the exact field names returned by `epic:show --json`, specifically whether `architectureDefined` or `slicesDefined` are computed fields in the show command output or if only `status` and `sliceSequence` are available.

## Score: 6/10

Significant improvement from round 1 (4/10). The three original critical issues are resolved. However, two new critical issues emerged: the `epic:activate` placement is wrong in both Phase 2 (missing entirely) and Phase 4 (called too early), which will cause state machine errors during execution. These are straightforward fixes — move the activation call to the correct lifecycle point and add verification submission. The IMPORTANT issues around the approval workflow ambiguity and shared reference path dependency are important for implementation success but won't cause hard failures. To reach 9+: fix both activation timing issues, clarify the approval workflow fallback, add verification submission steps, and make the shared reference path dependency explicit.

## Summary
- Critical: 2
- Important: 3
- Minor: 2
