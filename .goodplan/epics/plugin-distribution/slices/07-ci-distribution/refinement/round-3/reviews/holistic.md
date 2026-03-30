# Holistic Review (Round 3) — Slice 07: CI Distribution

## Issues

**[MINOR] Smoke test stdin JSON uses `$PWD` which is the runner workspace, not necessarily a real project dir**
Phase 1 Step 6 smoke tests use `"cwd":"'$PWD'"` in the JSON payloads fed to hooks. The `protect-state.sh` hook uses `cwd` to resolve relative paths and check for the `.goodplan-dev` sentinel. The `warn-bash-state.sh` hook checks for `.goodplan-dev` at `cwd`. On a CI runner, `$PWD` is the checked-out repo root — which may contain a `.goodplan-dev` file (if one exists in the repo) or a `.goodplan/` directory. Neither is a problem for the current test cases (protect-state uses an absolute-looking path `.goodplan/project.json` which gets resolved relative to cwd anyway, and warn-bash checks string containment of `.goodplan/` in the command, not filesystem state). But if a `.goodplan-dev` sentinel file is ever added to the repo, both hooks would silently skip their logic and the smoke tests would give false passes. This is unlikely but worth a one-line comment in the workflow noting the assumption.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 cleanup does not account for a missing rollback tag on first-ever release**
Step 10 creates `release-before-${{ github.ref_name }}` only if the `release` branch already exists. The Phase 2 cleanup (line 151) unconditionally tries to delete `release-before-v1.0.0-test`. Since the test tag is the first release, the release branch will not exist before the first run (workflow_dispatch does not create a release or push to the release branch due to the `if: github.ref_type == 'tag'` gate). So when the tag-triggered run executes, it is the first-ever release — no rollback tag is created. The cleanup step should tolerate the tag not existing (e.g., `git push origin :refs/tags/release-before-v1.0.0-test 2>/dev/null || true`).
Resolution: DIRECTLY_ACTIONABLE

No other issues found. All five R2 issues have been addressed:
- warn-bash smoke test now checks `hookSpecificOutput.additionalContext` (the correct nested path)
- `docs/releasing.md` task added with version contract, rollback, and release branch docs
- `if: github.ref_type == 'tag'` gate on the release step prevents spurious releases from workflow_dispatch
- `git checkout -b release` added after `git init` for clarity
- Before check for marketplace.json now asserts `description` field is absent

## Score: 9/10

The plan is clear, complete, and well-structured. Every phase has concrete before/after checks. The workflow steps are detailed with exact shell commands. The version contract and manifest authority model are explicitly documented. The two remaining minors are edge-case robustness issues (sentinel file assumption in smoke tests, missing rollback tag tolerance in cleanup) — neither would block a successful implementation. Addressing them would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
