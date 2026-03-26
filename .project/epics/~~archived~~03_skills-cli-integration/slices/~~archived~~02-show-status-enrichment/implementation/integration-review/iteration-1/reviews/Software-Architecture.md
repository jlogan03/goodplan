# Software Architecture Review: Final Integration (All 4 Phases)

## Issues

**[IMPORTANT]** `PathReferences` typed as `Record<string, string>` loses per-phase key guarantees

The `PathReferences` type is `Record<string, string>` -- a fully open map. The `resolvePathReferences` JSDoc documents guaranteed keys per phase (e.g., `plan` for the plan phase, `research` + `brainstorm` for explore), but the type system does not enforce this. Callers must consult documentation rather than getting compile-time verification of which keys exist. This is a shallow interface: the type tells callers almost nothing, pushing knowledge into documentation.

This is acceptable for iteration 1 given that the primary consumers are LLM skills (which parse JSON dynamically), but as the codebase matures, a discriminated union or per-phase result type would make the interface deep -- callers would know at compile time exactly which paths are available. The current shape matches the epic architecture spec (`PathReferences = Record<string, string>`), so this is a known design tradeoff rather than a bug.

File: src/core/rpc/types.ts:109
Resolution: DIRECTLY_ACTIONABLE

Recommendation: Add a `// TODO: Consider discriminated union per-phase PathReferences (e.g., PlanPaths, ExplorePaths) when consumers need compile-time key guarantees` comment on the type definition. No structural change needed now.

---

**[IMPORTANT]** `version-stamp.ts` INV-001 exception needs invariants.md annotation

The `bumpDataVersionIfNeeded` function in `src/core/rpc/version-stamp.ts` modifies `project.json.version` post-reduce in the RPC layer, which is a documented exception to INV-001 (all mutations through the state machine). The file's JSDoc explains the rationale well. However, `architecture/invariants.md` does not document this exception. Architectural invariants should be the single source of truth for what is and isn't allowed -- an undocumented exception that exists only in a code comment risks being "fixed" by a future contributor who reads the invariant doc and concludes it's a violation.

File: src/core/rpc/version-stamp.ts:1
Resolution: DIRECTLY_ACTIONABLE

Recommendation: Add a "Known Exceptions" subsection to INV-001 in `.project/architecture/invariants.md`:
```
**Known Exceptions:**
- `project.json.version` is stamped post-reduce in the RPC layer (`src/core/rpc/version-stamp.ts`). Version is infrastructure metadata (tracking which CLI version last wrote the data), not workflow state. The state machine need not validate or be aware of it.
```

---

**[MINOR]** `collectMdFiles` in status.ts is a local helper that duplicates tree-walking logic

The `collectMdFiles` function in `status.ts` walks a `DirectoryEntry` and filters by `.md` extension. This is a general-purpose tree navigation pattern. Currently it's the only consumer, but if other commands need similar directory listing (e.g., future `list` enrichments), this pattern will be duplicated. Given that `src/core/tree.ts` already provides `getDir`, `getJson`, `getJsonl`, `getMarkdown`, and `hasChild`, a `listChildren` or `filterEntries` helper would be a natural addition.

File: src/commands/global/status.ts:101
Resolution: DIRECTLY_ACTIONABLE

Recommendation: No action needed now -- one consumer doesn't justify extraction. Add a comment: `// Consider extracting to tree.ts if other commands need directory listing`.

---

**[MINOR]** `resolveEntityDir` returns `undefined` for `project` and `decision` targets silently

The `resolveEntityDir` function returns `undefined` for `project`, `decision`, and `rollup` target types, which causes `resolvePathReferences` to return `{}`. This is correct behavior (these targets don't have entity directories in the filesystem), but there's no comment explaining why. A future developer adding a new target type might miss the need to add a case here.

File: src/core/rpc/paths.ts:140
Resolution: DIRECTLY_ACTIONABLE

Recommendation: Add a brief comment: `// These target types have no entity directory -- return undefined to yield empty paths`.

## Score: 9/10

Strong architectural execution across all 4 phases. The layering is clean: `detectArtifacts` is a pure function at the right layer (core, not data, not state machine), `resolvePathReferences` lives in the RPC layer where it belongs, and the version compatibility check is correctly placed in the command dispatch path. The INV-001 exception for version stamping is well-reasoned and the code comment is thorough -- it just needs to be reflected in the invariants doc. The deletion of `src/core/data/files.ts` in favor of tree-walking is an improvement (eliminates redundant filesystem I/O when the tree is already in memory). Module boundaries are respected: no cross-layer violations detected, dependency direction is correct throughout, and all fitness functions remain unaffected by the changes. The breaking schema change in status artifacts is properly covered by the 1.0.0 version bump.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
