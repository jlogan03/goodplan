## Issues

**[CRITICAL]** Smoke tests will fail due to `.goodplan-dev` sentinel in the repo checkout

The `.goodplan-dev` file is tracked in git and will be present in the CI workspace after `actions/checkout`. Both `protect-state.sh` and `warn-bash-state.sh` check for this sentinel early and skip all protection logic when it exists:

```python
# protect-state.sh and warn-bash-state.sh both do:
if os.path.isfile(os.path.join(cwd, '.goodplan-dev')):
    sys.exit(0)
```

The smoke tests in Step 6 pass `"cwd":"'$PWD'"` which resolves to the repo checkout directory -- where `.goodplan-dev` exists. This means:

- **protect-state blocked path test**: Hook exits 0 (sentinel skip) instead of exit 2. The assertion `[ $? -eq 2 ] || exit 1` fails, but the failure message will be misleading ("hook didn't block") when the real cause is the sentinel file.
- **warn-bash .goodplan/ command test**: Hook exits 0 with no output (sentinel skip). The python3 assertion for `additionalContext` fails because stdout is empty.

**Fix:** Add a step before the smoke tests that removes the sentinel from the working directory:

```bash
# Remove dev sentinel so hooks enforce protection during smoke tests
rm -f .goodplan-dev
```

Or alternatively, set `cwd` in the test JSON to a temporary directory that does not contain `.goodplan-dev`:

```bash
SMOKE_CWD=$(mktemp -d)
echo '{"tool_input":{"file_path":".goodplan/project.json"},"cwd":"'"$SMOKE_CWD"'"}' | ./dist/gp-plugin/hooks/protect-state.sh
```

The `rm -f` approach is simpler and tests the hooks in a realistic end-user environment (no sentinel).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No SHA-256 checksum published alongside the release tarball

Flagged in R2 as IMPORTANT, appears to have been intentionally omitted. For a plugin shipping compiled binaries, publishing a checksum alongside the tarball is standard practice and low-effort:

```bash
shasum -a 256 gp-plugin-${{ github.ref_name }}.tar.gz > gp-plugin-${{ github.ref_name }}.tar.gz.sha256
```

Upload both files as release assets. If intentionally deferred, note it as a follow-up.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No Dependabot config for GitHub Actions version management

Flagged in R1 (minor) and R2 (minor), still not addressed. SHA-pinned actions will drift without automated updates. A `.github/dependabot.yml` with `package-ecosystem: github-actions` is a one-time addition. Can be a follow-up task if out of scope for this slice.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

R2's two IMPORTANT issues (warn-bash executable assertions, version extraction commands) are fully addressed in the current plan. The smoke test payloads are concrete and correct, the version assertion includes the python3 extraction, and the `workflow_dispatch` ref is specified. However, the `.goodplan-dev` sentinel issue is a critical gap that will cause all four smoke tests to behave incorrectly in CI -- the hook scripts work correctly, but the test environment defeats them. This is a one-line fix (`rm -f .goodplan-dev` before smoke tests). The two minor items (checksum, Dependabot) are repeat flags that could reasonably be deferred. To reach 9+: fix the sentinel issue and either add the checksum or explicitly note it as a follow-up.

## Summary
- Critical: 1
- Important: 0
- Minor: 2
