# Holistic Review — Refactor Intelligence

## Issues

**[IMPORTANT]** Graceful stop coverage for Step 9 is under-specified

The plan's third task says "No changes needed" to graceful stop and references existing case (d). However, case (d) in guidance.md reads: "System-profile updated, debt evaluation pending." Step 9 runs *after* Steps 6c/6d, so case (d) does not actually cover being stopped mid-Step-9. If the agent is stopped while applying inline fixes or drafting side quest goals (mid-Step-9 actions), none of the existing graceful stop cases describe this state. The plan should either: (1) add a new graceful stop case for "Step 9 in progress — partial refactor actions applied," or (2) explicitly verify that the current cases handle it and document why (e.g., case (d) is broad enough because Step 9 changes are independently safe).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No test coverage or documentation tasks

The plan has no tasks for tests or documentation updates. While this is a guidance/skill-definition change (not application code), the project's own `skill-conventions.md` or workflow may expect skill changes to be documented. More importantly, the verification section relies entirely on manual read-throughs. Consider whether the project has any automated validation for skill files (lint, schema checks) that should be updated.

Resolution: CODEBASE_EXPLORATION
Research: Check `.project/skill-conventions.md` and any CI/lint configurations to determine if skill file changes require test or documentation updates beyond the plan's manual verification.

---

**[IMPORTANT]** Pre-implementation commit detection is fragile

The plan describes a fallback chain for finding the pre-implementation commit: flow-log entry -> `git log --oneline -10` heuristic -> skip. The middle option ("identify the likely pre-implementation boundary") is vague and could produce incorrect diffs. An LLM scanning 10 log lines to guess a boundary is unreliable. The plan should either: (a) make flow-log the only source and skip git diff when unavailable, or (b) specify a concrete heuristic (e.g., look for a commit message matching a known pattern like "implement phase N"). The current middle ground adds complexity without reliability.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification lacks runtime/behavioral check

All verification tasks are "read the file and confirm structure." This is a skill definition change, so there is no server to curl, but the plan could include a trace-through with a synthetic scenario (e.g., "given these mock artifacts, what would the detection algorithm produce?"). The plan's existing "Trace-through" is structural (does it route correctly per scope type) but doesn't exercise the detection algorithm's logic paths. Adding one concrete worked example would strengthen confidence.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Batch table format not fully specified

The presentation format specifies columns (#, What, Why, Scope, Risk) and mentions AskUserQuestion with multiSelect, but doesn't specify the exact AskUserQuestion format (question text, option format). Since AskUserQuestion is a tool with specific parameters, the guidance should show the concrete invocation pattern so implementers don't have to guess. Other protocols in guidance.md (e.g., Debt Evaluation) specify the exact option strings.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured for a single-phase skill modification: clear goal alignment, good separation from Step 6c, correct scope-type routing, and thoughtful skip-when-clean behavior. The main gaps are: (1) graceful stop coverage has a real hole that could leave state inconsistent, (2) the pre-implementation commit heuristic adds unreliable complexity, and (3) verification is structural rather than behavioral. Addressing the two IMPORTANT issues and tightening verification would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
