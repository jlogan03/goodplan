# Repo & Tooling Review — Phase 2: Build Pipeline & Plugin Manifest

## Issues

**[IMPORTANT]** Double execution of `claude plugin validate` on failure path
The validation logic on lines 211-224 runs `claude plugin validate` twice: once in the `if !` condition (line 211, output goes to stdout/terminal), then again on line 214 to capture output into `VALIDATION_OUTPUT`. This is wasteful and fragile — the validator could return different results between the two runs (e.g., if the dist directory were being modified concurrently). Capture the output once and check the exit code from that single run.
File: scripts/build-plugin.sh:211
Resolution: DIRECTLY_ACTIONABLE

Suggested fix:
```bash
VALIDATION_OUTPUT=$(claude plugin validate "$PLUGIN_DIR/" 2>&1) && true
VALIDATION_EXIT=$?
if [[ "$VALIDATION_EXIT" -ne 0 ]]; then
  AGENT_ERRORS=$(echo "$VALIDATION_OUTPUT" | grep -c 'agents:' || true)
  TOTAL_ERRORS=$(echo "$VALIDATION_OUTPUT" | grep -c '❯' || true)
  if [[ "$AGENT_ERRORS" -eq "$TOTAL_ERRORS" && "$TOTAL_ERRORS" -gt 0 ]]; then
    echo "  WARN: claude plugin validate does not recognize 'agents' field yet — expected, continuing"
  else
    echo "FAIL: plugin validation failed with unexpected errors"
    echo "$VALIDATION_OUTPUT"
    exit 1
  fi
fi
```

---

**[MINOR]** Bare `@` reference regex matches email addresses and other non-reference `@` patterns
The regex on line 177 (`@\./[^ )]+|@[a-zA-Z][^ )]*`) matches any `@` followed by a letter — including email addresses (e.g., `user@example.com`), markdown citations, or prose references. Currently no agent files contain such patterns, but if one does in the future, this will produce spurious warnings. Consider tightening the regex to require a `/` after the initial token (since real `@` file references always include a path), e.g., `@[a-zA-Z][^ )]*\/[^ )]*` plus the existing `@\./` pattern.
File: scripts/build-plugin.sh:177
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No `.DS_Store` assertion for agents directory
Skills have a post-copy `.DS_Store` assertion (lines 138-144) as a belt-and-suspenders check after the rsync `--exclude '.DS_Store'`. The agents directory has the rsync exclusion (line 51) but no equivalent post-copy assertion. For consistency and defense in depth, add a matching check for agents.
File: scripts/build-plugin.sh:199
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Error count detection relies on `❯` Unicode character in validator output
The `grep -c '❯'` pattern on line 216 is fragile — it depends on the exact character the `claude plugin validate` command uses for error markers. If the CLI updates its output format, this check silently passes all errors. A comment documenting what `❯` represents and a note to verify after CLI upgrades would reduce maintenance risk.
File: scripts/build-plugin.sh:216
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is solid and well-structured. Agent validation follows the established skill validation pattern closely, the `@` reference verification is a valuable addition that catches broken references at build time, and the `claude plugin validate` fallback logic correctly handles the transitional period where the CLI doesn't recognize the `agents` field. The double-execution issue in the validation path is the most impactful item — it's not a correctness bug today but introduces unnecessary fragility. Fixing that plus the minor items would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
