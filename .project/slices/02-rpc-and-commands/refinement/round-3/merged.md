# Merged Feedback — Slice 02: RPC and Commands (Round 3)

## Scores
- Holistic: 8/10
- SoftwareArchitecture: 9/10
- TypeScript: 9/10

## Issues

### IMPORTANT

**[IMPORTANT-1]** Plan omits 4 test files that construct slice Targets without `epic`
Source: Holistic
The plan lists specific test files but misses 4 others with 44 total instances:
- `tests/unit/commands/slice/slice-commands.test.ts` — 32 instances
- `tests/unit/commands/learning/learning-commands.test.ts` — 7 instances
- `tests/unit/commands/subagent/start-commands.test.ts` — 4 instances
- `tests/unit/context/collect.test.ts` — 1 instance
The catch-all bullet is insufficient; at minimum `slice-commands.test.ts` and `learning-commands.test.ts` should be explicitly listed since they represent the bulk of remaining work.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-2]** `complete.ts` deferred routing loop needs per-item epic name for path construction
Source: Holistic + SoftwareArchitecture (merged)
Lines 208-209 in the deferred routing loop iterate over *other* slices via `overview.items` using `item.name`. After migration, the flattened list of all epics' slices loses the epic association (since `sliceOverviewItemSchema` omits an `epic` field). The plan must specify that flattening preserves the epic name — e.g., map to `{ epicName, ...sliceItem }` tuples, or iterate nested (for each epic, for each slice). The current plan's "add `epicName: string` parameter" + "update all 6 internal path references" implies uniform substitution, but the deferred loop paths need per-item epic resolution, not a single `epicName`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-3]** `architecture-deltas.jsonl` path on line 259 needs prominent callout
Source: TypeScript + Holistic (merged)
Line 259 (`getJsonl(newState, \`slices/${sliceName}/architecture-deltas.jsonl\`)`) is 80+ lines away from the other 5 path references and in a different logical section (architecture path derivation vs. main complete/deferred logic). Easy to miss during implementation. The plan should call this out separately or group it more explicitly, since it's structurally different (JSONL file, not entity JSON).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-4]** `slice:create` uses required `--epic` flag — plan should clarify it does NOT use `requireActiveEpic`
Source: TypeScript
`create.ts` has `epic` as a required flag (`required: true`, line 31). The plan's phrasing "from existing `--epic` flag or `requireActiveEpic(projectDir)`" is ambiguous. Clarify: `create.ts` uses `args.epic` directly, no helper needed. The `requireActiveEpic` helper is only for commands without an `--epic` flag (`plan.ts`, `refine-plan.ts`, `implement.ts`, `complete.ts`, `abandon.ts`, and the 6 subagent commands).
Resolution: DIRECTLY_ACTIONABLE

### MINOR

**[MINOR-1]** `requireActiveEpic` helper should use `loadState` + `getJson`, not direct `fs` reads
Source: SoftwareArchitecture
The plan proposes `requireActiveEpic(projectDir)` that "reads `project.json`, returns `activeEpic`" but doesn't specify the mechanism. Direct `fs.readFileSync` + `JSON.parse` bypasses schema validation (violating INV-005). Specify: use `loadState` + `getJson<Project>(state, "project.json")` to stay consistent with existing patterns and INV-005.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-2]** `list.ts` `--all` flag referenced in plan but doesn't exist in current code
Source: Holistic
The plan describes `--all` behavior and verification tests it, but the current `list.ts` only defines `--epic` as an arg. The plan should explicitly include adding the `--all` flag to the args definition, not just describe the behavior.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-3]** `resolveScope` update should be cross-referenced with context test updates
Source: TypeScript
The plan lists `resolveScope` under "Context Layer" and context tests separately. Since `resolveScope` and `entityDir` changes are the root cause of 9 test failures, the implementer should update both code and tests in the same pass to avoid broken intermediate state.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-4]** Before-check grep pattern uses `slice.02` which matches any character for the dot
Source: Holistic
The grep pattern `@ts-expect-error.*slice.02` matches `slice-02`, `slice_02`, etc. Currently safe since all annotations use `slice.02`, but noted for robustness.
Resolution: DIRECTLY_ACTIONABLE

## Deduplication Notes
- Holistic IMPORTANT #2 (deferred loop per-item epic) merged with SoftwareArchitecture MINOR #2 (flattening loses epic association) — same issue, elevated to IMPORTANT per Holistic's severity rating, enriched with SA's implementation detail.
- Holistic MINOR #1 (architecture-deltas.jsonl) merged with TypeScript IMPORTANT #1 (same line 259) — elevated to IMPORTANT per TypeScript's severity rating as domain specialist.

## Contradictions
None. All reviewers agreed on the issues; differences were only in severity and specificity.
