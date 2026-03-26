# TypeScript Review

## Issues

**[CRITICAL]** Bug 4 plan misidentifies the problem and proposes wrong fix location

The research file (`_codebase-context.md`) already determined that `copyMarkdownFiles()` copies ALL `.md` files from source directories — so sibling `.md` files (plan.md, plan-refined.md, etc.) ARE already copied during migration. The plan says to "scan each source directory for files/subdirectories not mentioned in the answers" and "emit a follow-up question asking the LLM whether they should be included." But the current code uses an allowlist approach for directories (`ARTIFACT_DIRS`) and copies all `.md` files from roots. The actual gap, if any, is about non-allowlisted subdirectories (not `.md` files).

The plan proposes adding `scanSiblings`/`siblingScan`/`unknownSiblings` logic to `src/core/rpc/migrate.ts` and a schema to `schemas.ts`, plus unit tests. But it doesn't specify:
1. What exactly constitutes an "unknown sibling" — non-`.md` files? Non-allowlisted directories? Both?
2. How follow-up questions integrate with the existing round-based Q&A protocol (rounds 1-3 are currently: inventory, epic-details, confirmation). Adding a mid-validation follow-up question breaks this sequential round structure.
3. Whether the new schema additions to `schemas.ts` need corresponding Zod schemas (they should, per INV-005) or are just TypeScript interfaces.
4. How `noUncheckedIndexedAccess` affects the new sibling scanning code — directory listing results need proper `undefined` handling.

The plan should either (a) clarify what the actual bug is with a concrete reproduction case, or (b) be removed/replaced with a more targeted fix if the research shows the original report was inaccurate.

Resolution: CODEBASE_EXPLORATION
Research: Re-examine the original bug report for Bug 4. Determine: what specific files are NOT being migrated that should be? If the issue is about non-allowlisted subdirectories, document which ones. If the issue is about artifact flag mapping in `buildMigrationState()`, that's a different fix than what the plan describes.

---

**[IMPORTANT]** Bug 4 sibling detection schema changes lack Zod schema definition

The plan says "Add the sibling scan schema to `src/commands/global/migrate/schemas.ts`" but doesn't specify whether this is a Zod schema or a plain TypeScript interface. The existing codebase consistently uses Zod schemas for all migration protocol types (`inventoryResponseSchema`, `epicDetailResponseSchema`, `confirmationResponseSchema`, `migrationStateSchema`, `migrationResultSchema`). Per INV-005, validation happens on every read/write boundary. Any new response type for sibling detection must be a Zod schema with `z.infer<>` for the TypeScript type, not a standalone interface.

The plan should explicitly state: "Define a Zod schema for the sibling detection response and infer the TypeScript type from it."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Bug 4 follow-up question mechanism doesn't fit the round protocol

The current migration protocol is strictly round-based: Round 1 (inventory) -> Round 2+ (epic details) -> Confirmation round. The plan says to "emit a follow-up question" during answer validation for sibling detection. But `validateSourcePathsForAnswer()` is a synchronous validation function that pushes to an `errors: string[]` array — it doesn't emit questions.

The plan needs to specify HOW this integrates:
- Is it a new round type (Round N+1: sibling review) injected between epic details and confirmation?
- Does it modify the `MigrationResult` discriminated union to add a new status variant?
- Does it extend the `MigrationState.status` enum (`z.enum(["in-progress", "confirming", "complete"])`) to include a "sibling-review" state?

Without this, an implementer would have to make significant architectural decisions not captured in the plan.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Verification commands use `bun run check` and `bun test` but package.json uses `vitest` not `bun test`

Phase 1 verification says "Run `bun run check`" and "Run `bun test`". The `package.json` has `"test": "vitest"` and `"check": "biome check ."`. So `bun run check` is correct (it runs biome), and `bun test` would work (bun delegates to vitest). However, the verification doesn't include TypeScript type checking. There is no `tsc` or type-check script in `package.json`. The plan should either add `tsc --noEmit` to verification or note that `biome check` does not perform type checking.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan uses `as` type assertions extensively in existing code — new code should avoid them

The existing `migrate.ts` uses `as` type assertions heavily (e.g., `validatedAnswers[QUESTION_IDS.EPIC_INVENTORY] as MigrationEpic[]`). While the plan doesn't need to fix existing code, any NEW code for Bug 4 (sibling scanning) should use proper type narrowing or Zod `.parse()` instead of `as` assertions. The plan should note this explicitly to avoid propagating the pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior grep for Bug 1 may be testing the wrong thing

The "Before" check `grep -c "Verification\|Success Criteria" skills/create-slices/SKILL.md` expects both section names to appear. But the research found that Bug 1 does NOT exist in `SKILL.md` — the duplication, if it exists, is in the goal.md template within Step 6. The Expected Behavior assertions should target the actual location of the duplication or be removed if the bug is already fixed.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Bug 4 is the only TypeScript/JavaScript code change in this plan, and it has fundamental issues: the problem statement doesn't match the codebase reality (research already showed `.md` files ARE copied), the proposed fix doesn't specify how it integrates with the round-based protocol, and it lacks Zod schema specifics. Bugs 1-3 and Phases 2-3 are markdown-only changes outside the TypeScript reviewer's domain. To reach 9+: clarify or remove Bug 4 based on actual reproduction, and if kept, specify the round protocol integration, Zod schema, and `noUncheckedIndexedAccess` handling.

## Summary
- Critical: 1
- Important: 3
- Minor: 2
