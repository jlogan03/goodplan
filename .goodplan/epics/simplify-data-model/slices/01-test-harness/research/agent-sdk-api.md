# Agent SDK API Research

**Package:** `@anthropic-ai/claude-agent-sdk`
**Installed version:** 0.2.81
**Fetch date:** 2026-04-01
**Source:** `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` + existing usage in `tools/dogfood/`

---

## 1. `query()` Function Signature

```typescript
export declare function query(_params: {
    prompt: string | AsyncIterable<SDKUserMessage>;
    options?: Options;
}): Query;
```

**Key points:**
- `prompt` accepts either a static `string` or an `AsyncIterable<SDKUserMessage>` for streaming user messages into the session
- Returns `Query`, which extends `AsyncGenerator<SDKMessage, void>` with control methods

### `Query` interface

```typescript
export declare interface Query extends AsyncGenerator<SDKMessage, void> {
    interrupt(): Promise<void>;
    setPermissionMode(mode: PermissionMode): Promise<void>;
    setModel(model?: string): Promise<void>;
    setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>;
    applyFlagSettings(settings: Settings): Promise<void>;
    initializationResult(): Promise<SDKControlInitializeResponse>;
    supportedCommands(): Promise<SlashCommand[]>;
    supportedModels(): Promise<ModelInfo[]>;
    supportedAgents(): Promise<AgentInfo[]>;
    mcpServerStatus(): Promise<McpServerStatus[]>;
    accountInfo(): Promise<AccountInfo>;
    rewindFiles(userMessageId: string, options?: { dryRun?: boolean }): Promise<RewindFilesResult>;
    reconnectMcpServer(serverName: string): Promise<void>;
    toggleMcpServer(serverName: string, enabled: boolean): Promise<void>;
    setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult>;
    streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void>;
    // ... stopTask, send, etc.
}
```

### Streaming input via `AsyncIterable<SDKUserMessage>`

Yes, `query()` natively supports an async iterable as `prompt`. This means you can push messages dynamically into a running session. The `SDKUserMessage` type:

```typescript
export declare type SDKUserMessage = {
    type: 'user';
    message: MessageParam;  // from @anthropic-ai/sdk
    parent_tool_use_id: string | null;
    isSynthetic?: boolean;
    tool_use_result?: unknown;
    priority?: 'now' | 'next' | 'later';
    timestamp?: string;
    uuid?: UUID;
    session_id: string;
};
```

Additionally, `Query.streamInput()` allows attaching an async iterable after construction, and `Query.send()` allows pushing individual messages.

---

## 2. Options (relevant subset)

```typescript
export declare type Options = {
    abortController?: AbortController;
    additionalDirectories?: string[];
    agent?: string;
    agents?: Record<string, AgentDefinition>;
    allowedTools?: string[];
    canUseTool?: CanUseTool;
    cwd?: string;
    disallowedTools?: string[];
    tools?: string[] | { type: 'preset'; preset: 'claude_code' };
    env?: { [envVar: string]: string | undefined };
    executable?: 'bun' | 'deno' | 'node';
    hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
    includePartialMessages?: boolean;
    thinking?: ThinkingConfig;
    effort?: 'low' | 'medium' | 'high' | 'max';
    maxTurns?: number;
    maxBudgetUsd?: number;
    mcpServers?: Record<string, McpServerConfig>;
    model?: string;
    outputFormat?: OutputFormat;
    permissionMode?: PermissionMode;
    allowDangerouslySkipPermissions?: boolean;
    plugins?: SdkPluginConfig[];
    persistSession?: boolean;
    systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };
    settingSources?: ('user' | 'project' | 'local')[];  // inferred from usage
    // ... more
};
```

### `permissionMode`

```typescript
export declare type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'dontAsk';
```

Using `bypassPermissions` requires `allowDangerouslySkipPermissions: true`.

### `canUseTool` callback

```typescript
export declare type CanUseTool = (
    toolName: string,
    input: Record<string, unknown>,
    options: {
        signal: AbortSignal;
        suggestions?: PermissionUpdate[];
        blockedPath?: string;
        decisionReason?: string;
        title?: string;
        displayName?: string;
        description?: string;
        toolUseID: string;
        agentID?: string;
    }
) => Promise<PermissionResult>;
```

Returns `PermissionResult`:

```typescript
export declare type PermissionResult =
    | { behavior: 'allow'; updatedInput?: Record<string, unknown>; updatedPermissions?: PermissionUpdate[]; toolUseID?: string }
    | { behavior: 'deny'; message: string; interrupt?: boolean; toolUseID?: string };
```

---

## 3. PreToolUse Hook API

### Registration

Hooks are registered via `options.hooks`:

```typescript
hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
```

where:

```typescript
export declare type HookEvent =
    | 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure'
    | 'Notification' | 'UserPromptSubmit'
    | 'SessionStart' | 'SessionEnd'
    | 'Stop' | 'StopFailure'
    | 'SubagentStart' | 'SubagentStop'
    | 'PreCompact' | 'PostCompact'
    | 'PermissionRequest' | 'Setup'
    | 'TeammateIdle' | 'TaskCompleted'
    | 'Elicitation' | 'ElicitationResult'
    | 'ConfigChange' | 'WorktreeCreate' | 'WorktreeRemove'
    | 'InstructionsLoaded';
```

### HookCallbackMatcher

```typescript
export declare interface HookCallbackMatcher {
    matcher?: string;        // optional tool name pattern to match
    hooks: HookCallback[];   // array of hook functions
    timeout?: number;        // timeout in seconds
}
```

### HookCallback signature

```typescript
export declare type HookCallback = (
    input: HookInput,
    toolUseID: string | undefined,
    options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

### PreToolUse hook input

```typescript
export declare type PreToolUseHookInput = BaseHookInput & {
    hook_event_name: 'PreToolUse';
    tool_name: string;
    tool_input: unknown;
    tool_use_id: string;
};
```

where `BaseHookInput` provides:

```typescript
export declare type BaseHookInput = {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode?: string;
    agent_id?: string;
    agent_type?: string;
};
```

### Hook return type

```typescript
export declare type HookJSONOutput = AsyncHookJSONOutput | SyncHookJSONOutput;

export declare type SyncHookJSONOutput = {
    continue?: boolean;
    suppressOutput?: boolean;
    stopReason?: string;
    decision?: 'approve' | 'block';
    systemMessage?: string;
    reason?: string;
    hookSpecificOutput?: PreToolUseHookSpecificOutput | /* ...other hook outputs */;
};
```

### PreToolUse-specific output (for denying with message)

```typescript
export declare type PreToolUseHookSpecificOutput = {
    hookEventName: 'PreToolUse';
    permissionDecision?: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
    additionalContext?: string;
};
```

### Example: Denying a tool use with a message

```typescript
hooks: {
    PreToolUse: [{
        matcher: 'Write',
        hooks: [async (input) => ({
            decision: 'block',
            reason: 'Writes to .goodplan/ are not allowed',
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'State files must be modified via CLI only',
            },
        })],
    }],
}
```

### Example: Adding context to a tool use

```typescript
hooks: {
    PreToolUse: [{
        hooks: [async (input) => ({
            continue: true,
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                additionalContext: 'Remember to use CLI commands for state changes',
            },
        })],
    }],
}
```

---

## 4. SDKMessage Types

`SDKMessage` is a discriminated union:

```typescript
export declare type SDKMessage =
    | SDKAssistantMessage      // type: 'assistant' — full assistant message with tool_use blocks
    | SDKUserMessage           // type: 'user' — user message
    | SDKUserMessageReplay     // type: 'user', isReplay: true
    | SDKResultMessage         // type: 'result' — SDKResultSuccess | SDKResultError
    | SDKSystemMessage         // type: 'system' — subtype: 'init' | 'error' etc.
    | SDKPartialAssistantMessage // type: 'stream_event' — streaming deltas
    | SDKCompactBoundaryMessage
    | SDKStatusMessage         // type: 'status' — status updates
    | SDKAPIRetryMessage       // type: 'system', subtype: 'api_retry'
    | SDKLocalCommandOutputMessage
    | SDKHookStartedMessage
    | SDKHookProgressMessage
    | SDKHookResponseMessage
    | SDKToolProgressMessage
    | SDKAuthStatusMessage
    | SDKTaskNotificationMessage  // type: 'system', subtype: 'task_notification'
    | SDKTaskStartedMessage       // type: 'system', subtype: 'task_started'
    | SDKTaskProgressMessage
    | SDKFilesPersistedEvent
    | SDKToolUseSummaryMessage
    | SDKRateLimitEvent
    | SDKElicitationCompleteMessage
    | SDKPromptSuggestionMessage;
```

### Key message types

**SDKResultSuccess** (the final success message):
```typescript
{
    type: 'result';
    subtype: 'success';
    result: string;
    total_cost_usd: number;
    num_turns: number;
    duration_ms: number;
    duration_api_ms: number;
    usage: NonNullableUsage;
    modelUsage: Record<string, ModelUsage>;
    permission_denials: SDKPermissionDenial[];
    structured_output?: unknown;
}
```

**SDKResultError:**
```typescript
{
    type: 'result';
    subtype: 'error_during_execution' | 'error_max_turns' | 'error_max_budget_usd' | 'error_max_structured_output_retries';
    errors: string[];
    // ... same cost/usage fields
}
```

**SDKAssistantMessage:**
```typescript
{
    type: 'assistant';
    message: BetaMessage;  // from @anthropic-ai/sdk — contains content blocks (text, tool_use, thinking)
    parent_tool_use_id: string | null;
    error?: SDKAssistantMessageError;
}
```

---

## 5. Existing Usage Patterns (from `tools/dogfood/`)

### Basic usage (validate.ts, harness.ts)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
    prompt,
    options: {
        cwd: PROJECT_DIR,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 300,
        maxBudgetUsd: 25,
        model: "claude-opus-4-6",
        settingSources: ["project"],
        env: { ...process.env, PATH: `${HOME}/bin:${process.env.PATH}` },
        systemPrompt: {
            type: "preset",
            preset: "claude_code",
            append: "AUTONOMOUS MODE ...",
        },
        canUseTool: async (toolName, input) => {
            // Intercept AskUserQuestion, detect violations, etc.
            return { behavior: "allow", updatedInput: input };
        },
    },
})) {
    if (message.type === "result" && message.subtype === "success") {
        // Final result
    } else if (message.type === "assistant") {
        for (const block of message.message.content) {
            if (block.type === "tool_use") { /* count tools */ }
        }
    } else if (message.type === "system") {
        if (message.subtype === "task_started") { /* subagent started */ }
        if (message.subtype === "task_notification") { /* subagent status */ }
    }
}
```

### Permission interception via `canUseTool` (not hooks)

The existing harness uses `canUseTool` (not `hooks`) for:
1. Auto-responding to `AskUserQuestion` tool calls
2. Detecting `.project/` access violations
3. Always returning `{ behavior: "allow" }` (since `bypassPermissions` is set, this is mainly for observation)

---

## 6. Key Differences: `canUseTool` vs `hooks.PreToolUse`

| Feature | `canUseTool` | `hooks.PreToolUse` |
|---|---|---|
| Registration | `options.canUseTool` callback | `options.hooks.PreToolUse` array |
| Can deny | Yes (`behavior: 'deny'`) | Yes (`permissionDecision: 'deny'`) |
| Can modify input | Yes (`updatedInput`) | Yes (`updatedInput`) |
| Can add context | No | Yes (`additionalContext`) |
| Matcher pattern | No (receives all tools) | Yes (`matcher` field for tool name filtering) |
| Multiple handlers | No (single callback) | Yes (array of matchers, each with array of hooks) |
| Deny message | `{ behavior: 'deny', message: '...' }` | `{ permissionDecision: 'deny', permissionDecisionReason: '...' }` |
| When called | Permission check phase | Hook phase (before permission check) |

For the test harness, `canUseTool` is simpler and already proven. For state protection (blocking writes to `.goodplan/`), either works but `hooks.PreToolUse` provides `additionalContext` which can remind the model why the tool was blocked.

---

## 7. Summary for Test Harness Design

1. **Streaming input is supported** — `query()` accepts `AsyncIterable<SDKUserMessage>` as prompt, enabling multi-turn programmatic control
2. **State protection can use either `canUseTool` or `hooks.PreToolUse`** — the existing harness uses `canUseTool` successfully; hooks add `additionalContext` capability
3. **Message streaming** — iterate the `Query` async generator; discriminate on `message.type` and `message.subtype`
4. **Deny with message** — `canUseTool` returns `{ behavior: 'deny', message: 'reason' }`; hooks return `{ decision: 'block', hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'reason' } }`
5. **`bypassPermissions` + `canUseTool`** — even in bypass mode, `canUseTool` is still called (proven by existing harness usage for violation detection and AskUserQuestion interception)
