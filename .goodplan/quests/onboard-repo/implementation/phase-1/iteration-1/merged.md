# Merged Feedback — Phase 1: Skill Skeleton + Project Init

Scores: Generalist 8/10, Agent-Skill 7/10
Critical: 0 | Important: 3 | Minor: 6

---

## Important Issues

### I1. Re-entry guards in Steps 3 and 4 are unreachable dead logic [MERGED]

**File:** `skills/onboard-repo/SKILL.md`, lines 37, 148
**Raised by:** agent-skill (2 items, merged)
**Resolution:** DIRECTLY_ACTIONABLE

Step 1 unconditionally stops if `.project/` exists. This makes the re-entry guards in Steps 3 ("if `.project/` exists from a previous partial run, skip init") and 4 ("if `idea.md` exists and has content, ask the user…") unreachable. The dead code will mislead future skill maintainers and prevents crash-recovery behavior intended for later phases.

**Fix:** In Step 1, distinguish between a fully-onboarded project (has `idea.md`, `conventions.md`, architecture files) and a bare partial run (just `.project/project.json` with no markdown artifacts). Use `goodplan status --json` for structured detection. If the project is partially initialized, inform the user and continue instead of stopping. Only stop (exit 3) for a fully-onboarded project.

---

### I2. No negative test for existing `.project/` in test harness [DIRECTLY_ACTIONABLE]

**File:** `tools/dogfood/test-onboard.ts`
**Raised by:** generalist
**Resolution:** DIRECTLY_ACTIONABLE

The plan explicitly requires a negative test: run the skill on a repo with an existing `.project/` and verify it stops gracefully (exit 3 guard, no crash). The test harness only runs the positive path.

**Fix:** Add a second test case that pre-creates `.project/` in the fixture directory before invoking the skill and asserts the skill exits with code 3 (or the expected graceful-stop behavior).

---

### I3. Project name priority order inverts convention [DIRECTLY_ACTIONABLE]

**File:** `skills/onboard-repo/SKILL.md`, line 109
**Raised by:** agent-skill; noted but dismissed as plan-compliant by generalist
**Resolution:** DIRECTLY_ACTIONABLE

The current priority is: (1) repo directory name, (2) `package.json` name, (3) README title. This inverts the expected convention — directory names are the least reliable signal (often `repo`, `project`, or an arbitrary clone path). Other skills (e.g., `create-epic`) treat the package manifest name as primary, with directory name as fallback. The plan defines this order, but the plan order is wrong.

**Contradiction resolved:** generalist dismissed this as plan-compliant; agent-skill flagged it as a convention violation. Resolved in favor of agent-skill — the plan's order is the defect, not a protection. The implementation should correct it.

**Fix:** Change priority to: (1) `package.json`/manifest name, (2) README title, (3) repo directory name.

---

### I4. Fixture missing an author matching the test user [DIRECTLY_ACTIONABLE]

**File:** `scripts/generate-onboard-fixture.sh`, lines 433–434
**Raised by:** generalist (I1)
**Resolution:** DIRECTLY_ACTIONABLE

The plan requires at least one commit author to match the test user's `git config user.name` so Phase 5 expertise profiling tests are meaningful. Both authors are hardcoded strangers (`Alice Dev`, `Bob Eng`).

**Fix:** Read `git config user.name` / `git config user.email` at script start and use as one of the authors (e.g., replace `Alice Dev` with the current user's identity).

---

## Minor Issues

### M1. Fixture missing `.env.example`

**File:** `scripts/generate-onboard-fixture.sh`
**Raised by:** generalist (both M1 and inline)

SKILL.md Step 2d lists `.env.example` as a scannable config file. The fixture has no `.env.example`. Adding one with placeholder values (e.g., `DATABASE_URL=`, `JWT_SECRET=`) would exercise more of the scanning path.

---

### M2. `rmSync` imported but unused in test harness

**File:** `tools/dogfood/test-onboard.ts`, line 19
**Raised by:** generalist

`rmSync` is imported but never called (cleanup is handled by the fixture script). Dead import — remove it.

---

### M3. `|| true` on git commits silently swallows failures in fixture script

**File:** `scripts/generate-onboard-fixture.sh`, line 447
**Raised by:** agent-skill

The `commit()` helper appends `|| true`, meaning a real commit failure (e.g., missing git config) produces a fixture with missing history and confusing test output instead of a clear error.

**Fix:** Remove `|| true`; let commit failures propagate so the fixture script fails loudly.

---

### M4. Test harness uses emojis in log output

**File:** `tools/dogfood/test-onboard.ts`, line 199+
**Raised by:** agent-skill

Project guidelines say "avoid using emojis." Checkmark/cross emojis appear in verification output. Verify whether `test-migrate.ts` also uses emojis; if not, remove them from `test-onboard.ts` for consistency.

---

### M5. Skill description could be more trigger-friendly

**File:** `skills/onboard-repo/SKILL.md`, line 3
**Raised by:** agent-skill

The description is clear but could be pushier. Consider adding: "Use when joining an existing codebase, taking over a project, or wanting to understand a repo's architecture." This helps Claude trigger the skill on prompts like "help me understand this codebase" or "I just cloned this repo."

---

### M6. Fixture commit count is tight (22 commits for a "20+" requirement)

**File:** `scripts/generate-onboard-fixture.sh`
**Raised by:** generalist

Technically satisfies "20+" but leaves little margin. Low priority.

---

## Contradictions

**1 resolved:** Project name priority order — generalist treated the plan's order as authoritative; agent-skill flagged it as a convention violation against other skills. Resolved: the plan order is the defect, fix it (I3 above).

**0 unresolved.**

---

## Re-review Domains

- `skills/onboard-repo/SKILL.md` — re-entry logic (I1), project name priority (I3)
- `tools/dogfood/test-onboard.ts` — negative test coverage (I2), unused import (M2), emoji output (M4)
- `scripts/generate-onboard-fixture.sh` — author identity (I4), silent commit failures (M3), missing `.env.example` (M1)
