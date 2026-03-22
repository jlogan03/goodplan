# TUI and CLI Review — Phase 04: Slice CLI Commands

## Issues

**[IMPORTANT]** `slice:create` output branches bypass the shared `output()` quiet handling

In `slice:create`, the command manually checks `args.json` then `!args.quiet` with separate `output()` calls. However, the `output()` utility already handles quiet mode by returning early. The current pattern duplicates quiet-checking logic and introduces a subtle inconsistency: in JSON mode, `output(result, args)` is called, but if `args.quiet` is also true, `output()` will suppress it — so `--json --quiet` together silently drops JSON output. This is the same pattern used in epic commands, so it is consistent with the codebase, but it means `--json --quiet` is silently a no-op across all commands rather than JSON winning (which is what scripting callers would expect). This is a codebase-wide pattern issue, not specific to this phase — noting for awareness but not blocking.

File: src/commands/slice/create.ts:50
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `slice:list` human-readable output does not show slice status with color

The `slice:list` human-readable mode outputs the status as plain text (`item.status`), while `slice:show` and all mutation commands use `pc.green()`, `pc.yellow()`, etc. for status. For list output, status coloring would improve scannability — completed slices should be green, abandoned yellow, active states neutral. The epic:list command has the same gap, so this is consistent with existing code, but the slice list is more likely to have a mix of statuses (completed, abandoned, in-progress) making color more valuable.

File: src/commands/slice/list.ts:55
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `slice:show` human-readable output does not display `completed` timestamp

When a slice is completed, the human-readable output shows `Created:` and `Updated:` but not `Completed:`. The `slice:list` output does show the completed timestamp. For consistency and usefulness, `slice:show` should display the completed date when the slice status is "completed".

File: src/commands/slice/show.ts:43
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Empty `setup()` methods on all commands

Every command includes `setup() {}` which does nothing. If citty requires it, this is fine. If not, removing it reduces noise. Consistent with epic commands so not a real issue — just noting.

File: src/commands/slice/create.ts:33
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `slice:show` human-readable output does not show `verificationPassed` or `abandonReason` fields

For abandoned slices, the reason is not displayed. For completed slices, whether verification passed is not displayed. These are useful for human operators debugging state.

File: src/commands/slice/show.ts:43
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Test helper `captureStdout` restore pattern is fragile

The `captureStdout()` helper returns `{ chunks, restore }` and every test manually calls `restore()`. If a test throws before `restore()`, the spy leaks into subsequent tests. Using `afterEach` with `vi.restoreAllMocks()` (which is already present) mitigates this, but the explicit `restore()` calls add noise. The epic command tests use the same pattern so this is consistent.

File: tests/unit/commands/slice/slice-commands.test.ts:31
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is clean, well-structured, and closely follows the established epic command patterns. All 8 commands are registered correctly in `main.ts`, use the right routing (read-only to Data Layer, mutations through RPC), have proper Zod validation at the boundary, and support all three output modes (json/quiet/human). The test suite is thorough with 25 passing tests covering the full lifecycle, edge cases, and output modes. The architecture's commands-api spec is faithfully implemented.

To reach 9+: add status coloring to `slice:list` human output, display `completed` timestamp in `slice:show`, and consider showing `abandonReason`/`verificationPassed` in show output. These are polish items that improve the CLI's usefulness for human operators.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
