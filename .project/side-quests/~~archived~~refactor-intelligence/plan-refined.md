# Plan: Refactor Intelligence for /complete Step 9

## Overview

Upgrade `/complete` Step 9 from a generic "want a cleanup pass?" to proactive identification of specific refactoring opportunities with scope/risk classification and side quest proposals. The current Step 9 asks a yes/no question; the upgraded version analyzes implementation artifacts to surface concrete refactors, presents them as a batch table, and lets the user select which to act on.

**Slug**: `refactor-intelligence`

**Key design decisions**:
- Batch presentation (table of findings + multiSelect) rather than per-finding AskUserQuestion — less friction, especially when nothing is found
- Skip for initiative scope (`$SCOPE_TYPE = initiative`) — initiative completion is a meta-operation; refactors were caught during individual slice completions
- Detection sources: implementation reviews (`merged.md`), git diff of changes, plan-vs-reality deviations, rule-of-three duplication
- Classification: inline fix (low risk, single file/module) vs side quest (medium+ risk, cross-cutting)
- Distinct from Step 6c (architectural debt) — Step 9 targets code-level patterns (duplication, divergent patterns, warranted abstractions), not subsystem-boundary concerns
- Step 9 inline fixes are a scoped exception to `/complete`'s read-only-code pattern, justified by the low friction of small contained changes

## Phase 1: Upgrade Step 9 — Refactor Intelligence

Replace the generic cleanup question in SKILL.md and add a Refactor Intelligence Protocol section to guidance.md.

### Tasks

- [x] **Add Refactor Intelligence Protocol to guidance.md**: New section after the Signal Tracking Algorithm section (Step 6d), before the Archive Convention section, covering:
  - **Detection algorithm**: For the current scope's implementation artifacts, analyze:
    1. **Review feedback**: Scan `merged.md` files for reviewer comments flagging code quality, duplication, deferred cleanup, or "TODO" patterns. Look for MINOR issues that were acknowledged but not addressed.
    2. **Git diff analysis**: Run `git diff <pre-implementation-commit>...HEAD -- <changed-files>` to examine what was built. Derive the changed-files list from the diff itself: first run `git diff <commit>...HEAD --name-only` to get all changed files, then run the full diff scoped to those files. Look for: (a) duplicated code blocks (similar logic in 2+ locations), (b) pattern divergence from established conventions (different approaches to the same problem), (c) inline TODOs or FIXME comments introduced during implementation.
    3. **Rule of three**: If similar code appears in 3+ locations (files or functions), it warrants extraction into a shared abstraction.
    4. **Plan deviations**: First read `plan-learnings-and-feedback.md` for already-identified deviations. Only flag deviations not already captured there. Then compare `plan-refined.md` tasks against actual implementation. Shortcuts or workarounds that deviate from the plan are refactor candidates.
  - **Classification**:
    - **Inline fix** (low risk): Contained to a single file or tightly-coupled module. Examples: extract function, rename for clarity, consolidate duplicates within one file, remove dead code.
    - **Side quest** (medium risk): Affects 2-5 files across a module boundary. Examples: extract shared utility, consolidate divergent patterns, introduce a common abstraction.
    - **Side quest** (high risk): Cross-cutting change affecting many files or public APIs. Examples: API redesign, data model refactoring, framework migration.
  - **Presentation format**: Batch table with columns: #, What (specific files/patterns), Why (improvement rationale), Scope (inline fix / side quest), Risk (low/medium/high). Use AskUserQuestion with multiSelect to let user pick which to act on. Specify the exact AskUserQuestion invocation: question text template summarizing the findings count, option format (e.g., `"[inline] #1: Extract shared utility from X and Y"` or `"[side-quest] #3: Consolidate auth patterns across modules"`), and multiSelect parameter. Include "Skip all" as a natural option (selecting nothing).
  - **Action handling**:
    - For selected inline fixes: apply the fix immediately (scope it, make the change, verify). Apply up to 5 inline fixes per Step 9 run. If the user selects more than 5, apply the first 5 and create a side quest for the remainder.
    - For selected side quests: draft a `goal.md` and present it for approval using AskUserQuestion with the draft content and options "Approve and create / Edit first / Skip". Run `mkdir -p .project/side-quests/<name>/` and write `goal.md` only after user approves. Include in the goal: what to refactor, which files, why, risk level, and success criteria.
    - If user selects nothing (skip all): no flow-log entry needed (Step 10 captures overall completion). Proceed to the next step.
  - **Skip conditions**: If no refactoring opportunities are found after analysis, skip silently — no output, no AskUserQuestion. This is the expected common case for clean implementations.
  - **Pre-implementation commit detection**: To get a meaningful git diff, the agent needs the commit hash before implementation started. `/implement-plan` commits each phase with a `[<plan-slug>]` prefix in the commit message. Find the first such commit and take its parent: `first_impl_commit=$(git log --oneline --all --grep="\\[<plan-slug>\\]" --reverse --format=%H | head -1)` then `pre_impl_commit=$(git rev-parse "${first_impl_commit}^" 2>/dev/null)`. If no matching commits are found (e.g., quest implemented without `/implement-plan`, or commit messages don't follow the convention), skip git diff analysis entirely — the other three detection sources (review feedback, rule-of-three, plan deviations) still provide sufficient coverage.
  - **Step 6c deduplication**: Before presenting findings, cross-reference with any debt items surfaced in Step 6c of this completion run. Remove duplicates, keeping the Step 6c framing for items that appeared there.

- [x] **Update SKILL.md Step 9**: Replace the current Step 9 content with the refactor intelligence flow. The updated step should:
  - **For slices/quests** (`$SCOPE_TYPE != initiative`):
    1. Load the Refactor Intelligence Protocol from `references/guidance.md`.
    2. Run the detection algorithm across the scope's implementation artifacts.
    3. If findings exist, present the batch table and use AskUserQuestion (multiSelect) for user selection.
    4. Apply inline fixes for selected low-risk items (up to 5 per run; overflow becomes a side quest).
    5. Draft side quest `goal.md` proposals for selected medium+/high-risk items (present for approval before writing).
    6. If no findings, skip silently.
  - **For initiative scope** (`$SCOPE_TYPE = initiative`): Keep the current behavior — present cleanup findings (leftover temp files, stale state entries, dangling references) via AskUserQuestion. Do NOT run the refactor detection algorithm (refactors were caught during per-slice completions).

- [x] **Update guidance.md Graceful Stop**: Add a new graceful stop case for Step 9: **(d2)** "Step 9 in progress — refactor table presented, fixes pending application. Recovery: re-run Step 9; re-running detection on the updated codebase will not re-surface already-applied fixes, because the codebase has already changed. Side quest goals not yet written are harmless to re-detect." Case (d) covers being stopped *before* Step 9 starts (signal tracking done, further steps pending). Case (d2) covers being stopped *during* Step 9 (refactor detection started or table presented but actions incomplete). Verify both cases are correct after the Step 9 rewrite.

### Verification

- Read updated SKILL.md Step 9. Confirm: initiative scope preserved as-is, slice/quest scope uses new detection algorithm, batch table presentation, multiSelect for action selection, silent skip when no findings.
- Read guidance.md Refactor Intelligence Protocol. Confirm: detection algorithm covers reviews + git diff + rule-of-three + plan deviations, classification has two tiers (inline fix / side quest) with three risk levels, presentation format matches the batch table design (including exact AskUserQuestion invocation pattern), action handling specifies immediate fix for inline (capped at 5) and draft-then-approve for side quests, skip-all handling logs to flow-log, and Step 6c deduplication step is present.
- **Trace-through**: Walk through Step 9 for each scope type:
  - `top-level-slice`: runs detection → presents table → handles selections
  - `side-quest`: same as above
  - `initiative-slice`: same as above (it's a per-slice completion)
  - `initiative`: skips detection, keeps current cleanup behavior
- Verify graceful stop cases still cover Step 9 correctly — both case (d) (stopped before Step 9) and case (d2) (stopped during Step 9). For (d2): trace through the scenario where the agent is stopped mid-inline-fix. Confirm that re-running Step 9 detection on the partially-modified code either re-detects the issue correctly (if partially applied) or skips it harmlessly (if fully applied — the code no longer matches the pattern).
- Verify Step 9 doesn't duplicate Step 6c's concerns (Step 6c = architectural debt at subsystem boundaries; Step 9 = code-level refactoring patterns). Confirm the deduplication step prevents overlap.
- **Behavioral trace-through**: Walk through a concrete scenario — e.g., a slice that introduced a duplicated utility function across two modules. Confirm the detection algorithm would surface it via git diff (source 2) and codebase scan (source 1), that it routes to inline-fix (not side quest), and that the table renders correctly with the specified AskUserQuestion format.
