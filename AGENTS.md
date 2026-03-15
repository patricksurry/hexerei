# Core Methodologies

## 1. Doc-Driven Development
- **Design First:** All non-trivial features or changes must start with a design document or implementation plan.
- **Location:** Documentation should be co-located with the relevant component in <component>/docs
- **Approval:** No implementation should begin until the plan is reviewed and approved by the user.
- **Consistency:** After significant changes review and update existing documents

**Always** prefer to save documents in user-visible locations within the project, not in private or agent-specific memory folders.  This project is a multi-agent collaboration so we need to maximize shared context.

## 2. Test-Driven Development (TDD)
The project adheres to a strict TDD workflow for all new features and bug fixes:
1. **Red:** Write a failing test that defines the desired behavior.
2. **Green:** Implement the minimal code necessary to make the test pass.
3. **Refactor:** Clean up the implementation while ensuring tests remain green.
- **Validation:** A change is only considered "complete" once it passes all unit and integration tests.
4. **Hygiene:** Do **not** 'fix' tests by suppressing errors or warnings, or by changing the test.  Resolve the underlying issue.  This might require additional planning or effort.

# Interaction Protocol
- **Inquiries:** Requests for analysis or advice. Agents should respond with research and a proposed strategy but **must not** modify files.
- **Directives:** Explicit instructions to perform a task. Agents should follow the **Plan -> Act -> Validate** cycle.
- **Safety:** Never log or commit secrets. Protect `.env`, `.git`, and system configs.
