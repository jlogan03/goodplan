# Agent Skill Review — onboard-repo

## Issues

**[CRITICAL]** Plan writes `.project/conventions.md` and `.project/architecture/_overview.md` directly but never explains how the `architecture/` directory gets created

The plan says Phase 2 writes `.project/conventions.md` and Phase 3 writes `.project/architecture/_overview.md`. The `goodplan init` command only creates `project.json`, overview.json files for collections, `activity-log.jsonl`, and empty JSONL files. It does NOT create `architecture/` or `conventions.md`. These are LLM-owned files, so the skill is allowed to write them — but the `architecture/` directory does not exist after `init`. The plan's Phase 1 Step 4 runs `goodplan init`, and Phase 3 jumps straight to writing `_overview.md`. The SKILL.md needs an explicit `mkdir -p .project/architecture/` before writing architecture files (the existing `/create-architecture` skill does exactly this). Similarly, `conventions.md` is a top-level file that can be written directly. The plan should document this directory creation step in Phase 3 tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** SKILL.md step numbering is confused — plan assigns Steps 5-10 but describes Phase 1 as creating Steps 0-4 plus "placeholder steps 5-9" and a "Step 10", then later phases flesh out different step numbers inconsistently

Phase 1 says "Step 5-9: Placeholder steps for phases 2-5" and "Step 10: Present summary". Phase 2 says "Step 5 in SKILL.md is fully fleshed out". Phase 3 says "Steps 6-7". Phase 4 says "Steps 8-9". Phase 5 says "Step 10 in SKILL.md is a minimal summary placeholder" but also adds expertise profiling as new steps. This leaves the summary step without a clear number. The plan needs a definitive step map up front (e.g., Step 0: version check, Step 1: pre-flight, Step 2: scan, Step 3: idea.md, Step 4: init, Step 5: conventions, Step 6: architecture extraction, Step 7: architecture interview, Step 8: migration detection, Step 9: side quest creation, Step 10: expertise profiling, Step 11: hot spots, Step 12: summary). Without this, each phase will produce conflicting numbering.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan has no install script update — new skill will not be deployed

The install script `scripts/install-skills.sh` has a hardcoded `SKILL_DIRS` array listing every skill directory. The plan creates `skills/onboard-repo/` but never adds it to the array. Without this, `bun run install:skills` will silently skip the new skill and it won't appear in `~/.claude/skills/`. Add a task in Phase 1 to update `scripts/install-skills.sh`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No description field design — triggering accuracy unaddressed

The plan creates SKILL.md but never specifies the `name` or `description` frontmatter content. The description is the primary trigger mechanism. For this skill, it needs to trigger on phrases like "onboard this repo", "bring this project into goodplan", "set up goodplan for this repo", "import this existing codebase" — but NOT trigger on "migrate" (that's the /migrate skill), "start a new project" (that's /create-epic Mode A), or "convert .project/" (that's /migrate). The plan should include a task to craft the description with trigger phrases and anti-trigger considerations, following the agentskills.io spec (max 1024 chars, third person).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan proposes writing expertise to "memory system" but doesn't specify the exact protocol

Phase 5 says "write to memory system (`expertise_<domain>.md`)" and "write to memory system and present to user for validation". The existing expertise tracking protocol (`_shared/references/expertise-tracking.md`) has a specific two-layer system: (1) update `~/.claude/CLAUDE.md` `## Expertise` section, and (2) write auto memory files at `~/.claude/projects/<project>/memory/expertise_<domain>.md`. The plan should explicitly reference this shared protocol and include the SKILL.md step reading `../_shared/references/expertise-tracking.md`. All other interactive skills follow this protocol at end-of-run; onboard-repo should too — but it also does the seeding step mid-run, which is novel and should be explicitly designed.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No reference to `_shared/references/cli-interaction.md` or `output-templates.md` — skill won't follow established error handling or output patterns

Every existing skill references `../_shared/references/cli-interaction.md` for error handling patterns (exit codes, error codes, recovery) and many reference `output-templates.md` for done summaries. The plan's SKILL.md skeleton (Phase 1) should include these references in Step 0/1, matching the established pattern from other skills. The plan's Phase 5 summary step should use the done summary template from `output-templates.md`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan proposes `gh pr list --author <user> --json comments,reviewComments` but `reviewComments` is not a valid gh field

The `gh pr list` command's `--json` flag accepts `comments` but not `reviewComments`. PR review comments are accessed via `gh pr view <number> --json reviews,reviewThreads` or `gh api`. The plan should use `gh pr list --json number,title,labels --limit 20` to get PR numbers, then `gh pr view <number> --json reviews,comments` for individual PR details. This affects Phase 2 (PR conventions) and Phase 5 (PR comment analysis).

Resolution: CODEBASE_EXPLORATION

Research: Verify the exact `gh pr list` and `gh pr view` JSON field names by running `gh pr list --json help 2>&1` and `gh pr view --json help 2>&1` (or check the gh CLI docs). The plan relies on `reviewComments` which may not exist.

---

**[IMPORTANT]** Verification approach relies on file existence checks rather than end-to-end skill invocation

The Expected Behavior sections check things like "`.project/` exists", "`conventions.md` contains detected naming patterns", etc. These are file existence/content checks. For a skill, the most direct verification is to actually invoke the skill (or its individual steps) on the fixture repo and verify the end-to-end behavior. Phase 1's Expected Behavior should include "invoke the skill on the fixture repo and verify it completes Steps 0-4 without error". Later phases should invoke the relevant steps and verify output, not just check file contents after manual execution.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fixture repo at `tests/fixtures/onboard-test-repo/` with 20+ git commits and 2 contributors will add substantial binary size to the repo

A git repo with 20+ commits and multiple contributors stored as a fixture means checking in the `.git/` directory (or a script to regenerate it). Storing `.git/` objects in the repo is unusual and bloats the repo. The plan should clarify: is the fixture a script that generates the repo at test time (preferred), or a checked-in git repo? If a script, the task description should say "create a fixture generation script" not "build a test repo".

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 uses `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json` but should use `stdin:` parameter per CLI interaction conventions

Per `cli-interaction.md` section 4, the canonical invocation pattern uses `stdin: '{"name":"...","goal":"..."}'` (Claude Code Bash tool API syntax), not `echo '...' | goodplan`. The plan should use the correct convention to match all other skills.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No progressive disclosure strategy — plan doesn't address SKILL.md length

With 12+ steps, multiple reference files, and detailed heuristics inline, the SKILL.md is likely to exceed 500 lines. The plan should explicitly state the progressive disclosure strategy: keep SKILL.md to the step flow with pointers to reference files, put all heuristic details in `references/` files (repo-scanning.md, convention-heuristics.md, architecture-extraction.md, migration-detection.md, expertise-profiling.md), and have each step say "Read `references/X.md` for detection rules" rather than inlining them.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No end-of-run expertise check step

All interactive skills have an expertise check at end-of-run per `expertise-tracking.md` ("Formal step at end of each run"). The plan's Phase 5 does mid-run expertise seeding from git history, but doesn't include the standard end-of-run expertise check that observes what the user revealed during the onboarding conversation itself. These are two different things: seeding from git (proactive) vs updating from conversation signals (reactive). Both should be present.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan covers the right scope and the phased approach makes sense, but it has significant gaps in skill infrastructure (no install script update, no description/trigger design, missing shared reference integration, confused step numbering) and several inaccuracies in CLI usage (`gh` field names, invocation syntax). The verification approach checks file existence rather than end-to-end skill invocation. To reach 9+: fix the two critical issues (directory creation, step numbering), add install script and description tasks, integrate shared references, correct `gh` CLI usage, and redesign verification to invoke the skill end-to-end on the fixture.

## Summary
- Critical: 2
- Important: 6
- Minor: 4
