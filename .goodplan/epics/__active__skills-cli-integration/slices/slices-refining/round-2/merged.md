# Merged Feedback — Round 2 Review

**Scores:** Software Architecture 9/10 | Architecture Alignment 9/10 | Tracer Bullet 8/10 | Risk/Dependency 9/10

**Overall:** All round 1 critical issues resolved. No critical issues remain. 5 important issues and 7 minor issues after deduplication.

---

## Important Issues

### IMP-1. Slice 05 verification uses wrong precondition status for `create-slices`/`refine-slices`
**Source:** Architecture Alignment (primary)

Slice 05 verification step 1 says "On a test epic in `activated` status, run `/create-slices`." But `epic:define-slices` maps to `BEGIN_SLICING`, which requires `architecture-refined` status (per transition-tables.md). An `activated` epic has already passed through slicing. This would always fail with `STATE_INVALID_TRANSITION`.

**Action:** Fix slice 05 verification step 1 to use an epic in `architecture-refined` status. Fix step 2 for `refine-slices` to use `slices-defined` status, not an activated epic.

---

### IMP-2. Slice 02 semver: major version mismatch behavior undefined
**Source:** Tracer Bullet (primary), Software Architecture (secondary)

The success criteria specify "With CLI 1.0.0 and project 1.1.0, prints minor version warning to stderr" but there is no success criterion for major version mismatch. The behavior section says "error on major mismatch" but "error" is ambiguous — exit code, GoodplanError code, stderr output, or all three?

**Action:** Add a success criterion for major version mismatch: "With CLI 1.0.0 and project 2.0.0, exits with non-zero exit code and `VERSION_MAJOR_MISMATCH` error to stderr."

---

### IMP-3. Slice 02 `paths?` field underspecified — contents not defined
**Source:** Tracer Bullet (primary)

`BeginResult` and `SubmitResult` have no `paths` field today (confirmed in codebase). The goal says "per the architecture spec" but does not enumerate what paths each command type should return (e.g., `slice:plan` → plan.md location? `submit-plan` → implementation directory?). Implementer must guess or research, adding rework risk.

**Action:** Add a brief field specification to slice 02: what `paths` contains for each command type, or reference the exact section of the architecture spec that defines this.

---

### IMP-4. Slice 03 lacks test state setup preamble for `complete` skill verification
**Source:** Tracer Bullet (primary)

Slices 04-05 received test state setup preambles. Slice 03 did not. Verification step 3 requires a slice in `implementation-complete` status — a long command chain (init → epic:create → activate → define-slices → slice:create → slice:plan → submit-plan → refine-plan → submit-refinement → slice:implement → submit-implementation). Step 4 (epic complete with all slices completed) is even more complex.

**Action:** Add a test state setup preamble to slice 03 similar to slices 04-05.

---

### IMP-5. Slice 01/02 semver: convention doc documents a protocol whose CLI enforcement doesn't exist until slice 02
**Source:** Risk/Dependency (primary)

The convention doc (slice 01) prescribes version compatibility checking at skill startup. But CLI-side enforcement (the command dispatcher check) doesn't land until slice 02. The `project-status` skill migrated in slice 01 can perform the skill-side check (`goodplan --version --json` + manual comparison), but the CLI won't enforce it. Skills migrated in slices 03-05 need to re-verify version checking once CLI enforcement lands.

**Action:** Add a note to slice 01 scope boundaries: "Version compatibility checking is 'convention doc only' in this slice — the protocol is documented and `--version --json` output exists, but CLI-side major/minor enforcement is deferred to slice 02."

---

## Minor Issues

### MIN-1. Slice 02 semver: `assembleState()` reference should be `loadState()` only
**Source:** Architecture Alignment (primary)

The goal text says "reads `project.json.version` via `assembleState()`/`loadState()`." `assembleState()` is a full scan; loading a version number only needs `loadState()` (cached, cheap). The slash notation implies both are valid, which could lead to an unnecessarily expensive implementation.

**Action:** Change to "reads `project.json.version` via `loadState()` — a legitimate Commands-to-Data-Layer read path."

---

### MIN-2. Slice 03 `complete` skill references `start-complete` which does not exist
**Source:** Software Architecture (primary)

The convention doc worked example (written in slice 01) references `goodplan start-complete --slice my-slice --inline --json`. No `start-complete` command exists in `src/commands/subagent/`, and it is not in the Commands API or RPC layer's `SubmitPhase` type. When `complete` is migrated in slice 03, implementers consulting the convention doc will encounter a non-existent command.

**Action:** Add a note to slice 03 scope boundaries: "The convention doc's `start-complete` example may need replacement with `state --json --query` for context loading, or `start-complete` may need to be added as a CLI gap discovered during migration."

---

### MIN-3. Slice 06 success criteria contradict the "don't re-verify" note
**Source:** Tracer Bullet (primary), Architecture Alignment (secondary)

Slice 06 says "Focus on cross-skill transitions and emergent issues (not re-verifying grep compliance already covered by slices 03-05)" but immediately lists grep-based criteria that replicate slice 03-05 verification. Implementer won't know whether to skip or perform them.

**Action:** Remove grep criteria from slice 06 (replace with "Prior slice grep compliance assumed") and keep only runtime/ergonomic cross-skill transition checks. Or remove the "not re-verifying" note and accept the duplication. The former is cleaner.

---

### MIN-4. Slice 01 convention doc success criterion lists nine topics as a completeness checklist, not a verifiable criterion
**Source:** Tracer Bullet (primary)

The success criterion lists nine topics the convention doc must cover. These cannot be verified by migrating `project-status` alone (a read-only skill that won't exercise write patterns, error recovery, etc.). The real validation happens in slices 03-05. The nine-topic checklist creates false completeness.

**Action:** Reframe: "Convention doc covers at minimum: binary detection, invocation patterns, state orientation, error handling. Additional topics may be drafted but are validated by subsequent slices."

---

### MIN-5. Slice 04 `start-*` inconsistency: `--json` flag and `--inline` byte budget
**Source:** Software Architecture (primary), Architecture Alignment (secondary), Tracer Bullet (secondary)

Two related cosmetic issues in slice 04:
(a) The behavior section says `start-*` commands always output JSON so `--json` is not needed, but `submit-*` invocations still include `--json` (correct per Commands API). The inconsistency is harmless but may confuse reviewers.
(b) `--inline` is described bare but the actual CLI accepts `--inline[=<bytes>]` with an optional byte budget. The skill rewrite needs to know whether to specify a budget.

**Action:** Generalize the note once in the convention doc: "`start-*` commands always return JSON; `submit-*` and mutation commands require `--json` for structured output." For `--inline`, either note the optional byte budget or defer to the convention doc.

---

### MIN-6. Slice 01 `state` command JSON output not noted as a public API contract
**Source:** Architecture Alignment (primary)

The `state` command exposes `assembleState()` as JSON. The unwrapped serialization format (DirectoryEntry → plain object, JsonEntry → unwrapped T, etc.) is defined in `cli-changes.md`. Changes to `StateEntry` type structure would break jq queries across all 15 skills. The goal treats this as an implementation detail.

**Action:** Add to slice 01 behavior or scope: "The `state` command's JSON output is a public API contract — internal state tree type changes must maintain backward compatibility with the unwrapped serialization format defined in `cli-changes.md`."

---

### MIN-7. Slices 04-05 sequential ordering may be over-conservative; note as parallelization candidate
**Source:** Risk/Dependency (primary)

The rationale for sequential 04→05 is "convention doc updates from 04 inform 05." If slice 03 produces a stable convention doc with minimal updates, the 11 skill migrations in slices 04+05 could potentially run in parallel. Current sequential ordering is the safe choice but carries a throughput cost.

**Action:** No change required. Note in sequencing rationale that this is a candidate for parallelization if slice 03 exit state shows a stable convention doc.

---

## Resolved Round 1 Issues (for reference)

All round 1 critical and most important issues were resolved:
- `begin()` factoring removed from slice 02
- `context?`/`paths?` reframed as new implementation work (not "already exist")
- `state` command routing now explicit
- Slices 04→05 made sequential with rationale
- CLI changes acknowledged as in-scope in slices 03-05
- Automated test requirements added to slice 01
- Test state setup preambles added to slices 04-05
- Slice 05 contradictory verification step fixed
- jqjs performance check added to slice 01 verification
- Dogfooding exit criteria bounded

---

## Conflict Notes

No direct conflicts between reviewers. Architecture Alignment and Tracer Bullet both flagged semver-related issues (IMP-2, MIN-1) from different angles — merged without contradiction. Software Architecture and Tracer Bullet both flagged the `start-*`/`--json` inconsistency (MIN-5) — merged as a single item. Risk/Dependency and Tracer Bullet both touched slice 06 scope (MIN-3) — Risk/Dependency declared the exit criteria acceptable; Tracer Bullet flagged the grep criterion duplication specifically; merged as MIN-3 targeting the grep duplication only.
