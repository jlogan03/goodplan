# Agent Skill Review: audit-docs-and-tests

## Issues

**[CRITICAL]** Plan omits standard skill lifecycle steps present in audit-architecture
The audit-architecture pattern includes Step 0 (Version Check), Step 1 (Load Context with decisions, learnings, expertise, resume detection, maturity conventions), a Graceful Stop step with partial-report markers, a project-health refresh step, and an Expertise Check step. The plan for both `/audit-docs` and `/audit-tests` only mentions Step 0 (Version Check) and then jumps straight into domain-specific steps. These are not optional flourishes — they are structural conventions that all audit skills must follow for consistency and operational correctness (resume from partial, expertise calibration, project health updates).

Specifically missing from both skills:
- **Step 1 — Load Context**: Load decisions, learnings (`goodplan learning:list --json`), conventions, activity-log, expertise check (from `~/.claude/CLAUDE.md`), resume detection (check for partial audit reports in `.project/audits/`)
- **Graceful Stop step**: Partial report with `<!-- partial — interrupted` markers at each step boundary
- **Write Audit Report step**: Write findings to `.project/audits/docs-<date>.md` or `.project/audits/tests-<date>.md`
- **Project Health Refresh step**: Update `.project/project-health.md` with audit findings
- **Expertise Check step**: Final step to update user expertise if new info observed

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Missing install script registration
The plan tasks include "Test on this repo" with `bun run install:skills` but never mention adding `audit-docs` and `audit-tests` to the `SKILL_DIRS` array in `scripts/install-skills.sh`. Without this, `bun run install:skills` will not copy the new skills to `~/.claude/skills/`. The confirmed goal explicitly states "Done means both skills installed via `bun run install:skills`." The plan needs an explicit task for updating the install script.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Side quest creation mechanism inconsistency
The plan says `/audit-docs` proposes side quests via `goodplan quest:create` (Step 4, large-scope items) and `/audit-tests` uses `goodplan quest:create` (Step 5). However, the existing `audit-architecture` skill uses a different mechanism: writing directly to `.project/side-quests/<name>/goal.md` via `mkdir -p` and file writes. The research file notes this discrepancy ("The audit-architecture skill also writes side quest goal files to `.project/side-quests/<name>/goal.md` — but this appears to be a pre-CLI convention"). The plan should be explicit about which mechanism to use and consistent with it. Since the confirmed goal says "no CLI code changes," the approach should align with what the installed CLI supports. Verify `quest:create` accepts piped JSON input as shown in the research file, and if so, use that consistently. If `quest:create` is the correct approach, the plan should note that this intentionally diverges from audit-architecture's pattern and explain why.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** Sub-agent prompts not self-contained per established pattern
The audit-architecture pattern stores sub-agent prompts in `references/sub-agent-prompts.md` as fully self-contained templates with `{placeholders}`. The prompts include explicit rules like "Do NOT read SKILL.md or other skill reference files. This prompt contains everything you need." The plan mentions creating `references/reviewer-prompts.md` for both skills but does not specify that prompts must be self-contained. For `/audit-docs` (3 reviewers) and `/audit-tests` (4 reviewers), each sub-agent prompt needs to include: its assignment scope, what tools to use, what output format to produce, and explicit instructions not to read parent skill files. The plan should specify this self-containment requirement and define the output format for each reviewer.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No model specification for sub-agents
The audit-architecture skill explicitly specifies `model: "opus"` for sub-agents. The plan for both `/audit-docs` and `/audit-tests` says "spawn parallel sub-agent reviewers" but never specifies which model to use. This is a required parameter for the Agent tool's `model` field. Add explicit model specification to both skills' sub-agent spawning steps.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `/audit-docs` auto-fix without user confirmation contradicts audit pattern
The plan says `/audit-docs` will "auto-fix, present summary after" for trivial issues (typos, dead links, stale references). The existing audit-architecture pattern uses `AskUserQuestion` before acting on findings and explicitly states "User confirmation via `AskUserQuestion` before acting on findings." Auto-fixing documentation without confirmation — even for "trivial" issues — breaks the audit pattern's conservative approach. A typo fix in a code example could change semantics. The plan should require confirmation before applying any changes, or at minimum present a diff preview and use `AskUserQuestion` to get batch approval ("Apply these N trivial fixes?").

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Verification approach uses grep file-existence checks instead of end-to-end skill invocation
The Expected Behavior sections for both phases use `ls` and `grep` to verify file existence and content patterns. Per evaluation criterion 8 (Verification approach appropriateness), skill phases should invoke the skill and verify behavior end-to-end. The "Test on this repo" task is in the right direction but is a task, not a verification criterion. The Expected Behavior should include:
- Invoke `/audit-docs` (or `/audit-tests`) on the goodplan repo
- Verify it discovers documentation sources (or test files)
- Verify sub-agent reviewers produce structured findings
- Verify the summary report is presented
- Verify the audit report is written to `.project/audits/`

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Reference file `doc-discovery-patterns.md` scope may be too broad
The plan proposes `doc-discovery-patterns.md` with "glob patterns and heuristics for finding documentation sources across different project types (TypeScript, Python, Rust, etc.)." This is a good idea for a generic skill, but the first implementation only needs to work on the goodplan repo (TypeScript). Over-engineering the discovery patterns for multiple languages in the first pass adds complexity without verification. Consider starting with TypeScript-focused patterns and noting extensibility as a future enhancement.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No mention of `references/guidance.md` for severity levels and side quest format
The audit-architecture pattern has a `references/guidance.md` that defines severity levels (CRITICAL/IMPORTANT/MINOR/INFO) and side quest proposal format. The plan only mentions `reviewer-prompts.md` and `doc-discovery-patterns.md` (or `test-patterns.md`) as reference files. Both new skills should either reference the shared severity definitions or include their own `guidance.md` with domain-appropriate severity definitions and output formats. Without this, reviewers will use inconsistent severity scales.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Description field in frontmatter not specified in plan
The plan says "Add trigger patterns to SKILL.md frontmatter" but doesn't draft the actual `description` field content. Per evaluation criterion 1, the description is the primary trigger mechanism and must include both what the skill does AND when to use it. The plan should include draft descriptions for both skills to ensure trigger accuracy can be reviewed. The audit-architecture description is 271 characters with embedded trigger phrases — the new skills should follow the same pattern.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan captures the domain intent well (parallel sub-agent reviewers, auto-fix vs confirm, static analysis for coverage) but misses critical structural elements from the established audit-architecture pattern. Both skills lack the standard lifecycle steps (context loading, graceful stop, audit report writing, project health refresh, expertise check), the install script update is missing, and the verification approach relies on file-existence grep rather than end-to-end skill invocation. Fixing the two CRITICAL and five IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
