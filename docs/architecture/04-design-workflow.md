# Design Workflow

This document defines the MVP workflow from top-down planning to bottom-up implementation preparation.

## 1. Design Workflow

The MVP workflow should follow the sequence below.

### Phase A — Top-Down Planning

### Step 1 — Intent Capture

The engineer describes the subsystem, its purpose, and high-level behavior.

### Step 2 — Structured Specification

The system extracts a structured design spec that includes inputs, outputs, timing assumptions, interface types, internal behaviors, and relevant constraints.

### Step 3 — Hierarchical Decomposition

The system and engineer jointly break the design into modules, sub-modules, and additional levels of hierarchy until each unit is sufficiently bounded.

### Step 4 — Initial Architecture Proposal

The system proposes a block hierarchy and interconnection structure.

### Step 5 — Visual Review

The proposed architecture is rendered as a block diagram that reflects the same semantic model.

### Step 6 — Interactive Refinement

The engineer edits the design using conversation and diagram operations. The system updates the semantic model accordingly.

### Step 7 — Decomposition Closure

The engineer confirms that the decomposition is complete enough for leaf-level implementation planning.

### Phase B — Bottom-Up Implementation Preparation

### Step 8 — Leaf Module Identification

The system identifies which modules are leaf-level implementation units and which remain composite.

### Step 9 — Module Packaging

The system produces implementation-ready module packages for selected leaf modules. Each package should include role, hierarchy position, interfaces, constraints, behavioral intent, dependencies, and generation guidance.

### Step 10 — Optional Leaf-Level Code Generation Handoff

The system emits focused prompts or structured payloads to an external AI code engine for HDL generation of leaf modules.

### Step 11 — Upward Integration Readiness

As leaf modules become available, the system uses the approved hierarchy and interface contracts to prepare parent-level integration context.

### Step 12 — Export

The engineer exports decomposition artifacts, diagrams, module specifications, and optional downstream generation packages.
