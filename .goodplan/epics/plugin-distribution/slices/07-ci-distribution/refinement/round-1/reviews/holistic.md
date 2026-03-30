# Holistic Review — Slice 07: CI Distribution

## Issues

**[IMPORTANT] Marketplace manifest already exists — plan should not "create" it**
The plan's Phase 1 tasks include creating `.claude-plugin/marketplace.json`, but this file already exists in the repo with the correct content (matching the plan's proposed JSON almost exactly). The plan should reference updating or verifying the existing file rather than creating it from scratch. The "before" check (`ls .claude-plugin/marketplace.json` — file not found) will fail immediately because the file is already present.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Marketplace manifest in plan is missing `description` field**
The existing `.claude-plugin/marketplace.json` does not include `description` on the plugin entry, and neither does the plan's proposed JSON. The research document's schema shows `description` is optional, so this is not a blocker — but the plan's prose says the plugin should have `"description": "goodplan — structured development workflow for Claude Code"`. The plan's JSON block and the actual task should be consistent: either include the description or don't mention it.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] "Before" checks in Phase 1 assume files don't exist yet**
Phase 1 Expected Behavior "Before" checks assert both `.github/workflows/publish-plugin.yml` and `.claude-plugin/marketplace.json` don't exist. The marketplace manifest already exists. The "before" check for it should be replaced with a check that verifies the current state (e.g., no workflow file exists, marketplace.json exists but has no `$schema`), or the marketplace task should be reframed as "verify/update" rather than "create."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Missing `.gitignore` consideration for `.claude-plugin/`**
The plan includes a task to "Add `.claude-plugin/` to `.gitignore` exclusion if needed." The current `.gitignore` does not ignore `.claude-plugin/`, so the file is already tracked (confirmed by its presence in the repo). This task is a no-op but the plan doesn't acknowledge that. Should be marked as a verification step or removed.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `actions/checkout@v4` — research doc references `@v6`**
The plan specifies `actions/checkout@v4`. The research document's example CI workflow uses `@v6`. While `v4` is fine and stable, the plan should be internally consistent with whichever version is chosen. Not a functional issue.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Hook smoke test details could be more specific**
Phase 1 Step 6 says "Run `protect-state.sh` and `warn-bash-state.sh` with synthetic stdin JSON" but doesn't specify the exact JSON payloads or how they'll be constructed in the workflow. The hooks read stdin for `tool_input` and `command` fields. Providing example payloads would make the task unambiguous for an implementer. The existing `hooks.json` and hook scripts provide the contract, but the plan should reference them.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No documentation task**
The plan does not include any task for updating documentation (README, CLAUDE.md, or architecture docs) to describe the CI pipeline, how to trigger releases, or how the release branch works. Phase 2 mentions "Document any issues found" as part of validation, but there's no task for documenting the release process itself.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 "before" check is weak**
Phase 2's "before" check is `gh run list --workflow=publish-plugin.yml --limit=1` returning no runs. This is a reasonable absence check, but if the workflow has been triggered before (e.g., from a prior failed attempt), this will show stale data. The check should verify "no successful runs" rather than "no runs at all," or just acknowledge it may have prior failed runs.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good reuse of the existing `build-plugin.sh` script, and thorough E2E validation in Phase 2. The main issues are: (1) the marketplace manifest already exists so the plan's "create" framing and "before" checks are inaccurate, and (2) some task details (hook smoke test payloads, action versions) could be tightened. Fixing the marketplace manifest framing, correcting the "before" checks, and adding a documentation task would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
