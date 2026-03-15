# Layered System Architecture

This document defines the layered architecture for the MVP and the responsibility boundaries between layers.

## 1. Layered System Architecture

The MVP is divided into five layers.

## 1.1 Layer 1 — Experience Layer

This layer is responsible for all user-facing interactions.

### Responsibilities

* conversational interaction with the engineer
* block diagram visualization
* parameter editing
* design review and approval flow
* artifact inspection and export

### Main Components

* Chat Workspace
* Diagram Workspace
* Property / Parameter Panel
* Review & Approval Panel
* Artifact Viewer

### Notes

This layer must not contain core design logic. It is only a view and interaction surface over deeper semantic services.

## 1.2 Layer 2 — Orchestration Layer

This layer coordinates system behavior across sessions, agents, generation steps, and review gates.

### Responsibilities

* workflow progression
* task sequencing
* approval gates
* multi-step planning and execution
* synchronization between user edits and backend actions

### Main Components

* Session Orchestrator
* Design Workflow Manager
* Approval Gate Manager
* Task Dispatcher

### Notes

This layer decides what should happen next, but does not itself define hardware meaning.

## 1.3 Layer 3 — Intelligence Layer

This layer contains reasoning components that interpret requirements, propose structures, and prepare generated artifacts.

### Responsibilities

* requirement interpretation
* architecture planning
* block decomposition
* diagram intent interpretation
* HDL generation planning
* verification planning
* consistency critique

### Main Components

* Spec Interpreter
* Architecture Planner
* Block Decomposer
* Design Critic
* HDL Generation Planner
* Verification Planner

### Notes

This layer should reason over the semantic model rather than generate outputs directly from raw conversation whenever possible.

## 1.4 Layer 4 — Semantic Core Layer

This is the most important layer in the entire product. It is the system-of-record for design meaning.

### Responsibilities

* representation of the design structure
* block and hierarchy modeling
* interface contracts
* connection semantics
* parameter and constraint representation
* design traceability
* semantic edit operations

### Main Components

* System IR / Semantic Model
* Graph Engine
* Interface Contract Engine
* Constraint Engine
* Traceability Engine
* Semantic Edit Engine

### Notes

All other layers must read from and write to this layer through controlled APIs.

## 1.5 Layer 5 — Artifact & Integration Layer

This layer converts semantic intent into engineering outputs and prepares downstream handoff artifacts.

### Responsibilities

* module specification export
* hierarchy export
* diagram export
* prompt package generation for downstream AI code engines
* optional HDL generation integration
* assertion and test scaffold preparation hooks
* external tool connector support

### Main Components

* Module Spec Packager
* Prompt Composer Backend
* Export Manager
* Optional HDL Generator Connector
* External Tool Connector Interface

### Notes

This layer should be implemented as a plugin-capable backend system. In v1, its main role is to package precise module-level implementation intent rather than to own full HDL synthesis logic.
