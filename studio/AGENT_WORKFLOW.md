studio/AGENT_WORKFLOW.md
# Agent Workflow Diagram

This document illustrates the flow of work between the Studio Agents, coordinated by the Orchestrator.

```mermaid
graph TD
    %% Nodes
    User([User Request])

    subgraph "Phase 1: Planning"
        Planner[Planner Agent]
        Plans[( /studio/PLANS/<plan_id>/plan.json )]
        State[(Context Bus<br/>/studio/STATE/state.json)]
    end

    subgraph "Phase 2: Execution Loop"
        Orch{Orchestrator<br/>Exec + Route + Gate + Persist}

        Policies[( /studio/POLICIES/routing_policy.yaml )]
        Runs[( /studio/RUNS/<run_id>/... )]

        subgraph "Design & Specs"
            Arch[Architect]
            Cont[Contractor]
            UX[UX Designer]
        end

        subgraph "Implementation"
            Imp[Implementer]
            Back[Backend Engineer]
            Front[Frontend Engineer]
            Doc[Documentation Engineer]
        end

        subgraph "Verification Gate"
            Rev{Reviewer}
            QA[QA Agent]
            Sec[Security Agent]
            Int[Integration Lead]
            PV[Phase Verifier]
            Reviews[( /studio/REVIEWS/review.<step_id>.json )]
        end

        subgraph "CI Automation"
            GHA[GitHub Actions Engineer]
            CI[( GitHub Actions CI<br/>.github/workflows/*.yml )]
        end

        %% Models (conceptual routing targets)
        subgraph "Model Pool (Routing Targets)"
            GLM[Model: GLM/FastModel]
            GPT[Model: GPT/StrongReasoning]
            Claude[Model: Claude/AlternativeReasoning]
            Gemini[Model: Gemini/CreativeModel]
        end
    end

    subgraph "Phase 3: Release"
        Rel[Release Manager]
        Deploy((Deployment))
    end

    %% Phase 1
    User --> Planner
    Planner -->|plan.json| Plans
    Plans --> Orch

    %% Orchestrator core
    Orch <--> State
    Orch --> Policies
    Orch --> Runs

    %% Routing (conceptual)
    Orch <-->|Routing Policy| Claude
    Orch <-->|Routing Policy| GPT
    Orch <-->|Routing Policy| GLM
    Orch <-->|Routing Policy| Gemini

    %% Design Loop
    Orch -->|Step: Design| Arch
    Arch -->|ADRs + architecture notes| Runs
    Arch --> Orch

    Orch -->|Step: Contracts| Cont
    Cont -->|OpenAPI + schemas| Runs
    Cont --> Orch

    Orch -->|Step: UX| UX
    UX -->|flows + copy| Runs
    UX --> Orch

    %% Implementation Loop
    Orch -->|Step: Implement| Imp
    Imp --> Back
    Imp --> Front
    Imp -->|Docs updates| Doc

    %% Review + Gate Loop
    Imp -->|Diffs + artifacts| Rev
    Rev -->|Trigger| QA
    Rev -->|Trigger| Sec
    Rev -->|Trigger| Int
    Rev -->|Trigger| PV

    QA -->|Pass/Fail| Rev
    Sec -->|Pass/Fail| Rev
    Int -->|Pass/Fail| Rev
    PV -->|Verify Commands + Expected Outcomes| Rev

    Rev --> Reviews
    Reviews --> Runs

    Rev -->|Changes Requested| Imp
    Rev -->|Approved| Orch

    %% CI Automation (mirrors Phase Verifier)
    Orch -->|Step: CI Gates| GHA
    GHA -->|Create/Update workflows| CI
    PV -->|Source of truth: verify steps| GHA
    CI -->|Runs on PR + main| Rev

    %% Completion
    Orch -->|Plan Complete| Rel
    Rel -->|Release notes + rollout + rollback| Runs
    Rel -->|Certified Artifacts| Deploy

    %% Styling
    classDef hub fill:#f9f,stroke:#333,stroke-width:4px,color:black;
    classDef worker fill:#bbf,stroke:#333,stroke-width:2px,color:black;
    classDef gate fill:#f96,stroke:#333,stroke-width:2px,color:black;
    classDef store fill:#ddd,stroke:#555,stroke-width:1px,color:black;

    class Orch hub;
    class Planner,Arch,Cont,UX,Imp,Back,Front,Doc,Rel,GHA worker;
    class Rev,QA,Sec,Int,PV gate;
    class State,Plans,Policies,Runs,Reviews,CI store;
