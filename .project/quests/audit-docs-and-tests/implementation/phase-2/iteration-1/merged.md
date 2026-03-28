# Merged Review: Phase 2 — `/audit-tests` Skill

**Composite Score**: 8.5/10
**Reviewers**: Generalist (9/10), Agent-Skill (8/10)
**Critical**: 0 | **Important**: 1 | **Minor**: 1 | **Info**: 4

---

## Overall Assessment

The `/audit-tests` skill is a strong implementation that closely follows the `/audit-docs` pattern from Phase 1. The lifecycle envelope, sub-agent architecture, guidance definitions, and install script registration all meet plan requirements. Both reviewers agree: no critical or structural issues. The one actionable gap is missing end-to-end verification; everything else is informational observations about intentional design choices.

---

## Issues

### Critical (0)

None.

### Important (1)

**[IMPORTANT] End-to-end verification was not performed**

The skill was not invoked on a real or fixture codebase. All plan requirements are met at the file level, but there is no evidence the skill was run end-to-end to verify runtime behavior (correct context loading, sub-agent spawning, report output, side quest creation via CLI).

Source: agent-skill reviewer
File: `skills/audit-tests/SKILL.md`
Resolution: Run `/audit-tests` on a fixture or this repo and confirm the workflow completes without errors.

---

### Minor (1)

**[MINOR] Trigger phrase coverage could be expanded**

The `description` field lists common triggers ('audit tests', 'check test coverage', etc.) but omits adjacent scenarios that should also trigger the skill: "before writing new tests", "after major refactoring", "are my tests sufficient". Both `audit-docs` and `audit-tests` have similar trigger density, so this is an incremental improvement rather than a gap.

Source: agent-skill reviewer
File: `skills/audit-tests/SKILL.md` line 2
Resolution: Optionally add 2-3 adjacent trigger phrases to the description.

---

### Info (observations — no action required)

**[INFO] `## Fixes Applied` section intentionally absent**

`audit-docs` includes a `## Fixes Applied` report section because it auto-applies trivial fixes. `audit-tests` correctly omits this since it only proposes side quests and never applies fixes directly. This is a conscious, correct divergence.

**[INFO] CRITICAL vs IMPORTANT severity examples have minor overlap**

In `guidance.md`, the CRITICAL example "No tests for core business logic" and the IMPORTANT example "Public API with no test coverage" could be confused. The severity assignment rules section correctly disambiguates them via consumer count and false-confidence criteria; the examples table is just a readability concern.

**[INFO] Sub-agent placeholder asymmetry is intentional**

The quality reviewer prompt uses only `{test_file_list}` and `{test_infrastructure_summary}`, not the full placeholder set. This is correct: the quality reviewer focuses on test code quality, not coverage mapping. The asymmetry is appropriate and documented.

**[INFO] Nested markdown code fences in sub-agent prompts**

Sub-agent prompts in `references/sub-agent-prompts.md` use outer ` ``` ` fences with inner output-format fences. Some LLMs may have minor parsing issues with nested fences, but this is consistent with the `audit-docs` pattern and has not caused problems in practice.

---

## Plan Adherence

All plan requirements verified met by both reviewers:

| Requirement | Status |
|---|---|
| SKILL.md frontmatter (name, description, requires) | Met |
| 4 reviewer sub-agents (coverage, stale, quality, strategy) | Met |
| Static analysis coverage mapping (no coverage tools) | Met |
| Side quest via `goodplan quest:create --json` | Met |
| Graceful stop markers per step | Met |
| Resume detection (tests-*.md glob) | Met |
| Report format (summary table, category sections, side quests, deferred) | Met |
| Project health refresh with confirm-before-write | Met |
| Registered in `scripts/install-skills.sh` (alphabetical, after audit-docs) | Met |
| guidance.md: severity levels, output format, side quest template, test categories | Met |
| sub-agent-prompts.md: 4 self-contained templates with placeholders | Met |
| Install succeeds (`bun run install:skills`) | Met |

---

## Pattern Consistency with audit-docs

Both reviewers independently confirmed the lifecycle envelope mirrors `audit-docs` faithfully across all key dimensions: frontmatter, version check, context loading, resume detection, epic scope detection, sub-agent model, findings-inline approach, side quest CLI, report overwrite, graceful stops, project health refresh, expertise check, and references structure.

---

## Recommended Actions

1. **Required**: Run `/audit-tests` end-to-end on a fixture or real codebase to verify runtime behavior before closing Phase 2.
2. **Optional**: Add 2-3 adjacent trigger phrases to the description (e.g., "before writing new tests", "are my tests sufficient").
