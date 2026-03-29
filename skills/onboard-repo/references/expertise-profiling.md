# Expertise Profiling

Rules for building an initial user expertise profile from git history, PR activity, and codebase structure. Used by `/onboard-repo` Step 10 to seed the two-layer expertise tracking system.

## 1. Git Authorship Analysis

### Global commit distribution

```bash
git shortlog -sn --no-merges
```

Produces a ranked list of contributors by commit count. Identifies the primary contributors and the user's relative position.

### Identify the current user

```bash
git config user.name
git config user.email
```

Match one or both against the `git shortlog` output and `git log --format='%aN <%aE>'` entries. Users may have multiple names/emails across history — match liberally (case-insensitive, partial email domain match).

### Per-subsystem authorship

For each subsystem identified in Step 6:

```bash
git log --format='%aN' -- '<subsystem-path>/' | sort | uniq -c | sort -rn
```

This reveals which subsystems the user has the most ownership of (by commit count) and which subsystems are dominated by other contributors.

## 2. Expertise Inference

### Primary language

Determined by the language of files the user most frequently commits to. Cross-reference with the tech stack detected in Step 5.

### Subsystem ownership

For each subsystem, compute the user's commit share:
- **Owner** (>50% of commits): deep familiarity assumed
- **Contributor** (10-50%): working knowledge
- **Peripheral** (<10%): limited familiarity

### Role indicators

Classify the user's commits by type (from commit message prefixes or patterns):
- **Feature-heavy** (mostly `feat:`, `add`, `implement`): builder role
- **Fix-heavy** (mostly `fix:`, `bug`, `patch`): maintainer role
- **Infra-heavy** (mostly `chore:`, `ci:`, `build:`, `devops`): infrastructure role
- **Mixed**: generalist

### Recency weighting

Recent commits (last 3 months) carry more weight than older ones. A user who was the primary contributor 2 years ago but hasn't committed recently may have stale expertise.

## 3. PR Comment Analysis

Only available when `{gh_available}` is true. Uses a three-tier data access pattern — each tier provides different data that the others cannot.

### Tier 1 — PR List (overview)

```bash
gh pr list --author <user> --limit 20 --json number,title,labels,reviews,reviewDecision
```

Provides: PR titles (domain indicators), labels (area tags), review decisions (approval patterns), and PR numbers for deeper inspection.

**What this gives you**: breadth — which areas the user works in, how their PRs are received.

**What this does NOT give you**: review content, inline comments, or detailed discussion.

### Tier 2 — PR View (top-level detail)

For the most informative PRs from Tier 1 (up to 5):

```bash
gh pr view {number} --json reviews,comments,body
```

Provides: PR body (design context, motivation), top-level review comments (approval/request-changes messages), and general discussion comments.

**What this gives you**: the user's communication style, how they describe their changes, high-level review feedback.

**What this does NOT give you**: inline code review comments (the `reviews` and `comments` fields do NOT contain inline review comments on specific lines of code).

### Tier 3 — API (inline review comments)

For PRs where the user was a reviewer (up to 3):

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments
```

Provides: inline code review comments — comments attached to specific lines in the diff. This is the ONLY way to access inline review comments; they are NOT included in Tier 1 or Tier 2 responses.

**What this gives you**: review thoroughness, technical depth, which code areas the user reviews, convention enforcement patterns.

### Extracting expertise signals from PR data

- **Domain coverage**: PR titles and labels reveal which parts of the system the user touches
- **Review quality**: inline comments that reference architecture, performance, or security indicate deep expertise
- **Convention enforcement**: comments about naming, patterns, or style indicate familiarity with project standards
- **Architectural discussions**: PR bodies or comments discussing trade-offs, alternatives, or design decisions indicate architectural thinking

## 4. Hot Spot Analysis

Compute file-level `churn × complexity` to identify high-risk areas that are both complex and frequently changed.

### Churn (commit count, last 6 months)

```bash
git log --since='6 months ago' --format='' --name-only | sort | uniq -c | sort -rn | head -30
```

### Complexity proxy (lines of code)

For each high-churn file, count lines:

```bash
wc -l <file>
```

### Scoring

```
hot_spot_score = churn_count × line_count
```

### Filtering

- **Deprioritize** `.d.ts` files (LOC inflated by type declarations, rarely contain logic)
- **Deprioritize** generated files (`*.generated.*`, `*.g.*`, files with `// @generated` header)
- **Deprioritize** lockfiles, config files, and non-source files
- **Include** test files — high-churn tests may indicate flaky or poorly-designed test infrastructure

### Presentation

Present the top 10 hot spots as a table:

```
| Rank | File | Churn (6mo) | LOC | Score | Subsystem |
|------|------|-------------|-----|-------|-----------|
| 1    | src/api/router.ts | 45 | 320 | 14400 | api |
| ...  |      |             |     |       |           |
```

Note which subsystems the hot spots cluster in — these are likely candidates for first slices or architectural attention.

## 5. Two-Layer Expertise Protocol

Per `expertise-tracking.md`, expertise is stored in two layers:

### Layer 1 — CLAUDE.md summary

File: `~/.claude/CLAUDE.md`, section `## Expertise`

```markdown
## Expertise
- Comfortable with: TypeScript, React, Node.js
- Less familiar with: database optimization, CI/CD pipelines
- Actively learning: event-driven architecture (see memory: expertise_event-driven.md)
```

This is the at-a-glance view. Keep to ~5 bullet points max.

### Layer 2 — Auto memory files

Path: `~/.claude/projects/<project>/memory/expertise_<domain>.md`

The `<project>` path component is derived from the repo root:

```bash
git rev-parse --show-toplevel
```

Replace slashes with dashes. Example: `/Users/iwhite/Repos/myapp` becomes `-Users-iwhite-Repos-myapp`.

Each file tracks one domain with dated observations:

```markdown
# expertise_typescript.md

Tracking user expertise with TypeScript.

## Observations

- March 2026: Onboarded repo with strict TypeScript config (noUncheckedIndexedAccess, exactOptionalPropertyTypes). User showed comfort with advanced type features during architecture review.
```

### What to write during onboarding

Based on the git history and PR analysis:

1. **Identify 3-5 domain areas** the user has demonstrated expertise in (languages, frameworks, subsystem domains)
2. **Identify 1-2 areas** where the user has less history (subsystems dominated by other contributors, technologies present but not in the user's commit history)
3. **Write Layer 1**: Update `~/.claude/CLAUDE.md` `## Expertise` section
4. **Write Layer 2**: Create one memory file per significant domain area with the onboarding observation

### Validation

Present the inferred expertise profile to the user before writing:

> Based on your git history and PR activity, here's what I infer about your expertise:
>
> **Strong areas**: [list]
> **Less familiar**: [list]
>
> Does this match your understanding? Any corrections?

Apply corrections, then write to both layers.
