## Issues

**[MINOR]** Phase 3 `--help` handling detail is thin for the `runCommand` custom runner

Phase 3 says the custom runner "handles `--help` rendering manually since `runMain`'s auto-help is bypassed" but does not specify which citty API to use. The citty research doc shows `renderUsage` (returns string) and `showUsage` (prints to console). The plan should specify using `showUsage` for `--help` on the main command, and note that subcommand `--help` (e.g., `goodplan init --help`) is handled automatically by citty's `runCommand` when the subcommand is resolved. This is a minor gap — the implementer can figure it out from the citty docs, but specifying the API avoids a research detour.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 `--query` error handling for invalid jq expressions is unspecified

Phase 5 implements `--query <expr>` and says it "requires `--json`" (error if used without it), but does not specify what happens when the jq expression itself is invalid (e.g., `--query '.['`). The commands-api.md specifies exit 2 with `VALIDATION_INVALID_QUERY` for invalid expressions, and exit 0 printing `null` for empty results. The plan should reference these behaviors so the implementer does not have to discover them independently from the architecture docs.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All 18 round-1 issues have been correctly applied. The plan is clear, well-structured, and technically sound for its TypeScript domain. The two remaining minors are documentation gaps that would cause brief implementation pauses but not incorrect behavior. The critical `runCommand` fix is thoroughly specified, `z.infer` conventions are established, merge semantics are clear, and the `JSON.stringify` replacer approach is correct. The plan is ready for implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
