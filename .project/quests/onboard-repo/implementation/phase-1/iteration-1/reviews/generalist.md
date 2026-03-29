# Generalist Review: Phase 1 — Skill Skeleton + Project Init

**Score: 8/10**

## Summary

Phase 1 delivers a solid skeleton. SKILL.md has correct frontmatter, step flow 0-12, shared reference loading at the right points, re-entry handling, and good trigger/anti-trigger design. The fixture script produces a realistic repo. The test harness follows the test-migrate.ts pattern well. Two important issues and a few minor ones below.

## Critical Issues

None.

## Important Issues

### I1. Fixture script has no `--author` for matching test user

**File:** `scripts/generate-onboard-fixture.sh`

The plan requires "at least one author must match the test user's `git config user.name` so expertise profiling tests are meaningful." The fixture uses two hardcoded authors (`Alice Dev` and `Bob Eng`) — neither matches any real user's git identity. Phase 5 expertise profiling will not be able to match the test user to any commits. The fixture should either accept the current user's git identity as one of the authors, or one of the two authors should be set from `git config user.name` / `git config user.email`.

### I2. Fixture test files are under `tests/` but plan says `*.test.ts` test files (implying co-located)

**File:** `scripts/generate-onboard-fixture.sh`

The vitest config includes `tests/**/*.test.ts` and test files are placed in a top-level `tests/` directory. This is internally consistent, which is fine. However, the plan task says the fixture should have "*.test.ts test files" — this is satisfied. No actual issue here upon closer reading; the fixture correctly has both vitest.config.ts and `*.test.ts` files. Downgrading — this is not an issue.

### I2 (revised). Test harness does not clean up previous test directory

**File:** `tools/dogfood/test-onboard.ts`

The fixture script (`generate-onboard-fixture.sh`) handles cleanup (lines 10-12: `rm -rf "$OUT"`), but the test harness itself does not clean up the TEST_DIR before calling the fixture script. This is actually fine since the fixture script handles it. However, comparing to `test-migrate.ts` which explicitly cleans up at lines 43-45, the onboard test relies on the fixture script for cleanup. This is a minor style inconsistency but functionally correct.

### I2 (actual). SKILL.md Step 3 project name inference priority order is wrong

**File:** `skills/onboard-repo/SKILL.md`, line 109-112

The plan specifies priority order: (1) repo directory name, (2) package.json `name`, (3) README title. The SKILL.md implementation matches this. However, this priority order is questionable — `package.json` `name` is more authoritative than a directory name (directories get renamed, cloned to arbitrary paths). The plan explicitly defines this order though, so the implementation is plan-compliant. Not an issue for this review.

### I2 (final). Missing `.env.example` in fixture

**File:** `scripts/generate-onboard-fixture.sh`

Step 2d of SKILL.md lists `.env.example` as a config file to read if present. The fixture does not include a `.env.example` file. While not blocking, adding one (with `DATABASE_URL` and `JWT_SECRET` placeholders) would exercise more of the scanning path and produce richer idea.md output. This is minor.

### I2. Test harness `readFileSync` import is unused for empty-check pattern

**File:** `tools/dogfood/test-onboard.ts`, line 18

`readFileSync` is imported and used at line 206 to check idea.md size. This is fine. No issue.

---

Let me re-focus on actual important issues:

### I1. Fixture missing one author matching test user (IMPORTANT)

**File:** `scripts/generate-onboard-fixture.sh`, lines 433-434

Plan requirement: "at least one author must match the test user's `git config user.name`." Both authors are hardcoded strangers. Fix: read `git config user.name` and `git config user.email` at script start and use as AUTHOR_A (or a third author).

### I2. No negative test for existing `.project/` (IMPORTANT)

**File:** `tools/dogfood/test-onboard.ts`

Plan expected behavior includes: "Negative test: running the skill on a repo with existing `.project/` detects it and offers re-entry instead of crashing (exit 3 guard)." The test harness only runs the positive path. There is no test that creates a `.project/` directory in the fixture first and verifies the skill stops gracefully. This was an explicit plan deliverable.

## Minor Issues

### M1. Fixture missing `.env.example`

**File:** `scripts/generate-onboard-fixture.sh`

SKILL.md Step 2d lists `.env.example` as a scannable config file. Adding one to the fixture (e.g., `DATABASE_URL=`, `JWT_SECRET=`) would exercise more scanning paths.

### M2. `rmSync` imported but not used in test-onboard.ts

**File:** `tools/dogfood/test-onboard.ts`, line 19

`rmSync` is imported but never called. The fixture script handles cleanup, so this import is dead code.

### M3. Fixture commit count is 22, plan says "20+ commits" — satisfied but tight

**File:** `scripts/generate-onboard-fixture.sh`

The fixture generates exactly 22 commits. This satisfies "20+" but leaves little margin. Not blocking.

### M4. `date -v` syntax is macOS-only; fallback uses `date -d` (GNU)

**File:** `scripts/generate-onboard-fixture.sh`, line 445

The `commit()` helper tries macOS `date -v` first, falling back to GNU `date -d`. The fallback syntax `date -d "${days_ago} days ago"` is correct for GNU date. This cross-platform approach is good. No issue.

### M5. SKILL.md Step 1 confirm-intent asks user a question

**File:** `skills/onboard-repo/SKILL.md`, line 49

The plan says the skill "only asks the user about things that can't be inferred." The confirm-intent prompt at Step 1 is reasonable for a destructive-ish operation (creating `.project/`), but in an automated test this will be intercepted by the AskUserQuestion handler. No real issue — just noting the interaction.

## Checklist vs Plan

| Requirement | Status |
|---|---|
| SKILL.md exists with Steps 0-12 | PASS |
| Frontmatter format (name, description, requires) | PASS |
| Step 0 loads cli-interaction.md | PASS |
| Step 10 defers expertise-tracking.md | PASS |
| Step 12 defers output-templates.md | PASS |
| Re-entry handling in Steps 1, 3, 4 | PASS |
| Trigger/anti-trigger in description | PASS |
| Placeholder steps clearly marked (5-12) | PASS |
| references/repo-scanning.md covers 5 project types | PASS (Node/TS, Python, Rust, Go, Java) |
| generate-onboard-fixture.sh: 2+ authors | PASS (Alice, Bob) |
| generate-onboard-fixture.sh: 20+ commits | PASS (22) |
| generate-onboard-fixture.sh: strict tsconfig | PASS (all 4 strict flags) |
| generate-onboard-fixture.sh: vitest | PASS |
| generate-onboard-fixture.sh: clear subsystem boundaries | PASS (api, db, auth, shared) |
| generate-onboard-fixture.sh: author matching test user | FAIL |
| install-skills.sh: onboard-repo in alphabetical order | PASS (between migrate and project-status) |
| test-onboard.ts: matches test-migrate.ts pattern | PASS |
| test-onboard.ts: installs skills to project-level .claude/skills/ | PASS |
| test-onboard.ts: autonomous mode | PASS |
| test-onboard.ts: post-verification checks | PASS (.project/, idea.md, goodplan status) |
| test-onboard.ts: negative test for existing .project/ | FAIL |
| Update .project/conventions.md with onboard-repo in skills list | NOT CHECKED (plan task, not in changed files list) |
