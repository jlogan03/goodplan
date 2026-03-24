# Merged Review — Phase 2: High-Complexity Skills (create-plan, create-slices)

**Scores:** Generalist 9/10 · Agent-skill 8/10
**Critical: 0 | Important: 2 | Minor: 1**

---

## Important

### 1. create-slices Step 4 still uses `mkdir -p .project/decisions/` instead of `decision:create --json`
**File:** `skills/create-slices/SKILL.md:102`
**Raised by:** Both reviewers (consensus)

create-plan was correctly updated to use `decision:create --json` (line 116), but create-slices Step 4 retains the old pattern: `Run mkdir -p .project/decisions/ before the first write. Write in the format specified by decisions-format.md.`

Resolution: Migrate create-slices to use the same CLI pattern as create-plan and create-architecture:
```
echo '{"id":"<id>","domain":"<domain>","title":"<title>","summary":"<summary>"}' | goodplan decision:create --json
```

Note: Generalist reviewer flagged this as out of Phase 2 scope per the plan and suggested deferring to Phase 3. Agent-skill reviewer considers it an incomplete migration within the current phase. Given that create-plan was updated in this phase, the inconsistency is real — recommend fixing now or explicitly tracking as a Phase 3 item.

### 2. create-plan `decision:create` invocation lacks concrete piped command syntax
**File:** `skills/create-plan/SKILL.md:116`
**Raised by:** Agent-skill reviewer only

Line 116 says `Use decision:create --json with payload { "id": "...", ... }` but omits the concrete bash invocation. The established convention (visible in create-architecture SKILL.md line 162) always shows the full piped command. Abstract descriptions require the agent to infer the piping pattern, which is less reliable.

Resolution: Replace with:
```
echo '{"id":"<id>","domain":"<domain>","title":"<title>","summary":"<summary>"}' | goodplan decision:create --json
```

---

## Minor

### 1. create-plan guidance.md omits `.project/` prefix in path references
**File:** `skills/create-plan/references/guidance.md:5`
**Raised by:** Agent-skill reviewer

SKILL.md line 42 correctly uses `.project/epics/<name>/slices/`, `.project/slices/`, `.project/side-quests/`. guidance.md line 5 omits the `.project/` prefix, showing `epics/<name>/slices/`, `slices/`, `side-quests/`. An agent reading only guidance.md could look in the wrong location.

Resolution: Add `.project/` prefix to all three paths in guidance.md line 5.

---

## Resolved / Non-Issues

- **create-slices Step 9 `echo '{}'` vs `stdin: ""`**: Both are functionally equivalent per commands-api.md ("Empty stdin treated as `{}`"). `echo '{}'` appears in multiple migrated skills. Not an issue.
- **create-slices line 166 `__active__` mention**: Conceptual reference in a migration note, not an actual path usage. Grep verification correctly excludes it. Acceptable as-is.
- **`$EPIC_DIR` / `<activeEpic.name>` notation**: Consistent across both files, clear as a placeholder. Not an issue.

---

## Overall Assessment

Clean migration. All major banned patterns (`state.md`, `activity-log`, `state-and-activity-formats`, `ls -d __active__`) eliminated from both skills. `requires` frontmatter, Step 0 version checks, `goodplan status --json` usage, graceful stop semantics, and CLI submit patterns are consistent with Phase 1 precedents. Tests pass (941/941).

Two actionable fixes remain: the create-slices decisions inconsistency (Important #1) and the abstract `decision:create` syntax in create-plan (Important #2). Fixing both brings this to 9+.
