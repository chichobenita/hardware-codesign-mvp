# Product Overview

This document summarizes the purpose, MVP target, scope boundaries, and core architectural principles for the interactive hardware co-design platform.

## 1. Purpose

This document defines the first architectural version of an interactive hardware co-design platform that collaborates with a hardware engineer to shape a chip, subsystem, or hardware block. The platform is intended to guide specification capture, architecture decomposition, hierarchical module planning, diagram synthesis and editing, and preparation of precise generation-ready inputs for downstream AI code generation.

The purpose of this MVP is not to directly automate full hardware implementation. The primary goal is to create a robust semantic and visual planning environment that helps the engineer and AI jointly decompose a design into well-scoped modules and sub-modules, so that each later HDL generation task becomes narrow, precise, and controllable.

The system is therefore positioned as a planning and decomposition layer that sits before code generation. It improves code quality indirectly by improving design structure, hierarchy clarity, interface definition, and prompt precision.

## 2. MVP Goal

The MVP should demonstrate a complete end-to-end workflow for a narrow but meaningful design space:

1. Capture design intent through structured conversation.
2. Translate that intent into an internal semantic model.
3. Jointly decompose the system into modules, sub-modules, and deeper hierarchy levels.
4. Propose and refine a hierarchical block architecture.
5. Render a visual block diagram from the same semantic source.
6. Accept semantic edits from chat and diagram interactions.
7. Produce precise generation-ready specifications and prompts for each approved leaf module.
8. Optionally prepare basic downstream HDL generation tasks, without making direct code generation the primary product responsibility.

The MVP should prove that conversation, diagram, and decomposition outputs can remain synchronized through a shared semantic core, and that this process materially improves the precision of later HDL generation.

## 3. Product Scope

### In Scope for v1

The first version focuses on digital hardware subsystems with relatively structured composition patterns. Recommended initial target domains include:

* streaming datapath subsystems
* controller + datapath subsystems
* memory-mapped control/peripheral subsystems
* simple buffering/arbitration/control compositions

Typical supported building blocks in v1 may include FIFO, register bank, arbiter, mux/demux, scheduler, FSM-based control blocks, and simple processing stages.

### Out of Scope for v1

The following are intentionally excluded from the initial MVP:

* full-chip SoC generation
* advanced multi-clock design planning
* full UVM generation
* signoff-quality verification closure
* analog or mixed-signal design
* full physical design / PPA closure
* automatic generation of arbitrary complex custom algorithms with guaranteed correctness

## 4. Architectural Principles

The system should follow the following core principles:

### 4.1 Human-in-the-loop by design

The platform proposes, refines, and structures, but the engineer remains the final authority.

### 4.2 Semantic source of truth

Conversation, diagram, hierarchy, and generation-ready module specifications are all derived from one internal semantic model. No view should drift independently.

### 4.3 Decomposition before generation

The platform must prioritize correct hierarchical decomposition over premature code generation.

### 4.4 Top-down planning, bottom-up implementation

Architectural planning should proceed top-down, beginning from system intent and refining into subsystem, module, sub-module, and leaf-level units. Implementation preparation and downstream code generation should proceed bottom-up, beginning with sufficiently bounded leaf modules and then integrating upward through the approved hierarchy.

### 4.5 Generation readiness over generation breadth

The system should optimize for producing precise, bounded, implementation-ready module definitions rather than attempting broad one-shot RTL generation.

### 4.6 Narrow product scope, general platform kernel

The MVP may support a small set of hardware patterns, but the core platform must remain extensible.

### 4.7 Layered architecture

Each layer must have clearly bounded responsibilities and stable interfaces, so the system can scale without architectural rewrite.
