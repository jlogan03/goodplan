# Merged Review Feedback — audit-docs-and-tests (Round 1)

## CRITICAL Issues

**C1. Missing `install-skills.sh` registration**
All three reviewers flagged this. The plan creates `skills/audit-docs/` and `skills/audit-tests/` but never adds them to the `SKILL_DIRS` array in `scripts/install-skills.sh`. Without this, `bun run install:skills` silently skips the new skills, and the confirmed goal's "done means both skills installed via `bun run install:skills`" criterion fails.
Resolution: DIRECTLY_ACTIONABLE

**C2. Plan omits standard audit-architecture lifecycle steps**
Flagged by all three reviewers (holistic as multiple IMPORTANT issues, software-architecture as one IMPORTANT, agent-skill as CRITICAL). Both new skills jump straight into domain work without the foundational steps established by the audit-architecture pattern:
- **Step 1 — Load Context**: decisions, learnings (`goodplan learning:list --json`), conventions, activity-log, expertise check (from `~/.claude/CLAUDE.md`), resume detection
- **Graceful Stop step**: partial report with `<!-- partial -- interrupted` markers at each step boundary
- **Write Audit Report step**: write findings to `.project/audits/docs-<date>.md` or `.project/audits/tests-<date>.md`
- **Project Health Refresh step**: update `.project/project-health.md` with audit findings
- **Expertise Check step**: final step to update user expertise if new info observed

These are structural conventions, not optional features. Omitting them creates architectural inconsistency across the audit skill family.
Resolution: DIRECTLY_ACTIONABLE

## IMPORTANT Issues

**I1. Side quest creation mechanism inconsistency**
Flagged by all three reviewers. The plan uses `goodplan quest:create` but audit-architecture uses the older filesystem approach (`mkdir -p .project/side-quests/<name>` + write `goal.md`). The plan should pick one mechanism and be explicit about it. If using `quest:create`, include the concrete CLI invocation pattern and note the intentional divergence from audit-architecture. If using the filesystem approach, match audit-architecture for consistency.
Resolution: CODEBASE_EXPLORATION — verify what `quest:create` accepts and whether it's the right mechanism.

**I2. Sub-agent prompts must be self-contained per established pattern**
The audit-architecture pattern stores sub-agent prompts in `references/sub-agent-prompts.md` as fully self-contained templates with `{placeholders}` and explicit instructions not to read parent skill files. The plan mentions creating `references/reviewer-prompts.md` but does not specify self-containment or output format for each reviewer.
Resolution: DIRECTLY_ACTIONABLE

**I3. No model specification for sub-agents**
Flagged by software-architecture and agent-skill. The audit-architecture skill explicitly specifies `model: "opus"` for sub-agents. Neither new skill specifies which model to use.
Resolution: DIRECTLY_ACTIONABLE

**I4. Auto-fix without user confirmation contradicts audit pattern**
Flagged by agent-skill. The plan says `/audit-docs` will auto-fix trivial issues (typos, dead links). The audit-architecture pattern uses `AskUserQuestion` before acting. Auto-fixing without confirmation breaks the conservative approach — a typo fix in a code example could change semantics. The plan should require confirmation or at minimum batch approval via `AskUserQuestion`.
Resolution: DIRECTLY_ACTIONABLE

**I5. Verification uses grep file-existence checks instead of end-to-end skill invocation**
Flagged by holistic and agent-skill. The Expected Behavior sections use `ls` and `grep -c` to verify file existence and content patterns. The confirmed goal says "verified working on this repo" but verification doesn't include actually running the skill. Add end-to-end verification: invoke the skill, verify it discovers sources, spawns reviewers, produces findings, and writes the audit report.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. Reference file naming inconsistency**
Flagged by holistic and software-architecture. The plan uses `reviewer-prompts.md` where audit-architecture uses `sub-agent-prompts.md`, and `doc-discovery-patterns.md`/`test-patterns.md` where audit-architecture uses `guidance.md`. Should align naming for pattern consistency.
Resolution: DIRECTLY_ACTIONABLE

**M2. No `references/guidance.md` for severity levels and side quest format**
Flagged by agent-skill. The audit-architecture pattern has `guidance.md` defining severity levels and side quest proposal format. Without this, reviewers will use inconsistent severity scales.
Resolution: DIRECTLY_ACTIONABLE

**M3. Description field in SKILL.md frontmatter not drafted**
Flagged by agent-skill. The plan says "add trigger patterns to SKILL.md frontmatter" but doesn't draft the `description` field. This is the primary trigger mechanism and should be reviewed.
Resolution: DIRECTLY_ACTIONABLE

**M4. `doc-discovery-patterns.md` scope may be too broad**
Flagged by agent-skill. The plan proposes multi-language discovery patterns but only needs TypeScript for the first implementation on the goodplan repo. Start focused, note extensibility as future enhancement.
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 1 Expected Behavior "Before" section is redundant**
Flagged by holistic. Both `ls` and `grep -c` checks test the same thing (file doesn't exist). One is sufficient.
Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE (for loop exit)

**DA1. Add skills to `scripts/install-skills.sh`** (from C1)
File: `scripts/install-skills.sh`
Add `"audit-docs"` and `"audit-tests"` to the `SKILL_DIRS` array. This is a one-line-per-skill addition to an existing array.

**DA2. Add full audit-architecture lifecycle steps to both skill plans** (from C2)
File: the plan.md being refined
For both `/audit-docs` and `/audit-tests`, add these steps matching audit-architecture's structure:
- Step 1: Load Context (decisions, learnings, conventions, activity-log, expertise, resume detection, read `../_shared/references/cli-interaction.md`)
- Graceful Stop step: partial report markers at each step boundary
- Write Audit Report step: `.project/audits/docs-<date>.md` or `.project/audits/tests-<date>.md`
- Project Health Refresh step: update `.project/project-health.md`
- Expertise Check step: final step

**DA3. Specify sub-agent model** (from I3)
File: the plan.md being refined
Add `model: "opus"` to both skills' sub-agent spawning steps, matching audit-architecture.

**DA4. Require self-contained sub-agent prompts** (from I2)
File: the plan.md being refined
Specify that `references/reviewer-prompts.md` (or `sub-agent-prompts.md` per M1) must contain fully self-contained templates with `{placeholders}`, explicit "do NOT read parent skill files" instructions, and defined output format for each reviewer.

**DA5. Add user confirmation before auto-fix** (from I4)
File: the plan.md being refined
Change `/audit-docs` auto-fix to require `AskUserQuestion` batch approval ("Apply these N trivial fixes?") before making any changes.

**DA6. Replace grep-based verification with end-to-end skill invocation** (from I5)
File: the plan.md being refined
Replace Expected Behavior sections with: invoke the skill on the goodplan repo, verify it discovers sources, spawns reviewers, produces findings, and writes the audit report to `.project/audits/`.

**DA7. Align reference file naming** (from M1, M2)
File: the plan.md being refined
Use `sub-agent-prompts.md` (not `reviewer-prompts.md`), add `guidance.md` with severity definitions and side quest format, matching audit-architecture's naming convention.

**DA8. Draft SKILL.md description fields** (from M3)
File: the plan.md being refined
Include draft `description` text for both skills in the plan, following audit-architecture's pattern (~270 chars with embedded trigger phrases).

**DA9. Scope discovery patterns to TypeScript** (from M4)
File: the plan.md being refined
Rename/scope `doc-discovery-patterns.md` and `test-patterns.md` to focus on TypeScript/goodplan-specific patterns first. Note multi-language as future enhancement.

**DA10. Remove redundant Before check** (from M5)
File: the plan.md being refined
In Phase 1 Expected Behavior Before, keep only one existence check.

---

## RESEARCH_NEEDED

**R1. Side quest creation mechanism** (from I1)
What to look up: How does `goodplan quest:create` work? Does it accept piped JSON? Is it the right mechanism for lightweight side quest proposals, or should the filesystem approach (`.project/side-quests/<name>/goal.md`) be used instead?
Why it matters: The plan, audit-architecture, and the research file give conflicting signals. Need to determine the canonical approach.
Tool strategy: CODEBASE_EXPLORATION — `Grep` for `quest:create` in CLI source code, `Read` the `audit-architecture` skill to see its exact side quest creation code, check if `.project/side-quests/` directory convention is documented anywhere.

---

## Contradictions Resolved

1. **install-skills.sh severity**: holistic and agent-skill rated this CRITICAL; software-architecture rated it IMPORTANT. Trusted holistic/agent-skill — the confirmed goal explicitly says "Done means both skills installed via `bun run install:skills`", making this a goal-blocking issue. **Merged as CRITICAL.**

2. **Missing lifecycle steps severity**: agent-skill rated this CRITICAL; holistic split it across five separate IMPORTANT issues; software-architecture bundled it as one IMPORTANT. Trusted agent-skill's CRITICAL rating — these are structural conventions from the established pattern, not optional features. **Merged as CRITICAL C2**, consolidating all five holistic IMPORTANT issues (context loading, graceful stop, expertise check, audit report, project health) into one.

3. **Side quest mechanism**: holistic said "pick one and document why" (CODEBASE_EXPLORATION); software-architecture said "use CLI command, note divergence from audit-architecture" (DIRECTLY_ACTIONABLE); agent-skill said "verify quest:create and be explicit" (CODEBASE_EXPLORATION). Trusted the two domain specialists (holistic + agent-skill) that this needs codebase exploration first. **Merged as CODEBASE_EXPLORATION.**

4. **Sub-agent prompt naming**: holistic (MINOR) and software-architecture (MINOR) flagged `reviewer-prompts.md` vs `sub-agent-prompts.md`. Agent-skill flagged the self-containment requirement (IMPORTANT) separately. These are complementary, not contradictory. **Kept both: naming as MINOR M1, self-containment as IMPORTANT I2.**

---

## Unresolved (USER_INPUT required)

No USER_INPUT items. All issues are either DIRECTLY_ACTIONABLE or CODEBASE_EXPLORATION.

---

## Available Research

**R1 resolved**: `goodplan quest:create` accepts `{name, goal}` via stdin JSON, returns structured output with `--json`. This is the CLI-native mechanism. The audit-architecture skill's filesystem approach (`mkdir -p .project/side-quests/<name>`) is a legacy pattern predating the CLI. New skills should use `quest:create` and note the intentional modernization vs audit-architecture. Example invocation:
```bash
echo '{"name":"improve-test-coverage","goal":"Add unit tests for..."}' | goodplan quest:create --json
```
