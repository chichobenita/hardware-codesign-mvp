# MVP Screens v1 — Interactive Hardware Co-Design Platform

## 1. Project / Design Entry Screen

### Purpose

* Create a new hardware design project
* Open an existing project
* View recent design sessions
* Define the initial system-level design goal

### Main UI Areas

* Project list or recent sessions
* Create new project action
* Short project summary card
* Initial prompt input for describing the system or subsystem

### Notes

This screen should remain lightweight. Its role is to start or resume a design process, not to expose detailed architecture editing.

---

## 2. Main Co-Design Workspace

### Purpose

* Perform joint top-down design planning
* Visualize architecture and hierarchy
* Inspect and fill Module Packages incrementally
* Interact with the AI about the currently selected module

### Main UI Layout

The screen should be split into three synchronized regions.

#### A. Center — Diagram Workspace

The main visual canvas for the hardware hierarchy.

Functions:

* Show blocks and sub-blocks on a lightweight SVG diagram surface
* Use deterministic hierarchy-depth columns for readable stable layout
* Show connections between modules from the normalized semantic connection state
* Allow selection of a module with synchronized highlighting across panels
* Surface lightweight hierarchy cues such as parent/child badges and hierarchy labels
* Show lightweight breadcrumb navigation and current hierarchy scope controls
* Allow basic structural edits such as add block, connect, split block, and delete block
* Allow entering a composite block scope to inspect and refine its direct child modules

#### B. Right Panel — Module Package Panel

The structured panel for the currently selected module.

Functions:

* Display section-based package data
* Allow incremental editing of package fields
* Show section completion state
* Highlight missing information for next readiness level

Initial sections shown in MVP:

* Identity
* Hierarchy
* Interfaces
* Purpose
* Behavior
* Constraints
* Dependencies and Interactions
* Decomposition Status

#### C. Left Panel — AI Collaboration Panel

The conversational workspace tied to the selected module or current design context.

Functions:

* Ask the AI to propose module decomposition
* Ask the AI to suggest ports, purpose, or behavior
* Ask clarification questions
* Show AI suggestions before commit
* Allow accept, edit, or reject actions

### Notes

This screen should support most of the design lifecycle without forcing users to navigate away constantly.

---

## 3. Review and Approval Screen / Mode

### Purpose

* Review a module definition before approval
* Inspect missing information or risks
* Confirm approval or request changes
* Prepare approved leaf modules for leaf-ready transition

### Main UI Areas

* Module summary header
* Readiness checklist
* Side-by-side view of package summary and compact generation payload preview
* Approve / send back for refinement action

### Notes

This may be implemented either as a dedicated screen or as a focused review mode layered on top of the Main Co-Design Workspace. For the MVP, a review mode may be preferable to reduce navigation complexity.

---

## 4. Handoff / Export Screen / Mode

### Purpose

* Inspect the final Generation Payload Minimal v1
* Trigger handoff to the downstream AI code engine
* Export artifacts
* Track which modules have already been handed off

### Main UI Areas

* List of approved leaf-ready modules
* Selected module payload preview
* Handoff action
* Export options
* Handed-off status indicator

### Notes

In the MVP, this screen may also be implemented as a mode or drawer instead of a fully separate page.

---

## 5. Recommended MVP Navigation Model

### Recommended Flow

1. Project / Design Entry Screen
2. Main Co-Design Workspace
3. Review Mode or Review Screen when needed
4. Handoff / Export Mode or Screen when needed

### Principle

The MVP should feel like one design environment with focused modes, not like a collection of disconnected enterprise forms.

The Main Co-Design Workspace should therefore carry most of the user journey, while review and handoff should appear as lightweight transitions around it.

