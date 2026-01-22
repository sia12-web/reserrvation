# ADR-0001: Studio Artifact Standardization

## Status
Accepted

## Context
The /studio folder was previously using untyped markdown files for state and planning. This caused inconsistencies between agent outputs and hampered automation.

## Decision
We will use machine-readable JSON schemas for plans, reviews, and state.
- Plans: `/studio/PLANS/plan.schema.json`
- Reviews: `/studio/REVIEWS/review.schema.json`
- State: `/studio/STATE/state.json`

## Consequences
- Lower ambiguity for the Orchestration Engine.
- Agents must produce structured JSON blocks that match the schemas.
- Improved auditability and replayability of runs.
