# Software Architecture Review — Rename to gp (Round 5)

## Issues

**[MINOR] `PROJECT_DIR_NAME` export creates a new cross-module coupling path**
The plan calls for exporting `PROJECT_DIR_NAME` from `project.ts` so that `init.ts` and `migrate.ts` can import it. This is reasonable for DRY, but introduces a coupling direction worth noting: command-layer files (`init.ts`, `migrate.ts`) would depend on a data-layer constant. This is consistent with the existing dependency direction (Commands depend on Data Layer per architecture), so it is not a violation — but the constant should be documented as part of the Data Layer's public API surface. Currently `project.ts` exports only `resolveProjectDir()`. Adding a named constant is fine but the plan should mention updating the JSDoc or module comment to indicate this is an intentional public export.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `migrate.ts` dual-path resolution adds detection logic to the command layer — consistent but worth a comment**
The plan correctly places `.goodplan/` vs `.project/` detection in the command layer (`migrate.ts`), consistent with how `init.ts` checks cwd directly. The plan also notes "Detection belongs in the command layer (consistent with `init.ts` pattern)." This is architecturally sound — the RPC layer receives a resolved path and stays agnostic. No issue here, just confirming the plan's reasoning is correct. However, the plan should specify that the dual-path resolution in `migrate.ts` should include a brief inline comment explaining why it checks both paths (legacy migration support), so future readers understand this isn't dead code.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Schema registry description for `migrate` is explicitly called out as stale — good, but the proposed fix is vague**
The plan says the schema registry description at `schema.ts` ~line 127 "is stale and should be updated to reflect re-migration support." It also says the description should "mention both `.project/` and `.goodplan/` directories." The plan should specify the exact new description string rather than leaving it to the implementer to draft, since this is a user-facing schema output consumed by LLM orchestrators (INV-006: schema output reflects actual command signatures). A mismatch here could cause LLM orchestrators to construct incorrect commands.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is architecturally sound. Module boundaries are respected: the rename correctly keeps detection in the command layer, path resolution in the data layer, and the RPC layer path-agnostic. The dependency direction (Commands → Data Layer) is maintained. The `PROJECT_DIR_NAME` export is a clean way to avoid string duplication. The dual-path approach in `migrate.ts` is the right design for backward compatibility without polluting lower layers. The scope decisions (keeping internal identifiers as `goodplan`) correctly separate product name from binary name. The atomicity constraints on fixture renames + helper updates are well-identified. The only gaps are minor documentation/specification items.

To reach 10/10: specify the exact `migrate` schema registry description string (INV-006 compliance), and add brief JSDoc notes on the new `PROJECT_DIR_NAME` export and the dual-path detection rationale.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
