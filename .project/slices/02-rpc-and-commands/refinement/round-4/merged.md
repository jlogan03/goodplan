# Merged Feedback — Slice 02: RPC and Commands (Round 4)

## Scores
- Holistic: 9/10 (C:0 I:0 M:1)
- SoftwareArchitecture: 8/10 (C:0 I:3 M:3)
- TypeScript: 9/10 (C:0 I:0 M:2)

## Resolution Notes

SA ran on a less capable model this round. Both domain experts (Holistic, TypeScript) scored 9/10 with zero IMPORTANT issues. SA's three IMPORTANT findings were evaluated against the domain experts' assessments:

- **SA-IMP-1** (buildSliceCompleteResult parameter position): TypeScript explicitly confirmed the narrowing and call-site pattern are sound. The clarity concern about parameter insertion position is valid but not a correctness risk. Downgraded to MINOR.
- **SA-IMP-2** (deferred routing inner path not explicitly called out): Holistic evaluated the deferred routing section for completeness and found it adequate. The tuple flattening description implies the path fix. Downgraded to MINOR.
- **SA-IMP-3** (activeEpic divergence across terminals): SA itself says "the plan does not need to resolve it in this slice" and "not a blocker." Dropped as out-of-scope observation.
- **SA-MIN-3** (INV-004 boundary note): SA says "no action needed" and "out of scope." Dropped.
- **TS-MIN-2** (narrowing confirmation): TS says "no action needed" — informational only. Dropped.

## Merged Issues

### MINOR

**M1. `buildSliceCompleteResult` — specify parameter position**
Source: SoftwareArchitecture (downgraded from IMPORTANT), confirmed by TypeScript
Make the `epicName` parameter position explicit in the plan: `buildSliceCompleteResult(sliceName: string, epicName: string, entity: string, ...)` so implementer doesn't append it at the end.

**M2. Deferred routing — explicitly call out inner path update**
Source: SoftwareArchitecture (downgraded from IMPORTANT)
The deferred routing task should explicitly note that `slices/${item.name}/slice.json` at line 208 becomes `epics/${epicName}/slices/${item.name}/slice.json`, alongside the structural flattening change. Currently implied but not stated.

**M3. `requireActiveEpic` — specify error code per INV-007**
Source: SoftwareArchitecture
Add that `requireActiveEpic` should throw `GoodplanError` with a namespaced code (e.g., `"NO_ACTIVE_EPIC"`) rather than a generic throw.

**M4. `create.ts` — use `input.epic` consistently over `args.epic` for Target**
Source: TypeScript
Since `input.epic` (validated from schema) is already used in the `begin()` payload (line 47), the Target construction should also use `input.epic` for consistency, or document why `args.epic` is intentional.

**M5. `show.ts` — note activeEpic fallback in task description**
Source: Holistic
The task description for `show.ts` (line 69) should note that when `--epic` flag is absent, epic defaults to `activeEpic`. The verification section confirms this behavior, but the task itself doesn't specify fallback logic.

## Verdict

**PASS** — No critical or important issues remain after resolution. Five minor clarity improvements identified; all are low-effort plan text edits. The plan is implementation-ready.
