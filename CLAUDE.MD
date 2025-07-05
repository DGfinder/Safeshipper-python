# Claude Development Protocol for the SafeShipper Project

This document outlines the standard operating procedure I will follow for all development tasks on the SafeShipper project. My goal is to work as a predictable, efficient, and safe pair-programmer, ensuring every change is simple, well-planned, and approved by you.

## Guiding Principles

My work will be guided by one core principle above all else:

**Simplicity and Small Changes:** Every task will be broken down into the smallest possible, self-contained steps. I will avoid making massive or complex changes in a single step. Each change will impact as little code as possible to ensure clarity, ease of review, and stability.

## My Workflow

I will follow a strict five-step process for every new feature or task request.

### Step 1: Understand and Plan

Before writing any code, my first action will be to understand the request and create a plan.

1.  **Think & Analyze:** I will think through the problem and read the existing codebase to identify all relevant files and potential impacts.
2.  **Create a Plan:** I will then generate a plan in a file named `todo.md`. This plan will contain a checklist of the simple, sequential tasks I will perform to complete the request.

### Step 2: Await Approval

**I will not proceed with any coding until you have verified the plan.**

After I create the `todo.md` file, I will stop and explicitly ask for your approval to proceed. This is a critical checkpoint to ensure we are aligned before any changes are made to the codebase.

### Step 3: Execute and Communicate

Once you approve the plan, I will begin working through the items in `todo.md`.

1.  **Execute Tasks:** I will work on one `todo` item at a time.
2.  **Mark as Complete:** As I complete each item, I will update the `todo.md` file to mark the task as checked (`- [x]`).
3.  **Provide High-Level Updates:** After completing each task, I will provide a brief, high-level explanation of the change I just made (e.g., "I have now created the `UserEditForm.tsx` component and connected it to the `useUpdateUser` hook.").

### Step 4: Security & Quality Review

After all coding tasks are complete, I will perform a dedicated security and quality review. I will add a `## Security Review` section to the `todo.md` file and verify the following points:

-   **Input Validation:** Is all user-provided data (from API requests, forms, etc.) properly validated on the backend to prevent invalid data or injection attacks?
-   **Permissions Check:** Does the new feature correctly enforce our role-based access control? Is there any risk of an unauthorized user accessing the new endpoint or data?
-   **Data Exposure:** Do the API serializers for the new feature expose any sensitive data that shouldn't be public (e.g., password hashes, internal keys)?
-   **Dependency Review:** If any new third-party libraries were added, I will note them and confirm they are from a reputable source.

### Step 5: Final Summary

Once the security review is complete, I will finalize the process.

1.  **Add Review Section:** I will add a `## Review Summary` section to the bottom of the `todo.md` file.
2.  **Summarize Changes:** This section will provide a comprehensive summary of the work done, list all files that were created or modified, and confirm that the initial goal has been achieved.

---

## File Formats

### `todo.md` Structure

All plans will follow this consistent format to ensure clarity.

```markdown
# Task: [A clear, concise title for the overall task]

## Plan

- [ ] **Step 1:** A short description of the first simple task.
- [ ] **Step 2:** A short description of the second simple task.
- [ ] **Step 3:** ...and so on.

---
*(This section will be added after coding is complete)*
## Security Review

- **Input Validation:** [Checked/Not Applicable]
- **Permissions Check:** [Checked/Not Applicable]
- **Data Exposure:** [Checked/Not Applicable]
- **New Dependencies:** [None/List of dependencies]

---
*(This section will be added at the end)*
## Review Summary

A detailed summary of the completed work, including a list of all files created or modified and confirmation that all acceptance criteria have been met.