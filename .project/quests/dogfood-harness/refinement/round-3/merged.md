# Round 3 Merged Feedback

## Reviewer Scores
- Holistic: 9/10
- Software Architecture: 9/10
- TypeScript: 9/10
- CLI: 8.5/10

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**[IMPORTANT-1] `canUseTool` answers shape is `Record<string, string>`, not an array**

The plan says "auto-response array" for `answers`, but `AskUserQuestionInput.answers` (sdk-tools.d.ts line 2178) is `{ [k: string]: string }` — a record keyed by the question's `question` string field, not a positional array. A `string[]` shape will be silently rejected or misinterpreted by the SDK.

Fix: The task must specify building answers as:
```typescript
const answers: Record<string, string> = {};
for (const q of typed.questions) {
  answers[q.question] = q.options[0]?.label ?? "Proceed";
}
return { behavior: "allow", updatedInput: { questions: typed.questions, answers } };
```

Source: TypeScript reviewer (domain specialist). Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] `goodplan()` catch block — fix must specify a concrete type strategy**

The plan says "use Bun/Node typed `child_process` error types" but doesn't specify which type or how to import it. With `exactOptionalPropertyTypes: true` and `noUncheckedIndexedAccess: true`, the replacement must handle `status: number | null` (not `number | undefined`).

Fix: Specify the guard as `err instanceof Error && 'status' in err && 'stdout' in err`, then cast to `NodeJS.ErrnoException & { stdout?: Buffer; stderr?: Buffer; status?: number | null }`. Alternatively, document that the `as` cast is accepted-risk in a harness context with a `// known shape from execFileSync` comment. The plan must pick one path explicitly — currently it names neither.

Source: TypeScript reviewer (primary), CLI reviewer (corroborating). Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3] `goodplanJson()` hardening scope is ambiguous — `result.ok` check and try/catch are required**

The plan lists three sub-items for hardening `goodplanJson()` but only labels the Zod overload "not blocking", leaving it unclear whether the `result.ok` check and `JSON.parse` try/catch are also optional. They are not optional: without them, any non-zero exit or malformed JSON output causes an unhandled throw, and the generic `T` cast is a runtime lie.

Fix: Clarify the task as: `result.ok` check + `JSON.parse` try/catch are **required**. The Zod schema parameter overload is optional.

Source: TypeScript reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4] `logFriction()` signature is inconsistent across plan steps**

The existing harness (line 73) has `logFriction(phase: number, source: string, issue: string, severity: string)`. The plan's Step 4 calls it as `logFriction("important", "phase4-architecture", "...")` — three arguments with severity first — while Step 1 calls it with four arguments (numeric phase first). This is a silent argument-order bug.

Fix: Step 1's "Fix `logFriction()`" task must choose and document one canonical signature — recommended: `logFriction(severity: string, source: string, message: string)` — and the task must explicitly state that all existing call sites in Step 1 code (`logFriction(2, "Skill: /explore", "...", "MINOR")`) must be updated to the new signature.

Source: CLI reviewer and TypeScript reviewer (both independently flag this). Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5] `phase2Architecture()` missing pre-skill state assertion after `epic:define-architecture`**

The plan correctly identifies that `epic:define-architecture --epic core-provider --json` must be called before `runSkill("create-architecture", ...)`. However, the task's Expected Behavior verification items do not include a pre-skill state check. If the CLI call succeeds but the epic is not in `defining-architecture` state (e.g., wrong initial state), the skill will run against stale state and fail at its submit step.

Fix: Add to the Step 2 `phase2Architecture` task: "After calling `epic:define-architecture`, assert exit code 0 and verify `goodplanJson(["epic:status", "--epic", "core-provider", "--json"])` returns status `defining-architecture` before proceeding to `runSkill`."

Source: CLI reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-6] `slice:list --json` missing `--epic` filter — will break in Phase 4**

`runPhase2()` calls `slice:list --json` with no `--epic` filter. With only one epic in Phase 2, this is harmless. But Phase 4 adds a second epic (`llm-judge`), and if `runPhase2()` re-runs (or its loop logic is reused in Phase 4), it will pick up slices from both epics.

Fix: Update `slice:list` calls to pass `--epic core-provider` in `runPhase2()` and `--epic llm-judge` in the equivalent Phase 4 loop. Add this as an explicit sub-item in the Step 2 task.

Source: CLI reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-7] `phase2SliceCycle` recovery: skill failures vs CLI failures require different handling**

The plan says "follow the same fallback pattern as `phase2Explore`: after each skill, check if state transitioned. If not, attempt the explicit submit command as recovery." This conflates two distinct failure modes: (a) a skill ran but did not complete the state transition — recovery is the explicit CLI submit via `goodplan()` helper; (b) an explicit CLI submit (steps 3, 6, 9) returned exit code 2 or 3 — recovery is exit-code branching per the `goodplan()` helper contract, not re-running the skill.

Fix: Add a clarifying note to the `phase2SliceCycle` task: "Steps 3, 6, 9, and 10 are explicit `goodplan()` CLI calls. If they return non-zero, apply exit-code branching (already defined in Step 1 helper). Do NOT re-run the preceding skill as recovery for a CLI failure."

Source: Software Architecture reviewer. Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**[MINOR-1] `patchSkillModels()` explicit file list is misleading — 10 files need patching, not 4**

The plan names 4 files explicitly then says "and any others found via `grep -rl 'opus\|sonnet' skills/`." Actual grep returns 10 files. An implementer who reads only the named files and skips the grep misses 6.

Fix: Either list all 10 files or drop the explicit list entirely in favor of "all files found via `grep -rl`."

Source: Holistic reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] `patchSkillModels()` / `restoreSkillModels()` storage type should be `Map<string, string>`**

The plan doesn't specify the data structure for storing path → originalContent. With `noUncheckedIndexedAccess: true`, a `Map<string, string>` is safer than `Record<string, string>` — map access returns `string | undefined`, making the undefined case explicit.

Fix: Specify `Map<string, string>` (not a plain object) for storing originals.

Source: TypeScript reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] `runSkill()` model is hardcoded — no `model?` parameter on opts**

The plan adds `model: "claude-haiku-4-5"` to `query()` options but doesn't add a `model?: string` parameter to `runSkill()`'s opts type. Any future caller wanting a different model has no escape hatch.

Fix: Add `model?: string` to `runSkill()`'s opts parameter (defaulting to `"claude-haiku-4-5"`).

Source: TypeScript reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] `phase2SliceCycle` rewrite scope understated in plan**

The plan implies `phase2SliceCycle` is an additive change. It is actually a full rewrite — the existing implementation has no explicit submit commands. The Expected Behavior "Before" section doesn't reflect this.

Fix: Add to the Step 2 `phase2SliceCycle` task's "Before" section: "`phase2SliceCycle` exists but does NOT include explicit submit commands — only bare skill invocations. This task is a full rewrite." The "After" section should confirm the 10-step sequence is fully wired.

Also clarify that steps 3, 6, 9, 10 in the sequence are separate `goodplan(["submit-plan", ...], { stdin: "..." })` calls using the `goodplan()` helper — not raw shell `echo` pipes.

Source: TypeScript reviewer and CLI reviewer (both flag this). Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] `phase2EpicComplete()` skill prompt must include the `verificationResults` payload**

The existing `phase2EpicComplete()` calls `runSkill("complete", ...)` with a generic prompt. For the skill to pass the correct payload to `epic:complete`, the prompt must include the payload text explicitly.

Fix: Add to the `phase2EpicComplete` task: "Pass the verificationResults payload in the skill prompt, e.g.: `Complete the epic. Verification results: [{"index": 0, "passed": true, "notes": "Harness automated verification"}]. Call epic:complete with this payload.`"

Source: CLI reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6] Step 2 `phase2RefineArchitecture()` in existing code lacks the `epic:refine-architecture` CLI transition call**

The plan text correctly specifies running `goodplan epic:refine-architecture --epic core-provider --json` before `/refine-architecture`. The existing harness code at lines 241–253 does NOT include this call. The plan task covers this gap, but it's worth verifying during implementation that both `phase2Architecture` and `phase2RefineArchitecture` have their CLI transition calls added.

Source: Holistic reviewer. Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7] Second epic completion in Step 4 — verification payload index must match the epic's activation**

When Step 4 completes the second epic, it says "same pattern as Step 2." Step 2 uses `index: 0`. This is correct only if the second epic also has exactly one verification item added during its `phase2Activate()` equivalent. The plan should confirm this assumption or parameterize the index.

Source: Holistic reviewer. Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE

Issues that can be implemented without further investigation:

1. IMPORTANT-1: Fix `canUseTool` answers shape to `Record<string, string>` keyed by `q.question`
2. IMPORTANT-2: Specify concrete type strategy for `goodplan()` catch block
3. IMPORTANT-3: Clarify `goodplanJson()` hardening scope — `result.ok` + try/catch required
4. IMPORTANT-4: Unify `logFriction()` to one signature and update all call sites
5. IMPORTANT-5: Add pre-skill state assertion in `phase2Architecture()` after `epic:define-architecture`
6. IMPORTANT-6: Add `--epic` filter to `slice:list` in `runPhase2()` and Phase 4 equivalent
7. IMPORTANT-7: Clarify skill-failure vs CLI-failure recovery distinction in `phase2SliceCycle`
8. MINOR-1: Drop or complete the explicit file list in `patchSkillModels()`
9. MINOR-2: Specify `Map<string, string>` for `patchSkillModels()` storage
10. MINOR-3: Add `model?: string` to `runSkill()` opts type
11. MINOR-4: Mark `phase2SliceCycle` as full rewrite in Before/After; clarify submit calls use `goodplan()` helper
12. MINOR-5: Inject `verificationResults` payload text into `phase2EpicComplete` skill prompt
13. MINOR-6: Verify `phase2RefineArchitecture()` also gets its CLI transition call in Step 2
14. MINOR-7: Confirm or parameterize second epic verification `index: 0` assumption in Step 4

---

### RESEARCH_NEEDED

**[RESEARCH-1] `goodplan init --name` flag — RESOLVED via codebase read**

CLI reviewer flagged `--name` as an unverified assumption for the `reset` command. Confirmed: `src/commands/global/init.ts` line 26 declares `name` as an optional string arg. `goodplan init --name nondet-eval --json` is valid.

Count: 0 open items (resolved during synthesis).

---

### Contradictions Resolved

1. **`canUseTool` answers type**: TypeScript reviewer (specialist) says `Record<string, string>` keyed by question text. Holistic reviewer accepted the plan's round-2 fix without inspecting the type detail. TypeScript specialist wins — the plan's "auto-response array" wording is incorrect and must change.

2. **`phase2Architecture()` CLI transition call**: Both Software Architecture reviewer (resolved, N/A) and CLI reviewer (flagged as IMPORTANT) comment on this. Software Architecture notes the plan text is correct; CLI notes the *existing code* still lacks it and the *verification items* are incomplete. Both are right — the plan text is fixed but the task's Expected Behavior section needs the state assertion. No contradiction; CLI reviewer adds a necessary implementation detail.

3. **`phase2SliceCycle` submit commands**: Software Architecture and TypeScript and CLI all flag this from different angles. No contradiction — all three are describing the same gap from different perspectives (architecture correctness, type safety, CLI correctness). Merged into IMPORTANT-7 and MINOR-4.

---

### Unresolved (USER_INPUT required)

None. All issues are either directly actionable or were resolved during synthesis.
