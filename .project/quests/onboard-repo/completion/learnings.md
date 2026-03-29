# Learnings — onboard-repo

## Plan-specified name priority orders should be validated against existing skill conventions
_Source: onboard-repo_

The plan specified project name priority as directory name → manifest name → README title. During implementation review, this was flagged as inverted — other skills (create-epic) use manifest name as primary. Plans for new skills should cross-reference existing skill conventions during refinement, not just during implementation.

## SDK query() stream requires explicit break after result message
_Source: onboard-repo_

The Claude Agent SDK's `query()` async generator can hang indefinitely after emitting the result message if subagents were spawned during the session. The `for await` loop never terminates naturally. Fix: `break` immediately after receiving any `message.type === "result"`. This applies to all dogfood test harnesses, not just this one.

## Fixture repos need dynamic author identity for expertise profiling tests
_Source: onboard-repo_

Hardcoded fixture commit authors (Alice Dev, Bob Eng) make expertise profiling tests meaningless because the test user isn't among the authors. Fixture generation scripts should read `git config user.name` / `git config user.email` and use the actual user as one of the commit authors.

## CJS-to-ESM migration fixtures must place CJS files outside tsconfig include scope
_Source: onboard-repo_

When planting CJS/ESM coexistence in a TypeScript fixture, CJS files with `require()` must use `.cjs` extension or be placed outside `src/` (e.g., in `scripts/`). TypeScript's `verbatimModuleSyntax` flag will error on CJS syntax in `.ts` files within the include scope.

## Skill re-entry logic must account for partial vs full project detection
_Source: onboard-repo_

A naive "if .project/ exists, stop" guard makes all downstream re-entry guards (Steps 3-12) unreachable. The pre-flight check should distinguish between a fully-onboarded project (has idea.md + conventions.md + architecture) and a bare partial run (just project.json from a crashed init). Use `goodplan status --json` for structured detection.

## gh pr list --json `reviews` field does not contain inline code review comments
_Source: onboard-repo_

The `reviews` field from `gh pr list/view --json` contains top-level review verdicts only, not inline code comments. Inline review comments require `gh api repos/{owner}/{repo}/pulls/{number}/comments`. Skills that analyze PR comments need this three-tier access pattern: list → view → API.
