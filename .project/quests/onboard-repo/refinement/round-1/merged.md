# Merged Feedback — onboard-repo Plan (Round 1)

## CRITICAL Issues

**C1. Plan does not include a CLAUDE.md update step**
Reviewers: holistic, software-architecture
The skill must write a `## Project Context` section in the repo's `CLAUDE.md` referencing `.project/idea.md`, `.project/conventions.md`, and `.project/architecture/_overview.md`. This is how the LLM discovers project context in future sessions. Without it, the scaffolded `.project/` is invisible. See `/create-epic` Step 9 for the established pattern.
Resolution: DIRECTLY_ACTIONABLE

**C2. Plan incorrectly assumes `goodplan init` creates `idea.md`, `conventions.md`, and `architecture/`**
Reviewers: software-architecture, agent-skill
`goodplan init` only creates JSON/JSONL state files and empty entity directories. It does NOT create `idea.md`, `conventions.md`, or `architecture/`. These are LLM-owned markdown files the skill must write directly using the Write tool. The plan must explicitly show: (1) the skill writing `.project/idea.md` after `goodplan init`, (2) `mkdir -p .project/architecture/` before writing `_overview.md`, (3) writing `.project/conventions.md` directly. Without this, these files will be silently missing.
Resolution: DIRECTLY_ACTIONABLE

**C3. SKILL.md step numbering is confused and inconsistent across phases**
Reviewers: holistic, software-architecture, agent-skill
Phase 1 describes Steps 0-4 with 5-9 as placeholders plus Step 10 for summary. Later phases assign different step numbers inconsistently. Phase 5 adds expertise profiling without assigned numbers. The plan needs a definitive step map up front, e.g.: Step 0: version check, Step 1: pre-flight, Step 2: scan, Step 3: idea.md, Step 4: init, Step 5: conventions, Step 6: architecture extraction, Step 7: architecture interview, Step 8: migration detection, Step 9: side quest creation, Step 10: expertise profiling, Step 11: hot spots, Step 12: summary.
Resolution: DIRECTLY_ACTIONABLE

**C4. Fixture repo approach needs redesign — nested git repo + LLM skill invocation**
Reviewers: holistic, software-architecture, agent-skill
Two intertwined issues: (1) A fixture repo with its own git history (20+ commits, 2 contributors) cannot trivially live inside the goodplan repo's git tree. Existing fixtures are minimal `.project/` state snapshots, not full application repos. The plan must clarify whether this is a generation script (preferred) or a checked-in repo, and how nested `.git/` is handled. (2) The skill is a SKILL.md (LLM prompt), not programmatic code — you cannot "run the skill's scanning + init flow on the fixture" like a test suite. The verification strategy must specify whether verification is interactive (invoke via Claude Code) or scripted (shell scripts replicating heuristics).
Resolution: USER_INPUT — the user must decide the verification approach: interactive invocation vs scripted replication.

## IMPORTANT Issues

**I1. Missing shared reference integration — output-templates.md, cli-interaction.md, expertise-tracking.md**
Reviewers: holistic, agent-skill, software-architecture
All existing skills reference `../_shared/references/output-templates.md` for done summaries, `../_shared/references/cli-interaction.md` for error handling/invocation conventions, and `../_shared/references/expertise-tracking.md` for the two-layer expertise protocol. The plan's SKILL.md skeleton must load these in Step 0/1. The done summary should use Variant B (loose checklist). Expertise tracking must follow the two-layer protocol: (1) `~/.claude/CLAUDE.md` `## Expertise` section, and (2) `~/.claude/projects/<project>/memory/expertise_<domain>.md` files.
Resolution: DIRECTLY_ACTIONABLE

**I2. No install script update — new skill will not be deployed**
Reviewer: agent-skill
`scripts/install-skills.sh` has a hardcoded `SKILL_DIRS` array. The plan creates `skills/onboard-repo/` but never adds it to the array. Without this, `bun run install:skills` silently skips the new skill. Add a task in Phase 1.
Resolution: DIRECTLY_ACTIONABLE

**I3. No description/trigger design for SKILL.md frontmatter**
Reviewer: agent-skill
The description is the primary trigger mechanism. Must trigger on "onboard this repo", "bring this project into goodplan", "set up goodplan for this repo" — but NOT trigger on "migrate" (/migrate skill), "start a new project" (/create-epic Mode A), or "convert .project/" (/migrate). The plan should include a task to craft the description with trigger/anti-trigger considerations.
Resolution: DIRECTLY_ACTIONABLE

**I4. No idempotent re-entry handling**
Reviewers: holistic, software-architecture
Per `cli-interaction.md` section 10, skills must handle re-entry gracefully. For a 10+ step interactive skill, partial failure is likely. Each phase should detect and skip already-completed work (e.g., if `.project/` exists, skip init; if `conventions.md` has content, skip or offer re-detect).
Resolution: DIRECTLY_ACTIONABLE

**I5. Quest creation will fail for multiple quests — `STATE_QUEST_ALREADY_ACTIVE` guard**
Reviewers: holistic, software-architecture
Phase 4 proposes creating multiple side quests via `quest:create`, but the state machine enforces only one active quest at a time. Creating a second quest will fail. The plan needs to address: does `quest:create` auto-activate? Can quests be created in `created` status? Should alternatives be captured as tasks instead?
Resolution: RESEARCH_NEEDED — verify `quest:create` state machine behavior and whether queued creation is possible.

**I6. Shallow clone detection missing from architecture extraction**
Reviewer: software-architecture
Phase 3 relies on git commands for churn and maturity data. Shallow clones will give misleading results. Add a pre-flight check: `git rev-parse --is-shallow-repository` and warn the user, suggesting `git fetch --unshallow`.
Resolution: DIRECTLY_ACTIONABLE

**I7. Convention heuristics missing TypeScript-specific detection**
Reviewer: typescript
Phase 2's convention heuristics omit: tsconfig strictness flags, module system (ESM vs CJS), path aliases, build tooling (vite/webpack/esbuild/tsup/bun), runtime detection (Node/Bun/Deno from lockfiles), and lockfile-based package manager detection. These are primary onboarding signals for TypeScript projects and should be enumerated in `references/convention-heuristics.md`. Should generalize: Python gets pyproject.toml/mypy/ruff, Rust gets Cargo.toml/clippy.
Resolution: DIRECTLY_ACTIONABLE

**I8. Import graph analysis lacks TypeScript module semantics**
Reviewer: typescript
Phase 3's architecture extraction must account for: (1) `import type` vs value imports — type-only imports indicate design coupling but not runtime dependency, (2) path alias resolution from tsconfig `paths`, (3) barrel re-exports (`export * from` in index.ts) tracing through to actual modules. Document as heuristic guidance in the reference file.
Resolution: DIRECTLY_ACTIONABLE

**I9. Fixture tsconfig.json must include realistic strict settings**
Reviewer: typescript
The fixture needs `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and ESM module resolution so convention detection heuristics have real signals to test against.
Resolution: DIRECTLY_ACTIONABLE

**I10. `gh pr list --json reviewComments` is not a valid field**
Reviewer: agent-skill
The `gh pr list` `--json` flag accepts `comments` but not `reviewComments`. PR review comments require `gh pr view <number> --json reviews,reviewThreads`. The plan should use `gh pr list --json number,title,labels` then `gh pr view` for details.
Resolution: RESEARCH_NEEDED — verify exact `gh pr list` and `gh pr view` JSON field names.

**I11. Verification checks file existence rather than end-to-end skill invocation**
Reviewer: agent-skill
Expected Behavior sections check "`.project/` exists" and "conventions.md contains X". For a skill, the most direct verification is invoking the skill (or individual steps) on the fixture and verifying end-to-end behavior, not just checking file contents after manual execution. (Note: tied to C4 — verification approach needs user decision.)
Resolution: DIRECTLY_ACTIONABLE (but gated on C4 user decision)

## MINOR Issues

**M1. Phase 1 "before" check is trivially true** (holistic)
`ls skills/onboard-repo/SKILL.md` fails — self-evident for file creation. Drop or replace with a meaningful check.
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 2 "before" check uses fragile grep** (holistic)
`grep -c 'convention'` returning "only placeholder mentions" is not falsifiable. Check for literal "placeholder" or "TODO" text instead.
Resolution: DIRECTLY_ACTIONABLE

**M3. Missing documentation update** (holistic)
Plan doesn't update `.project/conventions.md` repo structure section to list `onboard-repo/` in the skills list.
Resolution: DIRECTLY_ACTIONABLE

**M4. Smoke test on real repo lacks specific success criteria** (holistic, software-architecture)
"Verify reasonable output without errors" is not falsifiable. Define concrete checks: `.project/` exists, `idea.md` non-empty, `conventions.md` has 3+ detected conventions, `architecture/_overview.md` has subsystem table with 1+ row, `goodplan status --json` succeeds.
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 4 uses `echo | goodplan` instead of `stdin:` parameter** (agent-skill)
Per `cli-interaction.md` section 4, use `stdin: '{"name":"...","goal":"..."}'` (Claude Code Bash tool API syntax).
Resolution: DIRECTLY_ACTIONABLE

**M6. No progressive disclosure strategy for SKILL.md length** (agent-skill)
With 12+ steps, the SKILL.md will likely exceed 500 lines. Keep SKILL.md to the step flow with pointers to reference files; put heuristic details in `references/` files.
Resolution: DIRECTLY_ACTIONABLE

**M7. No end-of-run expertise check step** (agent-skill)
Phase 5 does mid-run expertise seeding from git, but not the standard end-of-run expertise check that observes what the user revealed during the conversation. Both should be present per `expertise-tracking.md`.
Resolution: DIRECTLY_ACTIONABLE

**M8. Fixture testing should use vitest with `*.test.ts` naming** (typescript)
Fixture should have `vitest.config.ts` and `*.test.ts` naming so Phase 2's testing convention detection has concrete signals.
Resolution: DIRECTLY_ACTIONABLE

**M9. Half-done migration fixture should use CJS-to-ESM pattern** (typescript)
Use `require()`/`module.exports` in some files and `import`/`export` in others, with git history showing ESM files added more recently. More realistic than class-vs-function-component for a TypeScript project.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

C1, C2, C3, I1, I2, I3, I4, I6, I7, I8, I9, I11, M1-M9 (22 items)

## RESEARCH_NEEDED

I5 (quest:create state machine — does it auto-activate? can queued creation work?)
I10 (gh pr list/view JSON field names)

## Contradictions Resolved

1. **C3 severity: IMPORTANT vs CRITICAL** — holistic and software-architecture rated step numbering as IMPORTANT; agent-skill rated it CRITICAL. Promoted to CRITICAL because agent-skill is the domain specialist here and confused step numbering in a SKILL.md directly causes LLM execution errors, which is a correctness issue, not just a clarity issue.

2. **Fixture approach severity** — holistic called the fixture approach CRITICAL (infeasible); software-architecture called it CRITICAL (convention violation); agent-skill called it MINOR (binary size concern). Merged as CRITICAL (C4) for the structural issues, keeping the binary size aspect as a sub-point. The holistic and software-architecture reviewers identified the deeper problem (approach feasibility), while the agent-skill reviewer only flagged a secondary concern.

3. **CLAUDE.md update: CRITICAL vs IMPORTANT** — holistic rated it CRITICAL; software-architecture rated it IMPORTANT. Kept as CRITICAL per holistic's reasoning: without CLAUDE.md wiring, the entire skill output is invisible to future sessions, which defeats the purpose of onboarding.

## USER_INPUT Resolved

1. **Verification approach (C4)**: The repo has a test harness using the Anthropic Claude SDK. Verification should automate the testing flow by starting a Claude SDK session on the fixture directory and invoking the skill. Expected Behavior sections should describe what the automated test checks before/after invocation.

## Available Research

- `.project/quests/onboard-repo/research/quest-create-behavior.md` — quest:create allows multiple quests (name-uniqueness guard only). Single-active-quest enforced at planning, not creation.
- `.project/quests/onboard-repo/research/gh-pr-json-fields.md` — `reviewComments` invalid; use `reviews` field + `gh api` for inline comments.
- `.project/quests/onboard-repo/research/_codebase-context.md` — skill patterns, CLI interfaces, expertise tracking.
