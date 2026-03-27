## Issues

**[IMPORTANT]** `learning:list` human output format for `file` field still unspecified

Round 1 flagged that the plan says "optionally show the file path alongside the summary" without specifying the format. The updated plan (Phase 2) still says "For human mode, optionally show the file path alongside the summary." The word "optionally" is ambiguous -- does it mean a flag controls it, or it's up to the implementer? The current human output format is `{category} {summary} ({source})` (line 47-49 of `src/commands/learning/list.ts`). The plan should specify one of: (a) always show as a dim suffix `({source}) [learnings/slug.md]`, (b) show only with `--verbose` (the global flag exists but is "reserved for future use"), or (c) omit from human output entirely (file path is JSON-only). Recommendation: option (c) keeps human output clean and is simplest -- the file path is primarily useful for programmatic consumers who will use `--json`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 Expected Behavior `state --json --query` syntax is corrected but the query semantics need verification

Round 1 flagged incorrect query syntax. The updated plan uses `.learnings["foo.md"]` which is syntactically valid jq. However, this query path depends on the `learnings/` directory appearing as a `learnings` key in the state tree's top-level contents, with individual `.md` files as nested keys. Looking at `serializeStateTree` in `src/core/data/serialize.ts`, a `DirectoryEntry` serializes its `contents` keys directly as object properties. So if `.project/learnings/foo.md` exists on disk, `assembleState` would produce a `learnings` directory entry containing `foo.md`, and the query `.learnings["foo.md"]` would return `true` (without `--inline`) or the markdown content (with `--inline`). This is correct. However, the Expected Behavior item says: "returns markdown content (with `--inline`) or `true` (without)". The `state` command's `--inline` flag is a string type, so the correct invocation would be `goodplan state --json --inline --query '.learnings["foo.md"]'` (not `goodplan state --json --query '.learnings["foo.md"]'` alone). The plan should include `--inline` explicitly in the verification command that expects markdown content.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** RPC layer `.md` file writing hook location is underspecified

The plan correctly moved `.md` file writing from the state machine to the RPC layer (fixing round 1's critical INV-003 violation). Phase 1 says: "After `reduce()` returns, the RPC layer: (1) extracts `detail` from the input payload, (2) derives the slug, (3) writes the `.md` file to disk...". Looking at `src/core/rpc/begin.ts`, the current flow is: `loadState -> reduce -> bumpDataVersionIfNeeded -> commitState -> buildResult`. The plan doesn't specify where in this sequence the `.md` writing happens. If `.md` files are written after `commitState`, a crash between the two leaves JSONL entries pointing to nonexistent files. If written before `commitState`, a crash leaves orphan `.md` files (less harmful). The plan should specify: write `.md` files *before* `commitState`, so the JSONL `file` field always points to an existing file. This is the same safety ordering used by the migration path. Additionally, the plan says the RPC layer "constructs the `StateEvent` with `file` instead of `detail`" -- this means the RPC layer must intercept the payload *before* calling `reduce()`, derive the slug, write the file, then build the event. This is a different pattern from "after `reduce()` returns". The plan contradicts itself here and needs to clarify the exact sequence.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `learning:list --json` breaking change accepted but not documented anywhere

Phase 2 says "replaces `detail` -- breaking change, accepted pre-1.0". While the acceptance is reasonable, the plan doesn't include a task to document this in a changelog, release notes, or any consumer-facing location. Skills that parse `learning:list --json` (e.g., skills updated in Phase 3) will be updated, but any external consumers or scripts would break silently. Add a task to Phase 2 or Phase 3 to note the breaking change in the project's changelog or equivalent.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 migration error paths lack specific exit code expectations

Phase 4 Expected Behavior says "Error paths (corrupt learnings.md, missing files) exit with non-zero exit codes" but doesn't specify which exit codes. Per INV-007, validation errors should exit with code 2, internal errors with code 1. A corrupt `learnings.md` that can't be parsed is a validation error (exit 2). A missing file referenced in JSONL is a data error (exit 1). The verification section should include specific exit code assertions (e.g., `goodplan migrate` on a corrupt fixture exits with code 2), not just "non-zero".

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1's critical issues (INV-003 violation, state machine I/O) are properly resolved -- the plan now correctly places `.md` file writing in the RPC layer and keeps the state machine pure. The breaking change strategy is explicitly accepted (pre-1.0). However, the RPC layer integration point is self-contradictory (before vs after reduce), the human output format remains unspecified, and the `state --inline` verification command is incomplete. To reach 9+: resolve the RPC layer sequencing contradiction (clarify whether slug derivation + file writing happens before or after reduce), specify the exact human output format for the `file` field, and add `--inline` to the state query verification command.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
