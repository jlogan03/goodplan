# Merged Feedback — onboard-repo Plan (Round 3)

## CRITICAL Issues

None.

---

## IMPORTANT Issues

**[IMPORTANT-1]** Test file location conflicts with existing test patterns; test harness interactive step handling is unspecified

Two related issues combined: (1) Phase 1 specifies `tests/integration/onboard-skill.test.ts` but existing integration tests run the `goodplan` binary directly — this test uses the Anthropic Claude SDK and should go in `tools/dogfood/` (alongside existing `harness.ts`) or a new `tests/skill-integration/` directory. Reference `tools/dogfood/harness.ts` as the pattern to follow. (2) Phase 1's test architecture says interactive steps (Steps 7, 8, 12) are handled by "pre-seeded approval messages" — this mechanism is unspecified. The simplest approach matching existing patterns: add a system prompt line "This is an automated test run. For all user confirmation prompts, proceed as if the user approved." The current wording leaves the implementer guessing about a critical test infrastructure decision.

Sources: holistic (test file location), software-architecture (interactive step mechanism)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2]** Phase 1 before-check is weak (carried from Round 2); missing negative test for pre-flight re-entry

Two related before-check gaps: (1) The Phase 1 before check — "Running `goodplan status --json` in the synthetic fixture repo returns error — no `.project/`" — tests a trivially true fixture precondition, not the skill. Replace with: verify that `skills/onboard-repo/SKILL.md` does not exist and the install script does not list `onboard-repo`. (2) The Expected Behavior for Phase 1 only covers the happy path. Add a negative test case: "Running the skill on a repo with existing `.project/` detects it and offers re-entry instead of crashing." This catches bugs where the skill blindly runs `goodplan init` on an already-initialized repo (exit 3).

Sources: holistic (weak before-check), agent-skill (missing negative test)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3]** CLAUDE.md placement logic in Step 12 contradicts the `/create-epic` pattern it claims to follow

Phase 5 Step 12 says "Place the section near the top, after any existing frontmatter/title (reference `/create-epic` Step 9 pattern for placement logic)." But `/create-epic` Step 9 case 2 explicitly says: "CLAUDE.md exists but no section — append the section at the end with a blank line before the header." The plan contradicts the existing pattern it claims to follow. If onboard-repo inserts near the top while create-epic appends at the end, placement becomes unpredictable. Match `/create-epic`'s exact logic: append at end for new sections, leave existing sections in place.

Source: software-architecture
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4]** Phase 2 convention heuristics lack dispatch logic for multi-language projects

The `references/convention-heuristics.md` task documents heuristics for 5 project types (TypeScript, Python, Rust, etc.) but the plan never describes the dispatch logic — how does the skill decide which language-specific heuristics to run? The reference file should include a dispatch table (e.g., "If `tsconfig.json` exists → apply TypeScript rules; if `pyproject.toml` exists → Python rules") and SKILL.md Step 5 should reference that dispatch logic. Without this, the agent will likely run all heuristics regardless of project type.

Source: agent-skill
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5]** Phase 4 quest creation uses ambiguous `echo | goodplan` syntax without referencing cli-interaction.md invocation pattern

Phase 5 Step 9 shows `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`. This is a valid shell command but the plan should reference `cli-interaction.md` section 4 (Invocation Patterns) and confirm this is the canonical pattern for Bash tool invocations. Additionally, the goal content description ("what to migrate/fix, which files, old->new pattern, estimated scope") has no size constraint — existing audit skills keep quest goals to 1-3 sentences. Add: "keep the goal to 2-3 sentences; reference patterns and directories rather than listing every file."

Sources: holistic (cli-interaction.md reference), agent-skill (goal size constraint)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-6]** Phase 1 shared references loaded at Step 0 front-loads context not needed until later steps

Step 0 loads all three references (`output-templates.md`, `cli-interaction.md`, `expertise-tracking.md`) upfront. `output-templates.md` is only needed at Step 12; `expertise-tracking.md` is only needed at Step 10. The skill already has 13 steps with 5 reference files — loading everything at the top wastes context. Load `cli-interaction.md` at Step 0, `expertise-tracking.md` at Step 10, and `output-templates.md` at Step 12. This matches how `/create-architecture` loads references on demand.

Source: agent-skill
Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

**[MINOR-1]** Phase 3 Step 6 `mkdir -p .project/architecture/` needs explicit justification in the plan

The plan uses `mkdir -p .project/architecture/` (following `/create-architecture`'s precedent), which is correct — `architecture/` is an LLM-owned content directory, not an entity directory managed by the state machine. But the plan should add an inline comment to prevent the implementer from second-guessing: "`architecture/` is an LLM-owned content directory (per cli-interaction.md section 2), so `mkdir -p` is appropriate here — the 'no mkdir' rule applies to entity directories managed by the state machine."

Source: software-architecture
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2]** Phase 2 convention detection: sampling scope for naming detection is unspecified; `.d.ts` files excluded from hot spots but not from debt heuristics

Two related file-scope precision gaps: (1) "Detect by sampling src/ files" — how many files? Specify a reasonable sample size (e.g., "up to 20 files, prioritizing files with the most git commits") to make the heuristic reproducible. (2) Phase 5 already deprioritizes `.d.ts` files for hot spot analysis; the same exclusion should apply to the Phase 4 "files over 500 lines" debt heuristic in `references/migration-detection.md` to avoid false positives.

Sources: holistic (sample size), software-architecture (`.d.ts` exclusion)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3]** Phase 5 smoke test doesn't specify which real repo to use; Phase 3 interview "3 exchanges" justification not self-contained

Two minor precision items: (1) Phase 5 smoke test says "clone a small open-source repo" — ambiguous and non-reproducible. Either name a specific repo or define selection criteria (e.g., TypeScript, 50-500 commits, 3+ contributors, has PRs on GitHub). (2) Step 7's "max of 3 exchanges" references "/create-epic Step 3's wrap-up heuristic" without inline justification. Add brief inline note: "3 exchanges: present, correct, confirm" to make it self-contained.

Sources: holistic
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4]** Overview "Core flow" narrative ordering doesn't match the authoritative step map

The Overview's "Core flow" prose puts "scaffold .project/" near the end, but the step map correctly puts init (Step 3) early. Update the core flow narrative to match the step map ordering, or remove it since the step map is the authoritative description.

Source: holistic
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5]** Project name sanitization for `goodplan init --name` is unspecified

Step 3 infers project name from directory name / package.json / README without asking the user. But `goodplan init --name` expects kebab-case names. If the directory is `MyProject` or the package.json name is `@scope/my-package`, the inferred name needs sanitization. Specify the transformation: lowercase, replace spaces/underscores with hyphens, strip scope prefixes, truncate to reasonable length.

Source: software-architecture
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6]** Phase 2 shallow-clone detection not referenced in convention heuristics git analysis

Phase 3 architecture-extraction.md references the shallow-repo flag from Step 1. Phase 2's convention heuristics (git conventions from `git log --oneline -50`) also depend on git history depth but don't mention shallow-clone awareness. Add a note that git convention detection should check the shallow-repo flag from Step 1 and degrade gracefully (skip commit message format analysis if shallow).

Source: software-architecture
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7]** Subsystem detection threshold (5+ files) too high for small projects

The heuristic "directory with 5+ files that imports from other directories = candidate subsystem" would miss small but well-structured subsystems (e.g., `src/api/` with 3 files: routes, handlers, middleware). The fixture itself has `src/api/`, `src/db/`, `src/auth/` which may not each have 5+ files. Use a lower threshold (2+ files with a clear entry point or shared imports) or use multiple signals. Document as a tunable heuristic with reasoning, not a hard threshold.

Source: agent-skill
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-8]** Phase 5 expertise profiling uses `pwd` for project path — should use `git rev-parse --show-toplevel`

The plan derives the `<project>` memory path component from `pwd` with slashes replaced by dashes. If invoked from a subdirectory, this produces a wrong path. Use `git rev-parse --show-toplevel` to get the repo root instead of `pwd`.

Source: agent-skill
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-9]** Step 12 optional epic creation invocation pattern is unspecified

Step 12 offers optional epic creation but doesn't include the `epic:create` invocation pattern or specify whether quests from Step 9 should inform the epic goal. Add the `echo '{...}' | goodplan epic:create --json` invocation to the Step 12 task, matching `/create-epic` Mode B's pattern.

Source: agent-skill
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-10]** Fixture CJS files must be placed outside tsconfig include scope (Phase 1 task should reinforce Phase 4's intent)

Phase 4 Task 1 correctly specifies CJS files "outside TS compilation." Phase 1's fixture generation script should explicitly place these files in `scripts/` or project root — not under `src/` — to avoid `verbatimModuleSyntax` errors when TypeScript processes `.js` files with `require()` syntax.

Source: typescript
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-11]** Path alias convention detection should verify active usage, not just tsconfig `paths` presence

`paths` in tsconfig may be configured but unused. Report path aliases as a convention signal only if actively used in 3+ import statements (grep for alias prefixes like `@/`).

Source: typescript
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-12]** Import graph construction should also scan for dynamic `import()` expressions

Phase 3 Task 1 covers static `import`/`export` patterns well but misses dynamic `import()` expressions (e.g., `await import('./module')`). These indicate runtime dependencies and potential code-splitting boundaries. Add a scan for `import(` patterns to the import graph heuristics.

Source: typescript
Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE (for loop exit)

All 16 issues above are DIRECTLY_ACTIONABLE (6 IMPORTANT + 12 MINOR, with some merged):

1. IMPORTANT-1: Relocate test file to `tools/dogfood/`; specify auto-approve system prompt for interactive test steps
2. IMPORTANT-2: Replace weak Phase 1 before-check; add negative test for pre-flight re-entry guard
3. IMPORTANT-3: Align CLAUDE.md placement with `/create-epic` Step 9 append-at-end logic
4. IMPORTANT-4: Add dispatch table to convention heuristics reference; reference from SKILL.md Step 5
5. IMPORTANT-5: Add cli-interaction.md section 4 reference; add goal size constraint (2-3 sentences)
6. IMPORTANT-6: Defer reference loading — `cli-interaction.md` at Step 0, others at point of use
7. MINOR-1: Add inline `mkdir` justification comment in Step 6
8. MINOR-2: Specify sample size for naming detection; add `.d.ts` exclusion to debt heuristics
9. MINOR-3: Name a specific repo for smoke test (or define selection criteria); add inline "3 exchanges: present, correct, confirm"
10. MINOR-4: Update Overview core flow narrative to match step map ordering
11. MINOR-5: Specify project name sanitization logic (kebab-case, strip scope prefix, etc.)
12. MINOR-6: Reference shallow-repo flag from Step 1 in Phase 2 git convention detection
13. MINOR-7: Lower subsystem detection threshold from 5+ to 2+ files with additional signals
14. MINOR-8: Use `git rev-parse --show-toplevel` instead of `pwd` for project memory path
15. MINOR-9: Add `epic:create` invocation to Step 12 optional epic creation task
16. MINOR-10: Reinforce in Phase 1 fixture script that CJS files go in `scripts/` or root, not `src/`
17. MINOR-11: Verify path alias active usage (3+ files) before reporting as convention
18. MINOR-12: Add dynamic `import()` scanning to import graph heuristics

---

## RESEARCH_NEEDED

None.

---

## Contradictions Resolved

**Contradiction 1: CLAUDE.md placement logic**
- holistic and agent-skill accept the plan's "near the top, after frontmatter" placement.
- software-architecture identified that this contradicts `/create-epic` Step 9's actual append-at-end behavior (case 2).
- Resolution: Trust software-architecture (domain specialist on architectural consistency). Match `/create-epic` Step 9 exactly — append at end for new sections.

**Contradiction 2: mkdir -p for .project/architecture/**
- holistic and agent-skill accept mkdir usage without comment.
- software-architecture identified the tension with cli-interaction.md section 3's "no mkdir" rule and provided the correct resolution: `architecture/` is LLM-owned content, not a state machine entity directory, so mkdir is appropriate — but should be documented.
- Resolution: Trust software-architecture. mkdir is correct but needs inline justification.

---

## Unresolved (USER_INPUT required)

None.
