# Repo, Tooling, & Docs Review — State Protection Hooks Plan (Round 3)

## Issues

**[IMPORTANT]** `plugin-api.md` line 122 doc fix is called out but the plan's implementation logic contradicts the doc in a second place

The plan (Phase 1 Verification) correctly notes that `plugin-api.md` line 122 currently says the warning goes to stderr and tasks an implementer to fix it. Good. However, `plugin-api.md` lines 116–117 show *two separate python3 invocations* for `warn-bash-state.sh` — one for `cwd` and one for `command` — which is the old pattern that caused the Round 2 IMPORTANT issue. The plan's Task 2 Step 4 correctly replaces this with a single consolidated python3 invocation. But the doc fix instruction only mentions "line 122." An implementer following the plan literally will fix line 122 but leave lines 113–118 showing the old two-invocation pattern, which will immediately conflict with the actual script they just wrote. The doc update scope needs to cover the entire `warn-bash-state.sh` Logic block (lines 113–123), not just line 122.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Build script fallback validation uses `jq` for `plugin.json` but plan adds `python3` for `hooks.json` — inconsistency noted but not addressed

`scripts/build-plugin.sh` line 57 currently uses `jq . "$PLUGIN_DIR/.claude-plugin/plugin.json"` for the fallback JSON validation path. The plan (Phase 2 Task 1 step 2) adds `python3 -c "import json; json.load(...)"` to validate `hooks.json`. This means the fallback path now mixes `jq` (for `plugin.json`) and `python3` (for `hooks.json`). This is harmless because `jq` is a dev dependency that's assumed available on developer machines, and `python3` is guaranteed on macOS. However, the plan doesn't note this mixed approach or explain why it's intentional. A comment in the build script at the validation section would prevent future contributors from thinking the inconsistency is accidental or from "cleaning it up" by removing one validator. The plan should instruct the implementer to add a brief comment (e.g., `# jq validates plugin.json (dev machines have jq); python3 validates hooks.json (guaranteed on macOS)`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 verification test for sentinel bypass leaves `/tmp/test/.goodplan-dev` on the filesystem

The sentinel bypass test (Expected Behavior item 7) creates `/tmp/test/.goodplan-dev` with `mkdir -p && touch`. There's no cleanup step after. In isolation this is fine (it's under `/tmp/`), but if the same `/tmp/test/` path is reused for multiple test cases in the same verification run, the sentinel file will bleed into subsequent tests. For instance, the `warn-bash-state.sh` basic trigger test (item 5) also uses `/tmp/test` as `cwd`. If the tests are run in the order listed, item 5 runs before item 7, so the bleeding is backwards. But if an implementer re-runs item 5 after running item 7, the sentinel suppresses the warning and the test appears to fail incorrectly. The plan should use a distinct `cwd` for the sentinel test (e.g., `/tmp/test-sentinel/`) or add an explicit `rm /tmp/test/.goodplan-dev` cleanup after item 7.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Both Round 2 IMPORTANT issues are resolved: `warn-bash-state.sh` now uses a single consolidated python3 invocation, and `protect-state.sh` has an explicit empty-path guard. The plan is structurally sound, the build integration approach is correct, and the doc-update task for line 122 is explicitly called out. The remaining issues are: an underspecified doc-fix scope that will leave `plugin-api.md` partially inconsistent with the implementation (IMPORTANT), and two minor issues around the `jq`/`python3` mixed validation comment and test isolation. To reach 10: expand the `plugin-api.md` fix instruction to cover the full `warn-bash-state.sh` Logic block, add a comment noting the intentional `jq`/`python3` mix in the build script fallback, and use a distinct `cwd` for the sentinel bypass test.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
