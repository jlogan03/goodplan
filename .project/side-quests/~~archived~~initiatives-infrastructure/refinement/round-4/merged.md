# Merged Feedback — Round 4

## Source Reviews
- Holistic (4 MINOR issues, score 9/10)
- Software Architecture (2 MINOR issues, score 9/10)

Total: 0 Critical, 0 Important, 6 Minor.

---

## Issues

### [MINOR-H1] `/refine-architecture` scaffold detection before top-level fallback
**Source**: Holistic

Phase 5 says `/refine-architecture` falls back to `.project/architecture/` when no active initiative. But the top-level `_overview.md` is a scaffold (contains `<!-- scaffold -->` marker) after Phase 2 runs — the skill should detect this marker and warn the user (or redirect to `/define-architecture`) rather than treating the scaffold as real architecture. This is consistent with Phase 7 stale detection skipping scaffold files.

**Applies to**: `05-explore-and-define-architecture.md` — `/refine-architecture` task block.

---

### [MINOR-H2] Phase 5 verification: add concrete smoke test for "no active initiative" fallback
**Source**: Holistic

The verification checklist asserts "All four skills fall back to top-level `.project/architecture/` when no active initiative" but gives no concrete smoke test. An implementer could break the fallback while passing the initiative-scoped path test. Add a concrete step: with no `initiatives/__active__*/` directory present, confirm `/refine-architecture` reads `.project/architecture/` and `/audit-architecture` globs `.project/architecture/**/*.md`.

**Applies to**: `05-explore-and-define-architecture.md` — Verification section.

---

### [MINOR-H3] `/audit-architecture` flow-log scope value not updated
**Source**: Holistic

`/audit-architecture` Step 7 writes `"scope":"project"` hardcoded to `flow-log.jsonl`. When operating on initiative architecture, this should be `"scope":"initiatives/<name>"`. Phase 5 adds path resolution but doesn't mention updating the flow-log write. `/project-status` reads the flow-log for interrupted-work detection, so the wrong scope creates traceability inconsistencies.

**Applies to**: `05-explore-and-define-architecture.md` — `/audit-architecture` task block.

---

### [MINOR-H4] `/refine-architecture` flow-log scope value not updated
**Source**: Holistic

Same as H3: `/refine-architecture` Step 4 writes `"scope":"project"` hardcoded. When operating on initiative architecture, this should be `"scope":"initiatives/<name>"`.

**Applies to**: `05-explore-and-define-architecture.md` — `/refine-architecture` task block.

---

### [MINOR-SA1] `/refine-architecture` run and backup directories not scoped to initiative
**Source**: Software Architecture

Phase 5 updates `/refine-architecture` to operate on initiative architecture but doesn't mention the run directory (`.project/architecture-refining/`) or backup directory (`.project/architecture-backup-<timestamp>/`), which are hardcoded to the project root. When operating on initiative architecture, these should be:
- Run directory: `initiatives/__active__<name>/architecture-refining/`
- Backup directory: `initiatives/__active__<name>/architecture-backup-<timestamp>/`

Without this, artifacts land in the wrong place and the resume detection logic (which looks for `architecture-backup-*`) could pick up the wrong backup.

**Applies to**: `05-explore-and-define-architecture.md` — `/refine-architecture` task block.

---

### [MINOR-SA2] Phase 4 state.md stale Active Slice edge case not specified
**Source**: Software Architecture

Phase 4 establishes that file-existence steps (2, 3) take precedence over state.md step (4). But the plan doesn't say what happens if no active initiative exists in the file system yet state.md's Active Slice value references an initiative path (e.g., the directory was renamed or deleted but state.md wasn't updated). The `status-logic.md` "file-existence overrides state.md" convention covers the spirit but this specific case should be spelled out: "If state.md's Active Slice references an initiative path that no longer exists in the file system, treat it as stale and fall through to project level."

**Applies to**: `04-project-status.md` — `status-logic.md` update task.
