# Merged Feedback — Slice 05: Tests and Migration (Round 4)

Reviewers: Software Architecture (8/10), TypeScript and JavaScript (9/10)

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**[IMPORTANT-1] `warning` field placement in `migrationResultSchema` is architecturally ambiguous**
Source: Software Architecture

The plan adds `warning` to `migrationResultSchema`'s discriminated union variants but says "the Q&A variant (or both variants)" — this ambiguity will cause implementation confusion. The warning is emitted during the pre-check phase, before Q&A starts; putting it on the `complete` variant means a stale warning from much earlier in the workflow gets surfaced at the wrong time. The correct approach: emit `warning` as a top-level field on the first `questions` response only (i.e., the `questions` variant exclusively), which is the moment the user can still abort. The plan must pick one approach explicitly.

Note: TypeScript reviewer confirmed the `exactOptionalPropertyTypes` interaction is correctly handled (`z.string().optional()`) — the issue is placement/design, not type safety.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] `renameProjectDir` timestamped naming — error recovery message contract**
Source: Software Architecture

The plan updates `renameProjectDir` to use `.project-old-<YYYYMMDD-HHmmss>/` but the `executeMigration` error recovery instructions (line 630–637) reference a fixed `.project-old/` name. The plan notes the error message uses the `projectOldDir` variable (via string interpolation), which already handles the dynamic name correctly — but this must be verified explicitly: confirm the error message path uses the runtime variable, not a hardcoded string. Additionally, the `fs.existsSync` guard previously guarded against any prior backup existing (semantics of the fixed name); with timestamped names, the guard now only protects against sub-second collisions on the specific new timestamped path. The plan's wording ("Retain `fs.existsSync` guard for the edge case of sub-second collisions") is correct in intent — make it explicit that the guard checks the new timestamped path, not the old fixed path.

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**[MINOR-1] `PROJECT_SCOPE_COMMANDS` naming may not age well**
Source: Software Architecture

The plan introduces a `PROJECT_SCOPE_COMMANDS` set for `migrate`. `init` (already in `READ_ONLY_COMMANDS`) is also project-scoped, so this naming could create confusion if `init` were ever moved. Consider naming it `ENTITY_EXEMPT_COMMANDS` instead, or add a comment documenting the relationship to `READ_ONLY_COMMANDS`. Minor because the fitness test subsystem is Developing.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] Phase 2 `epicJsonContent` field count after `sliceSequence` removal**
Source: Software Architecture

The `Epic` schema has 8 required fields; the current `epicJsonContent` object has 9 (including `sliceSequence`). After removal, the 8-field object should match exactly. The plan's task ordering (remove `sliceSequence` first, then apply `Epic` type annotation, then verify) is correct. This is implicitly covered but could be made explicit in the verification step to catch any missed fields.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] `state-machine-api.md` stale path references are not fully enumerated**
Source: Software Architecture

The plan lists specific line numbers for `state-machine-api.md` updates (lines 235–240, 262–263). Beyond the `slices/<name>/` path patterns, lines 239 (`COMPLETE_SLICE`) and 240 (`COMPLETE_EPIC`) also reference `slices/overview.json` — an eliminated file. The `CREATE_SLICE` row likely references it too. The plan should enumerate all stale `slices/overview.json` references in the State Key Dependencies table and specify their replacements under the embedded overview approach.

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE

5 items (IMPORTANT-1, IMPORTANT-2, MINOR-1, MINOR-2, MINOR-3) — all directly actionable without further research or user input.

---

### RESEARCH_NEEDED

None.

---

### Contradictions Resolved

**`warning` field — schema placement vs. TypeScript soundness**: The TypeScript reviewer confirmed that `warning: z.string().optional()` is the correct Zod type and that `exactOptionalPropertyTypes` is handled. The Software Architecture reviewer's concern is not about type correctness but about which discriminated union variant should carry the field. These are complementary, not contradictory. Resolution: apply `warning` to the `questions` variant only (Architecture concern), using `z.string().optional()` (TypeScript concern).

**`warning` field — "or both variants" latitude**: The TypeScript reviewer treated "or both variants" as sufficient latitude for the implementer. The Software Architecture reviewer flagged this as ambiguity that will cause implementation confusion. Architecture reviewer's position is stronger — an explicit decision is needed before implementation. Resolved in favor of Software Architecture: specify `questions` variant only.

---

### Unresolved (USER_INPUT required)

None.
