# Plan: Onboard Repo

## Overview

Build an `/onboard-repo` skill that brings existing repos (with code but no `.project/`) into the goodplan workflow. The skill extracts information from the repo itself — README, code structure, git history, config files, PR comments — rather than making the user re-explain everything. Only asks about things that can't be inferred.

**Core flow**: Scan repo → detect conventions → extract architecture & subsystems → estimate maturity → interview user for validation → detect migrations & debt → profile expertise → identify hot spots → scaffold `.project/` → optionally create first epic and/or side quests.

**Data sources**: Local git history (always available) + `gh` CLI for PR comments/reviews (when authenticated, graceful fallback to git-only).

**Verification approach**: Synthetic fixture repo with planted patterns for Expected Behavior checks; real open-source repo copy for smoke testing.

Skills-only changes — new SKILL.md + reference files under `skills/onboard-repo/`.

## Phase 1: Skill Skeleton + Project Init

Create the core SKILL.md with the main step flow, repo scanning infrastructure, `goodplan init` integration, and idea.md generation from repo artifacts.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/onboard-repo/SKILL.md` fails — skill doesn't exist yet
- [ ] Running `goodplan status --json` in the synthetic fixture repo returns error — no `.project/`

**After implementation** (should pass / show presence):
- [ ] `skills/onboard-repo/SKILL.md` exists with complete step flow
- [ ] `skills/onboard-repo/references/` directory exists with at least one reference file
- [ ] Synthetic fixture repo exists at `tests/fixtures/onboard-test-repo/` with README, package.json, src/ directory, and git history
- [ ] After running the skill's Phase 1 flow on the fixture: `.project/` exists, `idea.md` is populated from README content, `goodplan status --json` succeeds

### Tasks

- [ ] **Create synthetic fixture repo**: Build a small test repo at `tests/fixtures/onboard-test-repo/` with: README.md (project description, setup instructions), package.json (TypeScript project), src/ with 3-4 modules representing distinct subsystems, tsconfig.json, a test directory with vitest, git history with 20+ commits across multiple files, at least 2 contributors in git log. Initialize as a git repo with realistic commit history.

- [ ] **Create SKILL.md skeleton**: Write the main skill file with step flow:
  - Step 0: Version check (goodplan CLI)
  - Step 1: Pre-flight checks (no existing `.project/`, confirm intent)
  - Step 2: Repo scanning (README, package.json/pyproject.toml/Cargo.toml, directory structure, config files, CI files)
  - Step 3: Generate idea.md from scanned artifacts (project name, description, goals inferred from README, tech stack from config files)
  - Step 4: Run `goodplan init` to scaffold `.project/`
  - Step 5-9: Placeholder steps for phases 2-5 (convention detection, architecture, migration/debt, expertise/hotspots)
  - Step 10: Present summary and offer optional epic creation
  - Include `gh` CLI detection: check `gh auth status`, set a flag for PR data availability

- [ ] **Create references/repo-scanning.md**: Document the scanning heuristics — which files to read, what to extract from each, priority order, fallback strategies for different project types (Node/Python/Rust/Go/Java).

- [ ] **Verify on fixture**: Run the skill's scanning + init flow on the synthetic fixture repo. Confirm idea.md is populated with content from the README, `.project/` is initialized.

### Verification

- SKILL.md passes a structural review (step numbering, references exist, placeholder steps clearly marked)
- Fixture repo is a valid git repo with realistic structure
- Scanning heuristics cover the 5 most common project types

## Phase 2: Convention Detection

Add convention detection heuristics that analyze code patterns, naming, testing, git conventions, and PR comments. Write findings to `conventions.md`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'convention' skills/onboard-repo/SKILL.md` returns only placeholder mentions
- [ ] No `references/convention-heuristics.md` exists

**After implementation** (should pass / show presence):
- [ ] `skills/onboard-repo/references/convention-heuristics.md` exists with detection rules
- [ ] Step 5 in SKILL.md is fully fleshed out (no longer a placeholder)
- [ ] After running convention detection on fixture: `.project/conventions.md` contains detected naming patterns, test conventions, and git conventions from the fixture repo

### Tasks

- [ ] **Create references/convention-heuristics.md**: Document detection rules for:
  - Naming conventions: file naming (kebab-case, camelCase, PascalCase), export naming, variable naming — detect by sampling src/ files
  - Code structure: module organization (barrel exports, index files, flat vs nested), import patterns (absolute vs relative)
  - Testing conventions: test file location (co-located vs `__tests__/` vs `tests/`), naming pattern (`*.test.*`, `*.spec.*`), framework detection, coverage configuration
  - Git conventions: commit message format (conventional commits, prefixes, etc.) from `git log --oneline -50`, branch naming from `git branch -r`
  - PR conventions (when `gh` available): review comment patterns, PR template usage, label conventions from `gh pr list --limit 20 --json title,labels,comments`

- [ ] **Flesh out SKILL.md Step 5 (Convention Detection)**: Replace placeholder with full implementation instructions. Include: scan each category, present findings to user for confirmation/correction, write to `.project/conventions.md`. Handle the `gh` fallback — when not available, skip PR conventions and note the gap.

- [ ] **Add fixture PR data**: If feasible, add mock PR data to the fixture. Otherwise, document that PR convention detection is verified via the real repo smoke test only.

- [ ] **Verify on fixture**: Run convention detection on the fixture repo. Confirm conventions.md is generated with correct findings.

### Verification

- Convention heuristics cover all 5 categories (naming, structure, testing, git, PR)
- The skill gracefully handles repos without `gh` access
- conventions.md output follows the format from `.project/conventions.md` in the goodplan repo

## Phase 3: Architecture Extraction + Maturity

Add subsystem identification from code structure, maturity estimation from git history, and a user interview step to validate findings. Generate architecture files.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Steps 6-7 in SKILL.md are placeholders
- [ ] No `references/architecture-extraction.md` exists

**After implementation** (should pass / show presence):
- [ ] `skills/onboard-repo/references/architecture-extraction.md` exists with extraction rules
- [ ] Steps 6-7 in SKILL.md are fully fleshed out
- [ ] After running architecture extraction on fixture: `.project/architecture/_overview.md` exists with subsystem table including maturity estimates

### Tasks

- [ ] **Create references/architecture-extraction.md**: Document extraction rules:
  - Subsystem identification: top-level directories under src/, package.json workspaces, independent modules with their own dependencies. Heuristic: directory with 5+ files that imports from other directories = candidate subsystem
  - Dependency mapping: which subsystems import from which others (build import graph from grep/AST)
  - Maturity estimation from git:
    - File churn rate (`git log --format='' --name-only | sort | uniq -c | sort -rn`) — high churn in a subsystem = lower maturity
    - Recency of changes (`git log -1 --format=%ci <path>`) — recently active = likely Developing
    - Contributor count per subsystem — more contributors = more established
    - Commit message patterns (fix/bug vs feat/add) — high fix ratio = stability issues
  - Deployment context: Dockerfile, docker-compose.yml, k8s/, serverless config, CI/CD files, Procfile

- [ ] **Flesh out SKILL.md Steps 6-7 (Architecture + Interview)**:
  - Step 6: Run extraction, build subsystem map with maturity estimates, generate dependency graph
  - Step 7: Present findings to user via AskUserQuestion — "These are the subsystems I found: [table]. Are these the right boundaries? Any I should merge/split/rename?" Then: "Here are my maturity estimates based on git history: [table]. Do these match your understanding?" Iterate until user approves. Write `.project/architecture/_overview.md` with validated subsystems and maturity table.

- [ ] **Enhance fixture repo**: Ensure the fixture has clear subsystem boundaries (e.g., `src/api/`, `src/db/`, `src/auth/`) with different git activity levels to test maturity heuristics.

- [ ] **Verify on fixture**: Run extraction + interview flow. Confirm architecture files are generated with subsystems matching fixture structure.

### Verification

- Subsystem detection correctly identifies fixture repo's modules
- Maturity estimates are plausible given fixture git history
- User interview step presents findings and allows corrections
- Output matches `.project/architecture/_overview.md` format

## Phase 4: Migration & Debt Detection + Side Quests

Add pattern coexistence analysis, git timeline correlation for in-flight migrations, tech debt surfacing, and automatic side quest creation for approved items.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Steps 8-9 in SKILL.md are placeholders
- [ ] No `references/migration-detection.md` exists

**After implementation** (should pass / show presence):
- [ ] `skills/onboard-repo/references/migration-detection.md` exists with detection rules
- [ ] Steps 8-9 in SKILL.md are fully fleshed out
- [ ] After running migration detection on fixture (which has a planted half-done migration): at least 1 migration detected and presented to user
- [ ] Side quest creation flow works: detected items → user triage → `goodplan quest:create` for approved items

### Tasks

- [ ] **Plant a half-done migration in fixture**: Add pattern coexistence to the fixture repo — e.g., some files using `class` components and some using function components, or some files using CommonJS and some using ESM, with git history showing the transition started but didn't finish.

- [ ] **Create references/migration-detection.md**: Document detection rules:
  - Pattern coexistence: same conceptual operation done two different ways (e.g., class vs function components, callbacks vs async/await, CommonJS vs ESM, old API vs new API)
  - Git timeline correlation: when did the new pattern first appear? Is the old pattern still being added to (regression) or only the new pattern?
  - Confidence scoring: high (clear old→new with timeline), medium (coexistence but unclear direction), low (might just be stylistic variation)
  - Tech debt heuristics: TODO/FIXME/HACK comments, files with no test coverage, unused dependencies in package.json, outdated dependencies (major version behind), circular imports, files over 500 lines

- [ ] **Flesh out SKILL.md Steps 8-9 (Detection + Side Quests)**:
  - Step 8: Run migration detection + debt analysis. Present findings categorized as migrations (in-flight transitions) vs debt (accumulated issues). Use AskUserQuestion for each: "Create side quest / Acknowledge and defer / Skip"
  - Step 9: For approved items, create quests via `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`. Include in goal: what to migrate/fix, which files, old→new pattern description, estimated scope.

- [ ] **Verify on fixture**: Run detection on fixture. Confirm the planted migration is detected. Verify quest creation flow.

### Verification

- Migration detection finds the planted half-done migration in the fixture
- Debt detection finds TODO comments and other planted signals
- Quest creation produces valid quests via CLI
- User triage flow works (present → select → create)

## Phase 5: Expertise Profiling + Hot Spot Analysis

Add git authorship analysis for expertise profiling, PR comment analysis, and churn×complexity hot spot identification. Write expertise to memory system.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Step 10 in SKILL.md is a minimal summary placeholder
- [ ] No `references/expertise-profiling.md` exists

**After implementation** (should pass / show presence):
- [ ] `skills/onboard-repo/references/expertise-profiling.md` exists with profiling rules
- [ ] SKILL.md includes expertise profiling and hot spot analysis as complete steps
- [ ] After running on fixture: expertise profile generated from git history, hot spots identified by churn×complexity

### Tasks

- [ ] **Create references/expertise-profiling.md**: Document profiling rules:
  - Git authorship: `git shortlog -sn` for commit counts, `git log --format='%aN' -- <path>` for per-subsystem expertise. The user who runs the skill is assumed to be one of the git authors — match by `git config user.name` or `git config user.email`.
  - Expertise inference: primary language (most commits), subsystem ownership (most commits in each subsystem), role indicators (commit types — infra/CI commits vs feature commits vs fix commits)
  - PR comment analysis (when `gh` available): `gh pr list --author <user> --json comments,reviewComments` — extract review quality signals (thoroughness, domains reviewed), architectural discussions, convention enforcement
  - Hot spot analysis: file-level `churn × complexity` where churn = commit count in last 6 months, complexity = lines of code (proxy). Top 10 hot spots inform slice prioritization.

- [ ] **Flesh out SKILL.md expertise + hot spot steps**:
  - Expertise profiling: analyze git history, build user profile, write to memory system (`expertise_<domain>.md`) and present to user for validation
  - Hot spot analysis: compute churn×complexity, present top 10, note which subsystems they fall in — these are likely candidates for first slices

- [ ] **Complete SKILL.md summary step**: Finalize Step 10 — present full onboarding summary (project initialized, N subsystems identified, N conventions detected, N migrations found, N quests created, expertise profile built). Offer optional epic creation: "Would you like to create an initial epic for the first development direction?"

- [ ] **Verify on fixture**: Run profiling on fixture. Confirm expertise profile reflects fixture's git history. Confirm hot spots identified.

- [ ] **Smoke test on real repo**: Clone a small open-source repo, run the full skill end-to-end. Verify it produces reasonable output without errors. Document any gaps found.

### Verification

- Expertise profile correctly reflects fixture's git authorship patterns
- Hot spot analysis produces a ranked list with plausible results
- Full end-to-end smoke test on a real repo completes without errors
- Memory system updated with expertise profile
