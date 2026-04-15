# Side Quest Proposals — 05-epic-lifecycle-commands

## 1. Delete dead v1 epic command files

**Rationale:** 7 v1 command files (`explore.ts`, `define-architecture.ts`, `define-slices.ts`, `refine-architecture.ts`, `refine-slices.ts`, `add-verification.ts`, `update-verification.ts`) remain on disk but are commented out of `main.ts`. They import from `src/core/rpc/begin.js` which is the v1 data layer. Dead code increases confusion during search/navigation.

**Scope:** Small — delete files, verify no remaining imports reference them.

**Priority:** Low — wait until slice 06/07 are done to avoid any remaining v1 references.

## 2. Extract shared command boilerplate into a helper

**Rationale:** Every v2 command repeats the same 15-line setup: resolve project dir, check events path exists, read stdin, wire invariant engine (createCoreRegistry + createReplayGetContext + createBeforeAppendHook), get git branch/commit hint. This is ~60% of each command file. A `createEpicCommandContext(epicName)` helper would reduce each command to its unique logic.

**Scope:** Medium — extract helper, refactor 25+ commands to use it.

**Priority:** Medium — reduces boilerplate and potential for copy-paste errors in slices 06-07.

## 3. Add schema validation before event append

**Rationale:** Commands construct payloads manually but don't validate them against the Zod schemas in `EpicEventMap` before calling `appendEvent`. A `validatePayload(type, payload)` call before append would catch mismatches at the source rather than relying on downstream consumers.

**Scope:** Small — add a validation helper and wire it into the command pattern.

**Priority:** Low — invariant engine catches most issues; this is defense-in-depth.

## 4. Make `storeContentRef` consistently async

**Rationale:** `storeContentRef` has an `async` signature but uses `execSync` internally. Either make it truly async (using `Bun.spawn` or `child_process.exec`) or drop the `async` and return `ContentRef` directly. The current mix is misleading.

**Scope:** Small — one file change.

**Priority:** Low — correctness is fine, just an API consistency issue.
