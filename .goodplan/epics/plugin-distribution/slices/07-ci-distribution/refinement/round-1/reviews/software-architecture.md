## Issues

**[IMPORTANT]** Marketplace manifest in plan diverges from existing repo file

The plan's Phase 1 Tasks section proposes creating `.claude-plugin/marketplace.json` with a `description` field on the plugin entry and an `owner.url` field. However, the file already exists in the repo (created during slice 02) and has neither of those fields. The plan should reference updating the existing manifest rather than creating it from scratch. More importantly, the plan's proposed manifest includes `"url": "https://github.com/ian97531"` in the `owner` block, which is not present in the current file. The plan should explicitly note that this is an update to the existing file, and reconcile the field differences to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan omits `permissions:` block on the workflow — least-privilege violation

The workflow definition in Phase 1 has no `permissions:` block. GitHub Actions workflows default to broad read/write permissions on `GITHUB_TOKEN`. The workflow needs write access to `contents` (for creating releases, pushing to release branch, creating tags) but should not have write access to other scopes (issues, pull-requests, packages, etc.). Add an explicit top-level `permissions:` block with `contents: write` and nothing else. This is a security best practice for any workflow that uses `GITHUB_TOKEN`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Force-push to release branch uses GITHUB_TOKEN but requires write access to a different branch than the triggering ref

The plan says to use `GITHUB_TOKEN` for the force-push to `release`. This will work only if the `release` branch is not protected (or if protection allows force-push from Actions). The plan should document this requirement explicitly: the `release` branch must not have branch protection rules that would block force-push from GitHub Actions. If protection is desired for other branches, this is a prerequisite to note. Additionally, step 10 says "Force-push `tmp-release/` contents to the `release` branch" but does not specify the git mechanism. The implementation will need to init a temp git repo, commit, and force-push (since the workflow checkout is the source branch, not `release`). The plan should outline this mechanism to avoid implementation ambiguity.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Post-build assertion runs compiled binary on macOS runner but the version flag format is unverified

Step 5 runs `dist/gp-plugin/binaries/macos-arm64/gp --version --json` and expects to match against the tag version. The plan doesn't specify the expected JSON shape or how to extract the version from the output. Looking at the build script, the version comes from `package.json`, but the tag version comes from `github.ref_name`. If someone pushes tag `v1.0.0` but `package.json` says `1.0.1`, the assertion fails — which is correct behavior, but the plan should explicitly document that the user must bump `package.json` version before tagging. This is a workflow contract, not just an assertion detail.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Hook smoke test step lacks specificity on synthetic stdin format

Step 6 says "Run `protect-state.sh` and `warn-bash-state.sh` with synthetic stdin JSON" but doesn't show the actual JSON payloads to use. Given the hooks expect specific fields (`tool_input.file_path`, `tool_input.command`, `cwd`), the plan should include the exact test payloads or reference the hook script documentation in `plugin-api.md`. This prevents the implementer from having to reverse-engineer the expected input format.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** The `.claude-plugin/` gitignore exclusion task may be unnecessary

The plan includes a task "Add `.claude-plugin/` to `.gitignore` exclusion if needed." The current `.gitignore` does not ignore `.claude-plugin/`, and the marketplace.json is already tracked in git (it exists in the repo). This task is a no-op and adds confusion. Remove it or replace with a verification step confirming the file is tracked.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 cleanup step leaves the release branch in place after test

Phase 2 cleans up the test tag and release but doesn't address what happens to the `release` branch content after the test. If the `release` branch already exists from a previous run, the test will overwrite it. If it doesn't exist, the test creates it. Either way, after cleanup the `release` branch still contains the test build. This is probably fine (it gets overwritten on real release), but the plan should note this explicitly to avoid confusion.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `tar.gz` asset creation mechanism not specified

Step 7 uses `softprops/action-gh-release@v2` to upload a `.tar.gz` asset, but the plan doesn't show how the tarball is created. The `softprops` action uploads files — it doesn't create tarballs. The plan needs a step between build and release that runs `tar -czf gp-plugin-${{ github.ref_name }}.tar.gz -C dist gp-plugin` (or similar) to create the archive before the release step can reference it.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan correctly identifies the right distribution model (same-repo, release branch, `git-subdir`) and reuses the existing `build:plugin` script, which is architecturally sound. The layering is clean — CI is purely a packaging and distribution concern, outside the 4-layer stack, as documented in the epic architecture. However, several implementation details are underspecified (force-push mechanism, tarball creation, permissions block, smoke test payloads) and the plan has a factual error (creating marketplace.json that already exists). Raising to 9+ requires: adding the permissions block, specifying the git mechanism for force-pushing to the release branch, adding the tar step, reconciling the marketplace.json discrepancy, and fleshing out the smoke test payloads.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
