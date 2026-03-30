---
name: onboard-repo
description: >
  Scan an existing repo with code but no .goodplan/ directory and scaffold a
  complete goodplan project. Extracts conventions, architecture, subsystem
  maturity, migrations, tech debt, and expertise from repo artifacts (README,
  git history, config files, gh CLI). Only asks about things that can't be
  inferred. Not for repos that already have .goodplan/ (use /migrate) or new
  projects without code (use /create-epic).
requires: gp >= 1.0.0
---

# Onboard Repo

Scans an existing codebase and scaffolds a complete goodplan project by extracting conventions, architecture, subsystem structure, and tech debt from repo artifacts. Designed for repos that have code but no `.goodplan/` directory.

**When this skill triggers:** User says "onboard this repo", "set up goodplan for this project", "scan this codebase", or invokes `/onboard-repo` in a repo with code but no `.goodplan/`. Use when joining an existing codebase, taking over a project, or wanting to understand a repo's architecture.

## Step 0 — Version Check

```bash
"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" --version --json
```

If the command fails (not found, non-zero exit), stop: "The `gp` CLI is required (>= 1.0.0) but was not found or is incompatible. Ensure the goodplan plugin is installed and enabled — run `/plugin` to check."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Read `../_shared/references/cli-interaction.md` — needed throughout for CLI error handling patterns (section 10: Error Handling). Key points: exit code 1 = internal/unexpected error (present to user and stop), exit code 2 = validation/usage error (fix invocation — likely a skill bug), exit code 3 = state machine error (parse error code from JSON, apply recovery pattern).

Note: `../_shared/references/expertise-tracking.md` is deferred to Step 10. `../_shared/references/output-templates.md` is deferred to Step 12.

## Step 1 — Pre-Flight Checks

### Existing project check

```bash
ls -d .goodplan/ 2>/dev/null
```

If `.goodplan/` exists, run `gp status --json` to determine project state:

- **Fully onboarded** (has `idea.md` + `conventions.md` + architecture files): Stop with advisory message: "This repo already has a fully onboarded `.goodplan/` directory. Use `/project-status` to see current state, or `/migrate` if it needs updating to a newer CLI version." Do NOT crash or exit with an error code — this is a normal advisory stop.
- **Bare/partial** (just `project.json`, no markdown artifacts like `idea.md`): Inform the user: "Found a partial `.goodplan/` from a previous incomplete run. Continuing onboarding from where it left off." Continue to Step 2 — the re-entry guards in Steps 3 and 4 will handle skipping already-completed work.

If `.goodplan/` does not exist, continue normally.

### Confirm intent

Ask the user: "Ready to scan this repo and set up goodplan? This will create a `.goodplan/` directory with project metadata inferred from the codebase."

### Shallow clone check

```bash
git rev-parse --is-shallow-repository
```

If `true`, warn: "This is a shallow clone. Git history analysis will be limited. Consider running `git fetch --unshallow` first for better results." Continue regardless — shallow data is still useful.

### GitHub CLI availability

```bash
gh auth status 2>&1
```

Set `{gh_available}` flag:
- **true** if `gh auth status` succeeds — PR data, issue labels, and contributor stats will be available.
- **false** if it fails — skip GitHub-specific scanning in later steps. Inform: "GitHub CLI not authenticated — skipping PR/issue analysis. Run `gh auth login` to enable."

## Step 2 — Repo Scanning

Read `references/repo-scanning.md` (relative to this skill's directory) for scanning heuristics.

Scan in priority order, storing findings in working memory for subsequent steps:

### 2a. README

```bash
ls README* readme* 2>/dev/null
```

Read the first match. Extract: project name, description, tech stack mentions, setup instructions, architectural clues.

### 2b. Package Manifest

Look for (in order): `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`. Read the first match. Extract: project name, dependencies, scripts/commands, language version constraints.

### 2c. Directory Structure

```bash
ls -d src/*/ lib/*/ app/*/ cmd/*/ internal/*/ packages/*/ 2>/dev/null
```

Map top-level source directories to potential subsystems.

### 2d. Config Files

Read if present: `tsconfig.json`, `.eslintrc*`, `biome.json`, `.prettierrc*`, `jest.config*`, `vitest.config*`, `.env.example`.

### 2e. CI Configuration

```bash
ls .github/workflows/*.yml .github/workflows/*.yaml .gitlab-ci.yml Jenkinsfile .circleci/config.yml 2>/dev/null
```

Read CI files for build/test/deploy pipeline details.

## Step 3 — Initialize Project

Infer project name using this priority order:
1. `package.json` / manifest `name` field
2. README title (first `#` heading)
3. Repo directory name (basename of cwd)

Sanitize to kebab-case: lowercase, replace spaces and underscores with hyphens, strip npm scope prefix (`@scope/`), truncate to 50 characters.

**Re-entry:** If `.goodplan/` exists from a previous partial run, skip init.

```bash
gp init --name <sanitized-name> --json
```

Handle errors per `cli-interaction.md` section 10.

## Step 4 — Generate idea.md

Write `.goodplan/idea.md` directly using the Write tool. Content structure:

```markdown
# <Project Name>

## Description

<1-2 paragraph description inferred from README and package manifest>

## Goals

<Bulleted list of goals inferred from README, CI setup, and project structure>

## Tech Stack

<Bulleted list: language, framework, build tool, test framework, etc.>

## Constraints

<Any constraints visible from config: Node version, TypeScript strictness, etc.>
```

**Re-entry:** If `idea.md` exists and has content (more than just a heading), ask the user: "Found existing `.goodplan/idea.md`. Regenerate from scan results, or keep the current version?" Respect their choice.

## Step 5 — Convention Detection

Read `references/convention-heuristics.md` (relative to this skill's directory) for the dispatch table and all detection heuristics.

### Re-entry

If `.goodplan/conventions.md` already exists and has content (more than just a heading), ask the user: "Found existing `.goodplan/conventions.md`. Re-detect conventions from the codebase, or keep the current version?" Respect their choice. If they choose to keep, skip to Step 6.

### 5a. Project type dispatch

Scan the repo root for marker files per the dispatch table in `convention-heuristics.md`:

- `tsconfig.json` → TypeScript rules
- `pyproject.toml` → Python rules
- `Cargo.toml` → Rust rules
- `go.mod` → Go rules
- `pom.xml` / `build.gradle` → Java rules

Multiple markers can match. Record which rule sets apply. If none match, use general heuristics only and note the gap.

### 5b. Run detection categories

For each matching rule set, scan the following categories using the heuristics documented in `convention-heuristics.md`:

1. **Naming conventions** — sample up to 20 `src/` files (prioritizing files with most git commits via `git log --format='' --name-only -- 'src/' | sort | uniq -c | sort -rn | head -20`). Detect file naming pattern (kebab-case, camelCase, PascalCase, snake_case), export naming (named vs default), variable naming.

2. **Code structure** — check for barrel exports (index files with only export statements), flat vs nested module layout, import patterns (relative vs absolute/alias).

3. **Testing conventions** — detect test file location (co-located, separate `tests/`, `__tests__/`), naming pattern (`*.test.*` vs `*.spec.*`), framework (prioritize config file presence: `vitest.config.*` > `jest.config.*` > `.mocharc.*` over package.json scripts), coverage config, native TypeScript test support.

4. **Language-specific** — for TypeScript: read `tsconfig.json` strictness flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), module system (ESM/CJS), path aliases (only report if 3+ import statements use them), build tooling (vite/webpack/esbuild/tsup/bun/tsc), runtime detection from lockfiles, package manager detection from lockfiles.

5. **Git conventions** — check the shallow-repo flag from Step 1. If shallow, skip and note the gap. Otherwise: commit message format from `git log --oneline -50` (conventional commits, prefix style, ticket references, freeform), branch naming from `git branch -r`.

6. **PR conventions** — only if `{gh_available}` is true. Run `gh pr list --limit 20 --json number,title,labels,reviewDecision`. Detect PR title format, label usage, review requirements, PR template existence. If `{gh_available}` is false, skip and note: "GitHub CLI not available — PR conventions not analyzed."

### 5c. Present findings for confirmation

Present all detected conventions to the user organized by category, using a structured summary. Ask: "These are the conventions I detected. Anything to correct, add, or remove?"

Accept corrections in a single round — apply the user's changes, then proceed. Do not re-present for a second confirmation unless the user explicitly asks.

### 5d. Write conventions.md

Write `.goodplan/conventions.md` directly using the Write tool. Follow the output format documented in `convention-heuristics.md`:

- **Tech Stack** — language, runtime, frameworks, test framework, significant deps
- **Repo Structure** — abbreviated directory tree of key directories
- **Dependency Management** — package manager (from lockfile), lockfile status, monorepo tooling
- **Code Style** — linter/formatter, naming conventions, import style, TypeScript strictness
- **Testing** — framework, test location, naming pattern, coverage config
- **Other Conventions** — error handling patterns, git commit format, branch naming, PR conventions

Omit sections where no conventions were detected. Each bullet should be concise — one line per convention signal.

## Step 6 — Architecture Extraction

Read `references/architecture-extraction.md` (relative to this skill's directory) for extraction heuristics — subsystem identification, dependency mapping, maturity estimation, and deployment context.

### Re-entry

Check if `.goodplan/architecture/_overview.md` already exists and has content (more than just headings). If so, ask: "Found existing architecture files. Re-extract from the codebase, or keep the current version?" Respect their choice. If they choose to keep, skip to Step 7.

### 6a. Create architecture directory

```bash
mkdir -p .goodplan/architecture/
```

Note: `architecture/` is an LLM-owned content directory — the CLI creates entity directories (epics/, slices/, quests/) but `architecture/` is created by skills that write free-form markdown. `mkdir -p` is appropriate here; the "no mkdir" rule in `cli-interaction.md` applies only to entity directories managed by the state machine.

### 6b. Identify subsystems

Follow the subsystem identification heuristics in `architecture-extraction.md` section 1:

1. Scan for top-level source directories:

```bash
ls -d src/*/ lib/*/ app/*/ cmd/*/ internal/*/ packages/*/ 2>/dev/null
```

2. Check for monorepo workspaces (package.json `workspaces`, pnpm-workspace.yaml, Cargo workspace, go.work).

3. For each candidate directory, evaluate against the multi-signal heuristic table: entry point files, cross-directory imports, domain naming, file count, test files, distinct dependencies. Require at least 2 signals (one Strong or Medium) to classify as a subsystem.

4. Identify shared/utility directories (`shared`, `common`, `utils`, `lib`, `helpers`, `types`) — note these as cross-cutting infrastructure, not subsystems.

### 6c. Map dependencies

Build an import graph between identified subsystems per `architecture-extraction.md` section 2:

1. If TypeScript (`tsconfig.json` exists): read path aliases from `tsconfig.json` `compilerOptions.paths` first — expand aliases when scanning imports.
2. For each subsystem, Grep its source files for imports referencing other subsystems. Distinguish `import type` (type-only edge) from value imports (runtime edge).
3. Trace barrel re-exports in index files to understand true public API surfaces.
4. Scan for dynamic `import()` expressions — these indicate runtime dependencies and potential code-splitting boundaries.
5. Flag circular dependencies (bidirectional runtime edges).

Record edges as a dependency table: `From → To (runtime|type-only)` with key imported symbols.

### 6d. Estimate maturity

Check `git rev-parse --is-shallow-repository` before git analysis. If shallow, note the limitation and proceed with available history.

For each subsystem, collect per `architecture-extraction.md` section 4:

1. **Churn rate**: `git log --format='' --name-only -- '<path>/' | sort | uniq -c | sort -rn | head -20`
2. **Recency**: `git log -1 --format=%ci -- '<path>/'`
3. **Contributors**: `git log --format='%aN' -- '<path>/' | sort -u | wc -l`
4. **Commit patterns**: `git log --oneline -50 -- '<path>/'` — classify by prefix (fix/feat/refactor/chore), compute fix-to-feature ratio.

Combine signals using the weighted table in the reference to assign: Mature, Developing, Nascent, or Unknown.

### 6e. Detect deployment context

Per `architecture-extraction.md` section 5: scan for Dockerfile, docker-compose, k8s configs, serverless configs, CI/CD files (from Step 2e), Procfile. Summarize deployment model.

### 6f. Extract key dependencies

Read the package manifest (from Step 2b) and extract architecturally significant dependencies — frameworks, databases, ORMs, auth libraries, API clients. Record name, version, and purpose.

### 6g. Draft system summary

Synthesize findings from Steps 6b-6f into a 2-3 paragraph system summary describing:
- What the system does (from Step 4 idea.md)
- How it's organized (subsystem boundaries, layering if visible)
- Key design decisions visible from the code (e.g., monorepo, microservices, serverless, strict TypeScript)

Hold all findings in working memory for presentation in Step 7.

## Step 7 — Architecture Interview

Present extracted architecture findings to the user for validation and correction. Max 3 exchanges (present → correct → confirm).

### 7a. Present subsystem boundaries

Present the subsystem map as a table:

```
I identified these subsystems from the codebase:

| Subsystem | Description | Key files | Dependencies |
|---|---|---|---|
| api | HTTP handlers and routing | src/api/ | db, auth, shared |
| db | Database access layer | src/db/ | shared |
| auth | Authentication/authorization | src/auth/ | db |
| (shared) | Cross-cutting utilities | src/shared/ | — |
```

Ask: "Are these the right subsystem boundaries? Any to merge, split, rename, or add?"

### 7b. Present maturity estimates

After incorporating subsystem corrections (if any), present maturity:

```
Based on git history, here are my maturity estimates:

| Subsystem | Maturity | Justification |
|---|---|---|
| api | Developing | Active commits, 3 contributors, mix of feat/fix |
| db | Mature | Low churn, last changed 4 months ago, mostly maintenance |
| auth | Nascent | Created recently, single contributor, all feature commits |
```

Ask: "Do these maturity levels match your understanding? Any corrections?"

### 7c. Incorporate corrections and confirm

Apply any user corrections from 7a and 7b. If the user made changes, briefly restate the final version: "Updated architecture: [summary of changes]. Writing to `.goodplan/architecture/_overview.md`."

If no corrections, proceed directly.

### 7d. Write architecture overview

Write `.goodplan/architecture/_overview.md` directly using the Write tool. Follow the output format in `architecture-extraction.md` section 6:

- **System Summary** — 2-3 paragraphs
- **Subsystems** — one `###` section per subsystem with description and dependencies
- **Key Dependencies** — table of significant external packages
- **Deployment Model** — deployment context summary
- **Subsystem Maturity** — table with maturity level, dependents, and justification notes

Do not include a "Fitness Functions" column unless specific test infrastructure was detected that maps to subsystems.

## Step 8 — Migration Detection & Debt Analysis

Read `references/migration-detection.md` (relative to this skill's directory) for detection patterns, confidence scoring, and presentation format.

### Re-entry

Before running detection, check if quests already exist for detected items:

```bash
gp quest:list --json
```

Parse quest names and goals. If a quest already covers a detected migration or debt item (fuzzy match on keywords like "esm", "cjs", "migration", "todo", "test coverage"), note "Quest already exists: `<quest-name>`" and skip that item.

### 8a. Migration detection

Scan for in-flight migrations using the coexistence patterns in `migration-detection.md` section 1. For each detected pair:

1. **Identify coexistence**: Grep for old-pattern markers (`require(`, `module.exports`, `class.*extends Component`, callback signatures) and new-pattern markers (`import`/`export` statements, hooks, `async`/`await`).

2. **Correlate with git timeline** per section 2: When did the new pattern first appear? Is the old pattern still receiving new additions (regression) or only the new pattern? Use:

```bash
# Example for CJS→ESM: when were CJS files last added/modified?
git log --all --diff-filter=A --format='%ci %s' -- '*.cjs' '*.mjs'
git log --format='%ci %s' -10 -- '*.cjs'
```

3. **Check config-level signals** per section 3: dual `main`+`exports` in package.json, `.mts`/`.cts` extensions, `"type": "module"` with `require()` calls, mixed linter/test configs.

4. **Score confidence** per section 4: High (clear timeline + config evidence), Medium (coexistence but ambiguous timeline), Low (likely intentional variation). Only present High and Medium findings.

### 8b. Tech debt analysis

Scan for accumulated debt per `migration-detection.md` section 5:

1. **TODO/FIXME/HACK comments**: Grep case-insensitively for `TODO|FIXME|HACK|XXX|WORKAROUND` across source files. Record file, line, and comment text.

2. **Skeleton tests**: Check test files for placeholder assertions (`expect(true).toBe(true)`, `assert(true)`, empty test bodies).

3. **Long files**: Find source files over 500 lines. Exclude `.d.ts` files, generated files, and lock files.

4. **Untested source files**: Cross-reference `src/` files against test file locations (from Step 5 convention detection).

5. **Circular imports**: Reference the dependency graph from Step 6 — any bidirectional runtime edges are circular import debt.

6. **Unused dependencies**: For each dependency in package.json, Grep `src/` for import/require of that package name. Flag packages with zero matches.

### 8c. Present findings

Present findings in two categories per `migration-detection.md` section 6:

**Migrations** — each with: pattern description, old→new, timeline evidence, scope (file count), confidence level.

**Tech Debt** — each with: signal type, locations/counts, severity.

For each finding, ask the user to triage:

> "**[Finding name]** — [brief description]
> → Create side quest / Acknowledge and defer / Skip"

Collect all triage decisions before proceeding to Step 9. Items triaged as "Create side quest" will be created in Step 9. Items triaged as "Acknowledge and defer" are noted in the summary but no quest is created. Items triaged as "Skip" are dropped.

## Step 9 — Side Quest Creation

For each item the user triaged as "Create side quest" in Step 8c, create a quest via the CLI:

```bash
echo '{"name":"<kebab-case-name>","goal":"<goal-text>"}' | gp quest:create --json
```

### Quest naming

Use descriptive kebab-case names that indicate the work:

- Migrations: `migrate-cjs-to-esm`, `migrate-class-to-function-components`, `migrate-jest-to-vitest`
- Debt: `fix-todo-comments`, `add-missing-tests`, `resolve-circular-imports`, `split-long-files`

### Quest goals

Keep goals to 2-3 sentences. Reference patterns and directories rather than listing every file. Include:

- **What** to migrate/fix
- **Old → new pattern** (for migrations)
- **Estimated scope** (file count, subsystem affected)

Example goals:

- `"Complete the CJS-to-ESM migration in scripts/. Three .cjs files (seed-db, check-health, migrate-db) still use require()/module.exports while the rest of the codebase uses ESM imports. Convert to ESM and update any callers."`
- `"Replace skeleton test assertions in tests/api.test.ts and tests/db.test.ts with real test logic. Currently using placeholder expect(true).toBe(true) assertions."`
- `"Address 5 TODO/FIXME comments across src/db/ and src/api/. Implement the noted improvements or remove stale TODOs with explanations."`

### Notes

- `quest:create` creates quests in `created` status — multiple quests can be created without conflict.
- The single-active-quest constraint only applies at planning time, not creation time.
- Handle errors per `cli-interaction.md` section 10. Exit code 2 (validation error) likely means the quest name already exists — skip and note.
- After all quests are created, briefly summarize: "Created N side quests: [list names]."

## Step 10 — Expertise Profiling

Load `../_shared/references/expertise-tracking.md` for the two-layer expertise protocol. Read `references/expertise-profiling.md` (relative to this skill's directory) for profiling heuristics.

### Re-entry

Check if expertise files already exist:

```bash
# Check Layer 1
grep -c '## Expertise' ~/.claude/CLAUDE.md 2>/dev/null
```

```bash
# Check Layer 2 — derive project path
git rev-parse --show-toplevel
```

Replace slashes with dashes in the repo root path to get `<project>`. Check for existing memory files:

```bash
ls ~/.claude/projects/<project>/memory/expertise_*.md 2>/dev/null
```

If both layers already have content, ask the user: "Found existing expertise profile. Update with new observations from this onboarding, or keep the current version?" Respect their choice.

### 10a. Analyze git history

Run the authorship analysis from `expertise-profiling.md` section 1:

1. Get global commit distribution: `git shortlog -sn --no-merges`
2. Identify the current user via `git config user.name` / `git config user.email` — match against commit authors
3. For each subsystem from Step 6, compute per-subsystem authorship: `git log --format='%aN' -- '<path>/' | sort | uniq -c | sort -rn`

### 10b. Infer expertise domains

Per `expertise-profiling.md` section 2:

1. Determine primary language from the user's most-committed file types
2. Classify subsystem ownership: Owner (>50%), Contributor (10-50%), Peripheral (<10%)
3. Detect role indicators from commit message patterns (feature-heavy, fix-heavy, infra-heavy, mixed)
4. Apply recency weighting — recent commits (last 3 months) carry more weight

### 10c. PR comment analysis (when `{gh_available}`)

If `{gh_available}` is false, skip and note: "GitHub CLI not available — skipping PR analysis for expertise profiling."

If available, follow the three-tier access pattern from `expertise-profiling.md` section 3:

1. **Tier 1 — List**: `gh pr list --author <user> --limit 20 --json number,title,labels,reviews,reviewDecision`
2. **Tier 2 — View**: For up to 5 informative PRs: `gh pr view {number} --json reviews,comments,body`
3. **Tier 3 — API**: For up to 3 PRs where the user was a reviewer: `gh api repos/{owner}/{repo}/pulls/{number}/comments` — this is the ONLY way to access inline code review comments; they are NOT in Tier 1 or Tier 2 responses.

Extract domain coverage, review quality signals, convention enforcement, and architectural discussion indicators.

### 10d. Present and validate

Present the inferred expertise profile to the user per `expertise-profiling.md` section 5:

> Based on your git history and PR activity, here's what I infer about your expertise:
>
> **Strong areas**: [list]
> **Less familiar**: [list]
>
> Does this match your understanding? Any corrections?

Apply corrections in a single round.

### 10e. Write to two-layer system

Per `expertise-tracking.md`:

1. **Layer 1**: Write/update `~/.claude/CLAUDE.md` `## Expertise` section with the validated profile. If the section exists, update in place. If not, append it.
2. **Layer 2**: Derive the project path from `git rev-parse --show-toplevel` with slashes replaced by dashes. Create expertise memory files at `~/.claude/projects/<project>/memory/expertise_<domain>.md` for each significant domain, with a dated onboarding observation.

## Step 11 — Hot Spot Analysis

Compute churn×complexity to identify the highest-risk files in the codebase.

### 11a. Compute churn

```bash
git log --since='6 months ago' --format='' --name-only | sort | uniq -c | sort -rn | head -30
```

If the repo is a shallow clone (detected in Step 1), use all available history instead of the 6-month window.

### 11b. Score hot spots

For each high-churn file from 11a, compute:

```
hot_spot_score = churn_count × line_count (via wc -l)
```

Filter per `expertise-profiling.md` section 4:
- Deprioritize `.d.ts` files (LOC inflated by type declarations)
- Deprioritize generated files (`*.generated.*`, `*.g.*`, files with `// @generated` header)
- Deprioritize lockfiles, config files, and non-source files
- Include test files (high-churn tests may indicate fragile test infrastructure)

### 11c. Present top 10

Present as a ranked table:

```
| Rank | File | Churn (6mo) | LOC | Score | Subsystem |
|------|------|-------------|-----|-------|-----------|
| 1    | src/api/router.ts | 45 | 320 | 14400 | api |
| ...  |      |             |     |       |           |
```

Map each hot spot to its subsystem (from Step 6). Note which subsystems the hot spots cluster in — these are likely candidates for first slices or architectural attention.

## Step 12 — CLAUDE.md Update + Summary

Load `../_shared/references/output-templates.md` for the Variant B done summary format.

This step has two sub-activities followed by a summary and optional epic creation.

### 12a. Update repo CLAUDE.md

Write or update the repo's `CLAUDE.md` with a `## Project Context` section referencing the generated project files.

**Case 1 — No CLAUDE.md exists**: Create it with the Project Context section:

```markdown
## Project Context

Read these before doing any significant work in this repo:

- `.goodplan/idea.md` — project goal, scope, constraints
- `.goodplan/conventions.md` — tech stack, repo structure, coding style
- `.goodplan/architecture/_overview.md` — system architecture, subsystem maturity
```

**Case 2 — CLAUDE.md exists but no `## Project Context` section**: Append the section at the end with a blank line before the `## Project Context` header.

**Case 3 — `## Project Context` already exists**: Check if the three files (`.goodplan/idea.md`, `.goodplan/conventions.md`, `.goodplan/architecture/_overview.md`) already appear. Add any that are missing. Do not duplicate entries that are already present.

### 12b. End-of-run expertise check

Per `expertise-tracking.md` "All Interactive Skills" end-of-run protocol:

1. Check if the onboarding conversation revealed new expertise information beyond what was captured in Step 10 — corrections the user made, domain knowledge demonstrated during architecture interview (Step 7), migration triage decisions (Step 8), etc.
2. If yes: update `~/.claude/CLAUDE.md` `## Expertise` section and write/update the relevant memory file with a dated observation.
3. If no new information: skip silently.

### 12c. Present onboarding summary

Present a Variant B (loose checklist) done summary per `output-templates.md`. The following fields are onboard-repo-specific extensions of Variant B:

> **Onboarding complete.**
>
> **Artifacts written:**
> - `.goodplan/idea.md` — project description and goals
> - `.goodplan/conventions.md` — N conventions detected
> - `.goodplan/architecture/_overview.md` — N subsystems identified
> - `CLAUDE.md` — updated with project context
>
> **Migrations detected**: N (M quests created, K deferred)
> **Side quests created**: [list names, or "None"]
> **Expertise profile**: written to `~/.claude/CLAUDE.md` + N domain memory files
> **Hot spots**: N high-churn files identified across M subsystems
>
> **Recommended next step**: `/create-epic` to define the first development direction, or `/explore` to investigate a specific area first.

### 12d. Optional epic creation

Offer: "Would you like to create an initial epic for the first development direction?"

If the user approves, gather a name and goal, then create via:

```bash
echo '{"name":"<kebab-case-name>","goal":"<goal-text>"}' | gp epic:create --json
```

The epic goal should incorporate relevant quests from Step 9 if any were created. Handle errors per `cli-interaction.md` section 10.

Note: `epic:create` works on zero-epic projects after `gp init` — the only guards are name uniqueness and `epics/overview.json` existence (both satisfied by init).
