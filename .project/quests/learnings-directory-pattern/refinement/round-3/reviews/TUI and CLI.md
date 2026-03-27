## Issues

**[MINOR]** Phase 1 Expected Behavior verification commands use `grep -c` without specifying the fixture/test context

Phase 1 "Before implementation" checks use `grep -c 'deriveSlug' src/util/slug.ts` which will fail with a non-zero exit code if the file doesn't exist yet (grep returns exit 2 for missing files), not just return 0. This is cosmetic -- the implementer will understand the intent -- but for consistency with the testing constraint ("All CLI changes are tested on fixture repos, not this repo's live .project/"), the expected behavior items should clarify these are run against the repo source tree (not a fixture), since they're checking source code presence, not runtime behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `learning:list` human output -- round 2 recommendation adopted but not reflected in Expected Behavior

Round 2 recommended option (c): omit `file` from human output entirely. The plan now correctly says "Omit `file` from human output -- file paths are primarily useful for programmatic consumers. Human output keeps the existing `{category} {summary} ({source})` format." This is good. However, the Phase 2 Expected Behavior section only has JSON-focused assertions. Adding one negative assertion like "`goodplan learning:list` (no --json) output does NOT include file paths" would make the human output decision verifiable and guard against accidental inclusion.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round 2 issues are resolved. The RPC layer sequencing contradiction is fixed: the plan now clearly specifies that slug derivation and `LearningEventEntry` mapping happen *before* `reduce()`, `.md` file writing happens *after* `reduce()` succeeds (using the `detail` text retained from the original input), and `commitState()` follows. This is the correct order -- reduce validates state purity with `file` fields, then the RPC layer writes `.md` files, then commits. The `--inline` flag is correctly included in the state query Expected Behavior. The changelog task is added. Phase 4 now has specific exit code expectations (exit 2 for corrupt learnings.md, exit 1 for data errors). The human output format is explicitly specified as omitting the `file` field. The remaining items are minor polish.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
