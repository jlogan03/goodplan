# Design Tree — Interaction Protocol

Reference for Steps 5 (broad pass) and 7 (deep pass) in the create-architecture skill.

## Branching Logic

When the user answers a question, evaluate whether the answer raises follow-up questions:

- **Raises follow-ups**: Pursue immediately (depth-first). Example: "We'll use event-driven communication" → "What ordering guarantees do you need?" → "What happens when a consumer is down?"
- **Self-contained**: Mark the branch as resolved and move to the next open branch.
- **Uncertain/deferred**: Mark as "open — needs more context" and move on. Return to it later or defer to implementation.

Do not ask more than one question at a time. Each question should reference the branch it belongs to.

## Progress Display

After every 3-4 resolved branches (or when switching top-level areas), show a compact progress table:

```
| Branch                  | Status   | Decision          |
|-------------------------|----------|-------------------|
| Subsystem boundaries    | resolved | DEC-003           |
| Inter-service comms     | resolved | DEC-004           |
| Data ownership          | open     | —                 |
| Auth strategy           | deferred | needs prototyping |
```

Status values: `resolved` (decision written or clear), `open` (still exploring), `deferred` (explicitly punted).

Update frequency: show the table when switching areas or when the user seems uncertain about progress. Don't show it after every single question.

## Stopping Criteria

### Broad Pass (Step 5)

Stop when ALL of these are resolved (not deferred):
1. **Subsystem boundaries** — what the major components are and what each owns
2. **Communication patterns** — how subsystems talk (sync/async, protocols, message formats)
3. **Key constraints** — performance targets, scale expectations, compliance requirements, deployment model
4. **Data ownership** — which subsystem owns which data, how shared data is accessed

These four areas provide enough structure for design-it-twice to generate meaningfully different options. Detail-level questions (specific API shapes, error handling strategies, edge cases) belong in the deep pass.

### Deep Pass (Step 7)

Stop when every branch is either `resolved` or explicitly `deferred to implementation`. Deferred branches must include a note explaining why they can't be resolved now and what the implementing agent needs to know.

Typical deep-pass branches: API contracts between subsystems, error handling and retry strategies, data flow for key scenarios, caching strategies, migration/versioning approach, edge cases surfaced during design-it-twice.

## Expertise Calibration

Follow the user's expertise level (from `~/.claude/CLAUDE.md` `## Expertise` section):

- **Familiar domain**: Use jargon freely, ask pointed questions. "Event sourcing or state transfer for the order subsystem?"
- **Unfamiliar domain**: Briefly explain the trade-off before asking. "There are two main approaches here: X (good for A, bad for B) and Y (opposite). Which fits your needs?"
- **Mixed**: Default to concise. Expand only if the user's answer suggests confusion.

## Decision Deduplication

Before writing a new decision to `.goodplan/decisions/`:

1. Check existing decisions (loaded in Step 2) for overlap.
2. If an existing decision covers the same area:
   - **Same conclusion**: Skip writing. Reference the existing decision.
   - **Different conclusion**: Propose superseding the old decision. Use the `superseded_by` field per `decisions-format.md`.
3. If no overlap: write normally, following the threshold and format in `decisions-format.md`.

## Persistence Limitation

Branch resolution state is tracked in-memory during the conversation. On context compaction or fresh session, this state is lost. The durable records are:
- Written decisions in `.goodplan/decisions/`
- The architecture files themselves (produced in Step 8)

The deep pass can reconstruct context from these if interrupted and resumed.
