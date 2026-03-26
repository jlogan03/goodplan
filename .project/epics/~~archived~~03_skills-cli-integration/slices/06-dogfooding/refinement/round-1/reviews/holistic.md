## Issues

**[CRITICAL]** Phase 3 uses wrong quest directory path `.project/side-quests/`
Phase 3 references `.project/side-quests/` in expected behavior checks (`ls .project/side-quests/~~archived~~*/`) and in the deliberate quest task. The CLI uses `.project/quests/` — confirmed via `resolveEntityDir` in `src/core/rpc/paths.ts` (line 146: `nodePath.join(projectDir, "quests", target.name)`), the state machine schema registry (`quests/<name>/quest.json`), and the complete absence of `side-quests` anywhere in `src/`. The `complete` skill references both paths (possibly legacy), but the CLI — which is the source of truth per INV-001 — uses `quests/` exclusively. Every expected behavior check and task in Phase 3 that mentions `side-quests` will produce incorrect results.

Fix: Replace all `side-quests` references in Phase 3 with `quests`. Specifically:
- `ls .project/side-quests/` -> `ls .project/quests/`
- `ls .project/side-quests/~~archived~~*/` -> `ls .project/quests/~~archived~~*/`

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 claims "all 15 skills" but there are 14
Phase 1 expected behavior says "contains all 15 skills from goodplan repo." Actual count of skill directories under `skills/` (excluding `_shared/`) is 14: audit-architecture, complete, create-architecture, create-epic, create-plan, create-slices, explore, implement-plan, migrate, project-status, refine-architecture, refine-plan, refine-slices, start-epic. This will cause the verification check to fail or mislead the implementer.

Fix: Change "all 15 skills" to "all 14 skills" (or "all skills") in Phase 1's expected behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 task describes `__active__` rename as a CLI behavior but it is skill-owned
Phase 4 says: "This should: Rename `epics/llm-judge/` to `epics/__active__llm-judge/`" as part of `/start-epic`. The research file already flagged this. The CLI has zero references to `__active__` — the rename is performed by the `start-epic` skill via `mv .project/epics/<name> .project/epics/__active__<name>`. This distinction matters because the plan frames it as "This should" (implying CLI behavior to verify) when it should say "The skill will" (framing it as skill-driven filesystem rename to observe).

Fix: Reword the task to clarify this is a skill-owned rename, not a CLI action. Change "This should: Rename ..." to "The `/start-epic` skill will rename the directory (skill-owned, not CLI)."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 expected behavior references `.project/slices/` but slices directory does not exist at the CLI level before slice creation
Phase 2's before check says `ls .project/slices/ — does not exist or is empty`. This is fine as a before-check. However, the after check says `ls .project/epics/~~archived~~01_initial/` — but the CLI stores epics at `.project/epics/<name>/`, not with `__active__` or `~~archived~~` prefixes. The `~~archived~~` rename is skill-owned (from `complete` skill). The expected behavior should clarify that the archive rename is performed by the skill, so the implementer knows to check for it after the `/complete` skill run, not after a CLI command.

Fix: Add a note to the after-check: "(archive renaming is performed by the `/complete` skill, not the CLI)".

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 5 verification grep pattern may not match current codebase patterns
Phase 5's cross-skill grep uses `Read.*\.project/.*\.json` to find direct structured state access. However, skills typically access state via CLI commands like `goodplan status --json` or `goodplan epic:show --json`, not via `Read` tool calls on `.project/*.json`. The pattern should be verified against actual skill files to ensure it catches real violations. Additionally, the `state\.md` and `echo.*activity-log` patterns target legacy conventions that may already be fully cleaned up from prior slice work (slices 03-05 migrated all skills).

Fix: Before Phase 5, verify the grep patterns actually match something in the current skills. Consider adding patterns that catch actual bypass methods more precisely (e.g., `cat .project/`, `Read.*\.project/project\.json`). The broader grep step already covers `ls -d.*__active__` and `mkdir -p .project/` which is good.

Resolution: CODEBASE_EXPLORATION
Research: Run the Phase 5 grep patterns against the current `skills/` directory to determine how many hits exist (if any) and what the actual bypass patterns look like. This informs whether the patterns need updating.

---

**[MINOR]** Phase 3 before-check uses `goodplan quest:list --json` but doesn't specify expected empty-list format
The before check says "returns empty list" but doesn't specify the exact JSON shape. For falsifiable verification, it should state something like `returns { quests: [] }` or whatever the actual empty-state output is.

Fix: Specify the exact expected JSON output for an empty quest list.

Resolution: CODEBASE_EXPLORATION
Research: Check `src/commands/quest/list.ts` to determine the exact JSON output shape for an empty quest list.

---

**[MINOR]** Phase 2 lacks explicit state-transition verification between skill invocations
Phase 2's verification section says "check `goodplan status --json` after each" but the task list doesn't include explicit `goodplan status --json` checks between each skill invocation. For a dogfooding exercise focused on friction discovery, the implementer should have explicit checkpoints showing expected status values after each major step (e.g., after `/create-architecture`: `architectureDefined === true`, after `/create-slices`: `slicesDefined === true`).

Fix: Add explicit status check tasks between major skill invocations in Phase 2, or add a note that the implementer should check status after every skill run and log discrepancies.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No explicit task for `idea.md` content in Phase 1
Phase 1 says "Paste the nondeterministic eval library idea (provided during planning)" but doesn't specify where this content comes from or what it should contain. If the implementer doesn't have this content prepared, they'll be stuck.

Fix: Either include a brief outline of what `idea.md` should contain (project name, goal, scope, constraints) or note that the implementer should write it during execution based on the eval library concept.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 before-check "No `architecture-proposal/` exists anywhere" is too broad
This check is fragile — it says "anywhere" but should be scoped to the specific epic directory. The goodplan repo itself has `architecture-proposal/` directories.

Fix: Scope to `ls .project/epics/llm-judge/architecture-proposal/` or similar.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers the right workflow phases and the overall structure is sound — two epics plus side quests correctly exercises both empty-state and non-empty-state paths. However, there are significant path correctness issues (`.project/side-quests/` vs `.project/quests/`), factual inaccuracies (15 vs 14 skills), and unclear ownership boundaries (`__active__` rename attributed to CLI vs skill). These would cause real failures during execution. The verification checks, while present, need tightening — several are not falsifiable or reference incorrect paths. To reach 9+: fix the critical path issue, correct factual claims, clarify CLI vs skill ownership throughout, and make all expected behavior checks precise and runnable.

## Summary
- Critical: 1
- Important: 4
- Minor: 4
