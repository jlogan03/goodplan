# Agent Skill Review: audit-docs-and-tests (Round 3)

## Issues

**[IMPORTANT]** Side quest creation via `quest:create` uses incorrect stdin format
The plan specifies creating side quests via `echo '{"name":"fix-stale-docs","goal":"..."}' | goodplan quest:create --json`. However, examining the CLI help output, `quest:create` accepts `Stdin: {name, goal}` and has no `--json` flag on the command itself (only the global `--json` output flag). The `--json` flag controls output format, not input parsing. The plan should drop `--json` from the `quest:create` invocation examples or verify that the global `--json` flag doesn't interfere with stdin parsing. The piped JSON stdin format `{"name":"...","goal":"..."}` appears correct based on the CLI schema, but the `--json` flag usage should be verified or removed from the examples in Phase 1 Step 5 and Phase 2 Step 6.
Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** `doc-discovery-patterns.md` reference file is potentially over-engineered for a skill reference
The plan specifies a `doc-discovery-patterns.md` reference file containing "glob patterns and heuristics for finding documentation sources." However, the audit-architecture skill handles its equivalent discovery inline (Step 2 of SKILL.md describes what to glob without needing a separate reference file). For audit-docs, the discovery step (Step 2) already describes what to scan: READMEs, `docs/`, `.project/` files, CLAUDE.md files, JSDoc-heavy files. Extracting glob patterns into a separate file adds a reference load that the orchestrator must perform but could instead be inline in SKILL.md. Consider whether this file pulls its weight vs. inlining the patterns directly in the SKILL.md Step 2 instructions (as audit-architecture does). If kept, ensure the SKILL.md Step 2 instructions say to read it explicitly.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `test-patterns.md` has the same over-engineering concern as `doc-discovery-patterns.md`
Same reasoning applies to Phase 2's `test-patterns.md`. The audit-architecture skill does not have a separate "discovery patterns" reference file. If the patterns are simple enough to inline in SKILL.md Step 2, a separate file adds unnecessary progressive-disclosure overhead. However, test discovery patterns (framework-specific conventions, source-to-test mapping heuristics across jest/vitest/bun) may be complex enough to justify separation. This is a judgment call for the implementer.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan does not specify where reviewer sub-agents write their findings files
Both Phase 1 Step 4 and Phase 2 Step 4 state "Each reviewer writes findings to a file. Orchestrator synthesizes." But neither specifies where those files should be written. The audit-architecture sub-agent prompt template returns findings as structured markdown in the agent's response (not written to a file). The plan should clarify whether reviewers: (a) return findings inline in their response (matching audit-architecture's pattern), or (b) write to a specific path (which would need to be specified, e.g., `/tmp/audit-docs-findings-staleness.md`). Given that audit-architecture reviewers return inline, option (a) is more consistent and avoids file cleanup concerns.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Resume detection for graceful stop does not account for same-day re-runs
Both skills use `.project/audits/<type>-<date>.md` as the report filename pattern. If a user runs the audit twice on the same day, the second run would overwrite the first report. The plan should specify either a timestamp-based suffix (e.g., `docs-2026-03-27T14-30.md`) or simply note that re-running on the same day overwrites the previous report (which may be acceptable since the resume detection reads the most recent file). This matches audit-architecture's pattern which also uses `architecture-<date>.md`, so this is at most a pre-existing pattern concern, not something this plan introduces.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 3 addresses all round 2 issues effectively. The lifecycle envelope is clearly documented with explicit rationale for step count asymmetry. The `guidance.md` scope is well-defined with explicit exclusions (no fitness functions, invariants, or maturity criteria). Graceful stop markers now include step-specific detail for every interruptible step in both skills. Sub-agent output formats are anchored to the findings table schema in `guidance.md`. Description lengths are aligned with audit-architecture's ~270 chars. The one IMPORTANT issue (quest:create invocation syntax) is a correctness concern that needs codebase exploration to confirm. The remaining MINOR issues are refinements that would slightly improve implementation clarity but do not block. Addressing the IMPORTANT issue would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
