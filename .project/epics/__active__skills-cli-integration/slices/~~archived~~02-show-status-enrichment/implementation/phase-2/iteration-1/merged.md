# Merged Review — Phase 2: Status File Arrays

**Scores:** Generalist 9/10 · Software Architecture 8/10 · TypeScript 9/10
**Issues:** Critical: 0 · Important: 2 · Minor: 3

## Overall Assessment

Clean, well-executed phase. All seven plan tasks completed. The schema change from plain numbers to `{ count, files }` objects is correctly propagated through schema, command, human formatter, tests, and convention docs. Implementation correctly uses the state tree (via `getDir`) instead of raw `fs.readdirSync`, matching the plan's architectural intent. Build passes, all 941 tests pass.

---

## Issues

### Important

**I-1. Dead module: `src/core/data/files.ts`**
`countFiles` was the sole export of `src/core/data/files.ts`. After this phase replaced all usages with state-tree-based `collectMdFiles()`, no source file imports `countFiles` anymore. The module is now orphaned dead code. Remove it to avoid confusion about which approach is canonical and to reinforce the architecture's preference for assembled state tree over raw filesystem I/O.
- File: `src/core/data/files.ts`
- Raised by: Generalist, Software Architecture

**I-2. Vestigial `_projectDir` parameter in `countArtifacts()`**
`countArtifacts()` accepts `_projectDir: string` (underscore-prefixed to silence the unused warning), and its call site in `buildStatusResult` still passes `dir`. Since the function now walks the state tree exclusively, this parameter is dead. Keeping it signals to future readers that filesystem access might be involved, which contradicts the architectural intent. Remove from both the function signature and the call site.
- File: `src/commands/global/status.ts:124`
- Raised by: Generalist (minor), Software Architecture (important), TypeScript (minor)
- Resolution: Elevated to Important based on Software Architecture reasoning — the misleading signal outweighs the small refactor cost.

### Minor

**M-1. Redundant `count` field creates a divergence risk**
`count` is always `files.length`, but it is stored as a separate field. There is currently one construction site (`countArtifacts`) and a test that asserts consistency, which adequately mitigates the risk today. If construction sites multiply, consider a Zod `.transform()` to derive `count` at schema level and eliminate the invariant entirely. No action required now — flag for awareness.
- File: `src/schemas/commands/status.ts:21`
- Raised by: TypeScript

**M-2. Inline `import()` type for `ProjectState`**
`collectMdFiles` (and pre-existing helpers `countArtifacts`, `resolveActiveEpic`, etc.) uses `import("../../core/tree.js").ProjectState` inline rather than a top-level `import type`. The file already has `import type { DirectoryEntry } from "../../core/tree.js"` — `ProjectState` should be added to that import. The current pattern is consistent with existing helpers in the file, so this is polish rather than a defect.
- File: `src/commands/global/status.ts:108`
- Raised by: Generalist, TypeScript

**M-3. `collectMdFiles` placement may belong in Data Layer**
`collectMdFiles` walks `DirectoryEntry.contents` — a Data Layer concern (state tree traversal for reads). It currently lives as a private helper in the command file, which is acceptable while it is small and single-use. If future commands need similar directory-to-file-list logic, migrate to `src/core/data/tree.ts` alongside `getDir`. No action needed now.
- File: `src/commands/global/status.ts:107`
- Raised by: Software Architecture

---

## What Went Well

- Schema (`fileArtifactSchema`) is the single source of truth; type `Artifacts` is inferred and flows correctly into command and tests.
- `noUncheckedIndexedAccess` guard correctly applied (`dir: DirectoryEntry | undefined`).
- `exactOptionalPropertyTypes` handled via `.default()` on all artifact fields.
- Dual-directory aggregation matches prior `countFiles()` behavior; paths are state-tree-relative.
- `formatStatusHuman()` updated to reference `.count` throughout.
- Convention doc updated with "Changed in 1.0.0" annotation, concrete JSON example, and removed stale "Available after slice 02" guards.
- Test coverage is thorough: count-matches-length, state-tree-relative paths, dual-directory aggregation, empty project, plain-number field preservation.
