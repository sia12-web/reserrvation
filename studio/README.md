# Agent Studio: Poster Overview

This document provides a high-level overview of the Multi-Agent Orchestration pipeline used in this project.

```mermaid
flowchart TB
  %% ==============
  %% MULTI-AGENT STUDIO: POSTER OVERVIEW
  %% ==============

  U([User Goal / Request]) --> ORCH[Orchestrator<br/>Plan + Route + Gate + Persist]

  ORCH <--> BUS[(Context Bus<br/>STATE.md + state.json<br/>ADRs + Contracts + Run Artifacts)]

  ORCH --> PLAN{Plan exists?}
  PLAN -- No --> PLANNER[Planner<br/>Produces plan.json (steps + deps + gates)]
  PLANNER --> ORCH
  PLAN -- Yes --> EXEC[Execute Steps<br/>in dependency order]

  EXEC --> ROUTE[Routing Policy Engine<br/>risk_level + task_type + complexity + failures]
  ROUTE --> STEP[Step Agent Execution<br/>role + model + prompt template]

  %% Step agent cluster
  subgraph WORK[Core Build Agents]
    ARCH[Architect<br/>Modules + ADRs + architecture.md]
    CONT[Contractor<br/>OpenAPI + schemas]
    UX[UX Designer<br/>Flows + copy]
    IMPL[Implementer<br/>Backend / Frontend diffs + tests]
    DOC[Documentation Agent<br/>Docs + runbooks + onboarding]
  end

  STEP --> ARCH --> BUS
  STEP --> CONT --> BUS
  STEP --> UX --> BUS
  STEP --> IMPL --> BUS
  STEP --> DOC --> BUS

  %% Gates
  subgraph GATES[Automatic Gates (Triggered by step metadata)]
    QA[QA Engineer<br/>unit/integration/e2e + contract tests]
    SEC[Security & Privacy<br/>threat model + abuse cases + diff checks]
    INT[Integration Lead<br/>contract compliance + smoke tests]
  end

  STEP -->|if required| QA --> BUS
  STEP -->|if required| SEC --> BUS
  STEP -->|if required| INT --> BUS

  %% Review + correction loop
  STEP --> REVIEWER[Reviewer<br/>Gated checklist + decision JSON]
  QA --> REVIEWER
  SEC --> REVIEWER
  INT --> REVIEWER

  REVIEWER --> DEC{Decision}
  DEC -- Approved --> DONE_STEP[Mark step complete]
  DEC -- Approved w/ conditions --> COND[Record conditions + create follow-up step]
  DEC -- Changes requested --> FIX[Fix step (retry <= 3)<br/>Escalate after 2 failures]
  DEC -- Blocked --> AMEND[Amend plan / redesign]

  FIX --> STEP
  COND --> EXEC
  AMEND --> PLANNER

  DONE_STEP --> MORE{More steps?}
  MORE -- Yes --> EXEC
  MORE -- No --> REL[Release Manager<br/>release notes + rollout + rollback]
  REL --> BUS
  REL --> SHIP([Ready to Ship])
```

## Core Components

- **Orchestrator**: The central brain managing state, routing, and gates.
- **Context Bus**: Shared memory consisting of `state.json`, `STATE.md`, ADRs, and contracts.
- **Planner**: Generates structured, dependency-aware plans.
- **Build Agents**: Specialized roles for Architecture, Contracting, UX, Implementation, and Documentation.
- **Automatic Gates**: QA, Security, and Integration checks triggered by metadata.
- **Reviewer**: Decision-making gate using structured JSON checklists.
- **Release Manager**: Finalizes the release and ensures rollout safety.
