# Learnings: 02-rpc-and-commands

## State cache bypasses schema defaults — bump cache version or delete cache after schema changes
Zod `.default([])` on `epicOverviewItemSchema.slices` only applies when `loadState` runs `safeParse().data`. But the state cache stores raw `ProjectState` from before the schema change. Stale caches return data without defaults applied, causing runtime errors. After schema changes that add defaulted fields, either bump `CACHE_VERSION` (careful: unit tests may depend on it) or document that users must delete `.state-cache.json`.

## Scattered path references in large functions need exhaustive enumeration in plans
`buildSliceCompleteResult` (~100 lines) had 6 path references, but one (`architecture-deltas.jsonl` at line 259) was 80+ lines away from the others in a different logical section. The Architecture reviewer caught this as CRITICAL. Plans changing path strings in functions >50 lines should grep for ALL string literals containing the old path pattern, not just list the "main" references.

## Helper functions wrapping state access should minimize I/O scope
`requireActiveEpic(projectDir)` initially called `loadState` (full state tree) when it only needed `project.json`. Every caller also called `loadState`, doubling I/O on cache misses. The fix: read only `project.json` via `fs.readFileSync` + `projectSchema.safeParse()`. Design helpers that access state to take the narrowest possible input — `ProjectState` param or single-file read, not `projectDir` with implicit full load.

## Cross-epic deferred routing requires flattening the nested overview
`DeferredItem.targetEpic` is `string | undefined`, allowing cross-epic deferred work. After consolidating slices into the epic overview, the deferred routing loop must flatten all epics' slice arrays into `{ epicName, ...sliceItem }` tuples — not just iterate the completing slice's own epic. The `epicComplete` check correctly scopes to same-epic only (line 190), but the deferred loop must be broader.

## Installed vs repo CLI divergence is a bootstrapping constraint during self-development
The repo's code expects nested paths (`epics/${epic}/slices/${name}`), but the running project's data is in the old flat layout. The installed CLI (old version) works with the current data; the locally-built CLI (new version) can't operate on it. State mutations must use the installed CLI until a migration is run. This is inherent to self-hosting development tools — plan for it.
