## Issues

**[CRITICAL]** `start-epic` skill is NOT migrated to CLI commands — will break dogfooding

The `start-epic` skill (Phase 4, Step `/start-epic`) still uses direct file access: `mv` for `__active__` prefix renaming, direct `state.md` writes, direct `activity-log.jsonl` appends. Meanwhile, the CLI has `epic:activate` which handles the ACTIVATE_EPIC transition via the state machine. Running `/start-epic` in the dogfood project will bypass the CLI's state machine entirely, causing state inconsistency (CLI won't know the epic was activated). The plan does not flag this or include a task to migrate `start-epic` first.

Fix: Either (a) add a pre-Phase-4 task to migrate `start-epic` to use `epic:activate` CLI command, or (b) explicitly document that `/start-epic` is not CLI-migrated and Phase 4 should use `epic:activate` directly. Option (a) is strongly preferred since this is a dogfooding exercise meant to test CLI-integrated skills.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan references `.project/side-quests/` — CLI uses `.project/quests/`

Phase 3 Expected Behavior checks `ls .project/side-quests/~~archived~~*/` and the deliberate quest task uses `ls .project/side-quests/`. The CLI stores quests at `.project/quests/<name>/` (confirmed via `src/core/rpc/paths.ts:146` and `src/core/state/transitions/helpers.ts:288`). The `side-quests` path does not exist in the CLI codebase. This would cause all Phase 3 verification checks to fail.

Fix: Replace all references to `.project/side-quests/` with `.project/quests/` throughout Phase 3.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan references `__active__` prefix conventions that the CLI does not manage

Phase 4 task says: "Rename `epics/llm-judge/` to `epics/__active__llm-judge/`" and the plan expects the epic directory to be at `__active__` paths. The CLI does NOT create `__active__`-prefixed directories. The CLI uses `epic:activate` which sets `project.json.activeEpic` and transitions the epic's status — no directory renaming occurs. The `__active__` prefix is a skill-level filesystem convention from the pre-CLI era. Expecting `/start-epic` to produce `__active__` directories while also expecting CLI commands to work is contradictory.

Fix: Phase 4 should NOT reference `__active__` directory prefixes in tasks or expected behavior. Replace with CLI equivalents: `goodplan epic:activate --epic llm-judge --json`, verify via `goodplan status --json` showing `activeEpic.name === "llm-judge"`. The `start-epic` skill itself needs migration (see first issue) or Phase 4 should use CLI commands directly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 expected behavior references wrong epic name

Phase 1 verification says `activeEpic.name === "initial"` and `goodplan epic:show --epic initial --json`. But the plan describes the first epic as "Core Provider & Basic Execution" — the actual name passed to `epic:create` would be something like `core-provider`, not `initial`. The name `initial` comes from the pre-CLI skill convention where the first epic was always named `initial`. With CLI-managed state, the name is whatever is passed in the `echo '{"name":"..."}' | goodplan epic:create --json` payload.

Fix: Either (a) explicitly set the epic name to match in the `epic:create` payload task and update expected behavior to use that name consistently, or (b) use a placeholder like `<epic-name>` and note that the actual name will be chosen during execution.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 expected behavior uses `~~archived~~` paths — archiving is skill-managed, not CLI-managed

Phase 2 checks `ls .project/epics/~~archived~~01_initial/` as expected behavior. The `~~archived~~` renaming is done by the `/complete` skill, not the CLI. This is not wrong per se (since the skill does this), but the expected behavior should reflect the CLI's view: `goodplan epic:show --epic initial --json` returning `status === "completed"`. The filesystem path is a cosmetic skill convention that may or may not be applied.

Fix: Change expected behavior to use CLI commands as primary verification, with filesystem checks as secondary: `goodplan epic:show --epic <name> --json` returning `completed` status. Keep the `ls` check but mark it as "skill-managed convention, may vary."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Skill count is wrong — "15 skills" includes `_shared` which is not a skill

Phase 1 expected behavior says "contains all 15 skills from goodplan repo." There are 14 skill directories plus `_shared` (a shared references directory, not a skill). The actual skill count is 14 (13 workflow skills + 1 migrate stub). The `_shared` directory IS needed for skills to function (it contains `cli-interaction.md` and other references), but calling it a "skill" is misleading and the expected count should be corrected.

Fix: Change to "contains all 14 skills and the `_shared` references directory" or similar.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 install task `cp -r` may not preserve skill structure correctly

The task `cp -r ~/Repos/goodplan/skills/ ~/Repos/nondet-eval/.claude/skills/` copies the entire `skills/` directory. But skills reference `_shared/references/` paths relative to `~/.claude/skills/` (e.g., `~/.claude/skills/_shared/references/cli-interaction.md`). When installed in-project at `.claude/skills/`, the Read tool paths in skill instructions will point to `~/.claude/skills/_shared/...` (the user-level location) rather than `.claude/skills/_shared/...` (the project-level location). Skills hardcode the user-level path in their `Read` instructions.

Fix: Add a task to verify that skill reference paths resolve correctly when installed in-project. Either (a) update the skills' reference paths to be relative, (b) symlink `.claude/skills/_shared` to the project copy, or (c) acknowledge this as a known friction point to discover and log during dogfooding.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 3 quest creation uses raw CLI command but plan is testing skill integration

Phase 3's deliberate quest task uses raw `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json` directly, bypassing any skill for quest creation. Since the goal is to test the skill suite, quest creation should go through whatever skill handles it (likely `/create-epic` or a similar workflow). If no skill exists for quest creation, that itself is a friction point worth logging.

Fix: Clarify whether quest creation has a skill or is CLI-only. If CLI-only, note this explicitly as expected behavior (not a friction point to discover).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 references `bun run install:skills` but install script is at `scripts/install-skills.sh`

Phase 5 task says "run `bun run install:skills`" — verify this package.json script exists and maps to the install script. Minor but could cause confusion during execution.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 5 `diff -r skills/ ~/.claude/skills/` won't work for in-project install

Phase 5 verification says `diff -r skills/ ~/.claude/skills/` but the dogfooding installed skills in-project at `~/Repos/nondet-eval/.claude/skills/`, not at `~/.claude/skills/`. The diff target path is wrong for verifying the dogfood project's skills.

Fix: Clarify that Phase 5 operates on the goodplan repo, not the dogfood repo, and the diff is for verifying the user-level install (which is separate from the dogfood install).

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

Three critical issues would cause Phase 3 and Phase 4 to fail outright: wrong quest paths, unmigrated `start-epic` skill, and incorrect `__active__` prefix assumptions. The important issues around epic naming, archive paths, and skill reference paths would cause verification failures and confusion. The plan's core design is sound (two-epic cycle + quests + cross-skill verification), but the concrete CLI commands and filesystem paths are frequently inconsistent with how the CLI actually works. Fixing the critical and important issues would bring this to 8+. Ensuring all expected behaviors use CLI commands as primary verification (not filesystem conventions) would bring it to 9+.

## Summary
- Critical: 3
- Important: 4
- Minor: 3
