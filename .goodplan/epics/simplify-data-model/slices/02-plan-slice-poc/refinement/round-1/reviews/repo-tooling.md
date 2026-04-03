# Repo, Tooling, & Docs Review — Plan-Slice PoC

## Issues

**[IMPORTANT] Plan proposes new shared reference files that duplicate/overlap existing reviewer content**
Phase 1 proposes creating `skills/_shared/references/review-preamble.md`, `review-holistic.md`, `review-software-architecture.md`, and `review-agent-skill.md`. However, this directory already contains `reviewers-cross-cutting.md` (which has the holistic, software-architecture, and agent-skill reviewer prompts in sections), `reviewers-always.md`, `reviewers-ai-tooling.md`, and a `shared-preamble.md` in the refine-plan references. The plan should clarify whether the new files replace or supplement these existing files. If the intent is to extract per-reviewer content from the monolithic `reviewers-cross-cutting.md` into individual files for `@` reference injection into agents, the plan should include a task to either deprecate/remove the old monolithic files or document why both coexist. Without this, the repo will have two parallel sets of reviewer content that can drift.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `plan-format.md` extraction task is ambiguous about source and destination**
Phase 1 task says "Extract plan format conventions from existing `skills/create-plan/references/plan-format.md` into `skills/_shared/references/plan-format.md`". The source file exists at `skills/create-plan/references/plan-format.md` (confirmed). However, the plan does not specify whether the original file should be replaced with a symlink, deleted, or kept alongside the new shared copy. The existing `create-plan` skill and the installed `refine-plan` skill both reference `plan-format.md` — if the original is moved but installed skills still point to the old path, it will break until reinstalled. The plan should specify: (a) copy-and-redirect or (b) move-and-update-references, and what happens to the original file.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 build-plugin.sh agent validation uses different severity names than skill validation**
Phase 1 tasks list severity levels as "CRITICAL, IMPORTANT, SUGGESTION, NITPICK" in the review-preamble.md task. However, the existing `shared-preamble.md` used by refine-plan (the file being read right now for this very review) uses "CRITICAL, IMPORTANT, MINOR" as severity levels. The plan should use the existing severity levels to stay consistent with the refine-plan infrastructure. If the intent is to change severity levels, that is a cross-cutting decision that should be documented.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 Expected Behavior references `cat dist/gp-plugin/.claude-plugin/plugin.json | grep agents`**
The verification step uses `cat | grep` which is a UUOC (useless use of cat). More importantly, the Expected Behavior should specify what the grep output looks like — just `"agents": "./agents"` or the full line. This is a minor clarity issue since the intent is clear, but verification steps should be copy-pasteable.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 does not specify where `"agents"` goes in the plugin.json manifest relative to existing fields**
The manifest template in `build-plugin.sh` (lines 31-41) currently has `name`, `version`, `description`, `author`, `skills`. The plan says to add `"agents": "./agents"` but does not specify position. For deterministic output and consistent diffing, placement should be explicit (e.g., after `"skills"`).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 `verifyEntityStatus` signature mismatch with plan**
The plan says `verifyEntityStatus(gpBin, "slice", sliceName, "plan-refined")` but the actual function signature in `utils.ts` is `verifyEntityStatus(type, name, expected, opts?)` — it does not take `gpBin` as the first positional argument. The gpBin goes in the `opts` object. The plan's verification call should be `verifyEntityStatus("slice", sliceName, "plan-refined", { gpBin })`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 references `createMinimalFixture()` extension but does not mention backward compatibility verification**
The plan says "all new params optional with sensible defaults" and "backward compatible with existing callers." However, there is no verification task to run existing tests (`test-plugin-skills.ts`, `test-onboard.ts`, `test-migrate.ts`, `validate.ts`) after modifying `createMinimalFixture()` to confirm nothing breaks. A verification step should be added.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 proposes `model: opus` in agent frontmatter — unclear if this is a recognized field**
The Expected Behavior says each agent has `model: opus` in frontmatter. The build-plugin.sh validation (Phase 2) only checks for `name:` and `description:`. If `model:` is informational only, that is fine, but the plan should clarify whether Claude Code's agent spawning respects this field or if it is advisory/documentation-only.
Resolution: CODEBASE_EXPLORATION

## Score: 7/10

The plan is well-structured and aligns with the confirmed goal. The phase ordering is logical (shared references -> build pipeline -> orchestrator skill -> test harness), and the plan correctly builds on existing patterns (build-plugin.sh validation, dogfood utils, shared references). However, there are two IMPORTANT issues around content duplication/migration strategy for reviewer files and the plan-format extraction that could cause drift or breakage if not clarified before implementation. The verification approach is strong — Expected Behavior sections with before/after checks and a dedicated test harness phase are solid. To reach 9+: resolve the reviewer content duplication strategy (new files vs restructured existing files), clarify the plan-format extraction lifecycle, and fix the `verifyEntityStatus` signature mismatch.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
