## Issues

**[IMPORTANT]** Phase 5 RPC init function does not specify `assembleState` vs `ZERO_STATE` decision logic clearly

Phase 5 task for `src/core/rpc/init.ts` says: "call `assembleState()` (or construct ZERO_STATE if `.project/` doesn't exist)". This creates ambiguity about who decides. The init command (Phase 5 task 2) already checks `cwd/.project/` existence as a pre-flight guard and throws `STATE_ALREADY_INITIALIZED` before reaching the RPC layer. So by the time the RPC function runs, `.project/` either doesn't exist (fresh init) or does exist (and `assembleState` would return a populated tree). The parenthetical "or construct ZERO_STATE" suggests the RPC function should bypass `assembleState` when it knows `.project/` doesn't exist, but `assembleState` already returns `ZERO_STATE` for missing directories per Phase 3. The cleaner approach per the architecture flow in `flows.md` step 3 is: always call `assembleState()` and let it return `ZERO_STATE` naturally. The "or construct ZERO_STATE" alternative adds a code path that duplicates `assembleState`'s zero-state logic. Fix: remove the parenthetical and state that `assembleState()` is always called -- it handles the missing directory case.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 INIT_PROJECT handler creates `decisions.jsonl` and `learnings.jsonl` as empty arrays but no `activityEntrySchema` validation coverage for the init log entry

Phase 4 says the INIT_PROJECT apply function produces an `activity-log.jsonl` entry with an init entry. The plan specifies the unit test checks "INIT_PROJECT on ZERO_STATE -> valid tree with all expected entries" but does not verify that the activity log entry itself conforms to the `activityEntrySchema` shape defined in Phase 2. Since the state machine is pure (INV-003) and doesn't import schemas, this validation happens in `commitState`. However, the Phase 4 unit tests operate on the raw tree output without `commitState`. If the state machine produces a malformed activity log entry (wrong field names, missing `ts`), the Phase 4 tests would pass but Phase 5 integration would fail. Add a Phase 4 test assertion that the activity log entry shape matches the expected fields (ts, phase, scope, status, summary) -- not via Zod import (that would violate purity), but via structural assertions on the object.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `commitState` JSONL append detection assumes array-length comparison is sufficient but doesn't address empty-to-populated transition

Phase 3 says "detect appended entries by comparing array lengths only (existing entries are trusted unchanged per INV-003 reducer purity), append only new lines." For the init case, `oldState` is `ZERO_STATE` (no `activity-log.jsonl` entry at all) and `newState` has an `activity-log.jsonl` with entries. This is not an "append" -- it's a new file creation. The plan correctly covers "New json -> validate + write atomically" and "New jsonl -> validate + write" as separate cases from "Changed jsonl -> detect appended entries." However, the phrasing in the task conflates these cases. The distinction matters because a new JSONL file should be written in full (not appended to a nonexistent file). The plan does separate "New jsonl" from "Changed jsonl" in the task description, so this is a clarity issue rather than a correctness issue. Consider adding a brief note that "append-only" applies to the changed case; new JSONL files are written in full.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 `buildStatusResult` refactoring uses `assembleState()` directly from the Commands layer

Phase 5 task 3 says: "refactor `buildStatusResult()` to use `assembleState()` to read the state tree." The `buildStatusResult` function lives in `src/commands/global/status.ts` (Commands layer). The architecture says read-only commands can go directly to the Data Layer (skipping RPC), so this is architecturally valid. However, the RPC layer API defines `status(options: StatusOptions): StatusResult` as the canonical status function. The plan has the status command calling `assembleState` directly rather than going through the RPC `status()` function. For this slice this is fine (the RPC status function doesn't exist yet), but the plan should note that this is a temporary arrangement that will be replaced when the RPC `status()` function is implemented in a later slice. Without this note, the implementer might assume this is the final architecture.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All critical and important issues from rounds 1 and 2 have been addressed in the current plan revision. The `StateError.detail` type now matches the architecture spec (`Record<string, unknown>`). The `assembleState` behavior for unregistered `.json` files is explicitly stated (silently skipped). The error collection strategy (collect all, throw single `GoodplanError`) is specified. The binary regression test runs in a temp directory. The `commitState` write ordering is documented with rationale and a two-array implementation approach. The `--quiet` routing note is present. The verbose verification checks for specific file paths. Module boundaries remain clean: types -> schemas -> I/O -> state machine -> wiring, with correct dependency direction. The single remaining IMPORTANT issue (RPC init function ambiguity) is a small wording fix. The three MINOR issues are documentation/clarity improvements. This plan is ready for implementation after the wording fixes.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
