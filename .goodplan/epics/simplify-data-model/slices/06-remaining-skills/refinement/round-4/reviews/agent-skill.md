# Agent Skill Review — Remaining Skills + Cleanup (Round 4)

## Issues

**[MINOR]** Phase 2: "First positional argument" phrasing persists from round 2

Phase 2, task 1 still reads: "Parse mode from first positional argument: `/gp:audit architecture`..." The term "positional argument" implies CLI-style `argv` parsing, which does not apply in a skill context. Skills receive context from natural language invocation text. The examples themselves are correct, but an implementer may write formal arg-parsing code that fails at runtime. Replace "Parse mode from first positional argument" with "Extract mode from the user's invocation text" — the rest of the sentence is fine as-is.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: Onboard-phase agent write target unspecified — risk of HMAC bypass

The plan says the onboard-phase agent has "full tool access (Read, Grep, Glob, Write, WebSearch)" and "writes conventions.md, architecture files, idea.md based on repo analysis", but does not specify whether the agent writes to a temp dir or directly to `.goodplan/`. This was flagged in round 3. The existing `architecture-phase.md` agent writes directly to CLI-managed directories, so there is precedent for either pattern. However, the `init` skill runs `gp init` before spawning the agent, meaning `.goodplan/` exists and is HMAC-protected. If the agent writes directly to `.goodplan/`, those writes bypass HMAC (per the CLAUDE.md rule: "Never write directly into .goodplan/; HMAC and hooks are integrity safeguards; CLI commands only"). The plan should specify one of: (a) agent writes drafts to `<tmpdir>/` and returns `filesWritten` paths, orchestrator copies via `gp` CLI commands where available or Bash `cp` where no CLI command exists; or (b) agent uses `gp` CLI commands for all `.goodplan/` writes. Option (a) is safer and matches the explore-phase pattern.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: No runtime verification of new reviewer agents

Round 3 flagged the absence of end-to-end test coverage for the 14 new reviewer agents (only file existence and build-time checks). This is still unaddressed. A single lightweight test (spawn `reviewer-python` or `reviewer-backend` with a small fixture, verify it returns valid JSON with `status`, `summary`, `score`, `review` fields) would catch `@` reference resolution failures that build-time checks cannot detect. If a standalone test is impractical, add a note to Phase 5 verification that the Phase 1/Phase 2/Phase 3 test harness scripts exercise the refinement loop, which implicitly invokes reviewers — and specify which of the new reviewers would be exercised.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: Reference file copy for init/references/ happens in Phase 4 but init skill is created in Phase 3 — dependency ordering concern

Phase 3 creates `skills/init/SKILL.md` and `agents/onboard-phase.md`, but the 5 reference files from `skills/onboard-repo/references/` are not copied until Phase 4 (the "For `skills/init/`" task). If someone runs Phase 3 verification (`bun tools/dogfood/test-init.ts`) before Phase 4, the onboard-phase agent may fail because its `@` references to `skills/init/references/` files will not resolve. This is acceptable if phases are always executed sequentially and Phase 3 verification is understood to be partial until Phase 4 completes — but this should be explicitly noted. Add a note to Phase 3 verification: "Onboard mode verification requires Phase 4 reference file copy to complete. Phase 3 verification covers new-project mode and skill structure only."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The two round 3 IMPORTANT issues (hardcoded reviewer lists in create-epic/plan-slice, CLAUDE.md stale references) have been resolved with well-specified tasks. Audit return validation (schema check + FAILED handling) was added to Phase 2. The iteration-loop.md update task was added to Phase 5. The plan is comprehensive, well-sequenced, and implementable. The four remaining MINORs are polish items: two are carry-forwards from rounds 2-3 (positional-argument wording, reviewer runtime testing) that have not changed, one is a round 3 carry-forward (onboard-phase write target), and one is a new observation about cross-phase dependency clarity. None would cause implementation failure — they reduce ambiguity for the implementer.

## Summary

- Critical: 0
- Important: 0
- Minor: 4
