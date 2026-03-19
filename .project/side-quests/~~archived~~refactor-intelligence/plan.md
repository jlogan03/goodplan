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

## Phase 1: Upgrade Step 9 — Refactor Intelligence

Replace the generic cleanup question in SKILL.md and add a Refactor Intelligence Protocol section to guidance.md.

### Tasks

- [ ] **Add Refactor Intelligence Protocol to guidance.md**: New section after the Debt Evaluation Protocol covering:
  - **Detection algorithm**: For the current scope's implementation artifacts, analyze:
    1. **Review feedback**: Scan `merged.md` files for reviewer comments flagging code quality, duplication, deferred cleanup, or "TODO" patterns. Look for MINOR issues that were acknowledged but not addressed.
    2. **Git diff analysis**: Run `git diff <pre-implementation-commit>...HEAD -- <changed-files>` to examine what was built. Look for: (a) duplicated code blocks (similar logic in 2+ locations), (b) pattern divergence from established conventions (different approaches to the same problem), (c) inline TODOs or FIXME comments introduced during implementation.
    3. **Rule of three**: If similar code appears in 3+ locations (files or functions), it warrants extraction into a shared abstraction.
    4. **Plan deviations**: Compare `plan-refined.md` tasks against actual implementation. Shortcuts or workarounds that deviate from the plan are refactor candidates.
  - **Classification**:
    - **Inline fix** (low risk): Contained to a single file or tightly-coupled module. Examples: extract function, rename for clarity, consolidate duplicates within one file, remove dead code.
    - **Side quest** (medium risk): Affects 2-5 files across a module boundary. Examples: extract shared utility, consolidate divergent patterns, introduce a common abstraction.
    - **Side quest** (high risk): Cross-cutting change affecting many files or public APIs. Examples: API redesign, data model refactoring, framework migration.
  - **Presentation format**: Batch table with columns: #, What (specific files/patterns), Why (improvement rationale), Scope (inline fix / side quest), Risk (low/medium/high). Use AskUserQuestion with multiSelect to let user pick which to act on. Include "Skip all" as a natural option (selecting nothing).
  - **Action handling**:
    - For selected inline fixes: apply the fix immediately (scope it, make the change, verify).
    - For selected side quests: draft a `goal.md` and present it for approval. Run `mkdir -p .project/side-quests/<name>/` and write `goal.md` only after user approves. Include in the goal: what to refactor, which files, why, risk level, and success criteria.
  - **Skip conditions**: If no refactoring opportunities are found after analysis, skip silently — no output, no AskUserQuestion. This is the expected common case for clean implementations.
  - **Pre-implementation commit detection**: To get a meaningful git diff, the agent needs the commit hash before implementation started. Use the flow-log: find the most recent `implement-plan` entry for the current scope with `"status":"complete"` and look at the commit before it. If no flow-log entry exists (e.g., quest implemented without `/implement-plan`), fall back to `git log --oneline -10` and identify the likely pre-implementation boundary, or skip git diff analysis.

- [ ] **Update SKILL.md Step 9**: Replace the current Step 9 content with the refactor intelligence flow. The updated step should:
  - **For slices/quests** (`$SCOPE_TYPE != initiative`):
    1. Load the Refactor Intelligence Protocol from `references/guidance.md`.
    2. Run the detection algorithm across the scope's implementation artifacts.
    3. If findings exist, present the batch table and use AskUserQuestion (multiSelect) for user selection.
    4. Apply inline fixes for selected low-risk items.
    5. Draft side quest `goal.md` proposals for selected medium+/high-risk items (present for approval before writing).
    6. If no findings, skip silently.
  - **For initiative scope** (`$SCOPE_TYPE = initiative`): Keep the current behavior — present cleanup findings (leftover temp files, stale state entries, dangling references) via AskUserQuestion. Do NOT run the refactor detection algorithm (refactors were caught during per-slice completions).

- [ ] **Update guidance.md Graceful Stop**: No changes needed — Step 9 is between Steps 6d and 10. If stopped during Step 9, the existing case (d) handling applies (signal tracking done, further steps pending). Verify this is still correct after the Step 9 rewrite.

### Verification

- Read updated SKILL.md Step 9. Confirm: initiative scope preserved as-is, slice/quest scope uses new detection algorithm, batch table presentation, multiSelect for action selection, silent skip when no findings.
- Read guidance.md Refactor Intelligence Protocol. Confirm: detection algorithm covers reviews + git diff + rule-of-three + plan deviations, classification has two tiers (inline fix / side quest) with three risk levels, presentation format matches the batch table design, action handling specifies immediate fix for inline and draft-then-approve for side quests.
- **Trace-through**: Walk through Step 9 for each scope type:
  - `top-level-slice`: runs detection → presents table → handles selections
  - `side-quest`: same as above
  - `initiative-slice`: same as above (it's a per-slice completion)
  - `initiative`: skips detection, keeps current cleanup behavior
- Verify graceful stop cases still cover Step 9 correctly.
- Verify Step 9 doesn't duplicate Step 6c's concerns (Step 6c = architectural debt at subsystem boundaries; Step 9 = code-level refactoring patterns).
