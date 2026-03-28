# Merged Review: Phase 4 — Slice CLI Commands

**Scores:** Generalist 9/10 | TypeScript 7/10 | TUICLI 8/10

---

## Critical (2) — Must fix before merge

**[CRITICAL-1] `exactOptionalPropertyTypes` violation in `slice:complete`**
`completeSliceInputSchema` uses `.optional()` on `deferred`, `learnings`, and `architectureDelta`, giving types `T[] | undefined`. Passing these directly into `CompleteInput` union members (which use `?:` optional properties) is rejected by `exactOptionalPropertyTypes: true` — `undefined` is not assignable to a missing key. Fix: use conditional spread before passing to `complete()`.
File: `src/commands/slice/complete.ts:41`

**[CRITICAL-2] `required_error` is not a valid Zod v4 option**
`z.boolean({ required_error: "verificationPassed is required" })` uses a key that does not exist in Zod v4. Use `error` (or `message` depending on exact version). Verify the project's Zod version and apply the correct error customization API.
File: `src/schemas/commands/slice.ts:31`

---

## Important (2) — Fix soon, not blocking

**[IMPORTANT-1] `slice:list` human-readable output omits status coloring**
Status is printed as plain text, while `slice:show` and all mutation commands use `pc.green()` / `pc.yellow()` etc. A slice list often contains a mix of statuses (completed, abandoned, in-progress), making color more valuable here than anywhere else. `epic:list` has the same gap; noting here as the higher-value fix.
File: `src/commands/slice/list.ts:55`

**[IMPORTANT-2] `--json --quiet` combo is a silent no-op across all commands**
`slice:create` (and epic commands) manually check `args.json` then `!args.quiet`. Because `output()` already returns early on quiet, `--json --quiet` silently drops JSON output instead of JSON winning. This is a codebase-wide pattern issue inherited from epic commands — not a regression — but scripting callers would expect JSON to win. Worth fixing when addressing output handling globally.
File: `src/commands/slice/create.ts:50`

---

## Minor (4) — Polish

**[MINOR-1] `slice:show` does not display `completed` timestamp**
Human-readable output shows `Created:` and `Updated:` but not `Completed:` for completed slices. `slice:list` already shows the completed timestamp; `slice:show` should too.
File: `src/commands/slice/show.ts:43`

**[MINOR-2] `slice:show` omits `verificationPassed` and `abandonReason` fields**
Completed slices don't surface whether verification passed; abandoned slices don't show the abandon reason. Both are useful for human operators debugging state.
File: `src/commands/slice/show.ts:43`

**[MINOR-3] Missing `--quiet` tests for `slice:complete` and `slice:abandon`**
Tests cover quiet mode for `slice:create`, `slice:list`, `slice:show`, and `slice:plan` but not for the two terminal-state commands. Gaps two quiet-mode test cases from full output-mode coverage.
File: `tests/unit/commands/slice/slice-commands.test.ts`

**[MINOR-4] Import order in `slice/create.ts` inconsistent with epic commands**
`resolveProjectDir` is imported before `begin`; epic commands place `begin` first. Cosmetic only — Biome does not flag it.
File: `src/commands/slice/create.ts:3`

---

## Deduplification notes

- MINOR-4 (import order) raised by both TypeScript and Generalist reviewers — merged into one item; TypeScript reviewer is domain authority.
- `--quiet` produces no output (Generalist IMPORTANT-1) and `--json --quiet` silent no-op (TUICLI IMPORTANT-1) are related but distinct aspects of the same output-handling gap. Kept as one IMPORTANT item (IMPORTANT-2) with both facets described.
- `captureStdout` restore fragility (TUICLI MINOR) omitted: `vi.restoreAllMocks()` in `afterEach` already covers it and the pattern is consistent with the existing test suite.
- Empty `setup()` methods (TUICLI MINOR) omitted: required by citty's interface; not actionable.
- `completed` null-check concern (Generalist MINOR-1) omitted: valid as-is given current schema; low-signal as standalone item.

---

## Overall assessment

Two real type errors fail `tsc --noEmit` and must be fixed (CRITICAL-1, CRITICAL-2). Everything else is either a polish improvement or a pre-existing codebase-wide pattern. Command logic, routing, validation, output modes, and test coverage are all solid. Fixing the two criticals brings this to a clean pass.
