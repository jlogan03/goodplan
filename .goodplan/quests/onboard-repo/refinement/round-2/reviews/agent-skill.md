# Agent Skill Review — onboard-repo (Round 2)

## Issues

**[CRITICAL]** Step 3 (idea.md) runs before Step 4 (init) but `.project/` does not exist yet

The plan's step map puts "Step 3: Generate idea.md — Write `.project/idea.md` directly using Write tool" before "Step 4: Run `goodplan init` to scaffold `.project/` JSON/JSONL state files". However, `goodplan init` is what creates the `.project/` directory. Writing `.project/idea.md` before init means the directory does not exist. And you cannot `mkdir -p .project/` first because `goodplan init` guards against `.project/` already existing (exit 3). The `/create-epic` skill does this correctly: Step 4 runs `goodplan init`, Step 5 writes `idea.md`. The plan must swap Steps 3 and 4 — run init first, then write idea.md into the now-existing `.project/`. This affects the Overview step map, Phase 1 SKILL.md skeleton task, and Phase 1 Expected Behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Test harness approach is novel with no existing pattern to follow — plan lacks test file location, framework choice, and SDK setup details

The plan repeatedly says "Automated test invokes the skill on the generated fixture via Anthropic Claude SDK test harness" but the codebase has zero existing SDK-based skill tests. All existing tests use vitest and live under `tests/`. The plan does not specify: (1) where the test file lives (e.g., `tests/integration/onboard-skill.test.ts`?), (2) whether it uses vitest or a standalone script, (3) how the Claude SDK session is configured (API key, model, system prompt, tool permissions), (4) how to handle the interactive nature of the skill (user questions at Steps 7, 8, 12), or (5) cost/time budget for SDK test runs. This is the highest-risk part of the plan because it establishes a pattern other skills will follow. A dedicated task should design the test harness approach — at minimum deciding on framework, file location, mock strategy for user interaction, and timeout handling.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Fixture generation script creates git history but plan does not address `gh` CLI testing

The fixture generation script (`scripts/generate-onboard-fixture.sh`) creates a local git repo with commits and structure, but the skill heavily uses `gh` CLI for PR data (Phase 2 PR conventions, Phase 5 PR comment analysis for expertise). The fixture has no GitHub remote, so `gh pr list` will fail. The plan mentions this briefly in Phase 2 ("If feasible, add mock PR data to the fixture. Otherwise, document that PR convention detection is verified via the real repo smoke test only") but does not address it as a design decision. Since the `gh` fallback path is a significant code path exercised only during smoke testing, the automated test will never cover it. The plan should either: (a) explicitly accept this gap and document it as a known limitation, or (b) design a mock strategy (e.g., a wrapper script that simulates `gh` responses for the fixture).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 Step 9 uses `stdin:` with `goodplan quest:create --json` but does not show the Bash tool invocation syntax

The plan says: "create quests via Bash tool with `stdin: '{"name":"<name>","goal":"<goal>"}'` passed to `goodplan quest:create --json`". The `stdin:` parameter is a Claude Code Bash tool API concept, not a shell concept. The SKILL.md needs to show the actual invocation pattern that an agent can follow. Looking at existing skills, none use `stdin:` in their SKILL.md — they use `echo '...' | goodplan ...` syntax because SKILL.md instructions are read by the LLM which then decides how to invoke the Bash tool. The round-1 review flagged this as using `echo` instead of `stdin:`, but the fix went too far in the other direction. SKILL.md should show the shell command (`echo '...' | goodplan quest:create --json`) since that is what the LLM will execute via the Bash tool, regardless of how the Bash tool internally handles stdin.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan does not specify how the skill determines the project name for `goodplan init --name`

Step 4 runs `goodplan init` but the plan does not explain how the skill derives the `--name` flag value. The `/create-epic` skill asks the user or derives from conversation. For onboard-repo, the name should be inferred from the repo (e.g., directory name, package.json `name` field, or README title) — since the whole point is to avoid unnecessary questions. The SKILL.md skeleton task should specify the derivation logic.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 task "Update `.project/conventions.md`" asks to add `onboard-repo/` to the skills list, but this is the target repo's conventions, not the goodplan repo's

Phase 5 includes the task: "Update `.project/conventions.md`: Add `onboard-repo/` to the skills list in the repo structure section." This refers to the goodplan repo's own `.project/conventions.md` (a repo structure documentation task). However, this is a side effect of building the skill, not part of the skill's runtime behavior. It should be clearly labeled as a "repo housekeeping" task separate from the skill implementation, or moved to a pre/post-implementation step. As written, it could be confused with something the skill itself does to the target repo.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No explicit iteration limit or timeout guidance for the architecture interview (Step 7)

Step 7 presents subsystem findings to the user and iterates "until user approves". Without a loop bound, an agent could get stuck iterating indefinitely if the user keeps requesting changes. The step should include a max iteration count (e.g., 3 rounds) and a wrap-up heuristic similar to `/create-epic` Step 3's "If 3+ exchanges passed without substantive new information... offer to wrap up."

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1's critical issues (step numbering confusion, missing `mkdir -p`) and most important issues (install script, description/trigger, shared references, `gh` field names, verification approach, progressive disclosure) have been addressed. The plan is substantially improved. The remaining critical issue (step ordering: idea.md before init) is a logical sequencing bug that is straightforward to fix. The important issues center on the novel test harness approach needing more design detail and a few invocation pattern clarifications. To reach 9+: fix the step ordering, add test harness design specifics, and address the minor gaps.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
