# Software Architecture Review: Dogfooding Plan

## Issues

**[CRITICAL]** Plan references `__active__` prefix convention that the CLI does not implement

Phase 1 states `/create-epic` "creates `__active__initial/` with `goal.md`" and Phase 2's "Before" check references `ls .project/epics/__active__initial/architecture/`. Phase 4 states `/start-epic` should "Rename `epics/llm-judge/` to `epics/__active__llm-judge/`". However, the CLI (`epic:create`, `epic:activate`) has zero knowledge of the `__active__` prefix — it uses `epics/<name>/` as the directory path (confirmed in `resolveEntityDir` in `src/core/rpc/paths.ts`). The `__active__` convention is a pre-CLI skill-layer concern that lives only in the skill files (`epic-conventions.md`, `start-epic/SKILL.md`). Dogfooding will immediately hit confusion if the plan expects `__active__`-prefixed paths but the CLI creates unprefixed paths.

Fix: Remove all `__active__` prefix references from Phases 1, 2, and 4. Use `epics/initial/` and `epics/llm-judge/` consistently. The `__active__` prefix is managed by skill-layer conventions (e.g., `start-epic` skill renames directories), not by the CLI. If the plan intends to exercise the skill-layer `__active__` rename, it should explicitly note this as a skill-side filesystem operation that happens outside the CLI, and verify it does not break subsequent CLI commands (which expect unprefixed paths).

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan references `.project/side-quests/` but CLI uses `.project/quests/`

Phase 3 Expected Behavior checks `ls .project/side-quests/` and `ls .project/side-quests/~~archived~~*/`. The CLI's `resolveEntityDir` resolves quests to `quests/<name>` (not `side-quests/<name>`). The schema registry uses `quests/[^/]+/quest.json`. The `complete` skill references both `side-quests/` and `quests/` paths, which is itself a latent bug. The plan must use the correct CLI path.

Fix: Replace all `side-quests` references in Phase 3 with `quests`. Update Expected Behavior checks accordingly. Note: the `complete` skill's dual `side-quests/` + `quests/` references should be logged as a friction item for Phase 5.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `/start-epic` skill has NOT been migrated to CLI patterns

Phase 4 tasks include "Run `/start-epic`" but the `start-epic` skill still uses pre-CLI patterns: direct `ls -d .project/epics/__active__*/`, direct filesystem state detection via file existence checks (`approved.md`, `architecture-proposal/`), and direct `state.md` / `activity-log.jsonl` writes. It has not been updated to use `goodplan epic:activate`, `goodplan epic:show --json`, or any CLI commands. Running it during dogfooding will either: (a) fail because it expects old-format state that the CLI-migrated `create-epic` skill didn't produce, or (b) succeed but create state inconsistencies between the CLI's JSON state and the filesystem conventions.

Fix: The plan must acknowledge this gap explicitly. Options: (1) add a task in Phase 4 to migrate `start-epic` before running it, (2) add a pre-Phase-4 task to verify `start-epic` works with CLI-created state and log the inconsistency as friction, or (3) use `goodplan epic:activate` directly instead of `/start-epic` and note in friction log that the skill needs migration. Option 3 is the simplest and most aligned with dogfooding goals (testing the CLI path). The plan should also add a Phase 5 task to verify `start-epic` is migrated or flagged for a follow-up slice.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 conflates CLI `epic:activate` with skill-layer `/start-epic` approval gate

The plan's Phase 4 describes `/start-epic` as doing: "Review the architecture proposal and approve it", then "Rename `epics/llm-judge/` to `epics/__active__llm-judge/`", then "Create `architecture/` from the proposal", then "Write `approved.md`". But the CLI's `epic:activate` command does a simple state transition (`slices-defined` or `slices-refined` -> `activated`) with no directory renaming, no proposal-to-architecture copy, and no `approved.md` write. These are separate operations at different layers. The plan needs to clearly distinguish what the CLI does (state transition via `epic:activate`) from what the skill does (filesystem reorganization). Mixing them produces incorrect Expected Behavior checks and incorrect verification steps.

Fix: Rewrite Phase 4's "Run `/start-epic`" section to separate: (a) the approval/review workflow (user-facing, judgment-driven, skill-owned), (b) the `epic:activate` CLI command (state transition), and (c) the filesystem reorganization (skill-owned, post-CLI-migration this may use CLI or remain skill-side). Adjust Expected Behavior to check `goodplan epic:show --epic llm-judge --json` for `status === "activated"` rather than checking for `__active__` directory prefixes.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 skill installation uses naive `cp -r` which may miss structure

The task `cp -r ~/Repos/goodplan/skills/ ~/Repos/nondet-eval/.claude/skills/` copies the entire `skills/` directory. However, the install script (`scripts/install-skills.sh`) handles old-to-new skill name mapping and specific install locations (`~/.claude/skills/`). For in-project installation, the raw copy may include files that shouldn't be installed (e.g., the `migrate` skill, internal references that assume user-level paths). The research file explicitly flags this risk: "Manual copy may miss skills or get structure wrong."

Fix: Add a verification step after the copy that confirms the installed skill count matches expectations (the plan says "15 skills" in Expected Behavior). Also add a task to verify that skill `Read` references using `~/.claude/skills/_shared/` paths work when skills are installed in `.claude/skills/` in-project — if they use absolute paths to `~/.claude/skills/`, they will fail in the dogfood repo. This is a critical friction vector.

Resolution: CODEBASE_EXPLORATION

Research: Grep all skill files for `~/.claude/skills/` path references to determine if in-project installation will break `Read` calls that reference shared files at the user-level path. Check `scripts/install-skills.sh` for the exact mapping logic.

---

**[IMPORTANT]** `~~archived~~` directory renaming is skill-owned but plan verifies it as if CLI-produced

Phases 2 and 4 Expected Behavior checks include `ls .project/epics/~~archived~~01_initial/` and `ls .project/epics/~~archived~~02_*/`. The `~~archived~~` prefix renaming is explicitly documented as skill-owned (confirmed in `complete/SKILL.md`: "The CLI does not perform `~~archived~~` directory renaming — this remains skill-owned"). The CLI `epic:complete` command sets the epic's JSON status to `completed` and clears `activeEpic`, but does not rename directories. The plan should verify the JSON state via CLI and treat the directory rename as a separate skill-layer verification.

Fix: Split Expected Behavior into two categories: (a) CLI state checks (`goodplan epic:show --epic initial --json` shows `status: "completed"`), and (b) skill-layer filesystem checks (`ls .project/epics/~~archived~~01_initial/` after the `/complete` skill runs). This makes clear which layer owns which behavior and helps friction logging if one succeeds but the other fails.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 incorrectly states second epic creates `epics/llm-judge/` "NOT `__active__`-prefixed, since there's no active epic"

The statement "NOT `__active__`-prefixed, since there's no active epic" implies the `__active__` prefix is CLI behavior conditional on active epic state. In reality, the CLI never uses the `__active__` prefix — `epic:create` always creates `epics/<name>/` regardless of project state. The parenthetical note is misleading and will confuse implementation.

Fix: Remove the parenthetical. Simply state: "`epic:create` creates `epics/llm-judge/` (the CLI uses flat `epics/<name>/` paths for all epics)."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 quest creation command uses incorrect CLI syntax

Phase 3 shows `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json` which is correct for the CLI. But the task also says "Create via `echo '...' | goodplan quest:create --json`" — this is fine. However, the Expected Behavior check `goodplan quest:list --json` should verify the JSON output shape (e.g., confirm it returns an array with at least one entry with `status: "completed"`), not just that it "returns at least 1 completed quest" (which is ambiguous about what to parse).

Fix: Make Expected Behavior more specific: `goodplan quest:list --json | jq '.[] | select(.status == "completed")' — returns at least one result`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing verification of INV-004 (stateless commands) during dogfooding

The dogfooding plan exercises many commands but doesn't explicitly verify that each command works without ambient state from prior commands — a core invariant (INV-004). Since this is the first real external project test, it would be valuable to include at least one "cold start" verification: run a show/list command in a fresh terminal session (no prior commands) and confirm it works.

Fix: Add a task in Phase 2 or Phase 5: "Verify INV-004: In a fresh terminal, run `goodplan status --json` and `goodplan slice:show --slice <name> --json` to confirm commands work without prior session state."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 test count is hardcoded to "941+ tests"

The test count will likely change as friction fixes in Phase 5 add/modify tests. Hardcoding "941+" creates a stale reference.

Fix: Change to "all existing tests pass" or "test count >= baseline at phase start."

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan has the right strategic intent — exercising the full CLI-integrated skill suite on a real project is exactly the right next step. However, it has three critical issues that would cause implementation failure: incorrect path conventions (`__active__`, `side-quests/`), reliance on an unmigrated skill (`start-epic`), and conflation of CLI-layer and skill-layer behaviors throughout. The plan also doesn't distinguish what the CLI owns vs what skills own, which is the central architectural boundary this dogfooding should be testing. To reach 9+: fix all three critical issues, clearly separate CLI-layer from skill-layer verifications throughout, and add the skill path reference check for in-project installation.

## Summary
- Critical: 3
- Important: 4
- Minor: 3
