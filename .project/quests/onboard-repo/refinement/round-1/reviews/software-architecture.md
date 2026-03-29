# Software Architecture Review — onboard-repo Plan

## Issues

**[CRITICAL]** Plan incorrectly assumes `goodplan init` creates `idea.md` and `architecture/`
The plan's Phase 1 flow says "Run `goodplan init` to scaffold `.project/`" and then verifies "idea.md is populated from README content" and that `goodplan status --json` succeeds. However, `goodplan init` only creates the JSON/JSONL state files (`project.json`, `activity-log.jsonl`, `decisions.jsonl`, `learnings.jsonl`) and empty entity directories (`epics/`, `quests/`, `slices/`, `tasks/`). It does NOT create `idea.md`, `conventions.md`, or `architecture/` — those are LLM-owned markdown files that skills write directly using the Write tool. The plan must explicitly show the skill writing `idea.md` to `.project/idea.md` after calling `goodplan init`, not treating it as output of the init command. Similarly, Phase 3 must explicitly create the `architecture/` directory and write `_overview.md` rather than assuming the CLI does it. This is critical because the skill will silently skip these files otherwise.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Fixture repo at `tests/fixtures/onboard-repo/` violates existing fixture conventions
The plan places the fixture at `tests/fixtures/onboard-test-repo/` and describes creating it as a git repo with 20+ commits and 2 contributors. Existing fixtures at `tests/fixtures/` are minimal `.project/` state snapshots (e.g., `fresh-init/`, `epic-activated/`), not full application repos with source code and git history. A fixture repo with its own git history cannot live inside the goodplan repo's git tree — you'd need a submodule or a script that builds the fixture at test time. The plan must address: (1) how a nested git repo works inside the parent repo (`.gitignore` the `.git/` inside the fixture? use a setup script?), (2) how "2 contributors" and "20+ commits" are simulated without a real git history, and (3) whether this belongs in `tests/fixtures/` at all or in a temporary directory created by a test setup script.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No `CLAUDE.md` update step — the onboarded repo won't have project context wiring
Existing skills (notably `/create-epic`) write a `## Project Context` section in the repo's `CLAUDE.md` that references `.project/idea.md`, `.project/conventions.md`, and `.project/architecture/_overview.md`. Without this, subsequent skill invocations won't load project context automatically. The plan mentions generating `idea.md`, `conventions.md`, and `architecture/_overview.md` but never mentions updating or creating `CLAUDE.md` with references to these files. This is a core integration requirement — the skill's output won't be useful to the workflow without it.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Data ownership violation: plan has skill writing `.project/conventions.md` without clarifying write mechanism
Phase 2 says "write to `.project/conventions.md`" after convention detection. Per the data ownership model (cli-interaction.md section 2), `conventions.md` is LLM-owned markdown — skills write it directly with the Write tool. This is technically correct but the plan never makes this explicit. More importantly, the plan doesn't clarify the relationship between the skill writing `conventions.md` and the CLI's awareness of it. The CLI reads `conventions.md` for context bundling (it appears in every phase's priority table in `src/core/context/priorities.ts`), so the file must be at the exact path `.project/conventions.md`. The plan should explicitly state the write path and mention that this is an LLM-owned file written directly, not via a CLI command.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Quest creation via `echo | goodplan quest:create --json` will fail — no active quest guard
Phase 4, Step 9 proposes creating multiple side quests for detected migrations/debt. The state machine enforces `STATE_QUEST_ALREADY_ACTIVE` — only one quest can be active at a time. The plan's approach of creating quests in a loop will fail after the first one because `quest:create` activates the quest. The plan needs to either: (a) create all quests and immediately abandon/complete each one to clear the active slot, (b) use a different approach where quests are created in `created` status without activation, or (c) document that only one quest is created and others are captured as tasks via `task:create`. Research the `quest:create` state machine behavior — does it auto-activate?
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Missing step ordering dependency: expertise tracking requires `.project/` to exist first
Phase 5 describes writing expertise to the "memory system" (`expertise_<domain>.md`). But the auto memory file path (`~/.claude/projects/<project>/memory/`) depends on knowing the project identity. The plan's Phase 5 runs after Phases 1-4, so `.project/` exists, but the plan doesn't make explicit that the memory file path must be derived from the project path. More critically, the expertise profiling step says to write to "memory system" but doesn't specify whether this means CLAUDE.md `## Expertise` section (always-loaded) or auto memory files (per-project). Per expertise-tracking.md, both layers must be updated. The plan should reference `../_shared/references/expertise-tracking.md` explicitly and follow its two-layer protocol.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Architecture extraction runs git commands that may not work inside Claude Code's sandboxed Bash
Phase 3 relies heavily on git commands like `git log --format='' --name-only | sort | uniq -c | sort -rn` and `git log -1 --format=%ci <path>`. These will work, but the plan doesn't account for repos where git history is shallow (e.g., `git clone --depth 1`) or where the user cloned without full history. A shallow clone will give misleading churn and maturity data. The plan should include a pre-flight check: `git rev-parse --is-shallow-repository` and warn the user if shallow, suggesting `git fetch --unshallow` first.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step numbering in SKILL.md skeleton is fragile and inconsistent with the plan text
Phase 1 describes Steps 0-10 with Steps 5-9 as placeholders. Phase 2 says "Step 5" for conventions. Phase 3 says "Steps 6-7". Phase 4 says "Steps 8-9". Phase 5 says "Step 10" for summary. But Phase 5 also adds expertise profiling and hot spot analysis as "complete steps" without assigned numbers, then Step 10 becomes the summary. This creates ambiguity about the final step count. Existing skills use sequential step numbering (see create-epic). The plan should lock down the step numbering up front in Phase 1 and not change it later.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No idempotency / re-entry handling
Existing skills handle re-entry gracefully (see cli-interaction.md section 10: idempotent re-entry principle). The plan never discusses what happens if the skill is interrupted mid-run and restarted. For a long-running skill with 10+ steps, this is important. The plan should include re-entry detection: check for existing `.project/` artifacts (idea.md exists? conventions.md exists? architecture/ exists?) and skip already-completed steps.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Smoke test on "real open-source repo" is underspecified
Phase 5 says "Clone a small open-source repo, run the full skill end-to-end." This doesn't specify which repo, or what "small" means, or what constitutes success beyond "no errors." The verification should name a specific repo (or criteria for selecting one) and define concrete success criteria.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan demonstrates good understanding of the problem space and covers the right feature areas (convention detection, architecture extraction, migration detection, expertise profiling). However, it has two critical issues: incorrect assumptions about what `goodplan init` produces (leading to missing files) and a fixture approach that won't work inside a git repo. The important issues around CLAUDE.md wiring, quest creation constraints, and expertise tracking protocol compliance further reduce confidence. To reach 9+: fix the init/file-writing model, resolve the fixture strategy, add CLAUDE.md update step, handle quest creation constraints, reference expertise-tracking.md explicitly, add shallow-clone detection, lock down step numbering, and add re-entry handling.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
