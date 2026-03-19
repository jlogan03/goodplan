# Merged Review Feedback — Refactor Intelligence Plan (Round 1)

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Pre-implementation commit detection is fragile and under-specified**
Files: plan (detection algorithm step 2), guidance.md (to-be-written protocol)
All three reviewers flagged this. The flow-log fallback chain (`flow-log entry -> git log heuristic -> skip`) has two problems: (a) flow-log.jsonl's required fields (`ts`, `phase`, `scope`, `status`, `summary`) don't include a `commit` field, so extracting a commit hash is unspecified; (b) the `git log --oneline -10` fallback gives no concrete heuristic for identifying the boundary. Options: specify how to derive the commit (e.g., correlate timestamp with `git log --after`), specify a concrete fallback heuristic (e.g., look for commit messages matching known patterns), or drop the fallback entirely and skip git diff when no flow-log entry exists.
Resolution: DIRECTLY_ACTIONABLE

**I2. Graceful stop coverage for Step 9 is incomplete**
Files: guidance.md graceful stop cases, plan task 3
Two reviewers flagged this (holistic as IMPORTANT, software-architecture as MINOR). The plan asserts "No changes needed" and references existing case (d): "System-profile updated, debt evaluation pending." But case (d) was written for Step 6b->6c flow, not for being stopped mid-Step-9 (e.g., after the batch table is presented but before inline fixes are applied). The plan should either add a new graceful stop case for Step 9 states or document explicit reasoning for why case (d) suffices. Specify what to do if verification shows it doesn't.
Resolution: DIRECTLY_ACTIONABLE

**I3. Inline fix application lacks iteration/count limit**
Files: SKILL.md Step 9, guidance.md protocol
Two reviewers flagged this (agent-skill as IMPORTANT, software-architecture as MINOR). Step 9 applies code changes for selected inline fixes but doesn't cap how many. If 10+ are surfaced and all selected, the agent runs a long unbounded sequence. Add a guard: "Apply up to 5 inline fixes per session; if more are selected, batch the remainder as a side quest." This aligns with existing skill patterns (e.g., implementation max 5 iterations per phase).
Resolution: DIRECTLY_ACTIONABLE

**I4. Step 6c / Step 9 boundary lacks deduplication mechanism**
Files: guidance.md (Debt Evaluation Protocol + new Refactor Intelligence Protocol)
Software-architecture reviewer only. The conceptual distinction (6c = architectural debt at subsystem boundaries, 9 = code-level patterns) is clear, but there's no mechanism to prevent the same finding appearing in both. E.g., duplication across modules could be flagged by both. Add a deduplication step: "Skip findings that overlap with debt items already presented in Step 6c" or cross-reference Step 6c results before presenting Step 9 table.
Resolution: DIRECTLY_ACTIONABLE

**I5. Guidance.md section placement is ambiguous**
Files: guidance.md
Agent-skill reviewer only. "New section after the Debt Evaluation Protocol" is ambiguous since multiple sections follow it. Specify: place the Refactor Intelligence Protocol section after the Signal Tracking Algorithm section (which corresponds to Step 6d), since Step 9 follows Step 6d in the skill flow.
Resolution: DIRECTLY_ACTIONABLE

**I6. No test coverage or documentation tasks in plan**
Files: plan tasks, project CI/lint configuration
Holistic reviewer only. The plan has no tasks for tests or documentation. Verification is entirely manual read-throughs. Need to check if the project has automated validation for skill files.
Resolution: CODEBASE_EXPLORATION

## MINOR Issues

**M1. Verification lacks runtime/behavioral check**
Files: plan verification section
Holistic reviewer. All verification is "read the file and confirm structure." Add one concrete worked example: given mock artifacts, trace through the detection algorithm's logic paths to exercise the actual detection logic, not just routing.
Resolution: DIRECTLY_ACTIONABLE

**M2. Batch table AskUserQuestion format not fully specified**
Files: guidance.md protocol (to-be-written)
Holistic reviewer. The presentation format specifies columns but not the exact AskUserQuestion invocation pattern. Other protocols in guidance.md (e.g., Debt Evaluation) specify exact option strings. Do the same here.
Resolution: DIRECTLY_ACTIONABLE

**M3. Detection algorithm `<changed-files>` source unspecified**
Files: guidance.md protocol step 2
Agent-skill reviewer. The git diff command includes `-- <changed-files>` but doesn't explain how to derive the file list. Clarify: use plan-refined.md task descriptions, implementation result files, or run an unscoped diff first then narrow.
Resolution: DIRECTLY_ACTIONABLE

**M4. No explicit handling for "user selects nothing"**
Files: guidance.md protocol action handling
Agent-skill reviewer. The plan mentions "Skip all" as an option but the action handling section only covers selected items. Add explicit: "If user selects nothing: proceed silently to the next step."
Resolution: DIRECTLY_ACTIONABLE

**M5. Plan deviations source overlaps with plan-learnings-and-feedback.md**
Files: guidance.md detection algorithm step 4
Agent-skill reviewer. Detection source 4 ("Compare plan-refined.md tasks against actual implementation") partially duplicates what plan-learnings-and-feedback.md already captures. Add: "Cross-reference plan-learnings-and-feedback.md first for already-identified deviations before running a fresh comparison."
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

**I1 — Pre-implementation commit detection:** In the guidance.md Refactor Intelligence Protocol, either (a) specify how to extract the commit hash from flow-log (e.g., correlate `ts` with `git log --after=<ts> --before=<ts+1min> --format=%H` to find the closest commit), or (b) simplify: make flow-log the only source and when unavailable, skip git diff analysis entirely (the other three detection sources still provide coverage). Option (b) is recommended — simpler, more reliable, avoids the fragile heuristic.

**I2 — Graceful stop:** Add a new graceful stop case to the plan's task 3: "Step 9 in progress — refactor table presented, fixes pending application. Recovery: re-run Step 9; already-applied inline fixes are idempotent, side quest goals not yet written are harmless to re-detect." Alternatively, if case (d) truly covers this, add a sentence in the plan explaining why (e.g., "case (d) applies because Step 9 only writes to `.project/` state and any partial code changes are independently safe").

**I3 — Inline fix cap:** In the SKILL.md Step 9 description and the guidance.md protocol, add: "Apply up to 5 inline fixes per Step 9 run. If the user selects more, apply the first 5 and create a side quest for the remainder."

**I4 — Step 6c/9 deduplication:** In the guidance.md Refactor Intelligence Protocol, add a preliminary step: "Before presenting findings, cross-reference with any debt items surfaced in Step 6c of this completion run. Remove duplicates, keeping the Step 6c framing for items that appeared there."

**I5 — Section placement:** Change the plan to specify: "Add the Refactor Intelligence Protocol section in guidance.md after the Signal Tracking Algorithm section (Step 6d), before the Archive Convention section."

**M1 — Behavioral verification:** Add a verification task: "Trace through with a concrete scenario — e.g., a slice that introduced a duplicated utility function across two modules. Confirm the detection algorithm would surface it via git diff (source 2) and codebase scan (source 1), that it routes to inline-fix (not side quest), and that the table renders correctly."

**M2 — AskUserQuestion format:** In the guidance.md protocol, specify the exact AskUserQuestion invocation: question text template, option format (e.g., `"[inline] #1: Extract shared utility from X and Y"`), and multiSelect parameter.

**M3 — Changed-files derivation:** In detection algorithm step 2, add: "Derive the changed-files list from the git diff itself: first run `git diff <commit>...HEAD --name-only` to get all changed files, then run the full diff scoped to those files."

**M4 — Skip-all handling:** In the action handling section, add: "If user selects nothing (skip all): log 'refactor-intelligence: skipped' to flow-log and proceed to the next step."

**M5 — Plan deviations cross-reference:** In detection algorithm step 4, add: "First read plan-learnings-and-feedback.md for already-identified deviations. Only flag deviations not already captured there."

## RESEARCH_NEEDED

None.

## CODEBASE_EXPLORATION

**I6 — Test/documentation requirements for skill changes:**
What to look up: Does the project have automated validation (lint, schema checks, CI) for skill files? Does `skill-conventions.md` or any other project doc require tests or documentation updates when skills change?
Tool strategy: `Glob` for CI config files (`.github/workflows/*.yml`, `Makefile`, etc.), `Read` skill-conventions.md, `Grep` for "test" or "lint" in project configuration.
Why it matters: If automated checks exist, the plan needs a task to update them. If not, the manual verification approach is acceptable.

## Contradictions Resolved

1. **Graceful stop severity:** Holistic rated IMPORTANT, software-architecture rated MINOR. Merged as IMPORTANT — the holistic reviewer provided stronger reasoning (state inconsistency risk) and this is a cross-cutting concern where the generalist's broader view is appropriate.

2. **Inline fix cap severity:** Agent-skill rated IMPORTANT, software-architecture rated MINOR. Merged as IMPORTANT — agent-skill reviewer is the domain specialist for skill execution behavior, and their reasoning (alignment with existing iteration limits) is more specific.

3. **No contradictions in substance** — all reviewers agreed on the nature of issues, differing only in severity and specificity.

## Unresolved (USER_INPUT required)

None. All issues are either DIRECTLY_ACTIONABLE or CODEBASE_EXPLORATION.
