# Software Architecture Review — Round 3

## Issues

**[MINOR]** Phase 2 explore scope resolution: `activeSlice` field shape mismatch with status --json

The plan specifies checking `activeSlice` (nullable `{ name, status } | null`) in the scope resolution priority. However, the `StatusResult` type in `rpc-layer-api.md` defines `activeSlice` as `{ name: string; status: string; phase: string }` (optional, not nullable). The plan should reference `activeSlice` as optional (undefined when absent) rather than nullable, matching the actual API shape. This is cosmetic but could confuse the implementer if they expect a null check vs an undefined check.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 smoke test exercises commands beyond slice scope

Steps 11-16 in the Phase 4 smoke test exercise `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, `epic:add-verification`, and `epic:activate`. These are not commands that the 4 skills being migrated in this slice will invoke. Including them is fine for end-to-end confidence but conflates this slice's validation scope with downstream epic lifecycle testing. Consider adding a brief note that steps 11-16 validate the full epic lifecycle path (not just the 4 migrated skills) to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

The plan is architecturally sound at round 3. All major issues from previous rounds have been addressed well:

- **Dependency direction is correct**: skills depend on CLI commands, never on internal state files. The plan consistently replaces direct file access with CLI queries and mutations, maintaining the Commands -> RPC -> State Machine -> Data Layer boundary.
- **Module boundaries are respected**: the plan clearly delineates what is skill-owned (working copies, LLM artifact directories like `audits/`, `architecture-refining/`, `completion/`) vs CLI-owned (state transitions, activity logging, directory creation for entity directories).
- **Graceful stop redesign for create-architecture** uses a clean dual-detection model (CLI status + file existence) that aligns with the convention doc's idempotent re-entry principle.
- **Refine-architecture resume detection** correctly uses `epic:show --json` for lifecycle status and directory structure for iteration progress, eliminating the skill-local activity-log.jsonl dependency.
- **Explore skip flow** correctly leverages `submit-explore`'s dual `from` status acceptance (`created` and `exploring`), keeping the state machine simple.
- **`start-architecture` non-use** is well-justified — the conventions research sub-agent does web research only.
- **Non-epic scope handling** in explore is honest about the provenance loss and consistent with the audit provenance decision.
- **Data flow is clear**: each phase documents the CLI command sequence (begin -> interactive work -> submit), and the plan correctly identifies which commands return paths vs context bundles.
- **Layering is clean**: no plan step reaches into CLI internals or bypasses the command interface.
- **Maturity**: all touched subsystems are Developing, so no escalated scrutiny needed. No fitness functions are modified or invalidated.

The two remaining MINOR items are clarity improvements, not architectural issues. To reach 10/10, address the `activeSlice` type precision and add the smoke test scope note.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
