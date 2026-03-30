# Holistic Review (Round 2) — Slice 07: CI Distribution

## Issues

**[IMPORTANT] Smoke test for warn-bash-state.sh verifies wrong output shape**
Phase 1 Step 6 says to verify warn-bash-state.sh stdout "is non-empty JSON with additionalContext" for the `.goodplan/` command case. The actual hook outputs a JSON object with `hookSpecificOutput.hookEventName` and `hookSpecificOutput.additionalContext` — not a top-level `additionalContext` field. The smoke test should parse the output and assert the presence of `hookSpecificOutput.additionalContext` specifically. Additionally, the comment says "verify stdout is empty" for the clean command case, but there is no concrete assertion command — it should be something like `OUTPUT=$(...) && [ -z "$OUTPUT" ] || exit 1`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] No documentation task for the release process**
Round 1 flagged "no documentation task" as MINOR. The round-1 summary says this was addressed, but the plan still has no task for documenting the release workflow — how to trigger a release (bump version, push tag), what the release branch contains, how rollback works (the `release-before-*` tags), or the `package.json` version contract. This is important because the workflow introduces a non-obvious contract (package.json version must match tag) and a novel branch structure (force-pushed release branch). A brief section in the repo's CLAUDE.md or a `docs/releasing.md` would prevent future confusion.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 cleanup step does not clean up the GitHub Release draft if workflow_dispatch run created one**
Step 5 of Phase 2 creates a test tag `v1.0.0-test` and the cleanup section deletes that release. But the prior workflow_dispatch run (step 2-4) may also create a release (since `softprops/action-gh-release` runs unconditionally in the workflow). If workflow_dispatch uses a different ref (e.g., a branch name rather than a tag), the behavior of the release step is unclear. The plan should note whether the workflow_dispatch path should skip the release step (e.g., conditional on `github.ref_type == 'tag'`) or document what happens and how to clean up.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `git init` in tmp-release creates a default branch that may not be `release`**
Step 11 does `cd tmp-release && git init && git add -A && git commit -m "Release ..." && git push --force ... HEAD:refs/heads/release`. This works because it pushes to an explicit refspec. However, if `git init` creates a `main` branch (the default on most systems), the local branch name differs from the remote branch name. This is cosmetically fine but could confuse debugging. A clearer approach: `git checkout -b release` after `git init`, or use `git switch -c release`. Not a functional issue — just clarity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 "before" check for marketplace.json could be more useful**
The before check says `cat .claude-plugin/marketplace.json` — "file exists (created in slice 02); verify current contents." This is a passive observation, not a falsifiable assertion. A better before check would assert something that changes — e.g., verify the file does NOT yet contain a `description` field, or verify the `$schema` field is absent. Then the "after" check verifies those fields are present. This gives a meaningful before/after contrast per criterion 6a.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 is a significant improvement over round 1. The marketplace manifest framing is now correct (verify/update instead of create), SHA-pinned actions are specified, concrete smoke test payloads are provided, the tarball step is present, and the workflow contract is documented. The remaining issues are: (1) the warn-bash-state smoke test checks the wrong output shape, (2) there is still no documentation task for the release process, and (3) a few minor clarity items around workflow_dispatch behavior and before-check falsifiability. Fixing the smoke test output assertion and adding a documentation task would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
