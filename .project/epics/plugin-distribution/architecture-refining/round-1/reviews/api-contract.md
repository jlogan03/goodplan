# API Contract Review — Round 1

## Issues

### [CRITICAL] hooks.json format does not match Claude Code's actual hook configuration schema

**Description:** The architecture specifies `hooks.json` as a flat array:

```json
{
  "hooks": [
    { "event": "PreToolUse", "matcher": "^(Write|Edit)$", "command": "...", "description": "..." }
  ]
}
```

But the research file (`claude-code-hooks-pretooluse.md`) documents the actual Claude Code plugin hook format as a three-level nested structure: event name -> matcher group -> handler array:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "..." }
        ]
      }
    ]
  }
}
```

The architecture's flat format with `event` and `command` as top-level fields is not a valid Claude Code hook configuration. The handler also requires a `"type": "command"` field. The matcher in the architecture uses `^(Write|Edit)$` regex anchors, while the research shows simpler `Write|Edit` (Claude Code applies the matcher as a regex to tool names).

**Resolution:** Adopt the three-level nested format from Claude Code's actual schema. Each event type is a key, containing an array of matcher groups, each containing a `hooks` array of typed handlers. Drop the `"description"` field from individual hook entries (it belongs on the outer wrapper object per the research) and add `"type": "command"` to each handler.

---

### [IMPORTANT] `nextCommands` on transition table rows conflates two concerns and couples state machine to CLI surface

**Description:** The architecture adds `command` metadata (template + description) directly to transition table rows:

```typescript
interface TransitionRow {
  event: string;
  from: string[];
  to: string;
  command: { template: string; description: string; };
}
```

However, the existing state machine implementation (`src/core/state/`) uses a completely different `Transition` interface:

```typescript
interface Transition {
  from: EntityStatus;
  on: StateEvent['type'];
  guard?: (...) => true | 'skip' | StateError;
  apply: (...) => ProjectState;
}
```

The transition handlers are pure functions grouped per entity/phase (e.g., `epic-phase.ts`, `slice-plan.ts`). There is no centralized declarative transition table object that rows could be added to. The `handlerRecord` in `reduce.ts` maps event types to handler functions, not transition rows.

Adding CLI-specific metadata (`gp epic:explore --epic {name}`) to the state machine layer violates the layered architecture: the state machine should not know about CLI command syntax, flag names, or binary naming. This couples the state machine to the CLI presentation layer.

Furthermore, the existing Commands API already has the complete command-to-event mapping table (lines 22-60 of `commands-api.md`). This mapping is the natural place for `nextCommands` metadata, not the state machine.

**Resolution:** Keep command metadata out of the state machine layer. Instead, define a mapping table in the RPC layer or a dedicated module that maps `(entityType, status)` pairs to available commands. The RPC layer already has all the information needed: it knows which event types are valid from the transition tables (by attempting or inspecting transitions), and the commands-api.md already documents the event-to-command mapping. A `commandMetadata` registry at the RPC layer that inverts the command-to-event mapping would achieve the same goal without coupling the state machine to CLI concerns.

---

### [IMPORTANT] `gp verify` output contract missing `extra` field for untracked state files

**Description:** The `gp verify` command output includes `verified`, `failed`, and `missing` counts, plus a `results` array for failures. But there is no accounting for state files that exist on disk but have no entry in `.signatures.json` — these "extra" files would indicate files created outside the CLI. The current schema only handles the case where a signature exists but the file content doesn't match, or where a signature exists but the file is missing.

**Resolution:** Add an `extra` count to the output and include entries with `"status": "unsigned"` in the results array for state files found on disk but absent from `.signatures.json`.

---

### [IMPORTANT] HMAC key as a "permanent constant" creates a security/maintenance tension

**Description:** The conventions doc states: "HMAC key is a permanent constant baked into the compiled binary" and "Same key across all builds." The cli-changes-api reiterates: "HMAC key is permanent - never changes across versions."

This means the HMAC key is the same in every published binary, which means anyone who inspects the binary (via `strings` or reverse engineering) can extract the key and forge signatures. The stated threat model is "the LLM cannot forge signatures because the key is inaccessible outside the binary" -- but the key IS accessible to anyone with the binary.

The architecture should acknowledge this is defense-in-depth, not a true security boundary. The LLM cannot easily extract the key during a session (it cannot run `strings` on the binary and know what to look for), but it is not cryptographically secure against a determined adversary. This affects the contract: the `gp verify` command's trust guarantees should be documented accordingly.

**Resolution:** Add a note to the invariants doc clarifying the threat model: HMAC prevents casual/accidental tampering and LLM bypass, but is not resistant to key extraction from the binary. Consider whether the key should be per-installation (generated on first run, stored in `CLAUDE_PLUGIN_DATA`) rather than baked in -- this would make signatures portable only within a single installation, but significantly stronger. Either way, document the actual guarantee level in the `gp verify` contract.

---

### [IMPORTANT] `nextCommands.other` section definition is ambiguous for creation events

**Description:** The algorithm for the "other" section says: "scan all entity types' transition tables for creation events (transitions from `none`). Exclude the entity type just acted on." But looking at the transition tables, creation events (`CREATE_EPIC`, `CREATE_QUEST`, `CREATE_TASK`, `CREATE_SLICE`, `CREATE_DECISION`) have different preconditions:

- `CREATE_SLICE` requires an `--epic` argument -- which epic should be interpolated?
- `CREATE_DECISION` uses `--id` not `--name`
- `CREATE_EPIC` and `CREATE_QUEST` need `name` + `goal` (via stdin), not flags

The template interpolation only supports `{name}` and `{epic}`. For creation commands that don't operate on an existing entity, there's nothing to interpolate. The example shows `"gp quest:create"` and `"gp task:create"` with no arguments, which works, but `slice:create` requires `--epic` which isn't available from context.

**Resolution:** Clarify that "other" creation commands are listed without interpolated arguments (they serve as hints, not executable commands). Alternatively, define which creation commands are included and how `slice:create` is handled -- perhaps it includes `--epic` from the current entity's context if the entity just acted on is within an epic scope, or it's excluded from "other" when context is insufficient.

---

### [MINOR] `.signatures.json` path format uses colon-prefixed algorithm but no versioning strategy

**Description:** Signature values use the format `"hmac-sha256:a1b2c3..."`. This is good for future algorithm flexibility, but the spec doesn't define how the CLI should handle encountering an unknown algorithm prefix. If a future version uses a different algorithm, old CLIs would see signatures they can't verify.

**Resolution:** Define the behavior when the algorithm prefix is unknown: either treat as verification failure (safe default) or skip with a warning. This should be part of the `gp verify` contract.

---

### [MINOR] `nextCommands` is not included in read-only responses but `gp verify` is read-only

**Description:** The spec says `nextCommands` is not included in read-only command responses. `gp verify` is a read-only command. But after running `gp verify`, the user likely wants to take corrective action. There is no guidance on what commands are appropriate after a verification failure (e.g., re-running the CLI command that should have written the file, or manual recovery steps).

**Resolution:** Either make `gp verify` an exception that includes `nextCommands` (since it's a diagnostic command where guidance is valuable), or document this as intentional and note that skills/CLAUDE.md should provide recovery guidance.

---

### [MINOR] Hook stdin contract uses `cwd` field but protect-state.sh logic references `$cwd` without parsing it

**Description:** The `protect-state.sh` logic description says "Check if path matches `$cwd/.project/**/*.json`" but the script receives `cwd` as a field within a JSON object on stdin. The script would need to parse the JSON to extract `cwd`, then use it for path comparison. The pseudocode implies `$cwd` is available as a shell variable, but it's actually inside the JSON payload.

**Resolution:** The script specification should explicitly show `jq` extraction of `cwd` from stdin JSON (matching the pattern shown in the research file). This is a documentation clarity issue -- the actual implementation would naturally parse it, but the architecture spec should show the correct extraction pattern to avoid ambiguity.

---

### [MINOR] `nextCommands` template variable set is too limited for all command signatures

**Description:** The template variables are `{name}` (entity name) and `{epic}` (parent epic). But several commands require additional arguments not covered by these variables:

- `epic:abandon --reason "..."` -- no `{reason}` variable
- `epic:update-verification --index <n>` -- no `{index}` variable
- `task:convert --to quest|epic` -- no `{to}` variable
- `submit-refinement --slice <name>` -- uses `--slice` not `--epic` or `--quest`

Commands that require user-supplied arguments (like `--reason`) presumably show a template with a placeholder, but this isn't specified. The example in cli-changes-api.md shows `"gp epic:abandon --epic plugin-distribution --reason \"...\""` with literal `"..."`, suggesting these are hint strings rather than executable commands.

**Resolution:** Document that template interpolation only handles entity identifiers. Commands requiring user-supplied arguments (reason, scores, verification data) should use literal placeholder text (e.g., `--reason "..."`) and are guidance rather than copy-paste-executable commands. This distinction between "executable as-is" and "template with user input needed" should be explicit in the `CommandEntry` type, perhaps via an `executable: boolean` field or by documenting the convention.

## Score: 6/10

The architecture makes sound high-level decisions -- deriving `nextCommands` from transition tables, using HMAC for defense-in-depth, and shipping hooks for state protection. However, the hooks.json format directly contradicts the research findings (critical), and the decision to embed CLI command metadata in state machine transition rows conflicts with both the existing codebase structure and layered architecture principles. The `gp verify` contract has gaps around untracked files and threat model documentation. The `nextCommands` contract needs refinement around interpolation limits and creation command handling.

## Summary
- Critical: 1
- Important: 4
- Minor: 4
