# Tracer Bullet Quality Review

## Summary

Slice 01 is an excellent tracer bullet — it builds new infrastructure and immediately exercises it end-to-end with a real skill migration. Slices 03-05 are well-structured mechanical rollouts with clear grep-based verification. The main weaknesses are: slice 02 packs too many unrelated changes with weak end-to-end verification tying them together, slices 04-05 rely heavily on manual slash-command invocation against test state that's hand-waved, and the `state` command itself lacks automated test coverage in the plan.

## Issues

### Critical

**goal-refining.md [02-show-status-enrichment]: Five unrelated deliverables bundled with no unifying end-to-end verification.** This slice combines `show --json` artifacts, `status --json` file arrays, semver compatibility checking, `begin()` RPC factoring into 5 dedicated functions, and `context?`/`paths?` result type fields. These are five independent concerns. The verification section tests each in isolation but never exercises them together as a skill would. A skill migration would be the natural end-to-end proof, but no skill is migrated in this slice. This means the RPC refactoring (the riskiest change — it restructures the call interface for `learning:rollup`, `epic:add-verification`, `decision:create`, `decision:update`, and verification updates) ships without being exercised by any consumer. The only regression check is "run `bun test`" which validates existing behavior, not new behavior.

**Recommendation:** Either split into two slices (enrichments + RPC refactoring) each with a tracer-bullet skill consumer, or migrate at least one skill (e.g., `complete`, which uses `learning:rollup` and result `paths`) in this slice to exercise the RPC changes end-to-end.

### Important

**goal-refining.md [01-state-command-convention-doc-tracer]: No automated tests for the new `state` command.** The verification section describes manual CLI invocations but does not mention adding unit or integration tests. The existing codebase has thorough test coverage (unit tests for every command, integration workflow tests, fitness tests). Shipping a new command without tests breaks the established pattern and leaves no regression safety net. The `--query` + `--offset`/`--limit` interaction has edge cases (non-array results, empty arrays, offset beyond length) that manual verification will miss.

**Recommendation:** Add to success criteria: integration test for `state --json`, `state --json --query`, pagination, and error cases. This aligns with the existing test infrastructure in `tests/integration/` and `tests/unit/commands/`.

**goal-refining.md [04-exploration-architecture-skills]: Verification requires specific epic states that aren't described how to set up.** Step 1 says "On a test epic in `created` status, run `/explore`." Step 2 says "On a test epic in `explored` status." But how is this test state created? The CLI itself could do it (`goodplan epic:create` + transitions), but the verification section doesn't specify. This makes verification non-reproducible. Same issue in slice 05 ("On a test slice in `created` status").

**Recommendation:** Each verification step should specify the setup commands, e.g., "Create a test project with `goodplan init`, create an epic with `goodplan epic:create`, then run `/explore`." Or reference a shared test fixture setup script.

**goal-refining.md [05-planning-execution-skills]: Verification step 1 has a contradictory setup.** It says "begin planning with `goodplan slice:plan`, then run `/create-plan`." But `slice:plan` IS the begin-planning transition (BEGIN_PLAN). If the CLI command already begins planning, running `/create-plan` (which also begins planning) would either fail (already in planning) or be redundant. The skill should be the one calling `slice:plan`, not the manual setup.

**Recommendation:** Clarify: setup puts the slice in `created` status, then `/create-plan` is invoked and it calls `slice:plan` internally. The verification checks that the skill made the correct CLI calls.

**goal-refining.md [03-core-skill-validation]: "Out of scope: CLI code changes (should be complete from slices 01-02)" is an untested assumption.** The whole point of slice 03 is to validate the convention doc against complex workflows. It's likely that `create-epic` and `complete` will surface CLI gaps (missing fields, incorrect error codes, edge cases in `init --json` flow). The scope boundary creates a contradiction with the slice's stated purpose of "surfacing convention doc gaps before mechanical rollout." Convention doc gaps often imply CLI gaps.

**Recommendation:** Explicitly allow minor CLI fixes in scope for slice 03. The convention doc says "CLI conforms to skills" — if a skill needs something the CLI doesn't provide, blocking until a future slice defeats the purpose.

### Minor

**goal-refining.md [01-state-command-convention-doc-tracer]: "Three deliverables" description lists four items.** The opening paragraph says "Three deliverables: (1)... (2)... (3)... and (4)..." — this is a minor editorial issue but creates confusion about scope size.

**goal-refining.md [02-show-status-enrichment]: Version compatibility verification is fragile.** "Temporarily set `project.json.version` to a higher minor version, run any command, verify warning on stderr. Restore." Manual file editing as a verification step is error-prone and leaves the project in a dirty state if interrupted. An integration test with a temp directory would be more reliable.

**goal-refining.md [06-dogfooding]: Success criteria overlap heavily with slices 03-05.** The grep checks and "zero direct file access" criteria are already verified in each migration slice. Dogfooding should focus on emergent issues from the full workflow sequence, not re-verify what previous slices already proved. The unique value is exercising cross-skill transitions and finding ergonomic gaps — the success criteria should emphasize those.

**goal-refining.md [04-exploration-architecture-skills] and [05-planning-execution-skills]: Missing verification for `refine-architecture` and `refine-slices`.** Slice 04 verifies explore, create-architecture, and start-epic, but skips refine-architecture and audit-architecture. Slice 05 omits `create-slices` and `refine-slices` from explicit verification steps (only `create-plan`, `refine-plan`, `implement-plan` are verified). The grep check catches source-level compliance but not runtime correctness.

**Recommendation:** Either add verification steps for every skill, or explicitly note which skills are verified only via grep (accepting the risk).

## Score: 6/10

The tracer bullet in slice 01 is strong and the overall sequencing is logical. But slice 02 is an unexercised code risk (RPC refactoring with no consumer), automated test coverage is absent from the plan, and verification steps in slices 04-05 are underspecified. The plan would benefit from: (1) splitting or augmenting slice 02 with a consumer, (2) requiring automated tests for new CLI commands, and (3) specifying reproducible test state setup in verification sections.
