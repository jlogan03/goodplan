## Issues

**[IMPORTANT]** Phase 1 `show --json` output schema not discoverable by `schema` command (INV-006 gap)
The `schema` command (`src/commands/global/schema.ts`) currently exposes `args` and `stdinSchema` per command but does NOT expose output schemas. The plan adds `ArtifactFlags` to `show --json` output and says "These schemas are reused by `show --json` output schemas for INV-006 `schema` command compatibility" — but the `schema` command has no `outputSchema` field in `buildCommandDetail()` and no `outputSchemaRegistry`. Without extending the `schema` command to include output schemas, the new `ArtifactFlags` shape is invisible to skill consumers who rely on `schema --command slice:show --json` to discover response shapes. Either: (a) add an `outputSchemaRegistry` parallel to `stdinSchemaRegistry` and populate it for `show` commands, or (b) acknowledge this as a known gap and defer output schema exposure to a later slice. Option (b) is acceptable since INV-006 currently only guarantees args and stdin schemas, but the plan should be explicit about which option it takes rather than implying coverage that doesn't exist.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 `VALIDATION_VERSION_MAJOR_MISMATCH` error code is only used for `major-behind` — naming could be narrower
The plan registers `VALIDATION_VERSION_MAJOR_MISMATCH` for the case where CLI major < data major. The name is accurate. However, the `VALIDATION_*` prefix means exit code 2 (via `exitCodeForError()` in `src/util/output.ts` line 95: `if (error.code.startsWith("VALIDATION_")) return 2`). This is correct — version mismatch is a validation-class error. No action needed, just confirming the plan's routing is correct.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `paths` field guaranteed-key documentation should cover `submit-*` phase names explicitly
The plan says `submit-*` phases return the same paths as their `begin` counterpart and adds a task note about begin-phase mapping. Good — round-2 M6 is addressed. However, the JSDoc on `resolvePathReferences` should explicitly list the submit phase names (e.g., `submit-plan` resolves same as `plan`) so consumers can look up any phase name without knowing the mapping rule. This is a documentation completeness issue, not a correctness issue.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
All round-2 issues relevant to this domain have been addressed: phase ordering now explicitly states Phase 4 before Phase 2, `cli-minor-behind` replaces the ambiguous `minor-ahead`, `submit()` path resolution uses begin-phase mapping, `ArtifactFlags` moved to `src/schemas/commands/`, version stamp on every RPC mutation is explicit, `completion/` directory mapping corrected to `{}`, `architecturePaths` coexistence strategy documented, `process.stderr.write()` for warnings, `--quiet` extraction added. The remaining IMPORTANT item is the INV-006 output schema gap — the plan implies `schema` command coverage but the mechanism doesn't exist yet. Making this explicit (either implement or defer) would bring the score to 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
