# Agent Skill Review -- Phase 2: audit skill

**Reviewer:** Agent Skill Domain Specialist
**Date:** 2026-04-03
**Iteration:** 1

## Summary

The audit skill is a well-structured orchestrator with three mode-specific agents and a comprehensive test harness. The SKILL.md follows the established orchestrator pattern from create-epic while being appropriately simpler (no pipeline status tracking, no refinement loops). Agent files are well-scoped, under 200 lines each (well within the ~500-line guidance), and follow the read-only + structured JSON return pattern. The test harness covers all three modes plus the error path.

## Findings

### CRITICAL

None.

### IMPORTANT

**I1. Agents write audit reports but SKILL.md also says "the agent writes the report file directly" (Step 8)**

The agents include instructions to `mkdir -p .goodplan/audits` and write the audit report (e.g., Section 7 of each agent). However, the agents are documented with `allowedTools: ["Read", "Grep", "Glob"]` and `disallowedTools: ["Agent"]` -- they have no Write or Bash tools to actually create directories or write files. This is a contradiction: either the agents need Write+Bash tools added, or the report-writing responsibility needs to move to the orchestrator.

Compare with create-epic: agents that write files have `Write` in their allowedTools (e.g., explore-phase, architecture-phase). The audit agents explicitly restrict to read-only tools, but their instructions include write operations.

**Recommendation:** Either (a) add Write and Bash to agent allowedTools and update the agent notes ("No file writing" -> "Writes audit report only"), or (b) remove the report-writing sections from agents and have the orchestrator write the report using the structured JSON return data. Option (b) is more consistent with the orchestrator pattern where the orchestrator owns all CLI/filesystem mutations.

**I2. Re-entry detection uses `ls` and `grep` on audit artifacts, but agents can't write them**

Step 3 of SKILL.md checks for `.goodplan/audits/<mode>-*.md` files and `<!-- partial` markers. Given the tool restriction issue (I1), these artifacts may never be created. If I1 is resolved by having the orchestrator write reports, the `<!-- partial` marker approach is orphaned -- the orchestrator would need a different re-entry signal (or the feature should be removed since audits are lightweight and idempotent).

**Recommendation:** If agents don't write reports, simplify re-entry to check only for completed reports (no partial marker logic). Audits are fast enough that restarting is acceptable.

**I3. `audit-docs-phase.md` says "No file writing except the audit report" but has read-only tools**

Line 15: "No file writing except the audit report" contradicts the tool restrictions. The architecture agent (line 16) correctly says "No file writing -- all output is returned via structured JSON." The docs agent text is inconsistent.

**Recommendation:** Align audit-docs-phase.md note with the actual tool restrictions. If agents remain read-only, change to "No file writing -- all output is returned via structured JSON."

### MINOR

**M1. SKILL.md frontmatter missing `user-invocable: true` field documentation alignment**

The frontmatter has `user-invocable: true` which is correct. However, the `requires` field uses `gp >= 1.0.0` format. This matches the create-epic pattern -- no issue, just confirming alignment.

**M2. Test harness `testInvalidMode` always returns `true`**

Line 612: `const passed = true;` is never set to `false`. The verification section only logs PASS/WARN/INFO but never fails the test. This means the invalid-mode test can never report a failure, reducing test coverage confidence.

Compare with `testAuditMode` which sets `passed = false` on session failure. The invalid-mode test should similarly set `passed = false` if the result text does NOT mention the invalid mode error.

**Recommendation:** Change to `let passed = true` and set `passed = false` when the error mention check fails (not just WARN).

**M3. Test harness runs modes sequentially, not in parallel**

Lines 656-669: All four tests run sequentially. The three mode tests are independent and could run in parallel to reduce total test time. The create-epic harness also runs sequentially, so this is consistent with the existing pattern, but worth noting for future optimization.

**M4. No `--max-iterations` flag support in test-audit.ts**

The create-epic test harness accepts `--max-iterations` for cost control during testing. The audit test has no equivalent. Since audit doesn't have a refinement loop, this is less critical, but the `maxTurns: 200` and `maxBudgetUsd: 15` per mode test could be made configurable.

**M5. Agent frontmatter uses `model: opus` but create-epic agents don't specify model**

The three audit agents specify `model: opus` in their frontmatter. The explore-phase agent also specifies `model: opus`, so this is consistent with the existing pattern for agents that do heavy analysis work. No action needed.

**M6. Quest creation in Step 7 uses `echo | $GP quest:create --json` instead of stdin pipe**

The plan says quest creation should use CLI, and the SKILL.md implements it with echo piping. This works but is fragile with shell escaping of JSON containing special characters. The create-epic skill uses the same pattern (`echo '...' | $GP ...`), so this is consistent.

## Scores

| Dimension | Score | Notes |
|---|---|---|
| Frontmatter correctness | 9/10 | All required fields present, triggers well-covered |
| Mode parsing & error handling | 9/10 | Clean mode validation, good error messages |
| Context discipline | 9/10 | Orchestrator correctly delegates content work |
| Re-entry logic | 6/10 | Partial marker logic depends on write capability agents don't have |
| Agent dispatching | 8/10 | Correct agent mapping, good task prompt structure |
| Return validation | 9/10 | Thorough schema validation, good error surfacing |
| Agent tool restrictions | 6/10 | Read-only tools but instructions include writes (I1) |
| Agent return format | 9/10 | Consistent structured JSON across all three agents |
| Agent reference injection | 9/10 | Correct `@${CLAUDE_PLUGIN_ROOT}` paths, shared refs exist |
| Agent size | 10/10 | All under 200 lines, well within ~500-line guidance |
| Test fixture realism | 9/10 | Good mix of gaps, staleness, and coverage issues |
| Test mode coverage | 9/10 | All three modes + invalid mode tested |
| Test error path | 7/10 | Invalid mode test never fails (M2) |

## Overall Assessment

Score: 8/10

The skill is well-designed and follows established patterns closely. The primary issue is the contradiction between agent tool restrictions (read-only) and agent instructions (write audit reports). This needs resolution before the skill can function correctly. The test harness is solid but has a minor bug where the invalid-mode test can never fail. All agent files are clean, well-structured, and appropriately sized.

Critical: 0, Important: 3, Minor: 6
