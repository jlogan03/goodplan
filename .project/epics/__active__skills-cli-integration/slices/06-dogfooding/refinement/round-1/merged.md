# Merged Review Feedback — Round 1

## Reviewers

| Reviewer | Score |
|---|---|
| holistic | 6/10 |
| software-architecture | 4/10 |
| typescript | 6/10 |
| tui-cli | 4/10 |
| agent-skill | 4/10 |

---

### CRITICAL Issues

**C1. Plan references `.project/side-quests/` — CLI uses `.project/quests/`**
(holistic, software-architecture, tui-cli, agent-skill, typescript)

Phase 3 Expected Behavior checks `ls .project/side-quests/` and `ls .project/side-quests/~~archived~~*/`. The CLI resolves quests to `quests/<name>/` (`resolveEntityDir` in `src/core/rpc/paths.ts:146`, schema registry `quests/[^/]+/quest.json`). The `side-quests` path does not exist in the CLI codebase. All Phase 3 verification checks will fail.

Fix: Replace all `side-quests` references in Phase 3 with `quests`.
Resolution: DIRECTLY_ACTIONABLE

---

**C2. Plan references `__active__` prefix for epic directories — CLI does not use this prefix**
(software-architecture, tui-cli, agent-skill, typescript)

Phase 4 tasks state: "Rename `epics/llm-judge/` to `epics/__active__llm-judge/`". Phase 1 also references `__active__initial/`. The CLI has no `__active__` prefix concept — `resolveEntityDir` always resolves to `epics/<name>/`. The `ACTIVATE_EPIC` handler changes epic status in JSON without renaming directories. The `__active__` convention is a pre-CLI skill-layer concern. Using `/start-epic` to rename directories to `__active__` while expecting CLI commands to keep working is contradictory — the CLI will look for `epics/llm-judge/epic.json` but the file will be at `epics/__active__llm-judge/epic.json`.

Fix: Remove all `__active__` prefix references from Phases 1, 2, and 4. Use `epics/<name>/` consistently. Verify activation via `goodplan status --json` checking `activeEpic.name`. If the plan intends to exercise the skill-layer `__active__` rename, explicitly note this as a skill-side operation and flag it as a friction/compatibility discovery item.
Resolution: DIRECTLY_ACTIONABLE

---

**C3. `start-epic` skill is NOT migrated to CLI commands — will break dogfooding**
(software-architecture, agent-skill)

The `start-epic` skill still uses direct filesystem access: `mv` for `__active__` prefix renaming, direct `state.md` writes, direct `activity-log.jsonl` appends. It has not been updated to use `goodplan epic:activate`. Running it during dogfooding will either fail (expects old-format state) or create state inconsistencies between CLI JSON state and filesystem conventions.

Fix: Either (a) add a pre-Phase-4 task to migrate `start-epic` to use `epic:activate`, or (b) Phase 4 should use `goodplan epic:activate --epic llm-judge --json` directly and note `start-epic` needs migration in the friction log. Option (b) is simplest and most aligned with dogfooding goals.
Resolution: DIRECTLY_ACTIONABLE

---

**C4. Plan uses `~~archived~~` directory prefixes as verification — archiving is skill-owned, not CLI-managed**
(tui-cli, holistic, software-architecture, typescript, agent-skill)

Multiple phases reference `~~archived~~01_initial/`, `~~archived~~02_llm-judge/` paths. The CLI's `epic:complete` sets status to `"completed"` and clears `activeEpic` but does NOT rename directories. The `~~archived~~` renaming is done by the `/complete` skill. Using `ls` for `~~archived~~` paths as primary verification conflates CLI and skill behaviors.

Fix: Use CLI commands as primary verification (`goodplan epic:show --epic <name> --json` returning `status === "completed"`). Keep filesystem checks as secondary, explicitly annotated as "skill-managed convention."
Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT Issues

**I1. Phase 1 says "15 skills" but there are 14 skills plus `_shared`**
(holistic, typescript, agent-skill)

The `skills/` directory has 15 subdirectories, but `_shared/` is a shared references directory, not a skill. Actual skill count is 14.

Fix: Change "all 15 skills" to "all 14 skills plus the `_shared/` references directory."
Resolution: DIRECTLY_ACTIONABLE

---

**I2. Phase 1 skill installation via raw `cp -r` may break skill reference paths**
(software-architecture, typescript, tui-cli, agent-skill)

Skills hardcode `~/.claude/skills/_shared/references/cli-interaction.md` (user-level path) in their `Read` instructions. When installed in-project at `.claude/skills/`, these paths will point to the wrong location. Also, `cp -r ~/Repos/goodplan/skills/ ~/Repos/nondet-eval/.claude/skills/` may create nested `skills/skills/` depending on trailing slash behavior.

Fix: (a) Add verification that skill reference paths resolve correctly after copy (e.g., `ls ~/Repos/nondet-eval/.claude/skills/complete/SKILL.md` exists, not `.claude/skills/skills/complete/SKILL.md`). (b) Verify whether `~/.claude/skills/_shared/` path references break in-project — this is a critical friction vector. (c) Use `cp -r .../skills/* .../` or verify copy structure.
Resolution: CODEBASE_EXPLORATION

---

**I3. Phase 4 conflates CLI `epic:activate` with skill-layer `/start-epic` behavior**
(software-architecture, holistic)

The plan describes `/start-epic` as doing directory rename, proposal-to-architecture copy, and `approved.md` write. But the CLI's `epic:activate` does a simple state transition. These are separate operations at different layers.

Fix: Rewrite Phase 4 to separate: (a) the approval/review workflow (skill-owned), (b) the `epic:activate` CLI command (state transition), (c) filesystem reorganization (skill-owned). Reference the CLI command by name (`epic:activate`).
Resolution: DIRECTLY_ACTIONABLE

---

**I4. Verification checks rely on `ls` and directory existence instead of CLI commands**
(tui-cli, typescript)

Expected Behavior sections use `ls` commands to verify state throughout. This conflicts with CLI interaction conventions (section 3: skills must not use `ls` to infer entity status) and undermines the dogfooding goal of exercising CLI-based workflows.

Fix: Replace `ls`-based verification with CLI commands: `goodplan epic:show`, `goodplan status --json`, `goodplan slice:list --json`, `goodplan quest:list --json`. Keep `ls` only for non-CLI artifacts (architecture markdown, etc.).
Resolution: DIRECTLY_ACTIONABLE

---

**I5. Phase 5 grep patterns may not match current skill conventions**
(holistic, typescript, tui-cli)

The grep pattern `Read.*\.project/.*\.json` may produce false positives and miss actual bypass methods (e.g., `cat .project/`, `Write.*\.project/.*\.json`, `jq .* .project/`). The `state.md` and `echo.*activity-log` patterns may already be cleaned up from prior slice work.

Fix: Verify grep patterns against current skills before Phase 5. Add patterns for `cat .project/`, `Write.*\.project/.*\.json`, `jq`, and `ls -d.*__active__`. Consider running patterns during planning to establish baseline.
Resolution: CODEBASE_EXPLORATION

---

**I6. Phase 1 `bun init` does not configure strict TypeScript settings**
(typescript)

The plan does not mention configuring `tsconfig.json` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Since the dogfood project should match team conventions, add TypeScript config and verify `bun tsc --noEmit` passes.

Fix: Add task to configure strict `tsconfig.json` after `bun init` and verify compilation.
Resolution: DIRECTLY_ACTIONABLE

---

**I7. Phase 1 expected behavior may reference wrong epic name**
(agent-skill)

Plan says `activeEpic.name === "initial"` but the first epic is described as "Core Provider & Basic Execution" — the actual name depends on what's passed to `epic:create`. The name `initial` comes from pre-CLI convention.

Fix: Either explicitly set the epic name in the `epic:create` payload task, or use a placeholder like `<epic-name>` with a note.
Resolution: DIRECTLY_ACTIONABLE

---

**I8. Phase 3 quest workflow has gaps — organic quest creation not specified**
(tui-cli)

The plan says quests created via `/complete` are "organic quests" but never specifies how to actually create them. Does `/complete` auto-create quests, or must the user manually create them from suggestions?

Fix: Add task clarifying: after reviewing `/complete` output for proposed quests, create each via `echo '...' | goodplan quest:create --json`.
Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**M1. Phase 3 before-check `goodplan quest:list --json` doesn't specify expected empty-list JSON shape**
(holistic)

Fix: Specify exact expected JSON output for empty quest list.
Resolution: CODEBASE_EXPLORATION

---

**M2. Phase 2 lacks explicit `goodplan status --json` checks between skill invocations**
(holistic)

Fix: Add explicit status check tasks between major skill invocations, or add a note to check after every skill run.
Resolution: DIRECTLY_ACTIONABLE

---

**M3. No explicit task for `idea.md` content in Phase 1**
(holistic)

Fix: Include brief outline of what `idea.md` should contain (project name, goal, scope, constraints) or note it should be written during execution.
Resolution: DIRECTLY_ACTIONABLE

---

**M4. Phase 4 before-check "No `architecture-proposal/` exists anywhere" is too broad**
(holistic)

Fix: Scope to `ls .project/epics/llm-judge/architecture-proposal/`.
Resolution: DIRECTLY_ACTIONABLE

---

**M5. Phase 3 quest creation command uses raw CLI — should clarify if quest creation has a skill**
(agent-skill)

Fix: Clarify whether quest creation is CLI-only or has a skill wrapper. If CLI-only, note explicitly.
Resolution: DIRECTLY_ACTIONABLE

---

**M6. Phase 5 test count hardcoded to "941+ tests"**
(software-architecture)

Fix: Change to "all existing tests pass" or "test count >= baseline at phase start."
Resolution: DIRECTLY_ACTIONABLE

---

**M7. Missing verification of INV-004 (stateless commands)**
(software-architecture)

Fix: Add a "cold start" verification task — run show/list commands in a fresh terminal session.
Resolution: DIRECTLY_ACTIONABLE

---

**M8. No exit-code checking in verification steps**
(tui-cli)

Fix: Add exit code verification (0 on success, 3 with structured error JSON on invalid transitions) per INV-007.
Resolution: DIRECTLY_ACTIONABLE

---

**M9. Phase 5 `diff -r skills/ ~/.claude/skills/` targets wrong path for in-project install**
(typescript, agent-skill)

Fix: Clarify this is goodplan-repo verification (user-level install), not dogfood-repo verification.
Resolution: DIRECTLY_ACTIONABLE

---

**M10. Phase 5 `bun run install:skills` — verify package.json script exists**
(agent-skill)

Fix: Verify this script is defined in package.json.
Resolution: CODEBASE_EXPLORATION

---

**M11. Phase 2 `ls .project/slices/` pre-check should note flat entity paths**
(tui-cli)

Fix: Note that slices use flat paths `.project/slices/<name>/`, not nested under epics.
Resolution: DIRECTLY_ACTIONABLE

---

**M12. Phase 2 does not verify TypeScript compilation after `/implement-plan`**
(typescript)

Fix: Add task to run `bun tsc --noEmit` after each `/implement-plan` and record compilation failures.
Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE (for loop exit)

1. **C1** — Replace `side-quests` with `quests` in Phase 3
2. **C2** — Remove all `__active__` prefix references; use `epics/<name>/` consistently
3. **C3** — Use `epic:activate` directly in Phase 4 (or add pre-task to migrate `start-epic`)
4. **C4** — Use CLI commands as primary verification for archived epics; annotate `~~archived~~` as skill-managed
5. **I1** — Fix skill count to 14 (not 15)
6. **I3** — Separate CLI `epic:activate` from skill-layer behavior in Phase 4
7. **I4** — Replace `ls`-based verification with CLI commands throughout
8. **I6** — Add strict TypeScript config task in Phase 1
9. **I7** — Fix/clarify epic name in Phase 1 expected behavior
10. **I8** — Clarify organic quest creation workflow
11. **M2** through **M12** (all minor DIRECTLY_ACTIONABLE items)

### RESEARCH_NEEDED

None.

### Contradictions Resolved

1. **`~~archived~~` as CRITICAL vs IMPORTANT**: tui-cli raised `~~archived~~` paths as CRITICAL; holistic/typescript/agent-skill raised it as IMPORTANT. Resolved as **CRITICAL (C4)** — trusting tui-cli as domain specialist on CLI path conventions. The issue would cause verification failures even if the underlying state transition succeeds.

2. **`.project/side-quests/` severity**: typescript rated it IMPORTANT while all other reviewers rated it CRITICAL. Resolved as **CRITICAL (C1)** — the path simply does not exist in the CLI; this is a hard failure, not a severity judgment call.

3. **`__active__` prefix — remove entirely vs track as friction**: holistic suggested rewording to "skill-owned rename"; software-architecture and tui-cli said remove entirely. Resolved in favor of **removing references and using CLI paths** (software-architecture/tui-cli as domain specialists), with a note to flag `__active__` convention as a friction discovery item if `/start-epic` is exercised.

4. **Skill installation approach**: software-architecture suggested modified install script; typescript suggested `cp -r ... /*` syntax fix; agent-skill suggested codebase exploration for reference paths. These are complementary, not contradictory — merged into I2 with all three recommendations.

### Unresolved (USER_INPUT required)

None — all issues are either DIRECTLY_ACTIONABLE or CODEBASE_EXPLORATION.

### CODEBASE_EXPLORATION Results

**I2 — Skill reference paths**: Skills DO hardcode `~/.claude/skills/_shared/references/` as absolute paths (found in project-status, implement-plan, refine-plan, etc.). When skills are copied in-project to `.claude/skills/`, these paths will still point to user-level `~/.claude/skills/_shared/`. This works IF the user-level `_shared/` directory contains up-to-date content. However, if goodplan's old-format skills are at `~/.claude/skills/`, the `_shared/` references there may be stale (pre-slice-05 content). **Recommendation**: Phase 1 should also copy `_shared/` to user-level or explicitly verify user-level `_shared/` is current. Alternatively, use `bun run install:skills` to install user-level first, THEN copy everything in-project.

**I5 — Grep patterns**: The grep `Read.*\.project/.*\.json|state\.md|echo.*activity-log` finds matches in:
- `cli-interaction.md` — documentation/migration examples (false positives)
- `start-epic/SKILL.md` — directly references `state.md` and `activity-log.jsonl` (TRUE positive — confirms C3 that start-epic is not migrated)
- `project-status/` — migration references (informational)
**Recommendation**: Phase 5 grep should exclude `_shared/references/` (convention docs contain "before" examples). Add `-l` to find only files, and manually review matches for false positives from documentation.

**M1 — Quest list empty shape**: `goodplan quest:list --json` returns `{"items":[]}` for empty state. Phase 3 should verify `items` array is empty.

**M10 — install:skills script**: `"install:skills": "bash scripts/install-skills.sh"` exists in package.json. Confirmed.
