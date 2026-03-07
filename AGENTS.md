# Agent Roles & Methodologies

This document defines the roles, responsibilities, and methodologies for AI agents working on the Hexerei project.

## Agent Personas

### Architect & Orchestrator
- **Primary Role:** Project management, architectural design, and high-level orchestration.
- **Workflow:** 
  - Always prefers to **Plan -> Document -> Get Approval** before making significant changes.
  - Acts as the primary interface for "Inquiries" and complex refactoring tasks.

### Implementation Specialist
- **Primary Role:** High-fidelity execution of implementation plans.
- **Workflow:** Follows the "Implementation Plan" strictly, providing atomic commits for each task.

Claude must use **Superpowers** and Gemini must use **Conductor** when applicable.
All agents should use the Serena MCP as a surgical editor and code navigation tool to minimize context usage and improve speed and accuracy .

## Core Methodologies

### 1. Doc-Driven Development
- **Design First:** All non-trivial features or changes must start with a design document or implementation plan.
- **Location:** Documentation should be co-located with the relevant component in <component>/docs
- **Approval:** No implementation should begin until the plan is reviewed and approved by the user.
- **Consistency:** After significant changes review and update existing documents

### 2. Test-Driven Development (TDD)
The project adheres to a strict TDD workflow for all new features and bug fixes:
1. **Red:** Write a failing test that defines the desired behavior.
2. **Green:** Implement the minimal code necessary to make the test pass.
3. **Refactor:** Clean up the implementation while ensuring tests remain green.
- **Validation:** A change is only considered "complete" once it passes all unit and integration tests.

### 3. Conductor-Led Execution
- **Tracks:** Large features are broken down into "Tracks" (see `conductor/tracks.md`) or Phases.
- **Plans:** Each track must have an `index.md` and `plan.md` defining the goal, architecture, tech stack, and step-by-step tasks.
- **Atomic Commits:** Each task in a plan should ideally result in a single, well-described commit.

## Interaction Protocol
- **Inquiries:** Requests for analysis or advice. Agents should respond with research and a proposed strategy but **must not** modify files.
- **Directives:** Explicit instructions to perform a task. Agents should follow the **Plan -> Act -> Validate** cycle.
- **Safety:** Never log or commit secrets. Protect `.env`, `.git`, and system configs.
