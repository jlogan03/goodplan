# Merged Review Feedback — Phase 1, Iteration 1

## Scores
- Generalist: 8/10
- Software Architecture: 8/10
- TUI and CLI: 7/10
- Repo, Tooling, & Docs: 7/10

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### 1. `protect-state.sh` uses two python3 invocations instead of one
**Flagged by:** All 4 reviewers
**File:** `plugin-hooks/protect-state.sh:30`

The plan (task 4) explicitly specifies "Parse JSON and resolve path in a single python3 invocation" and `warn-bash-state.sh` correctly consolidates all logic into one. However, `protect-state.sh` spawns python3 twice: once for `RESOLVED_PATH` (lines 13-23) and once for `CWD` (lines 30-34). This doubles subprocess overhead on every Write/Edit tool call and contradicts the plan's stated rationale of avoiding "subshell variable-evaporation under `set -euo pipefail`."

**Fix:** Have the first python3 invocation print both `RESOLVED_PATH` and `CWD` (e.g., newline-separated, then `read` them), or restructure so the bash path-matching logic also moves into python3 (matching the `warn-bash-state.sh` pattern). Remove the second invocation entirely.

**Resolution:** DIRECTLY_ACTIONABLE

### 2. `plugin-api.md` protect-state.sh Logic block still shows two separate python3 invocations
**Flagged by:** Generalist, Software Architecture, Repo/Tooling
**File:** `.goodplan/epics/plugin-distribution/architecture/plugin-api.md:91`

The plan task updated the `warn-bash-state.sh` Logic block correctly, but the `protect-state.sh` Logic block (lines 91-100) still shows two separate `python3 -c` calls using the old `<<<` heredoc pattern. The numbered description (step 1) says "single invocation" but the code contradicts it. This should be updated to reflect the actual consolidated pattern after issue #1 is fixed.

**Resolution:** DIRECTLY_ACTIONABLE

### 3. `protect-state.sh` missing `.goodplan-dev` sentinel check
**Flagged by:** TUI and CLI
**File:** `plugin-hooks/protect-state.sh:1`

`warn-bash-state.sh` checks for a `.goodplan-dev` sentinel file in `cwd` and skips the warning for dev repos. `protect-state.sh` has no equivalent -- it will block Write/Edit on state files even when working in the goodplan source repo itself during development and testing. The same rationale applies: when developing the CLI, you need to test state file writes. Without this, the hook blocks the CLI's own test fixtures.

**Resolution:** DIRECTLY_ACTIONABLE

---

## MINOR Issues

### 4. `warn-bash-state.sh` heuristic is purely substring-based
**Flagged by:** TUI and CLI
**File:** `plugin-hooks/warn-bash-state.sh:22`

The check `'.goodplan/' in cmd` matches any occurrence in the command string, including comments, echo strings, or read-only operations like `grep -r "pattern" .goodplan/`. The advisory message already mitigates user confusion ("direct reads are fine, but avoid direct writes"), and the hook is non-blocking (exit 0). Acceptable for Experimental maturity.

**Resolution:** DIRECTLY_ACTIONABLE (low priority -- acceptable as-is for now)

### 5. `hooks.json` source paths don't resolve locally
**Flagged by:** Repo, Tooling, & Docs
**File:** `plugin-hooks/hooks.json:8`

`hooks.json` uses `${CLAUDE_PLUGIN_ROOT}/hooks/` but source files live in `plugin-hooks/`. The mapping is handled by the build script, but could confuse developers reading the source tree. Low priority given Experimental maturity.

**Resolution:** DIRECTLY_ACTIONABLE (low priority)

---

## DIRECTLY_ACTIONABLE

1. Consolidate `protect-state.sh` to a single python3 invocation (IMPORTANT)
2. Update `plugin-api.md` protect-state.sh Logic block to match (IMPORTANT)
3. Add `.goodplan-dev` sentinel check to `protect-state.sh` (IMPORTANT)
4. Improve `warn-bash-state.sh` substring heuristic (MINOR, low priority)
5. Clarify `hooks.json` source-vs-runtime path mapping (MINOR, low priority)

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **Error output format inconsistency (TUI/CLI, MINOR):** Flagged as noting asymmetry between stderr (protect-state.sh, exit 2) and stdout JSON (warn-bash-state.sh, exit 0). Reviewer themselves concluded "the asymmetry is intentional and correct" per hook contract. Dropped as not a real issue.

## Unresolved (USER_INPUT required)

None.
