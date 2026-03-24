## Issues

**[CRITICAL]** Plan uses `~~archived~~` directory prefixes that do not exist in the CLI

Multiple phases reference `~~archived~~01_initial/`, `~~archived~~02_llm-judge/` paths for archived epics (Phase 2 Expected Behavior, Phase 4 Expected Behavior and Tasks). The CLI does not implement any archive-rename mechanism. `resolveEntityDir()` in `src/core/rpc/paths.ts` resolves epics as `epics/<name>` with no prefix logic. The state machine's `COMPLETE_EPIC` handler in `src/core/state/transitions/epic-lifecycle.ts` sets status to `"completed"` on the entity JSON but does not rename the directory. Completed epics remain at `epics/<name>/`. All `~~archived~~` path references must be replaced with the actual CLI entity paths (e.g., `epics/initial/`), and verification checks should use `goodplan epic:show --epic initial --json` to confirm `status === "completed"` rather than checking for renamed directories.

Affected locations:
- Phase 2, Expected Behavior: `ls .project/epics/~~archived~~01_initial/`
- Phase 4, Expected Behavior: `ls .project/epics/~~archived~~02_*/` and `ls .project/epics/` referencing `~~archived~~01_initial/`
- Phase 4, Tasks: "archive as `~~archived~~02_llm-judge`"
- Phase 4, Verification item 1: "archived with correct `~~archived~~02_` numbering"

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan uses `.project/side-quests/` path — CLI uses `.project/quests/`

Phase 3 references `.project/side-quests/` and `ls .project/side-quests/~~archived~~*/`. The CLI resolves quests to `quests/<name>/` (confirmed in `resolveEntityDir()` at `src/core/rpc/paths.ts:146`). The quest list command reads from `quests/overview.json` (`src/commands/quest/list.ts:30`). The plan also compounds the error with `~~archived~~` prefixing on quest directories. Replace all `.project/side-quests/` references with `.project/quests/` and replace directory-existence checks with `goodplan quest:show --quest <name> --json` status checks.

Affected locations:
- Phase 3, Expected Behavior: `ls .project/side-quests/` and `ls .project/side-quests/~~archived~~*/`
- Phase 3, Deliberate Quest task: `ls .project/side-quests/~~archived~~<name>/`

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan references `__active__` prefix for epic directories — CLI does not use this prefix

Phase 4 tasks state: "Rename `epics/llm-judge/` to `epics/__active__llm-judge/`" as part of the `/start-epic` flow. The CLI has no `__active__` prefix concept — `resolveEntityDir` always resolves to `epics/<name>/`. The research file itself flags this: "`__active__` prefix is a pre-CLI skill convention — CLI paths don't use it." The `ACTIVATE_EPIC` state machine handler changes the epic status to `"activated"` in the entity JSON without renaming any directories. Also, Phase 4 says `/create-epic` "creates `epics/llm-judge/` (NOT `__active__`-prefixed)" but then contradicts itself by describing a rename to `__active__` in the `/start-epic` step.

Fix: Remove the rename step. `/start-epic` activates via `goodplan epic:activate --epic llm-judge --json` which sets the status and `project.json.activeEpic` without directory rename. Verify activation via `goodplan status --json` checking `activeEpic.name === "llm-judge"`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 quest creation command syntax does not match CLI API

Phase 3 shows: `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`. This is correct CLI syntax. However, the plan does not include the `--json` flag on the `goodplan quest:list` Expected Behavior check `goodplan quest:list --json` — it does include it. Actually this is fine. But the more substantive issue: the plan says quests created via `/complete` are "organic quests" and those created independently are "deliberate quests," but never specifies how to create an organic quest. The `/complete` skill may propose side quests in its output, but the plan doesn't describe the actual command to create them. This leaves a gap — the executor won't know whether `/complete` auto-creates quests via a CLI command or whether the user must manually create them from `/complete`'s suggestions.

Add a task clarifying: after reviewing `/complete` output for proposed quests, create each one via `echo '{"name":"...","goal":"..."}' | goodplan quest:create --json`, then run the plan/implement/complete cycle.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Verification checks rely on `ls` and directory existence instead of CLI commands

Throughout the plan, Expected Behavior sections use `ls` commands to verify state (e.g., `ls .project/epics/...`, `ls .project/architecture/_overview.md`, `ls .project/slices/`). This conflicts with the CLI interaction conventions (section 3: "Skills must NOT use `ls` or file-existence checks to infer entity status"). While this is a dogfooding plan (not a skill), the plan should model the correct verification pattern since the goal is to exercise and validate CLI-based workflows. Replace `ls`-based verification with:
- `goodplan epic:show --epic <name> --json` to check entity status and artifacts
- `goodplan status --json` for project-level orientation
- `goodplan slice:list --json` / `goodplan quest:list --json` for entity listing
- Reading architecture/learnings files directly with the Read tool is still valid (these are LLM-owned markdown)

This also improves verification fidelity — `ls` can show a directory exists even if the CLI state machine is inconsistent.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 skill installation uses raw `cp -r` — may miss structure or get wrong paths

The plan copies skills via `cp -r ~/Repos/goodplan/skills/ ~/Repos/nondet-eval/.claude/skills/`. The research file notes: "the install script targets `~/.claude/skills/`. Manual copy may miss skills or get structure wrong." The `scripts/install-skills.sh` handles old-to-new skill name mapping and correct installation structure. A raw `cp -r` of the `skills/` directory would copy the source structure, including `_shared/` and all skill subdirectories, but may not match the expected installed layout that Claude Code looks for in `.claude/skills/`. The plan should either:
1. Use a modified install script that targets the in-project location, or
2. Verify the installed structure matches what Claude Code expects after the copy, or
3. At minimum, add a verification step that lists the installed skills and confirms each is loadable.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 5 grep patterns may not match current skill conventions

Phase 5's cross-skill grep uses patterns like `Read.*\.project/.*\.json` and `echo.*activity-log`. After the stdin convention consistency fix (slice 05), the canonical form uses `echo '{"key":"value"}' | goodplan command --json`. But the grep pattern `echo.*activity-log` would only catch skills still directly echoing to activity-log — it would miss other direct-access patterns. More importantly, the grep for `Read.*\.project/.*\.json` could produce false positives for LLM-owned markdown reading patterns that include `.json` in path context. The plan should also grep for patterns like `Write.*\.project/.*\.json` and `cat.*\.project/.*\.jsonl` to catch write-side violations.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 assumes `ls .project/slices/` as pre-check — CLI creates flat slice paths

Phase 2 Expected Behavior "Before" says: `ls .project/slices/ — does not exist or is empty`. This is checking the directory before slices exist, which is fine for a pre-check. But the plan should note that slices are created at `.project/slices/<name>/` (flat, not nested under epics) and verify this convention during the dogfood. The learnings file already captures "Entity paths are flat, not nested under parent entities" — the plan should reference this as an explicit thing to verify.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 does not mention the `epic:activate` command by name

Phase 4 describes `/start-epic` as the user-facing skill, but the underlying CLI command is `epic:activate`. Since this is a dogfooding plan meant to test CLI integration, the plan should explicitly reference the CLI command being invoked by the skill (e.g., "the `/start-epic` skill should invoke `goodplan epic:activate --epic llm-judge --json`"). This helps catch CLI invocation issues during dogfooding.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No explicit exit-code checking in verification steps

The plan's verification steps check for "valid JSON" and entity existence but never specify checking exit codes. The CLI's error contract (INV-007) defines exit codes 0/1/2/3 with specific meanings. For thorough dogfooding, verification steps should include: "confirm exit code 0 on success" and "confirm exit code 3 with structured error JSON on invalid transitions." This exercises the error reporting path documented in the cli-interaction conventions.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan has three critical path-convention errors (`~~archived~~`, `side-quests/`, `__active__`) that would cause immediate failures during execution. These aren't subtle issues — the CLI's entity resolution code is unambiguous. The plan also systematically uses `ls`-based verification instead of CLI commands, which undermines the dogfooding goal of exercising CLI-based workflows. Fixing the three critical issues and switching to CLI-based verification would bring this to 7+. Additionally addressing the skill installation robustness and grep coverage improvements would reach 9+.

## Summary
- Critical: 3
- Important: 4
- Minor: 3
