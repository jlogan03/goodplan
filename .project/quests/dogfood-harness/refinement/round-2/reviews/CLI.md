# TUI and CLI Review — Dogfood Test Harness Plan (Round 2)

## Issues

**[IMPORTANT]** Step 2 `phase2SliceCycle` missing explicit `submit-plan`, `submit-refinement`, `submit-implementation` fallback calls

Step 2's `phase2SliceCycle(name)` task description says: "For each slice: `goodplan slice:plan --slice <name> --json` -> `/create-plan` -> `/refine-plan` -> `/implement-plan` -> `/complete`. Check state transitions at each step." But the skills `/create-plan`, `/refine-plan`, and `/implement-plan` are supposed to call the submit commands themselves (`submit-plan --slice <name> --json`, `submit-refinement --slice <name> --json`, `submit-implementation --slice <name> --json`). When skills fail to call submit commands (which Step 1 already anticipates with the explore fallback pattern), the harness should explicitly attempt the submit calls as recovery. Step 2's "Add state recovery" task is generic ("check if state transitioned, if not attempt manual CLI transition"), but `phase2SliceCycle` should explicitly list the submit commands and their required stdin payloads as the recovery path for each sub-step. `submit-refinement` requires `{"scores":{...}}` stdin and may need `--override` to bypass the circuit breaker; `submit-plan` and `submit-implementation` require empty stdin. Without this, a skill that writes the plan file but forgets to submit will leave the slice stuck in `planning`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Step 3 quest lifecycle missing `quest:refine-plan` -> `BEGIN_QUEST_REFINEMENT` transition command

Step 3 task list item 4 says: `goodplan quest:refine-plan --quest add-readme --json` with transition `(plan-created -> refining)`. This is correct. However, the transition tables show that `plan-created` can also go directly to `plan-refined` via `COMPLETE_QUEST_REFINEMENT_ROUND` if scores pass on the first round (skip path). The plan uses `submit-refinement --quest add-readme --override --json` (step 6) to force through. This is fine for the harness, but the plan should note that `--override` is required because the harness constructs synthetic scores that may not meet the threshold. Without `--override`, the harness could get stuck in `refining` state if the synthetic scores are below threshold and `maxRounds` is reached (triggering `STATE_MAX_ROUNDS_REACHED` exit 3). The plan mentions `--override` but doesn't explain why it's necessary.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 2 `phase2EpicComplete` doesn't specify `verificationResults` stdin payload construction

Step 2 says: "Run `/complete` for the epic with stdin: `{"verificationResults": [...]}`. Verify `status === "completed"`." The `epic:complete` command requires `verificationResults` to be a non-empty array of objects matching `verificationResultSchema` (each with `index`, `passed`, `notes`). The plan should show the expected payload shape: `{"verificationResults": [{"index": 0, "passed": true, "notes": "..."}]}`. Without this, the implementer may construct an invalid payload (e.g., omitting `index` or `passed`), triggering exit 2 (validation error). Step 2's Phase 2 "Activate" step adds exactly one verification, so the harness needs exactly one result at index 0.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 1 `reset` command should handle pre-existing state gracefully

Step 1's `reset` task says: "Deletes nondet-eval's `.project/` directory" then runs `init` and `epic:create`. If nondet-eval has uncommitted source files or other state outside `.project/`, those survive the reset. More importantly, if the `rm -rf .project/` fails (permissions, file locks), the subsequent `init` will fail with a confusing error. The reset should verify `.project/` is fully removed before proceeding and handle the case where nondet-eval directory itself doesn't exist. The plan says "Error handling: check exit code at each step, abort with descriptive message on failure" which addresses the positive case, but doesn't mention the rm step itself.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 4 architecture proposal path should explicitly log the friction item text

Step 4 says: "No CLI command exists for proposal approval. Perform manual filesystem copy... Log this as a friction item (approval workflow needs CLI migration)." This is correctly identified as a known gap. However, the plan should specify the friction log entry content (severity, source, description) so the implementer doesn't have to invent it. Something like: `logFriction(4, "CLI gap", "No CLI command for architecture proposal approval — required manual copy of architecture-proposal/ to architecture/ and writing approved.md", "IMPORTANT")`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1's CRITICAL issue (exit code handling) is fully addressed in the updated plan — `goodplan()` helper now exposes exit code and parsed error JSON, with branching logic per `cli-interaction-conventions.md`. The quest lifecycle in Step 3 now correctly specifies all quest-specific CLI commands with `--quest` flags, stdin payloads, and state transitions. The `--json` flag is present on all CLI calls. Stdin payloads are documented for `quest:create`, `epic:create`, and submit commands. The remaining issues are: (1) Step 2's slice cycle lacks explicit submit-command fallbacks for state recovery (IMPORTANT — same pattern as the explore fallback but not spelled out), (2) the `verificationResults` payload shape for `epic:complete` needs to be concrete, and (3) minor clarity items. Fixing the two IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
