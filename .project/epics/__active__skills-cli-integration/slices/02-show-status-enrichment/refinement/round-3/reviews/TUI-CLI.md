## Issues

**[IMPORTANT]** Phase 4 version compat check: `resolveProjectDir()` in dispatch path will throw for commands that don't need `.project/`

The plan says to add a `resolveProjectDir()` call in the dispatch path and skip checking for `--version`, `--help`, `init`, `schema`. But the plan's approach is to call `resolveProjectDir()` and then check the result -- if `resolveProjectDir()` throws (as it does when no `.project/` exists -- it throws `DATA_NO_PROJECT`), the error would be caught by the outer `try/catch` and surfaced as a `DATA_NO_PROJECT` error before the command even runs. The plan says "wrap in try-catch -- if it fails (no `.project/`), skip the check" which is correct, but this should be explicitly stated as a task: wrap the entire compat check block in its own try-catch that silently swallows `DATA_NO_PROJECT` errors. Without this, commands like `init` (which creates `.project/`) would fail with a confusing "no project" error before they even execute. The plan does mention this now ("wrap in try-catch -- if it fails, skip the check") which addresses the concern -- but the task list doesn't include an explicit task item for this try-catch wrapper, leaving it implicit. Making it an explicit sub-task would prevent an implementer from missing it.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `formatStatusHuman()` update task should specify the full list of field renames

The plan's Phase 2 task says "Update `formatStatusHuman()` -- use `artifacts.architecture.count` instead of `artifacts.architectureFiles`" but only names architecture and says "similarly for all renamed artifact fields." The human formatter at lines 301-324 of `status.ts` references four fields: `architectureFiles`, `researchFiles`, `brainstormFiles`, `prototypeFiles`. The task should explicitly list all four mappings to prevent partial updates. This is minor because an implementer would likely discover the others from type errors, but explicit is better than implicit for a plan.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 warning emoji in version mismatch message may not render in all terminals

The plan specifies the warning format as `"Warning: Version mismatch: CLI v{cli} / data v{data}. ..."` with a `process.stderr.write()` call. Looking at the plan more carefully, it uses a warning emoji character. While most modern terminal emulators support Unicode emoji, some minimal environments (CI runners, Docker containers with restricted locales, older Windows cmd.exe) may render it as garbage characters. The existing codebase uses picocolors for styling (e.g., `pc.yellow("!")` in `formatStatusHuman` for warnings at line 337). Consider using `pc.yellow("warning:")` or a plain ASCII prefix instead of an emoji, consistent with the existing warning style in the codebase.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has addressed all round-2 TUI-CLI issues thoroughly. The `outputError()` misuse is fixed (now correctly specifies `process.stderr.write()`). The `parseGlobalFlags()` extension for `--quiet` is now an explicit task. Phase ordering is corrected (1, 3, 4, 2). The remaining IMPORTANT issue is about making the try-catch for the compat check an explicit task item rather than leaving it as prose -- a minor gap that could still cause implementation confusion. The two MINOR issues are polish items. Overall the CLI interaction design is sound.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
