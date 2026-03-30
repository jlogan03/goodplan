# Repo, Tooling, & Docs Review: HMAC Signatures Plan (Round 4)

## Issues

**[MINOR] Phase 4 architecture doc updates list files but not the specific content changes**
Phase 4 tasks include "Update `.goodplan/architecture/data-layer-api.md` to reflect `commitState()` behavioral change (HMAC computation/embedding) and `loadState()` behavioral change (HMAC verification on non-cache-hit paths)". This is good — the right files are identified. However, the plan does not specify what should be added. The current `data-layer-api.md` describes `commitState()` write ordering ("JSON first, JSONL second, state cache last") and `loadState()` cache paths. An implementer might add a sentence or might miss that the "Contracts" section needs a new subsection for HMAC verification. Consider adding a brief note: add an "HMAC State Integrity" subsection under Contracts describing the sign-on-write/verify-on-read behavior and the bootstrap exception.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 `commands-api.md` update task lacks specificity**
The task says "Add `verify` command to `.goodplan/architecture/commands-api.md` (read-only check and `--fix` variant)" but does not specify where in the document. The existing structure has a "Global Commands" section listing `status`, `state`, `init`, `migrate`, `schema`. The implementer should add `verify` there, with both the read-only and `--fix` variants documented. This is low risk since the pattern is obvious from context, but explicitly naming the target section prevents any ambiguity.
Resolution: DIRECTLY_ACTIONABLE

No other issues found. The round-3 feedback has been well addressed:
- The dual-define rationale (why both `global-setup.ts` and `vitest.config.ts` need the HMAC key define) is now clearly documented in Phase 2 with a dedicated paragraph explaining the distinction.
- The `verify` command registration key is now explicit (`verify: verifyCommand` with "(un-namespaced global command)").
- The fitness test dependency on the compiled binary having the `__GP_HMAC_KEY__` define is now called out with a note about vacuous passing.
- The verification step now uses `gp schema --json --query` instead of piping through external `jq`.
- Build script quoting patterns correctly match the existing conventions in each file (`package.json` uses shell-escaped quotes, `build-plugin.sh` uses backslash-escaped quotes).

## Score: 9/10

The plan is strong from a repo, tooling, and docs perspective. Build configuration changes (`package.json`, `build-plugin.sh`, `global-setup.ts`, `vitest.config.ts`) all follow existing patterns correctly. The INV-001 exception is properly documented with rationale. Test infrastructure covers both the compiled binary path (integration/fitness) and the Vitest module transform path (unit tests). The two remaining MINOR issues are about documentation precision in the architecture doc update tasks — the actual code and tooling changes are correct and well-specified. To reach 10: specify the target sections and content shape for the architecture doc updates.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
