# Holistic Review — State Protection Hooks (Round 2)

## Issues

**[IMPORTANT]** Architecture doc `plugin-api.md` still describes `warn-bash-state.sh` output as stderr, contradicting the plan

The plan correctly uses stdout JSON with `additionalContext` for the warn-bash-state.sh output (matching the hook protocol where exit 0 stderr is ignored). However, `plugin-api.md` line 122 still says: `If match -> exit 0, stderr: "Warning: ..."`. The plan's Phase 1 Verification section includes a task to verify alignment with architecture docs, but this known divergence should be called out explicitly as something to update in `plugin-api.md` during or after implementation. Otherwise the implementer may get confused by the contradiction, or a future reader of the architecture doc will implement the wrong output mechanism.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `protect-state.sh` step 5 edge case check for exact match `$CWD/.goodplan` (no trailing slash) is unclear

The plan says to "Also check exact match `$CWD/.goodplan` (no trailing slash) as an edge case." It is unclear what Write/Edit operation would target the `.goodplan` directory itself (not a file within it) and what the expected tool_input would look like. If this is guarding against `file_path: ".goodplan"` with no extension, it would not match the `.json`/`.jsonl` check anyway. If it is guarding against directory creation, Write/Edit don't create directories. This step adds dead code that could confuse future maintainers. Either remove it or add a comment explaining the specific scenario it guards against.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Single python3 invocation mentioned in architecture but plan uses separate invocations for `warn-bash-state.sh`

The architecture doc (`plugin-api.md` line 119) says "Extract `cwd` and `tool_input.command` from stdin JSON in a single `python3` invocation." The plan's Phase 1 Task 2 step 4 says: "Parse JSON: extract command and cwd via `echo "$INPUT" | python3 -c "..."` with `read -r COMMAND` and `read -r CWD` to capture into shell variables." This implies two separate shell variables read from one python3 call, which is fine -- but the `read -r COMMAND` / `read -r CWD` approach requires the python3 script to print two lines in a specific order, which is fragile. The `protect-state.sh` approach (single python3 invocation that does all logic including path resolution) is cleaner. Consider having `warn-bash-state.sh` also do the full check inside a single python3 invocation rather than bouncing between python3 and bash for the simple string-contains check.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 2 addressed all round-1 issues effectively. The realpath replacement with `os.path.normpath`, stdin capture via `INPUT=$(cat)`, additionalContext on stdout, relative-path test, explicit build globs, shellcheck, python3 guard, and doc verification task are all solid improvements. The plan is well-structured, phasing is logical (scripts first, build integration second), verification is thorough with concrete falsifiable checks, and invariant compliance is good (this slice directly enforces INV-001 at the prevention layer). The one remaining IMPORTANT item is a documentation consistency issue between the plan and the architecture doc, not a plan quality problem per se. To reach 10: fix the architecture doc discrepancy inline (or add an explicit task) and simplify the warn-bash-state.sh python3/bash boundary.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
