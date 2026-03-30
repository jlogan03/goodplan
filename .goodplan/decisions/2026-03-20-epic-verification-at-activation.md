# Decision: Epic Verification Criteria Required at Activation, Not Creation

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: create-architecture for epics/goodplan-cli — epic lifecycle design

## Decision

Epic verification criteria (how we prove the epic achieved its goal) are stored in `epic.json` as a living document. They are NOT required when the epic goal is first captured — they ARE required before the epic can be activated (the activation gate). Any phase between goal creation and activation (explore, architecture, slicing) can add or modify verification steps. The criteria are verified at epic completion before the epic can be marked done.

## Rationale

When an epic is first created, the understanding of what success looks like is often incomplete. The explore and architecture phases reveal what's actually needed, what's feasible, and what "done" means in practice. Requiring verification criteria at creation would force premature specificity. Requiring them at activation ensures they exist before any implementation work begins, while giving the full explore → architecture → slicing pipeline to discover what success looks like.

Alternatives considered:
- **Require at goal creation** — forces premature specificity before exploration
- **Never require, only recommend** — verification criteria might never be written, making epic completion subjective
- **Require at slice planning** — too late; the epic should have clear success criteria before individual slice planning begins

## Consequences

- Activation gate enforces: no other active epic AND verification criteria exist
- The CLI validates criteria presence, not quality — quality is the LLM's and user's responsibility
- Verification criteria become a natural output of the explore and architecture phases
- Epic completion verifies against these criteria — the epic can't be marked done if criteria aren't satisfied
