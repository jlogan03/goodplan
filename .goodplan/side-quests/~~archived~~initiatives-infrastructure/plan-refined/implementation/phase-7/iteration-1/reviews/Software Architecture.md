# Software Architecture Review

Phase: Stale Assumption Detection + Two-Layer Architecture
Iteration: 1

## Issues

**[IMPORTANT]** Stale assumption detection logic duplicated between create-plan and refine-plan with subtle divergence
The stale assumption detection algorithm appears in three places: `create-plan/SKILL.md` (Step 3b), `create-plan/references/guidance.md` (Stale Assumption Detection section), and `refine-plan/SKILL.md` (Step 2b). The create-plan SKILL.md and guidance.md versions are nearly identical (good — guidance.md is a compressed reference). However, the refine-plan version diverges in output format: it produces a warning string for the codebase context summary rather than an interactive prompt. This is an intentional behavioral difference (create-plan is interactive, refine-plan feeds into automated reviewers), but the core detection algorithm (git log comparison, stat fallback, scaffold skip) is duplicated across files with no shared reference. If the detection logic needs updating (e.g., a new skip condition), three files must change in sync. Consider extracting the detection algorithm into a shared reference under `_shared/references/` (e.g., `stale-detection.md`) and having each skill reference it with their own output/action section.
File: ~/.claude/skills/create-plan/SKILL.md:51
File: ~/.claude/skills/create-plan/references/guidance.md:51
File: ~/.claude/skills/refine-plan/SKILL.md:95
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Two-layer architecture logic in refine-plan shared preamble is disconnected from reviewer prompt context
The `refine-plan/references/shared-preamble.md` (line 45) tells reviewers: "If `initiatives/__active__*/architecture/` exists, read it alongside top-level architecture. The active initiative's architecture represents the target state — flag any conflicts." This is good. However, the refine-plan SKILL.md Step 2b also performs its own initiative architecture awareness check and writes findings to the codebase context summary. There is a risk of redundant or conflicting signals: the orchestrator warns in the codebase context file, AND the shared preamble tells each reviewer to independently discover and check initiative architecture. If the codebase context summary already flags initiative conflicts, reviewers doing their own check may produce duplicate findings or contradictory assessments. Clarify the division of labor: either the orchestrator detects and summarizes initiative conflicts (and reviewers trust that summary), or reviewers independently discover initiative architecture (and the orchestrator skips the check). Currently both happen.
File: ~/.claude/skills/refine-plan/references/shared-preamble.md:45
File: ~/.claude/skills/refine-plan/SKILL.md:115
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Create-plan two-layer architecture loading order could be clearer for initiative slices
In `create-plan/SKILL.md` Step 3 item 4, the instruction says: "If planning an initiative slice, load the initiative's own `architecture/` as the primary architecture context (the target state), and `.project/architecture/` as secondary (current reality)." This is correct per `initiative-conventions.md`, but it interacts with item 3 which says "Read all `.md` files in `.project/architecture/`". For initiative slices, item 3 loads top-level architecture as if it were primary, then item 4 reframes it as secondary. The loading order would be clearer if item 3 were conditioned: "Read architecture files per item 4's layer rules" or if items 3 and 4 were merged into a single "Load architecture" step that handles both cases.
File: ~/.claude/skills/create-plan/SKILL.md:43
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Scaffold detection relies on a marker comment with no enforcement
The stale detection logic skips scaffold files detected by `<!-- scaffold -->` in `_overview.md`. This marker is referenced in create-plan and refine-plan but there is no corresponding guidance in `/define-architecture` or `/create-initiative` that says "write `<!-- scaffold -->` into scaffold overview files." If the marker is never written, the skip condition is dead code. If it IS written somewhere, I did not find it in the changed files or the initiative-conventions reference.
File: ~/.claude/skills/create-plan/SKILL.md:72
Resolution: CODEBASE_EXPLORATION

**[MINOR]** `stat -f %m` vs `stat -c %Y` platform branching is shell-level complexity exposed to the skill agent
Both create-plan and refine-plan instruct the executing agent to use `stat -f %m` (macOS) or `stat -c %Y` (Linux) as a fallback. This platform detection burden falls on the LLM agent at runtime. Since the team defaults indicate macOS usage (Darwin 25.3.0), this could be simplified to just `stat -f %m` with a comment noting Linux alternative, or better, use `git log` with `--diff-filter=A` to find the file's first appearance, which works cross-platform.
File: ~/.claude/skills/create-plan/SKILL.md:68
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The two new features (stale assumption detection and two-layer architecture awareness) are architecturally sound in concept and align well with the initiative-conventions.md design. The dependency direction is correct: both skills read from the shared `initiative-conventions.md` reference for the two-layer model. However, the detection algorithm is duplicated across three locations with no shared extraction, and the refine-plan path has a redundant initiative-check between the orchestrator and the reviewer preamble. Addressing the two IMPORTANT issues (extract shared detection logic, clarify orchestrator vs reviewer responsibility for initiative conflict detection) would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
