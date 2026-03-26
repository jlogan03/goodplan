# Agent Skill Review (Round 2)

Reviewer perspective: How well does the architecture support agent skill integration — the interaction patterns between LLM orchestrator skills and the CLI, sub-agent workflows, context bundling, and the convention document that skills will follow.

## Prior Issues — Resolution Assessment

All 2 CRITICAL issues from round 1 are resolved:
- **Migration example**: Added in `cli-interaction-conventions.md` Section "Migration Example: create-epic State Writes" — shows concrete before/after with `epic:create` and `epic:explore`. Clear and representative.
- **Interactive orchestrator pattern**: Added as a third interaction type in Section "Interactive Orchestrator Skills" — covers the begin/start/interactive-work/submit sequence with a worked `epic:explore` example.

All 6 IMPORTANT issues from round 1 are resolved or substantially addressed:
- **`init` usage**: Documented in `commands-api.md` global commands section with `--name` semantics and error handling.
- **state.md elimination**: "Replacing state.md Reads" table maps each previous usage to its CLI equivalent.
- **Graceful stop**: Dedicated section explains atomic transitions, no partial state, resume-from-last-transition pattern.
- **submit-* payloads**: Corrected — `submit-plan` now shows `stdin: ""` (no content), `submit-refinement` shows `{"scores":{...}}`.
- **Non-.project/ file access**: Section "What Skills MAY Still Do Directly" explicitly permits Read tool for reference files and LLM-owned markdown.
- **Error recovery examples**: Worked examples for `STATE_INVALID_TRANSITION`, `STATE_QUEST_ALREADY_ACTIVE`, and `VALIDATION_INVALID_INPUT` with recovery patterns.

## New Issues

### 1. IMPORTANT — `stdin: ""` pipe syntax is not valid shell

**File**: `cli-interaction-conventions.md` lines 99, 151, 158, 173, 184, 242, 251, 332

The convention doc shows `stdin: "" | goodplan ...` throughout. This is not valid bash/zsh syntax. The `stdin:` prefix looks like YAML or a pseudo-syntax notation. For skills that contain concrete CLI commands that LLMs will execute verbatim, this is a real problem — an LLM following the instruction literally will get a shell error. The correct form is `echo '' | goodplan ...` or `echo -n '' | goodplan ...`, or a heredoc like `<<< '' goodplan ...`. Alternatively, if this is Claude Code's Task/Bash tool syntax (where `stdin` is a parameter), that should be called out explicitly as tool-invocation syntax, not shell syntax, since some skills may run commands via Bash tool and others via direct shell.

The learnings file reinforces this: "Binary-spawning integration tests require explicit stdin" — integration tests presumably use the correct shell form, but the convention doc shows a non-shell form.

### 2. IMPORTANT — `activity:list` is still documented in commands-api.md as an entity namespace command, creating ambiguity with `state --query`

**File**: `commands-api.md` lines 122-124, 216-217

`activity:list [--scope <scope>]` is listed in the Activity namespace with `# not yet implemented`. The `cli-changes.md` file explicitly says `activity:list` is replaced by `goodplan state --json --query '.["activity-log.jsonl"] | ...'`. But `commands-api.md` still documents it as a first-class command with scope semantics. This creates ambiguity: should it be implemented during this epic, or is it officially replaced by `state --query`? If replaced, remove it from commands-api.md (or mark it as superseded by `state --query`). If it will be implemented, remove the replacement note from cli-changes.md. Having both creates conflicting guidance for the implementer.

### 3. IMPORTANT — Convention doc doesn't address `goodplan init` as a skill command

**File**: `cli-interaction-conventions.md`

The convention doc covers `status`, `show`, `list`, `state`, mutation commands, and sub-agent commands. But `goodplan init` is never mentioned, even though `create-epic` Mode A currently creates the entire `.project/` directory structure. The migration example shows `epic:create` and `epic:explore` but doesn't show the full Mode A flow: `init` -> `epic:create` -> interactive capture -> write content. The `commands-api.md` documents `init` well (including `--name` semantics and `STATE_ALREADY_INITIALIZED`), but the convention doc — which is the primary skill-author reference — should include `init` in its orchestrator command examples or migration example, since `/create-epic` is one of the three core validation skills.

### 4. IMPORTANT — `complete()` RPC function has no corresponding `begin` phase but convention doc groups it with orchestrator mutations

**File**: `rpc-layer-api.md`, `cli-interaction-conventions.md`

The `complete()` function in the RPC layer is separate from `begin()` — it takes `CompleteInput` with verification data. But the convention doc's orchestrator section shows `slice:complete` alongside `slice:plan` as "Mutate state" examples without distinguishing that `complete` requires stdin input while `plan` does not. The sub-agent section shows `submit-*` stdin payloads clearly, but the orchestrator section doesn't show `epic:complete` or `slice:complete` stdin shapes. Since `/complete` is one of the three core validation skills, its full CLI interaction (load artifacts, synthesize, then `echo '{"verificationPassed":true,...}' | goodplan slice:complete --slice X --json`) should be exemplified in the orchestrator pattern or the migration example.

### 5. MINOR — `schema` command discovery pattern is mentioned but never shown as a concrete recovery step

**File**: `cli-interaction-conventions.md` lines 231, 257

The error handling section mentions `goodplan schema --command <cmd> --json` as a recovery tool for validation errors, and the self-discovery section shows `goodplan schema --json`. But neither shows a concrete usage example. A brief worked example (e.g., "LLM gets exit 2, calls `goodplan schema --command slice:complete --json`, sees the expected input shape, corrects the payload, retries") would make the recovery path actionable rather than theoretical.

### 6. MINOR — Per-phase content priority tables are duplicated between `rpc-layer-api.md` and `context-api.md`

**File**: `rpc-layer-api.md` lines 334-346, `context-api.md` lines 59-69

The exact same content priority table appears in both files. The learnings file warns: "Architecture doc updates should be per-phase tasks, not consolidated" — dual maintenance of the same table is a drift risk. One should be the source of truth and the other should reference it.

### 7. MINOR — `commands-api.md` documents `--quiet` but no skill pattern uses it

**File**: `commands-api.md` line 287, `cli-interaction-conventions.md`

The `--quiet` flag is documented as a global flag but never appears in any skill interaction pattern or convention doc example. Skills always use `--json`. If `--quiet` is intended for human operators only, that should be noted. Otherwise, there may be skill patterns (e.g., "fire-and-forget mutations where the skill only checks exit code") where `--quiet` is the right choice.

### 8. MINOR — No guidance on concurrent skill invocations accessing the same CLI

**File**: `cli-interaction-conventions.md`

INV-004 says "target flags required" enables "safe concurrent sessions." But the convention doc doesn't describe what happens when an orchestrator and its sub-agent both call CLI commands concurrently. The data layer has `DATA_CONCURRENT_MODIFICATION` error handling (mentioned in rpc-layer-api.md error propagation), but the convention doc doesn't tell skills what to do if they encounter it. This is likely rare (orchestrator waits for sub-agent), but the sub-agent flow diagram (flows.md step 5) shows the sub-agent calling `submit-plan` independently — if the orchestrator queries `status --json` at the same time, is there a race? Brief guidance ("read-only commands are always safe; mutations are serialized by file locking; if `DATA_CONCURRENT_MODIFICATION`, retry once") would close this gap.

## Score: 9/10

The architecture is now comprehensive and practical as a skill-author reference. The round 1 critical gaps — migration examples, interactive orchestrator pattern, graceful stop, error recovery, submit payloads — are all well resolved. The convention doc reads as a complete guide: binary detection, data ownership, three interaction patterns, state orientation, error handling with worked examples, deep dives via `state --query`, and a concrete before/after migration example. The `state.md` replacement table is particularly well done.

The remaining issues are quality gaps, not structural ones. The `stdin: ""` syntax issue (issue 1) is the most impactful — it will cause real execution failures if LLMs copy the commands verbatim. The `activity:list` ambiguity (issue 2) and missing `init` in the convention doc (issue 3) are completeness gaps that will surface during the core validation phase with create-epic. The rest are minor polish.

To reach 10: Fix the stdin syntax to valid shell, decide on `activity:list` (keep or remove), add `init` to the convention doc, and add a `complete` orchestrator example.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
