# Agent Skill Review: complete-epic/SKILL.md

Phase: Phase 2: Fix complete-epic Bugs (iteration 2)

## Iteration 1 Fix Verification

All five iteration 1 issues have been addressed:

1. **CRITICAL (epic:complete flag)**: Fixed. Line 337 now uses `$GP epic:complete --epic $EPIC_NAME --json` with `--epic` as a CLI flag, not in stdin payload. Payload schema description at lines 340-341 correctly documents `verificationResults` and `learnings` as the stdin fields.

2. **IMPORTANT (field name `verification` vs `verifications`)**: Fixed. All references now use `verifications` (plural), matching `epicSchema` at `src/schemas/entities/epic.ts:41`. Step 4e task prompt (line 162) and Step 7a (line 278) both use the correct plural form.

3. **IMPORTANT (verification entry field names)**: Fixed. Step 7a (line 278) now correctly lists `description`, `status`, `addedDuring`, and `modifiedDuring` as the fields, matching `verificationSchema`.

4. **MINOR (vague "independently verify" language)**: Fixed. Step 7a now says "The orchestrator validates completeness of the agent's assessments" (line 270) which accurately describes the pass-through-with-validation pattern.

5. **MINOR (agent can't access verification criteria)**: Fixed. Step 4e task prompt now includes verification criteria as input data (lines 155-156), sourced from `gp epic:show --json`. The agent no longer needs Bash to discover them.

## Issues

**[CRITICAL]** "Mark as accepted" flow will fail at CLI level
Step 7b offers a "Mark as accepted" option that proceeds with `passed: false` verification results in the payload (line 310). However, the state machine at `src/core/state/transitions/epic-lifecycle.ts:102-113` hard-rejects any payload containing `passed: false` results, returning a `STATE_VERIFICATION_FAILED` error. The "Mark as accepted" path is unreachable -- the CLI will reject the payload before the state transition occurs.

Two possible fixes:
- (a) If user override is intended, the orchestrator must flip `passed` to `true` on accepted entries before submitting, so the CLI receives an all-passing payload. The `notes` field should indicate the override (e.g., "User override: originally assessed as not met. {original notes}").
- (b) If the state machine is the source of truth and overrides are not supported, remove the "Mark as accepted" option entirely and only offer "Fix and retry" or "Cancel completion".

Option (a) preserves the user's agency while staying compatible with the CLI. Option (b) is simpler but reduces flexibility.
File: skills/complete-epic/SKILL.md:310
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Learnings rollup reads file into orchestrator context without size guard
Step 7c (line 315) reads `consolidated-learnings.md` into orchestrator context to construct the CLI payload. This is correctly noted as a justified exception to context discipline. However, after a large epic with many slices, this file could be substantial. Consider adding a note that if the file exceeds a reasonable threshold (e.g., 200 lines), the orchestrator should spawn a sub-agent to parse and return structured learning objects rather than reading the full file inline.
File: skills/complete-epic/SKILL.md:315
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
All iteration 1 issues are cleanly fixed. The verification criteria flow (Step 4e passing data to agent, Step 7a validating agent's assessments, Step 7d submitting to CLI) is now well-structured and matches the actual CLI schema. The `quest:create` stdin pattern (line 240) correctly matches `createQuestInputSchema` (`{name, goal}`). The one remaining critical issue -- "Mark as accepted" producing a payload the CLI will reject -- is a logic error that will cause a runtime failure on a specific user choice. Fixing it brings the score to 9+.

## Summary
- Critical: 1
- Important: 0
- Minor: 1
