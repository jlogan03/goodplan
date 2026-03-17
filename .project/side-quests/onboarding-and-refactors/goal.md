# Side Quest: Onboarding & Refactor Intelligence

## What We're Building

Two related capabilities: (1) getting pre-existing repos set up in the goodplan workflow — both repos that have never used it and repos that used an earlier version, and (2) making `/complete-slice` smarter about identifying and proposing specific refactors as side quests instead of generically asking "do you want a cleanup pass?"

## Dependencies

- **decisions-and-expertise** side quest must be complete (for decisions/ convention and expertise tracking)

## What Changes

### Updated or New Skill: Repo Onboarding

The current `/start-project` only handles new projects — it creates `.project/` from scratch and captures an idea through conversation. It explicitly warns users away if `.project/` already exists. We need to handle two additional scenarios:

#### Scenario A: Existing repo, never used this workflow

The repo has code, maybe a README, maybe existing docs, but no `.project/` directory. This is the most complex onboarding scenario — the skill needs to build a rich, accurate picture of a codebase that may be years old, with accumulated history, conventions, debt, and context that lives in people's heads rather than in docs.

##### Core onboarding flow

1. **Understand what already exists** — read README, scan repo structure, check for existing documentation, look at git history to understand the project's purpose and state
2. **Collect what's needed** — through conversation, fill in gaps that can't be inferred: project goals, constraints, who's working on it, what phase the project is in (early? mature? maintenance?)
3. **Generate `.project/` structure** — write `idea.md` from what was learned (not a blank template), create `state.md` pointing to the right phase, initialize `flow-log.jsonl`
4. **Optionally scaffold architecture/** — if the repo has enough structure, offer to infer and draft architecture files from the existing code rather than starting the define-architecture flow from scratch
5. **Optionally scaffold vertical-slices/** — if there's a clear roadmap or TODO list, offer to convert it into slice goal files

The key insight: for an existing repo, most of the information already exists — in the code, the README, the git history, existing docs. The skill should extract and organize rather than ask the user to re-explain everything from scratch.

##### Detecting existing conventions

Every repo develops conventions over time, even if they're never written down. The onboarding skill should detect and document them rather than imposing new ones:

1. **Naming conventions** — file naming (kebab-case? camelCase? PascalCase?), directory naming, module/package naming. Check if it's consistent or mixed (mixed = potential debt item).
2. **File and directory structure patterns** — how are modules organized? By feature? By layer (controllers/services/models)? Hybrid? Is there a pattern for where tests live (co-located? separate `__tests__/` dirs? top-level `tests/`)?
3. **Code patterns** — error handling approach (Result types? exceptions? error codes?), dependency injection style, how config is loaded, logging patterns, how async work is handled.
4. **Testing patterns** — unit vs integration vs e2e mix, mocking strategy, fixture patterns, which testing framework(s), assertion style.
5. **Git conventions** — commit message style (conventional commits? free-form?), branching strategy (visible from branch names and merge patterns), PR size norms (visible from merge commit history).

These go directly into `conventions.md` — not as aspirational rules but as "this is how this repo actually works." Where conventions are inconsistent, note both patterns and which is dominant. The user can then decide during architecture definition whether to codify the dominant pattern or shift toward something better.

##### Stale documentation detection

Old repos accumulate docs that no longer match the code. This is worse than no docs — it actively misleads. The skill should:

1. **Cross-reference docs against code** — does the README describe a setup process that still works? Do API docs match actual endpoints? Do architecture diagrams match the module structure?
2. **Check doc freshness** — git blame on doc files vs the code they describe. If the code changed 6 months ago but the docs haven't been touched in 2 years, they're likely stale.
3. **Flag specific discrepancies** — not just "docs are stale" but "README says to run `npm start` but package.json has no `start` script; the actual command appears to be `npm run dev`."
4. **Triage** — some stale docs should be updated (README, setup guides, API docs). Others should be deleted (design docs for features that were never built, or built differently). Present both options.

##### Hot spot and risk analysis

Not all parts of a codebase are equal. The skill should identify where attention is most needed:

1. **Churn analysis** — files that change most frequently (high git commit count over the last N months). High churn = active development area, worth understanding well for architecture.
2. **Churn × complexity** — files that change often AND are complex (large, many dependencies, deep nesting) are the highest-risk areas. These are where bugs are most likely to be introduced.
3. **Recent activity clustering** — what parts of the codebase have been most active recently? This reveals where the team's current focus is, which informs what slices should come first.
4. **Ownership patterns** — git blame can reveal if certain modules are primarily touched by one person (bus factor risk) or if the whole team works across everything.
5. **Bug fix frequency** — commits with "fix", "bug", "patch" in their messages, correlated with files/modules. Modules with high bug-fix rates may need structural attention.

This analysis doesn't just inform the architecture — it directly shapes slice prioritization. High-risk, high-churn areas should get attention early, not last.

##### Domain model extraction

For repos with significant business logic, the skill should attempt to extract the domain model:

1. **Entity identification** — scan for data models, database schemas, API response types, protobuf/GraphQL schemas. These reveal the core entities the system works with.
2. **Relationship mapping** — how do entities relate? Foreign keys, nested types, join tables, graph edges. This is the skeleton of the domain.
3. **Business rule detection** — validation logic, state machines, permission checks, calculation functions. These are the rules the system enforces, often scattered across files.
4. **Terminology glossary** — the same concept often has different names in different parts of the codebase (e.g., "user" vs "account" vs "member"). Detecting and documenting these aliases prevents confusion in architecture and planning.

The domain model goes into architecture files and directly informs how slices are scoped — good slices align with domain boundaries.

##### Deployment and runtime context

Understanding how the system runs is essential for architecture and verification:

1. **Environment detection** — Docker/docker-compose files, Kubernetes manifests, serverless configs, Procfiles. What infrastructure does this run on?
2. **Service topology** — is this a monolith? Microservices? Monorepo with multiple deployable units? What talks to what?
3. **External dependencies** — databases, message queues, third-party APIs, cloud services. Detectable from config files, environment variable references, client library imports.
4. **Local dev setup** — what does a developer need to do to run this locally? Can we detect it from Makefiles, docker-compose, scripts/ directory, CONTRIBUTING.md? If the setup is complex or undocumented, that's both a debt item and context for how verification works during implementation.

This context is critical because architecture files need to describe not just the code structure but how it runs, and implementation verification needs to know how to actually exercise the system.

##### Prioritization context

The user is onboarding this repo for a reason. The skill should explicitly ask:

1. **Why now?** — what triggered adopting this workflow? A new feature? A rewrite? Scaling problems? Team growth? The answer shapes everything — a team adopting this to build a new feature needs different slices than one trying to tame a legacy codebase.
2. **What's most painful?** — where does the team lose the most time? Slow builds? Flaky tests? Difficult deployments? Hard-to-understand code? This identifies the highest-value side quests.
3. **What's the timeline?** — is there a deadline driving this? An upcoming release? A compliance requirement? This affects slice ordering — deadline-driven work goes first.
4. **What's off-limits?** — are there parts of the codebase that shouldn't be touched? Stable modules that work fine? Areas owned by another team? Frozen code waiting for a legal review? These are constraints for architecture and slicing.

#### Detecting In-Flight Migrations

Real repos often have multiple overlapping half-complete migrations happening simultaneously — one auth pattern being replaced by another, an API style shift that's 60% done, a state management migration that stalled, a directory restructure that only happened in some modules. These coexist and interact in messy ways. The onboarding skill needs to untangle them so the user can confirm what's intentional and capture the remaining work.

**Detection approach** — this requires serious codebase analysis, not surface-level scanning:

1. **Pattern coexistence analysis** — identify cases where two or more patterns serve the same purpose across the codebase (e.g., two auth approaches, two state management libs, two API styles, old and new directory structures, two testing frameworks, two build configs). Look at imports, file naming conventions, module structure, API shapes, configuration files.
2. **Git timeline correlation** — for each pair of coexisting patterns, use git blame and git log to build a timeline: when did each pattern first appear? Is one pattern exclusively in newer commits? Are there commits that explicitly replace pattern A with pattern B in specific files? Are there PRs or commit messages that mention "migrate", "upgrade", "replace", "deprecate"? This is the key signal — if pattern B only appears in commits from the last 3 months and those commits also remove pattern A from the same files, that's a migration in progress.
3. **Untangle overlapping migrations** — a single file might be touched by multiple migrations (e.g., moved to a new directory structure AND converted from JS to TS AND switched from one API client to another). The skill needs to separate these into distinct migration threads, each with its own old→new pattern pair. Some migrations may depend on others (can't finish the API migration until the auth migration is done).
4. **Migration direction inference** — for each detected migration, determine which pattern is the target (newer, being adopted) vs which is the legacy (older, being replaced). Heuristics: recency of commits, relative file counts, whether newer code exclusively uses the new pattern, commit message language, whether the old pattern appears in any recent new files (if not, it's legacy).
5. **Present findings for user confirmation** — this is a conversation, not an automated process. Present each detected migration: "I see what looks like N in-flight migrations: [list with evidence]. For each one: is this an intentional migration? Is [pattern B] the target? Is it stalled or actively progressing?" The user may clarify that some "migrations" are actually intentional coexistence, or that a migration was abandoned, or that the direction is the opposite of what git history suggests.
6. **Pre-create migration side quests** — for each confirmed migration, draft a side quest `goal.md` describing: what's migrating (old pattern → new pattern), evidence (which files are old vs new), estimated remaining scope (files/modules still on the old pattern), dependencies on other migrations, and suggested approach. These go into `.project/side-quests/` so they're tracked and can be planned/implemented through the normal workflow.
7. **Architecture represents the target** — when drafting architecture files, ensure they describe the intended target state (what the repo is migrating toward), not the current legacy state. For each in-flight migration, note explicitly: "This repo is mid-migration from X to Y. Architecture describes Y. See side quest `complete-X-to-Y-migration` for remaining work." This ensures that all downstream work (slices, plans, implementation) builds toward the target, not the legacy.

This prevents the common failure mode where onboarding captures a snapshot of the current messy state as if it were intentional architecture, when in reality much of it is legacy the team is actively moving away from.

#### Scenario B: Repo used an earlier version of this workflow

The repo has a `.project/` directory but it's missing files or conventions from the current workflow version. Examples:
- Missing `decisions/` convention (pre-decisions-and-expertise)
- Missing expertise tracking
- `state.md` in an old format
- Skills reference old paths (e.g., per-skill `formats.md` instead of `_shared/`)
- Missing `_shared/references/` files that new skills expect

The skill needs to:

1. **Detect the workflow version** — check which files/conventions exist vs expected
2. **Present a gap analysis** — "Your project was set up with workflow v1. Here's what's different in the current version: [list]"
3. **Migrate incrementally** — don't force everything at once. For each gap, explain what it enables and let the user choose whether to add it now
4. **Preserve existing work** — never overwrite or lose existing artifacts. Migration is additive.

#### Detecting Technical Debt Beyond Migrations

In-flight migrations are one category of technical debt, but there are others that the onboarding skill should surface. The same deep codebase analysis that finds migrations can also find:

1. **Dead code and unused dependencies** — modules that nothing imports, exported functions with zero call sites, dependencies in package.json/Cargo.toml/pyproject.toml that aren't imported anywhere. Git log can distinguish "newly added, not yet wired up" from "was used, callers were removed."
2. **Inconsistent error handling** — some modules use structured error types, others use string throws, others swallow errors silently. If the codebase has a dominant pattern, the outliers are debt.
3. **Test coverage gaps** — not just "low coverage" but structural gaps: entire modules with zero tests, critical paths (auth, payments, data mutations) without integration tests, test files that exist but are all skipped/disabled.
4. **Configuration drift** — multiple config files that should agree but don't (e.g., TypeScript strict mode enabled in some tsconfigs but not others, inconsistent lint rules across packages in a monorepo, environment-specific configs that have diverged from the template).
5. **Dependency staleness and security** — major version bumps available, dependencies with known vulnerabilities, pinned versions that are multiple majors behind, deprecated packages still in use.
6. **Structural inconsistencies** — some modules follow the project's conventions (naming, directory structure, export patterns) while others don't. Often indicates code written before conventions were established, or by different teams/contributors.
7. **TODO/FIXME/HACK archaeology** — scan for these markers, cross-reference with git blame to determine age. A FIXME from 2 years ago is different from one added last week. Old ones are likely forgotten debt; present the highest-impact ones.
8. **Coupling and boundary violations** — modules importing from deep inside other modules' internals rather than through public APIs, circular dependencies, god modules that everything depends on.

**Actionable side quest proposals** — some debt categories are substantial enough to warrant their own side quests with specific, scoped goals:

- **Dependency update side quest** — when dependencies are significantly out of date, propose a side quest to bring them current. Not a blanket `npm update` — the quest should group updates by risk: (1) patch/minor updates that are low-risk and can be batched, (2) major version bumps that may have breaking changes and need individual attention, (3) deprecated packages that need replacement with alternatives. For each group, the quest goal should specify which packages, what the target versions are, and what breaking changes to watch for. Security-vulnerable dependencies get flagged as high priority.
- **Test improvement side quest** — when testing has clear gaps, propose a quest scoped to the most impactful improvements. This isn't "write more tests" — it's specific: (1) which modules have zero coverage and handle critical paths (auth, data mutations, payments), (2) whether the test strategy is sound (e.g., heavy unit test reliance but no integration tests, meaning the system's pieces work individually but have never been verified together), (3) whether existing tests are actually useful (tests that never fail, tests that test implementation details instead of behavior, tests with no meaningful assertions), (4) flaky tests that erode confidence and slow CI. The quest should prioritize by risk — untested critical paths first, flaky tests second, coverage expansion third.

**Presentation**: Group all findings by category and severity. For each finding, include evidence (specific files, patterns, git dates). Let the user triage: "These are the categories of tech debt I found. Which ones matter to you? I'll create side quests for the ones you want to address." Some debt is intentional or low-priority — the user decides, the agent provides the analysis.

#### Skill Design Decision

This could be:
- **Option A**: Enhance `/start-project` with branching paths (new / onboard existing / upgrade)
- **Option B**: A separate `/onboard-project` skill that handles scenarios A and B, leaving `/start-project` focused on new projects
- **Option C**: `/start-project` handles new + onboard-existing, separate `/upgrade-project` handles version migration

This decision should be made during planning based on how much complexity each path adds and whether the skill stays under the ~15KB size limit.

### Updated Skill: `/complete-slice` — Refactor Intelligence

Replace the current Step 9 ("Do you want a cleanup/refactor pass?") with proactive refactor identification:

1. **Analyze what was built** — look at the implementation artifacts, review feedback, and the codebase changes from this slice
2. **Identify specific refactoring opportunities** — not "do you want to clean up?" but "here are concrete things that would improve the codebase":
   - Code that was duplicated across this slice and prior work
   - Patterns that diverged from conventions established earlier
   - Abstractions that are now warranted (the "rule of three" — if we've done it three times, abstract it)
   - Performance or maintainability improvements that weren't in scope but are now visible
   - Tech debt identified during implementation reviews that was deferred
3. **For each identified refactor**, present:
   - What: specific files/patterns affected
   - Why: what improvement it delivers
   - Scope: small (inline fix, do it now) vs medium (side quest with a plan)
   - Risk: low/medium/high
4. **Propose side quests** for medium+ refactors — draft a `goal.md` if the user approves
5. **Skip silently if nothing found** — don't ask "do you want a cleanup pass?" when there's nothing to clean up

The key change: the agent does the analysis work, not the user. Instead of "want to clean up?" it's "I found 3 things worth addressing: [specific proposals]."

## Success Criteria

- Run the onboarding flow on a repo with existing code but no `.project/` — verify it extracts project info from existing artifacts and generates a useful `.project/` structure without making the user repeat information that's already in the repo
- Run the onboarding flow on a repo with an in-flight migration (e.g., two auth patterns, old and new) — verify it detects the migration, correctly identifies which pattern is the target via git history, drafts architecture describing the target state, and pre-creates a side quest to finish the migration
- Run the onboarding flow on a large, old repo — verify conventions.md reflects how the repo actually works (not aspirational), stale docs are flagged with specifics, hot spots are identified and inform slice ordering, and the domain model is extracted into architecture files
- Run the upgrade flow on a repo with old-version `.project/` — verify it detects gaps, presents them clearly, and migrates without losing existing work
- Run `/complete-slice` after implementing a slice — verify it identifies specific refactors (if any) rather than asking a generic question, and proposes side quests for larger items

## Verification

- [ ] Onboarding: `.project/idea.md` populated from existing repo artifacts (README, code, git history)
- [ ] Onboarding: User only asked about information that couldn't be inferred
- [ ] Onboarding: In-flight migrations detected via pattern coexistence + git timeline
- [ ] Onboarding: Migration side quests pre-created with old→new pattern, remaining scope, and approach
- [ ] Onboarding: Architecture files describe target state, not legacy state, with explicit migration notes
- [ ] Onboarding: Technical debt detected and categorized (dead code, inconsistent patterns, config drift, etc.)
- [ ] Onboarding: User triages debt findings; approved items become side quests with goal.md
- [ ] Onboarding: Dependency update side quest groups by risk (patch/minor batch, major individual, deprecated replacements) with specific packages and target versions
- [ ] Onboarding: Test improvement side quest identifies untested critical paths, strategy gaps (e.g., no integration tests), useless tests, and flaky tests — prioritized by risk
- [ ] Onboarding: Existing conventions detected from code (not imposed) and written to conventions.md
- [ ] Onboarding: Stale docs flagged with specific discrepancies (not just "docs are old")
- [ ] Onboarding: Hot spots identified (high churn × complexity) and inform slice prioritization
- [ ] Onboarding: Domain model extracted from schemas/types/models and captured in architecture files
- [ ] Onboarding: Deployment/runtime context detected and documented
- [ ] Onboarding: User asked about motivation, pain points, timeline, and constraints — answers shape slice ordering
- [ ] Upgrade: Gap analysis correctly identifies missing conventions
- [ ] Upgrade: Migration is additive — no existing artifacts overwritten
- [ ] Complete-slice: Step 9 identifies concrete refactors with specific files/patterns
- [ ] Complete-slice: Medium+ refactors proposed as side quests with drafted goal.md
- [ ] Complete-slice: Skips silently when no refactors identified

## Scope Boundaries

**In scope**: Repo onboarding (new-to-workflow), workflow version upgrade/migration, complete-slice refactor intelligence

**Out of scope**: Changes to the workflow itself (that's workflow-v2 quest), new skills like refine-architecture (that's architecture-quality quest), changes to how slices are defined (that's slice-quality-and-health quest)
