# Software Architecture Review: RPC and Commands (Slice 02) — Round 3

## Issues

**[MINOR]** `requireActiveEpic` helper reads `project.json` directly — consider reusing existing state loading

The plan proposes a new `src/commands/slice/utils.ts` with `requireActiveEpic(projectDir: string): string` that "reads `project.json`, returns `activeEpic`." The mechanism for reading `project.json` is unspecified. The codebase already has `loadState(projectDir)` (which returns the full state tree) and `assembleState(projectDir)` (which handles uninitialized projects). If `requireActiveEpic` reads project.json directly via `fs.readFileSync` + `JSON.parse`, it bypasses schema validation (violating INV-005). If it uses `loadState`, it assembles the full state tree just to read one field. The most architecturally consistent approach: use `loadState` or `assembleState` and extract `project.json.activeEpic` via `getJson`. This is what the existing `start-*` commands already do (`loadState` is called on the next line). For `submit-*` and mutation commands, the caller typically calls `loadState` or `begin()`/`submit()`/`complete()` later anyway — the extra state load for `requireActiveEpic` is redundant but harmless (state is cached in memory during a single command invocation). The plan should specify: use `loadState` + `getJson<Project>(state, "project.json")` to stay consistent with INV-005 and avoid a direct `fs` dependency in a commands-layer helper.

Alternatively, several commands (e.g., `slice:plan`, `slice:implement`) construct Target and immediately pass it to `begin()`, which calls `loadState` internally. These commands could derive `epic` from the state loaded inside `begin()` — but that would require changing `begin()`'s signature (Target is a parameter, not derived internally), which is a larger refactor not in scope. The `requireActiveEpic` helper approach is the right call; just pin down its implementation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `complete.ts` deferred routing: flattening all epics' slices loses epic association for path construction

The plan says (line 41): "Flatten ALL epics' slice arrays from `epics/overview.json` to preserve cross-epic routing. For each deferred target, construct paths as `epics/${item's epic}/slices/${item.name}/slice.json`." When you flatten all epics' `slices` arrays into a single list, the resulting `SliceOverviewItem` objects do not carry an `epic` field (by design — `sliceOverviewItemSchema` omits it). The iteration needs to know which epic each slice belongs to in order to construct the `epics/${epicName}/slices/${sliceName}/slice.json` path. The plan should specify that the flattening must preserve the epic name — e.g., map to `{ epicName, ...sliceItem }` tuples, or iterate nested (for each epic, for each slice in epic.slices). The current code iterates `overview.items` (flat list with `item.epic` field) — the restructured code needs an equivalent way to know each slice's epic. This is a minor implementation detail but a correctness requirement for path construction.
Resolution: DIRECTLY_ACTIONABLE

No other issues found.

## Score: 9/10

The plan has comprehensively addressed all round 1 and round 2 feedback. Round 2's two important issues are resolved: (1) subagent commands now specify `requireActiveEpic(projectDir)` as the epic derivation mechanism, applied consistently across all 6 files; (2) cross-epic deferred routing is now specified with the flatten-all-epics approach and explicit path construction. The plan's single-phase structure is appropriate — changes are mechanical and interdependent. Module boundaries are respected: the `requireActiveEpic` helper centralizes a concern that would otherwise be duplicated across 12+ command files. Dependency direction is correct (Commands -> RPC -> State Machine). The two remaining minor issues are implementation details that an experienced implementer would likely resolve correctly, but specifying them prevents subtle bugs (schema validation bypass, lost epic association during flattening).

## Summary
- Critical: 0
- Important: 0
- Minor: 2
