# Software Architecture Review: Dogfooding Plan (Round 3)

## Round 2 Remediation Check

All round-2 critical and important issues were addressed:

- **C1 (Phase 4 epic:activate placement)**: Fixed. Phase 4 now has a dedicated "Epic Activation" section after slicing, with `add-verification` before `epic:activate`. Correct lifecycle ordering: create -> explore -> architecture -> slices -> refine-slices -> add-verification -> activate -> plan/implement -> complete.
- **C2 (Phase 2 missing activation)**: Fixed. Phase 2 now includes an "Epic Activation" section after slicing with `add-verification` and `epic:activate`.
- **C3 (Phase 1 activeEpic claim)**: Fixed. Phase 1 expected behavior now says `activeEpic === null` after `create-epic`.
- **I1 (approval workflow ambiguity)**: Fixed. Phase 4 now has concrete manual steps: copy `architecture-proposal/` to `architecture/`, write `approved.md`, skip `/start-epic`, log as friction.
- **I2 (missing slice:plan/quest:plan)**: Fixed. Phase 2 includes `slice:plan` before each `/create-plan`. Phase 3 includes `quest:plan` before each `/create-plan`.
- **I3 (missing verification submission)**: Fixed. Both Phase 2 and Phase 4 include explicit `epic:add-verification` tasks before `epic:activate`.
- **I4 (hardcoded reference paths)**: Fixed. Phase 1 user-level install task now explains the dependency on `~/.claude/skills/_shared/references/` with rationale and friction logging.
- **I5 ("type": "module")**: Fixed. Phase 1 TypeScript project setup mentions `"type": "module"`.
- **I6 (Promptfoo dependency)**: Fixed. Phase 1 includes `bun add promptfoo @anthropic-ai/sdk`.
- **M1 (artifacts field)**: Fixed. Phase 2 before-check uses `artifacts.architectureDefined === false`.
- **M2-M12**: All minor issues from round 2 addressed (start-epic exclusion in grep, slice execution order note, quest verification between steps, concrete PATH setup, TypeScript error distinction, etc.).

## Issues

**[IMPORTANT]** Phase 4 "Approve architecture manually" says to write `approved.md` but no CLI guard checks for this file

The task says "write `approved.md` in the epic's architecture directory" as part of the manual approval workflow. However, the CLI state machine has no guard that checks for an `approved.md` file. `COMPLETE_ARCHITECTURE` is an unconditional transition from `defining-architecture` to `architecture-defined` — it does not check filesystem contents. The `approved.md` file is therefore a skill-layer convention with no enforcement. This is not a bug in the plan, but the task wording implies `approved.md` has architectural significance. If the implementer writes it and assumes the CLI consumed it, confusion may follow. Clarify that `approved.md` is a human-readable marker only, not consumed by the CLI or any guard. The skill itself handles the `COMPLETE_ARCHITECTURE` transition via `submit-define-architecture`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 exploration section lacks explicit CLI transition commands

Phase 2's exploration tasks say "Run `/explore`" and "Check status." The `/explore` skill internally calls `epic:explore` (BEGIN_EXPLORE) and `submit-explore` (COMPLETE_EXPLORE) to manage state transitions. This is correct and consistent with the skill-CLI delegation model used throughout the plan. However, Phase 2's architecture and slicing sections include explicit CLI commands (e.g., `goodplan epic:activate --epic core-provider --json`), while the exploration section does not. For consistency and to help the implementer confirm the skill is driving the right transitions, add a note: "The `/explore` skill internally calls `goodplan epic:explore` and `goodplan submit-explore` to manage state transitions. Verify via `goodplan epic:show --epic core-provider --json` that `status` progresses through `exploring` -> `explored`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 expected behavior check for skill count says "14 skills" but conventions.md says 15

Phase 1 expected behavior says `ls ~/Repos/nondet-eval/.claude/skills/` should "contain all 14 skills plus the `_shared/` references directory." But `.project/conventions.md` lists 15 skills (including `migrate` stub). Phase 1's install task correctly notes that `migrate/` is a stub, but the expected behavior count should match the actual number of skill directories that will be present. Either say "15 skill directories (including the `migrate/` stub) plus `_shared/`" or "14 active skills plus the `migrate/` stub plus `_shared/`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 cross-skill grep `--exclude-dir` approach won't work for nested references

Phase 5's grep command uses `--exclude-dir='_shared' --exclude-dir='start-epic'`. The `--exclude-dir` flag matches directory basenames, not paths. If any skill has a subdirectory named `_shared` or `start-epic`, it would also be excluded. In practice this is fine for the current skill layout, but the broader grep patterns (`cat .project/`, `Write.*\.project/.*\.json`) should also exclude test fixtures and examples within skills if any exist. Consider adding a verification step: if any hits are found, manually inspect them before marking as failures.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Major improvement from round 2 (6/10). All critical and important issues from rounds 1-2 are resolved. The plan now correctly handles epic activation lifecycle (verifications -> activate -> implement -> complete), slice/quest state transitions (plan -> create-plan -> refine -> implement -> complete), and the approval workflow for subsequent epics. The remaining issues are minor: one IMPORTANT about the `approved.md` marker being described with more authority than it has (easy clarification), and three MINOR consistency/accuracy items. To reach 9+: clarify `approved.md` is a human-readable marker only, fix the skill count, and add the exploration transition note.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
