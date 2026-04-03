# Generalist Review -- Phase 2: Audit Skill

**Reviewer:** Generalist
**Score:** 8/10
**Date:** 2026-04-03

## Summary

Solid implementation that correctly follows the orchestrator pattern. The SKILL.md is well-structured with clear step numbering, proper CLI error handling, and agent dispatch. All three agent files are thorough and produce the required structured JSON. The test harness follows established patterns. A few issues around return format divergence, agent file writing contradictions, and missing plan requirements.

## Findings

### CRITICAL

*None*

### IMPORTANT

**I1. Agent return format diverges from sub-agent-return-format.md without acknowledgment**

The audit agents use a custom return schema (`findings`, `scores`, `proposedSideQuests`) that is completely different from the standard sub-agent return format defined in `skills/_shared/references/sub-agent-return-format.md` (which uses `status`, `summary`, `filesWritten`, `score`, `review`, etc.). The standard format is referenced by `explore-phase.md` via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md`.

The audit agents do include `status` and `summary` (compatible), but replace `filesWritten`, `score`, and `review` with domain-specific fields. This is arguably the right design for audit-specific output, but:
- None of the agent files reference the shared return format doc to indicate this is an intentional override
- The SKILL.md validation logic (Step 5) validates the custom shape but doesn't mention the standard format at all
- Future maintainers may not know whether this divergence is intentional

**Suggestion:** Add a brief note in each agent file (or a shared audit return format reference) documenting that audit agents use a domain-specific return schema that extends the base `status`/`summary` fields but replaces `filesWritten`/`score` with audit-specific output. Alternatively, add an entry to the Agent-Specific Return Fields table in `sub-agent-return-format.md`.

**I2. Agent files say "No file writing" but then instruct agents to write audit reports**

`audit-architecture-phase.md` line 14 says: "No file writing -- all output is returned via structured JSON." But Section 7 (line 107-119) instructs the agent to write the audit report to `.goodplan/audits/architecture-<date>.md`. The same contradiction appears in `audit-docs-phase.md` (line 15: "No file writing except the audit report") and `audit-tests-phase.md` (line 15: "No file writing except the audit report").

The architecture agent's note is the most contradictory -- it says "No file writing" with no exception, then later writes files. The docs and tests agents partially fix this by adding "except the audit report" but this still conflicts with `allowedTools: ["Read", "Grep", "Glob"]` which does not include Write.

If agents are expected to write the report, they need the Write tool. If the orchestrator writes the report (Step 8 of SKILL.md says "The agent writes the report file directly"), then the agent tool list needs Write added.

**Suggestion:** Either (a) add Write to agent allowedTools and fix the architecture agent's note to say "except the audit report", or (b) have the orchestrator write the report from the agent's structured JSON return (keeping agents read-only). Option (b) is cleaner architecturally but requires SKILL.md Step 8 changes.

**I3. SKILL.md Step 8 contradicts orchestrator context discipline**

Step 8 says "The agent writes the report file directly. Verify it exists." But the orchestrator also does report formatting in Step 6 (presenting findings). This creates ambiguity: does the orchestrator format and present findings to the user (Step 6) AND the agent writes a separate report file (Step 8)? Or is the Step 6 presentation just console output while the persisted report comes from the agent?

In the `create-epic` pattern, the orchestrator never reads or writes content files -- it delegates all file I/O to agents and uses shell `cp` for moves. If the audit agent writes the report, the orchestrator shouldn't need to format findings (it would just present the agent's summary). If the orchestrator formats findings, it shouldn't also expect the agent to write a file.

**Suggestion:** Clarify the responsibility split. Recommended: agent writes the `.goodplan/audits/` report file (with Write in allowedTools), orchestrator presents a summary from the structured JSON return (scores + finding counts), and Step 8 just verifies the file exists via `ls`.

### MINOR

**M1. Plan checkbox for dogfood test not checked**

The plan file has one unchecked expected-behavior checkbox: `bun tools/dogfood/test-audit.ts` (line 15). All task checkboxes are checked. This is likely an oversight since the test harness file exists and appears complete.

**M2. Test harness does not verify audit report file creation**

The `testAuditMode` function checks session success and result text mentions, but does not verify that `.goodplan/audits/<mode>-<date>.md` was created. The `test-create-epic.ts` harness verifies architecture files exist post-run (line 459-476). The audit harness should similarly verify the report artifact.

**Suggestion:** Add a post-run check: `existsSync(join(fixtureDir, ".goodplan", "audits"))` and verify at least one `.md` file exists for the tested mode.

**M3. Test harness `testInvalidMode` always returns `true`**

Line 612: `const passed = true;` is never reassigned to `false`. The function always returns `true` regardless of what happens. Compare with `testAuditMode` which properly sets `passed = false` on failure. The invalid mode test cannot actually fail.

**Suggestion:** Set `passed = false` when the error message check fails (the `WARN` branch).

**M4. Shared references not included in docs and tests agents**

`audit-architecture-phase.md` includes both `audit-conventions.md` and `maturity-conventions.md` references. `audit-docs-phase.md` and `audit-tests-phase.md` include only `audit-conventions.md`. The plan specifies maturity-conventions only for architecture (line 37), so this is correct per plan -- but the maturity assessment capability could also inform test audit (e.g., maturity level affecting expected test coverage). Not blocking, just noting.

**M5. No `--max-iterations` flag support in test harness**

`test-create-epic.ts` supports `--max-iterations` to control refinement loop cost. The audit harness has no refinement loop, so this is less relevant, but the test runs all three modes sequentially which is expensive. Consider adding a `--mode` flag to run a single mode for faster iteration during development.

**M6. SKILL.md uses `quest:create` but plan says "side quests"**

Step 7 uses `$GP quest:create --json` for side quest creation. This is correct per the CLI surface, but the JSON payload uses `"name"` and `"goal"` fields. Verify that `quest:create` actually accepts these field names via stdin JSON (the plan doesn't specify the exact CLI payload schema).

## Cross-File Integration

- **SKILL.md <-> agents:** Agent dispatch table (Step 4) correctly maps modes to agent names. Task prompt structure is clear. JSON return schema is consistent across all three agents and the SKILL.md validation logic.
- **SKILL.md <-> test harness:** Harness tests all three modes plus invalid mode. Fixture is well-designed with intentional gaps for each audit mode to find.
- **Agents <-> shared references:** All agents reference `audit-conventions.md`. Architecture agent additionally references `maturity-conventions.md`. References use the correct `@${CLAUDE_PLUGIN_ROOT}/...` syntax.

## Pattern Conformance

### vs. create-epic SKILL.md (orchestrator pattern)
- Version check (Step 0): Matches -- same binary path pattern and error code handling.
- CLI error handling: Matches -- same three-tier error pattern (binary not found, exit 1, exit 2).
- Agent spawn pattern: Simpler than create-epic (no refinement loop, no multi-phase pipeline), which is appropriate for audit's single-dispatch model.
- Context discipline statement: Present and clear ("You are an orchestrator. You do NOT read architecture files...").
- Re-entry: Uses filesystem detection instead of CLI status, which the plan explicitly calls out as an acceptable deviation (line 26).

### vs. explore-phase.md (agent pattern)
- Frontmatter: All agents have `name`, `description`, `model: opus`. Matches explore-phase pattern.
- Tool restrictions: Agents specify `allowedTools` and note `disallowedTools: Agent`. Matches.
- Inputs section: All agents document expected task prompt inputs. Matches explore-phase structure.
- Return format: Diverges from standard (see I1) but is internally consistent.

### vs. test-create-epic.ts (harness pattern)
- Structure: Same pattern -- preflight, plugin build, cache sync, fixture creation, session run, verification.
- Imports: Uses same utility functions (`createLogger`, `createMinimalFixture`, `createSimulatedUser`, etc.).
- Simulated user: Properly configured for each test case.
- Missing: No `checkViolations: true` or `verifyNoArtifactReads` -- but audit is not a pipeline with strict context discipline, so this is acceptable.

## Completeness vs. Plan

| Plan Requirement | Status | Notes |
|---|---|---|
| SKILL.md as lightweight orchestrator | Done | Steps 0-9, clear orchestrator discipline |
| Parse mode from argument | Done | Step 1 with AskUserQuestion fallback |
| gp status --json context loading | Done | Step 2 |
| Re-entry handling | Done | Step 3 with filesystem detection |
| Spawn mode agent | Done | Step 4 with agent mapping table |
| Validate agent return | Done | Step 5 with shape validation |
| Present formatted report | Done | Step 6 |
| Side quest creation | Done | Step 7 |
| Frontmatter triggers | Done | Comprehensive trigger list |
| audit-architecture-phase.md | Done | Gap analysis, fitness functions, invariants, maturity |
| audit-docs-phase.md | Done | Staleness, gaps, consistency |
| audit-tests-phase.md | Done | Coverage, staleness, quality, strategy |
| test-audit.ts | Done | 4 test cases (3 modes + invalid) |
| Each agent under ~500 lines | Done | Architecture: 178, Docs: 177, Tests: 190 |
| SKILL.md lightweight | Done | 255 lines, no content reading |
