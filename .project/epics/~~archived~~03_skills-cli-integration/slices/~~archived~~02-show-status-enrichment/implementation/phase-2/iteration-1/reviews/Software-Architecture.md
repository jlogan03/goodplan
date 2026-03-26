# Software Architecture Review — Phase 2: Status File Arrays

## Issues

**[IMPORTANT]** Dead export: `countFiles` in `src/core/data/files.ts` is no longer imported by any source file
The `countFiles` function was the sole export of `src/core/data/files.ts`. After this phase replaced all usages with state-tree-based `collectMdFiles()`, no source file imports `countFiles` anymore. The file is now dead code. It should be removed (or at minimum the import removed from the barrel if one exists) to avoid confusion about which approach is canonical. This also aligns with the architecture's preference for using the assembled state tree over raw filesystem I/O.
File: src/core/data/files.ts:19
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `_projectDir` parameter is now unused but still passed through the call chain
`countArtifacts()` accepts `_projectDir: string` (underscore-prefixed to silence the unused warning) and the caller at line 45 still passes `dir` to it. Since the function now walks the state tree exclusively, this parameter is vestigial. Keeping it signals to future readers that filesystem access might be involved, which contradicts the architectural intent of this change. Remove the parameter from both the function signature and the call site.
File: src/commands/global/status.ts:124
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `collectMdFiles` is a private helper in the command layer — consider whether it belongs in Data Layer
The `collectMdFiles` function walks `DirectoryEntry.contents` from the state tree, which is a Data Layer concern (tree traversal for reads). Currently it lives as a private function inside the command file, which is acceptable for now since it is small and single-use. However, if other commands (e.g., `show` enrichment or future context bundling) need similar directory-to-file-list logic, this should migrate to the Data Layer (`src/core/data/tree.ts` alongside `getDir`). No action needed now — flagging for awareness.
File: src/commands/global/status.ts:107
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation correctly moves from raw filesystem I/O (`countFiles`) to walking the assembled state tree, which is the architecturally preferred approach per the Data Layer design. The schema change is clean — `fileArtifactSchema` is well-defined, defaults work correctly with `exactOptionalPropertyTypes`, field renames align with the epic target architecture, and the `count` field is derived from `files.length` (no divergence risk). Tests are thorough: they verify the enriched shape, dual-directory aggregation, path relativity, count-files consistency, and that plain-number fields are preserved. The convention doc update is clear with a "Changed in 1.0.0" annotation and concrete JSON example.

To reach 9+: remove the dead `countFiles` export and the vestigial `_projectDir` parameter.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
