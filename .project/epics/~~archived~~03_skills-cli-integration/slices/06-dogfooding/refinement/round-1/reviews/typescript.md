## Issues

**[IMPORTANT]** Phase 3 uses `.project/side-quests/` path — CLI uses `.project/quests/`
The CLI data layer (`resolveEntityDir` in `src/core/rpc/paths.ts`) resolves quest entities to `.project/quests/<name>/`, not `.project/side-quests/<name>/`. Phase 3 Expected Behavior checks `ls .project/side-quests/` and `ls .project/side-quests/~~archived~~*/` — both will fail even after successful quest operations. The research file already flagged this. Fix: replace all `side-quests` references in Phase 3 with `quests`. Also update the `~~archived~~` check to `ls .project/quests/~~archived~~*/`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 says "15 skills" but `skills/` contains 14 skills plus `_shared`
The plan says "contains all 15 skills from goodplan repo" in Phase 1 Expected Behavior. The `skills/` directory has 15 subdirectories, but `_shared/` is a shared references directory, not a skill. There are 14 actual skills: audit-architecture, complete, create-architecture, create-epic, create-plan, create-slices, explore, implement-plan, migrate, project-status, refine-architecture, refine-plan, refine-slices, start-epic. The `_shared/` directory must also be copied (skills reference it), but the verification should say "14 skills plus `_shared/` references" or just verify specific expected directories rather than counting.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 uses `bun init` but nondet-eval is a dogfood project — needs `bun` available in the target repo
Phase 1 says to use `bun init` for the TypeScript project setup. This is fine given project conventions (bun is the package manager). However, the plan does not mention installing dependencies or configuring `tsconfig.json` with the strictness settings the team requires (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). Since the plan's goal is to exercise goodplan skills on a realistic project, the target repo should have a working TypeScript setup that matches team conventions. Add a task to configure `tsconfig.json` with strict settings and verify `bun tsc --noEmit` passes after Phase 1.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 and Phase 4 Expected Behaviors reference `~~archived~~` paths but archiving is skill-owned
The CLI's `epic:complete` handler (in `src/core/state/transitions/epic-lifecycle.ts`) sets status to `"completed"` and clears `activeEpic`, but does NOT rename directories to `~~archived~~` prefix. Archiving is a skill-level convention managed by the `/complete` skill. The Expected Behavior in Phase 2 (`ls .project/epics/~~archived~~01_initial/`) and Phase 4 (`ls .project/epics/~~archived~~02_*/`) are technically correct IF the `/complete` skill performs the rename during the epic completion step. However, these are testing the skill's archive behavior, not CLI behavior. The plan should clarify this dependency — if the `/complete` skill's archive step fails or is skipped, these checks will fail despite the CLI state being correct. Add a note: "Archive directory exists (created by `/complete` skill, not CLI)" and add a fallback check: `goodplan epic:show --epic initial --json` returns `status === "completed"`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 Task says `/create-epic` creates `epics/llm-judge/` without `__active__` prefix, then `/start-epic` renames to `__active__`
This is consistent with the skill convention BUT potentially inconsistent with how the CLI resolves paths. The CLI's `resolveEntityDir` maps epics to `.project/epics/<name>` — it does not know about the `__active__` prefix. If the `/start-epic` skill renames the directory to `__active__llm-judge`, the CLI will look for `.project/epics/llm-judge/epic.json` but the file will be at `.project/epics/__active__llm-judge/epic.json`. The `__active__` prefix convention appears to be a pre-CLI legacy. This is likely a real friction point that dogfooding will surface. The plan should explicitly call out this as an expected friction discovery item rather than describing the `__active__` rename as a known-good step. Add a friction tracking task: "Verify `__active__` prefix rename doesn't break CLI entity resolution. If it does, this is a high-priority friction item."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 skill installation uses raw `cp -r` instead of verifying structure
The plan copies skills with `cp -r ~/Repos/goodplan/skills/ ~/Repos/nondet-eval/.claude/skills/`. This may create `.claude/skills/skills/` (nested) depending on trailing slash behavior. The plan should use `cp -r ~/Repos/goodplan/skills/* ~/Repos/nondet-eval/.claude/skills/` or `rsync -a`. Also, the research file notes that `scripts/install-skills.sh` targets `~/.claude/skills/` (user-level), not in-project — the manual copy may miss the correct structure. Add verification: `ls ~/Repos/nondet-eval/.claude/skills/complete/SKILL.md` should exist (not `.claude/skills/skills/complete/SKILL.md`).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 grep patterns may not catch all direct access patterns
The verification grep `grep -rn 'Read.*\.project/.*\.json\|\.project/.*\.jsonl\|state\.md\|echo.*activity-log' skills/` looks for Read tool access to JSON files. However, skills also use the Bash tool for `cat`, `head`, or `jq` to read files. The grep should also check for patterns like `cat .project/`, `jq .* \.project/`, and direct `ls .project/` checks that infer status (Section 3 of the convention doc prohibits using `ls` or file-existence checks to infer entity status).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 references `bun run install:skills` but test repo uses in-project skills
Phase 5 says to run `bun run install:skills` and `diff -r skills/ ~/.claude/skills/`. But the dogfood repo uses in-project skills (`.claude/skills/` in nondet-eval), not user-level skills. The install script targets `~/.claude/skills/`. This step verifies the install script works for goodplan's own user-level skills, which is fine — but the plan should clarify this is goodplan-repo verification, not nondet-eval verification. The diff command also compares against `~/.claude/skills/` which may contain other non-goodplan skills.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 does not specify how to handle `bun init` TypeScript compilation during `/implement-plan`
When Phase 2 runs `/implement-plan` to write real TypeScript code in nondet-eval, the plan should verify the code compiles (`bun tsc --noEmit`) and passes any configured linting. Without this, the dogfood exercise could produce non-compiling TypeScript that doesn't surface real friction — the friction of "does the plan produce valid TypeScript" is itself a signal the plan should capture. Add a task: after each `/implement-plan`, run `bun tsc --noEmit` and record any compilation failures in the friction log.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan is well-structured with clear phases and verification steps. However, it contains multiple path convention errors that would cause Expected Behavior checks to fail (`.project/side-quests/` vs `.project/quests/`, `~~archived~~` assumptions, `__active__` prefix ambiguity). The research file already identified these issues but they were not incorporated into the plan. The TypeScript-specific concerns are moderate — the plan correctly uses `bun` as the package manager and targets TypeScript, but omits verification of TypeScript compilation and strict config setup. To reach 9+: fix all path convention errors, add `__active__` prefix friction tracking, add TypeScript compilation verification steps, and clarify the skill-vs-CLI ownership boundary for archiving.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
