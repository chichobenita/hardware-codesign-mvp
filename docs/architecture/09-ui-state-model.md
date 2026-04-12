# UI State Model

This document defines UI behavior for incremental Module Package filling during planning.

## 1. UI/State Model for Incremental Module Package Filling v1

This section defines how the user interface and package lifecycle should support gradual construction of Module Packages during planning.

The purpose of this model is to let the engineer and AI define modules progressively without forcing full package completion upfront. The UI should make partial progress visible, highlight missing required information, and allow package definition to evolve naturally as the design becomes clearer.

### 1.1 Core Principle

A Module Package should be treated as a living design object rather than a static form.

The user should be able to start with minimal information such as module name, rough role, or initial ports, and then refine the package step by step. The AI system should assist by proposing fields, filling obvious context, and identifying what information is still missing for the next readiness level.

### 1.2 UI Model

The MVP UI should expose Module Packages through three synchronized views:

#### A. Diagram-Centered View

The engineer sees the hardware hierarchy and connections visually.

Main behaviors:

* selecting a module opens its Module Package summary
* adding a block creates a new draft Module Package automatically
* connecting blocks may prefill interface and dependency fields
* splitting a block may create child Module Packages automatically

#### B. Package Panel View

The engineer sees the currently selected module's package fields in a structured side panel.

The panel should be section-based and reflect the MVP schema:

* Identity
* Hierarchy
* Interfaces
* Purpose
* Behavior
* Constraints
* Dependencies and Interactions
* Decomposition Status

The UI should support partial filling without requiring all sections to be completed immediately.

#### C. AI Collaboration View

The engineer can converse with the AI about the selected module.

Main behaviors:

* use a chat-first message list with a single input tied to the selected module
* ask the AI to propose or apply missing purpose, behavior, ports, or decomposition fields
* request lightweight structural edits such as create, connect, or decompose from direct intent text
* request clarification questions when the package remains ambiguous
* keep suggestion acceptance transparent, while allowing clear actions to auto-apply when intent is unambiguous


### 1.2.1 Hierarchy View Context

The workspace should keep one explicit hierarchy view context in reducer-owned UI state.

MVP behavior:

* one current composite module defines the visible diagram scope
* the diagram shows that composite module plus its direct children
* breadcrumb navigation allows moving back up the hierarchy deterministically
* selection remains synchronized through the same store state used by the package panel and AI panel

### 1.3 Incremental Filling States

The UI should represent package completeness at the section level, not only at the full-package level.

Each section may have a local status such as:

* empty
* partial
* complete
* needs_review

This allows the engineer to understand which parts of the Module Package are already usable and which still require attention.

### 1.4 Package Creation Events

A Module Package may begin forming from multiple entry points.

Supported MVP triggers should include:

* creating a new block in the diagram
* decomposing a parent block into children
* defining ports for a module
* assigning a module purpose in chat
* accepting an AI-proposed module definition

The system should create or update the Module Package immediately when one of these events occurs.

### 1.5 Autofill Rules

The AI system and platform logic should prefill fields whenever the information is already implied by existing design context.

Examples:

* hierarchy_path may be inferred from diagram placement
* parent_module_id may be inferred from decomposition context
* child_module_ids may be inferred from block creation
* dependencies may be inferred from connections
* ports may be inferred from explicit port editing

Autofill should reduce manual work, but filled values should remain visible and editable.

### 1.5.1 MVP Consistency Guardrails

To reduce identity drift and brittle dependency text handling, the MVP should keep two explicit rules:

* `modulePackage.identity.name` is the authoritative module display identity
* connection-derived dependencies should be stored as structured links (`direction`, `moduleId`, optional `signal`) and then rendered to human-readable dependency notes

This keeps UI editing lightweight while preserving deterministic semantics for validation and future hierarchy/diagram work.


### 1.6 Missing Information Guidance

The UI should help the engineer understand what is missing for the next readiness transition.

Examples:

* to move from draft to partially_defined, the system may request module purpose or initial ports
* to move from partially_defined to under_review, the system may request missing behavior or dependency information
* to move from approved to leaf_ready, the system may request leaf-specific completion items

The system should present this as guidance rather than as a rigid form-validation experience.

### 1.7 Suggestion Handling Model

AI-generated suggestions should not overwrite package content silently.

For MVP implementation, the source-of-truth should be an explicit proposal model in application/runtime state, while suggestion cards remain presentation over those proposals.

The MVP should support a simple suggestion workflow:

* AI proposes content
* the proposal is surfaced inline as concise AI chat messages
* the engineer may still accept, edit, or reject the proposal, even if the primary UI is chat-first
* accepted content updates the Module Package

This preserves transparency and engineer trust.

### 1.8 Section Ordering Strategy

The UI should encourage a practical order of filling, but should not enforce a strict one.

Recommended order for most modules:

1. Identity
2. Hierarchy
3. Interfaces
4. Purpose
5. Behavior
6. Constraints
7. Dependencies and Interactions
8. Decomposition Status

This order aligns with how hardware planning usually evolves while still allowing back-and-forth refinement.

### 1.9 Leaf-Ready Preparation Flow

When a module becomes an approved leaf candidate, the UI should shift into leaf-readiness preparation mode.

In this mode, the interface should:

* highlight the remaining leaf-ready fields
* show the future generation payload preview
* show the prompt snapshot derived from the same normalized source
* create and display a concrete handoff artifact record when handoff occurs
* clearly indicate when a previously created artifact is stale after later module edits
* allow the engineer to review the final compact handoff content
* make the handoff decision explicit

### 1.10 MVP Design Principle

The UI/state model should remain lightweight in v1.

The goal is not to create a heavy enterprise requirements tool. The goal is to make semantic module definition easy, progressive, and visible while preserving a natural co-design experience.
