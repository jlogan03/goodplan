# Quality Validation

## What We're Building
Run the complete consolidated workflow end-to-end with Opus powering both the test harness (simulated user responses) and the skills/sub-agents. This validates that the 12-skill system works at production quality — not just structurally correct outputs, but architecturally sound plans, insightful reviews, and coherent implementations. Bugs and quality issues found here are fixed before documentation.

## Behavior
1. Create a realistic test fixture: a TypeScript project with 3-5 source files, real dependencies, at least one test file, and a project idea that requires real architectural decisions (similar to the existing validate.ts flashcards project but exercising more of the pipeline).
2. Run the full workflow end-to-end with Opus:
   - `/gp:init` on the fixture (onboard mode)
   - `/gp:create-epic` — full 6-phase pipeline
   - `/gp:plan-slice` for the first slice
   - `/gp:implement` for the first slice
   - `/gp:create-side-quest` — capture and plan a side quest
   - `/gp:audit` in architecture mode
   - `/gp:complete-epic` after all slices
3. All simulated user responses powered by Opus (via `--model claude-opus-4-6` in test harness).
4. Verify quality of outputs using measurable proxy metrics:
   - Architecture files: `_overview.md` >= 500 characters, contains at least 3 `##` subsystem headings
   - Plans: at least 3 phases, each containing at least one concrete file path
   - Reviews: at least one issue with IMPORTANT or CRITICAL severity tag in refinement output
   - Implementation: code compiles (`bun build`), linter passes (`bun lint`), tests pass (`bun test`)
   - Completion: at least 2 learnings, each >= 100 characters
5. Fix any bugs, quality issues, or pattern violations discovered during the run.
6. Run the orchestrator context discipline check — verify no orchestrator-level Read calls on full artifacts across all pipeline skills.

## Verification
- [ ] Run `bun tools/dogfood/validate-consolidated.ts --model claude-opus-4-6` — full workflow completes without errors
- [ ] Architecture output: `_overview.md` >= 500 chars, covers at least 3 subsystems (count `##` headings)
- [ ] Plan output: at least 3 phases with concrete file paths (grep for path-like strings)
- [ ] Review output: at least one IMPORTANT or CRITICAL severity tag in refinement logs
- [ ] Implementation output: `bun build` succeeds, `bun lint` passes, `bun test` passes
- [ ] Completion output: at least 2 learnings, each >= 100 characters
- [ ] Orchestrator discipline: zero violations across all pipeline runs (no Read calls on full artifacts by orchestrators)
- [ ] Total cost per full run documented in test output — expected range $5-15 per full Opus run (based on ~110K orchestrator context estimate). Flag if cost exceeds $20 as potential context leak or runaway loop

Run `validate-consolidated.ts` with Opus. This is the production-quality gate — the test should take 15-30 minutes and exercise the entire workflow. Review the output artifacts for quality (not just existence). If any output is boilerplate, generic, or low-quality, investigate whether it's a skill issue, agent definition issue, or model issue, and fix it. Document the total API cost per run.

## Scope Boundaries
**In scope:** Realistic fixture creation, full end-to-end Opus-powered test, quality assertions on output, bug fixes discovered during validation, orchestrator discipline verification, cost documentation
**Out of scope:** Performance optimization (acceptable if slow). Multi-project testing (one realistic project is sufficient). CI integration (manual runs for now).

**Bug fix strategy:** Fixes commit to the same branch with clear messages referencing the originating slice. Significant fixes are captured as learnings.
