# Orchestrator Error Handling

Standard error handling for orchestrator skills. Skills with additional error cases should list them after including this reference.

- **CLI command failure**: Log the error, stop, and surface the error message to the user.
- **Sub-agent FAILED status**: Log the agent name and error summary, stop, and tell the user what happened. Preserve temp directory if one exists.
- **Sub-agent PARTIAL status** (default handling): Present `questions` to user via AskUserQuestion. Re-spawn the agent with the original task prompt plus: (a) the `continuationFile` path, if provided (the agent reads it to restore state), (b) a `resolvedAnswers` section containing each question and the user's response. If `researchTopics` present, log them. **Note**: Some agents use PARTIAL differently (e.g., explore-phase uses it as a user-controlled continuation signal without `questions`). Check the consuming skill's specific handling if it overrides this default.
- **Unexpected return format**: If a sub-agent return cannot be parsed as JSON, log the raw return text to stderr and treat as FAILED.
- **Graceful stop**: If user requests early exit or the agent encounters an unrecoverable CLI error, save progress to current entity status and report what was completed. Do not leave entities in an intermediate state without a valid status.
