# Agent Skill Review -- Phase 3: init Skill

**Reviewer:** Agent Skill Domain Specialist
**Date:** 2026-04-03
**Score:** 8/10

## Files Reviewed

- `skills/init/SKILL.md` (218 lines)
- `agents/onboard-phase.md` (287 lines)
- `tools/dogfood/test-init.ts` (570 lines)

## Summary

Solid orchestrator + agent decomposition. The init skill cleanly separates the new-project path (inline) from the onboard path (delegated to agent). Auto-detection logic is well-defined with override support. The onboard-phase agent successfully adapts the onboard-repo skill's scanning/extraction logic into a compact 287-line agent. Test harness covers all 5 planned scenarios.

---

## CRITICAL Issues (0)

None.

## IMPORTANT Issues (3)

### I-1. onboard-phase agent allowedTools in SKILL.md includes Bash but agent body does not list it

The orchestrator's Step 4c specifies `allowedTools: ["Read", "Grep", "Glob", "Write", "Bash", "WebSearch"]`. The agent body (line 4 area) says "full tool access (Read, Grep, Glob, Write, Bash, WebSearch if available)". This is consistent. However, the agent frontmatter has no `allowedTools` field -- tool restrictions are specified only in the orchestrator's spawn block. This is correct for the current architecture (orchestrator controls permissions), but the agent body's note on line 4 should match the orchestrator exactly. Currently it says "Bash" which is good.

**Actual issue:** The agent uses `mkdir -p .goodplan/architecture/` (Step 5a) and `git log`, `git shortlog`, `git rev-parse`, `find` commands throughout Steps 1, 5d, 7a -- all requiring Bash. Bash IS in the allowedTools list. However, the agent body says `disallowedTools: Agent` only in the opening note (line 4 area), not as a formal frontmatter field. The disallowedTools restriction relies entirely on the orchestrator passing it in the spawn block. This is fine but could be made more explicit in the agent frontmatter if the convention supports it.

**Recommendation:** Add a comment in the agent frontmatter clarifying tool restrictions are set by the spawning orchestrator, or add `allowedTools` / `disallowedTools` to the frontmatter if the agent format supports it.

### I-2. Onboard-phase agent drops Steps 7-12 from onboard-repo without full replacement

The original `onboard-repo/SKILL.md` has 12 steps covering: architecture interview (Step 7), migration detection (Step 8), side quest creation (Step 9), expertise profiling (Step 10), hot spot analysis (Step 11), CLAUDE.md update + summary (Step 12). The onboard-phase agent has 8 steps that cover scanning (Steps 1-2), idea.md (Step 3), conventions (Step 4), architecture (Step 5), migration + debt (Step 6), hot spots (Step 7), and CLAUDE.md (Step 8).

**Dropped capabilities:**
- **Architecture interview** (onboard-repo Step 7) -- the interactive Q&A where the user validates subsystem boundaries and maturity. The agent cannot do interactive Q&A (no AskUserQuestion), which is correct since it's an agent. But this validation step is not moved to the orchestrator either. The orchestrator just presents the agent's summary and stops.
- **Side quest creation** (onboard-repo Step 9) -- creating quests for detected migrations/debt. Not present in either the agent or orchestrator.
- **Expertise profiling** (onboard-repo Step 10) -- the two-layer expertise tracking system. Not present.
- **Optional epic creation** (onboard-repo Step 12d) -- not present.

The plan says "Adapt content from skills/onboard-repo/SKILL.md (Steps 1-12)" but the implementation drops significant user-facing functionality. If these were intentionally descoped for the init skill (simpler than full onboard-repo), that should be documented.

**Recommendation:** Either (a) add architecture interview and side quest creation to the orchestrator post-agent flow (between Steps 4d and 5), or (b) document explicitly that init/onboard is a lighter-weight version of onboard-repo and which features are intentionally omitted.

### I-3. Test 5 does not test the error path as planned

The plan specifies Test 5 as: "Test error path: invoke with missing permissions or broken CLI, verify graceful error message." The actual test-init.ts Test 5 (`testVerifyStatus`) is a positive path test that initializes a small repo and then verifies `gp status --json` works afterward. It does not test broken CLI or missing permissions.

The plan's error path test is replaced with a `gp status` verification test, which is useful but different. No test actually validates graceful error handling when the CLI is broken or unavailable.

**Recommendation:** Add a test that simulates CLI failure (e.g., set PATH to exclude gp binary, or rename the binary) and verifies the skill produces a helpful error message rather than crashing.

## MINOR Issues (4)

### M-1. SKILL.md context discipline allows `find` and `ls` but not `Glob`

Step 2a uses shell `find` and `ls` for auto-detection. The context discipline section says the orchestrator's context consists of "Directory listing output (ls, find -- for auto-detection only)". Using `find` via Bash is heavier than Glob and less idiomatic for the skill system. Consider using Glob for the source file scan in Step 2a.

### M-2. Agent drops the `references/` relative path convention

The original onboard-repo skill references local files like `references/repo-scanning.md`, `references/convention-heuristics.md`, `references/architecture-extraction.md`, `references/migration-detection.md`, and `references/expertise-profiling.md`. These contain detailed scanning heuristics. The onboard-phase agent inlines the heuristic logic directly (e.g., convention detection in Step 4, architecture extraction in Step 5) rather than referencing these files.

This is acceptable for keeping the agent self-contained, but means heuristic updates must be made in two places (agent + reference files) until onboard-repo is fully retired.

### M-3. SKILL.md Step 3c uses Write tool directly

The context discipline says "You are an orchestrator. You MUST NOT use the Read tool on source code files, architecture files, conventions files, or agent definitions." Writing `.goodplan/idea.md` in Step 3c is not reading, so it doesn't violate the stated rule. But writing markdown content (the idea.md template) is a content-level operation. For the new-project path this is pragmatic and correct since the content is minimal. No change needed, just noting the pattern.

### M-4. Test harness Test 3 accepts partial pass too generously

Test 3 (`testModeOverride`) has a fallback: if `.goodplan/` exists but conventions.md was also created (meaning --mode new was ignored), it still returns `true` with a "PARTIAL" log. This weakens the test -- a mode override that doesn't actually override should be a failure.

```typescript
// Lines 334-337
if (hasGoodplan) {
    logger.log("PARTIAL: Test 3 -- initialized but may not have respected --mode new override");
    return true; // Still counts as functional
}
```

**Recommendation:** Return `false` for the partial case, or at minimum track it as a separate "partial pass" category in the summary.

---

## Positive Observations

1. **Agent line count (287) well under 500-line limit** -- leaves room for iteration without hitting the ceiling.
2. **Shared reference injection** -- all four required references (expertise-tracking, maturity-conventions, codebase-context-discovery, sub-agent-return-format) are correctly referenced with `@${CLAUDE_PLUGIN_ROOT}` paths.
3. **Return format** -- agent uses the standard SUCCESS/FAILED JSON return format with `filesWritten` and `onboardSummary` fields. Follows sub-agent-return-format reference.
4. **Write in allowedTools** -- correctly included since the agent needs to write conventions.md, architecture files, and idea.md. This was the key Phase 2 learning.
5. **Frontmatter quality** -- both files have valid frontmatter. SKILL.md has `user-invocable: true`, `requires: gp >= 1.0.0`, and comprehensive trigger phrases. Agent has `model: opus`.
6. **Test harness structure** -- uses the established patterns (createSimulatedUser, runSkillSession, installSkills) from the dogfood utils. All 5 tests run sequentially with independent fixtures.
7. **Re-entry handling** -- SKILL.md Step 1 checks for existing `.goodplan/` and handles fully-initialized vs bare/partial states. Offers user choice rather than silently overwriting.
8. **Error handling** -- SKILL.md has a dedicated error handling section covering CLI failure, agent FAILED/PARTIAL status, and unexpected return formats.

---

## Verdict

The implementation delivers a functional init orchestrator with a well-structured onboard agent. The main gap is the dropped onboard-repo capabilities (architecture interview, expertise profiling, side quests) which reduce the onboard path from a comprehensive workflow to a scan-and-write operation. If this is intentional simplification, document it. The test harness covers the right scenarios but needs an actual error path test (Test 5 deviation from plan).
