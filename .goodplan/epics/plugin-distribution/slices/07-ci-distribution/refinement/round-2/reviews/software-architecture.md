## Issues

**[IMPORTANT]** Version assertion step does not specify JSON extraction method

Step 5 runs `dist/gp-plugin/binaries/macos-arm64/gp --version --json` and says to "verify the output version matches the tag version." The binary outputs `{"version":"X.Y.Z"}` (confirmed in `src/index.ts` line 145). The plan should specify how the version is extracted from the JSON output (e.g., pipe through `python3 -c "import json,sys; print(json.load(sys.stdin)['version'])"` or `jq -r .version`) and how the tag prefix is stripped (e.g., `${GITHUB_REF_NAME#v}`). Without this, the implementer must inspect the binary's output format and decide the extraction approach, which could lead to a fragile string comparison (e.g., matching `"version":"1.0.0"` as a substring rather than parsing JSON properly). This is an assertion that gates release publication — it should be precise.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Rollback tag (step 10) assumes release branch already exists

Step 10 says "Before force-pushing, tag the current release branch HEAD as `release-before-${{ github.ref_name }}`." On the very first release, the `release` branch does not exist, so `git tag release-before-... origin/release` will fail. The plan should add a conditional: only create the rollback tag if the `release` branch exists (`git ls-remote --heads origin release`). This is a minor edge case that would block the first-ever release if not handled.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Smoke test for `warn-bash-state.sh` "non-empty JSON with additionalContext" is vague

Step 6's third test case says to verify `warn-bash-state.sh` stdout "is non-empty JSON with additionalContext" but doesn't specify how. The fourth case says "verify stdout is empty." Unlike the `protect-state.sh` tests which use concrete exit code checks (`[ $? -eq 2 ]`), these lack a concrete assertion mechanism. Suggest: pipe stdout through `python3 -c "import json,sys; d=json.load(sys.stdin); assert 'additionalContext' in d['hookSpecificOutput']"` for the match case, and `[ -z "$(cat)" ]` or equivalent for the no-match case. Without concrete assertions, this smoke test could silently pass on malformed output.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All three IMPORTANT issues from round 1 are well addressed: the permissions block follows least-privilege (deny-all top-level, scoped job-level), the force-push mechanism is explicit and correct, and the manifest authority model is clearly documented. The plan is architecturally clean — CI is purely a packaging/distribution concern outside the 4-layer stack, the build reuses `build:plugin` without duplicating logic, and the marketplace manifest correctly uses `git-subdir` with `ref: "release"` matching the architecture doc. The data flow is clear: tag push triggers build, build reuses existing script, post-build assertions gate the release, and force-push to release branch provides the distribution surface. To reach 9+: make the version assertion extraction concrete (the most impactful remaining gap), and handle the first-release edge case for the rollback tag.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
