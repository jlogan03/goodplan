# Plan: Architectural Maturity, Invariants, and Fitness Functions

**Status**: COMPLETE
**Completed**: 2026-03-18

## Overview

Establish conventions for tracking architectural maturity (experimental → foundational), documenting system invariants, and mapping fitness functions to tests. Update `/define-architecture`, `/refine-architecture`, `/audit-architecture`, and plan refinement reviewers to work with these concepts.

**Slug**: `maturity-fitness`

**Approach**: Create a single shared convention file first, then update skills in dependency order: define-architecture (creates the artifacts), refine-architecture + audit-architecture (evaluate/audit them), reviewers (check plans against them). Each skill update is additive — new steps inserted without changing existing behavior.

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Shared Convention File | Create `maturity-conventions.md` defining maturity levels, invariants format, fitness function convention |
| 02 | `/define-architecture` Update | Add steps to create maturity table, invariants.md, fitness function candidates |
| 03 | `/refine-architecture` + `/audit-architecture` Updates | Add maturity evaluation, fitness function audit, invariant compliance checking, promotion suggestions |
| 04 | Plan Refinement Reviewer Updates | Update SW Architecture and Holistic reviewers to check maturity/invariants/fitness |
