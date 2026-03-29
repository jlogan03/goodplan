# Agent Skill Review — onboard-repo (Round 3)

## Issues

**[IMPORTANT]** Phase 1 SKILL.md skeleton task loads shared references at Step 0 but the plan also says "Step 1: Pre-flight checks" — loading references at Step 0 is inconsistent with existing skills

Looking at existing skills, the version check is Step 0 or Step 1, and shared references are loaded at that same step. The plan says Step 0 is "Version check (goodplan CLI). Load shared references: `../_shared/references/output-templates.md`, `../_shared/references/cli-interaction.md`, `../_shared/references/expertise-tracking.md`." This is fine structurally, but `output-templates.md` is only needed at Step 12 (done summary). Loading all three references at Step 0 front-loads context that is not needed until much later. The `/create-architecture` skill loads `cli-interaction.md` at Step 0 and other references on demand. The plan should load `cli-interaction.md` at Step 0, `expertise-tracking.md` at Step 10 (when profiling begins), and `output-templates.md` at Step 12 (when the done summary is needed). This matters because the skill already has 13 steps with 5 reference files — loading everything at the top wastes context on steps that don't need it.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 Expected Behavior verification for the test harness says "After invocation: `.project/` exists, `idea.md` is populated from README content, `goodplan status --json` succeeds" but does not verify Step 0-1 pre-flight behavior

The Expected Behavior for Phase 1 checks the happy path (init + idea.md) but skips verifying the pre-flight checks. Step 1 includes "no existing `.project/`, confirm intent, shallow clone detection." If `.project/` already exists, the skill should detect it and stop (or offer re-entry). A negative test case — running the skill on a repo that already has `.project/` — would catch failures in the re-entry guard. Without this, a bug where the skill blindly runs `goodplan init` on an already-initialized repo (exit 3) would go undetected until real usage. Add an Expected Behavior item: "Running the skill on a repo with existing `.project/` detects it and offers re-entry instead of crashing."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 convention heuristics include TypeScript-specific detection (tsconfig flags, ESM/CJS, path aliases) but the heuristics reference file covers 5 project types — the plan does not explain how the skill selects which heuristics to apply

The `references/convention-heuristics.md` task says "Document detection rules for: ... TypeScript-specific detection ... Generalization notes: Python gets pyproject.toml/mypy/ruff detection, Rust gets Cargo.toml/clippy detection." But the plan never describes the dispatch logic — how does the skill decide which language-specific heuristics to run? Does it scan for `tsconfig.json` → apply TypeScript rules, `pyproject.toml` → Python rules, etc.? Or does it run all heuristics and report only those that match? The reference file should include a dispatch table (e.g., "If file X exists, apply heuristic set Y") and the SKILL.md Step 5 should reference that dispatch logic. Without this, the agent will guess, likely running all heuristics regardless of project type.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 architecture extraction task says "Heuristic: directory with 5+ files that imports from other directories = candidate subsystem" but this threshold is too high for small projects

A project with `src/api/` containing 3 well-structured files (routes, handlers, middleware) is clearly a subsystem. The 5-file threshold would miss it. The fixture itself has `src/api/`, `src/db/`, `src/auth/` — it is unclear these will each have 5+ files based on the fixture generation script description ("src/ with 3-4 modules representing distinct subsystems"). The heuristic should use a lower threshold (e.g., 2+ files with a clear entry point or shared imports) or use multiple signals (directory has its own types/interfaces, imports from sibling directories, has dedicated tests). The reference file should document this as a tunable heuristic with the reasoning, not a hard threshold.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 Step 9 quest creation says `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json` which is correct, but the goal content is described as "what to migrate/fix, which files, old->new pattern" without a size constraint

Looking at existing quest creation in audit skills, the goal is kept to 1-3 sentences. The plan's Step 9 description says to include "what to migrate/fix, which files, old->new pattern description, estimated scope" — this could easily produce a multi-paragraph goal if the agent includes file lists for a large migration. The plan should specify "keep the goal to 2-3 sentences; reference patterns and directories rather than listing every file."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 expertise profiling derives the `<project>` path component from `pwd` with slashes replaced by dashes, but this is fragile if the user runs the skill from a subdirectory

The plan says: "The `<project>` path component is derived from the repo's absolute path (from `pwd`) with slashes replaced by dashes." If the user invokes the skill from `~/Repos/myapp/src/`, the path would be `-Users-iwhite-Repos-myapp-src` instead of `-Users-iwhite-Repos-myapp`. The skill should use `git rev-parse --show-toplevel` to get the repo root, not `pwd`. This is a minor issue because Claude Code typically runs from the project root, but the profiling reference file should document this explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan's done summary (Phase 5, Step 12) says "Present full onboarding summary using Variant B (loose checklist)" which is correct, but the plan does not specify whether to offer `goodplan quest:create` for the optional epic or `goodplan epic:create`

Step 12 says: "Offer optional epic creation: 'Would you like to create an initial epic for the first development direction?'" If the user says yes, the skill would presumably run `echo '{"name":"initial","goal":"..."}' | goodplan epic:create --json`. But the plan does not include this as a task or specify the invocation. It also does not consider whether quests created in Step 9 should inform the epic goal. Add the `epic:create` invocation pattern to the Step 12 task, matching `/create-epic` Mode B's pattern.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2's critical issue (step ordering: idea.md before init) and all important issues (test harness design, gh CLI gap documentation, stdin vs echo syntax, project name derivation, conventions.md housekeeping label, interview iteration limit) have been addressed. The plan is now well-structured with a definitive step map, proper shared reference integration, progressive disclosure, re-entry handling, and clear verification approach. The remaining issues are refinements rather than structural gaps: context-efficient reference loading, negative test cases for pre-flight, heuristic dispatch logic, and a few minor specification gaps. To reach 9+: add the pre-flight negative test, specify heuristic dispatch in convention detection, and address the reference loading order.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
