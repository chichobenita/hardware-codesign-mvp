# MVP Architecture v1 — Interactive Hardware Co-Design Platform

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

## 5. Layered System Architecture

The MVP is divided into five layers.

## 5.1 Layer 1 — Experience Layer

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

## 5.2 Layer 2 — Orchestration Layer

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

## 5.3 Layer 3 — Intelligence Layer

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

## 5.4 Layer 4 — Semantic Core Layer

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

## 5.5 Layer 5 — Artifact & Integration Layer

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

## 6. Core Data Model

The MVP should define a stable internal schema for the following entities.

### 6.1 Design

Represents one hardware system or subsystem under construction.

### 6.2 Block

Represents a logical hardware component. A block may be composite or leaf-level.

### 6.3 Port

Represents a typed ingress or egress endpoint of a block.

### 6.4 Interface

Represents a grouped interaction contract, including signal semantics and protocol rules.

### 6.5 Connection

Represents a semantic relationship between source and destination ports or interfaces.

### 6.6 Constraint

Represents throughput, latency, clock target, buffering, parameter, or policy requirements.

### 6.7 Decision Record

Represents why a design choice was made and what requirement it satisfies.

### 6.8 Artifact

Represents generated outputs such as HDL files, assertions, block-level specs, or diagram snapshots.

## 7. Design Workflow

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

## 8. Semantic Edit Model

Diagram and chat edits must map to controlled semantic operations.

The MVP should support the following edit operations:

* add block
* delete block
* connect blocks
* disconnect blocks
* split block
* merge blocks
* add port
* change interface type
* insert FIFO or buffer
* modify parameters
* change hierarchy placement

Each edit must update the semantic model first, then propagate to all derived views.

## 9. Module Packaging and HDL Generation Scope for v1

Direct HDL generation is not the primary responsibility of the MVP. The primary responsibility is to prepare precise, bounded, implementation-ready module definitions for downstream code generation.

### Primary Supported Outputs

* leaf-module specification packages
* module responsibility summaries
* interface definitions
* parameter definitions
* hierarchy context
* dependency summaries
* behavioral intent summaries
* generation guidance notes
* prompt packages for downstream HDL generation tools

### Optional Secondary Outputs

* module skeleton suggestions
* module templates
* basic HDL stubs

### Generation Philosophy

The system should improve code quality by reducing ambiguity before generation. Precision of decomposition, interface clarity, and hierarchy correctness are more important than aggressive direct code emission in v1.

## 10. Verification Scope for v1

Verification in the MVP is support-oriented, not signoff-oriented.

### Supported Outputs

* interface consistency checks
* basic structural checks
* simple assertions derived from interface contracts
* basic directed testbench skeletons
* generation-time warnings for incomplete or ambiguous design assumptions

### Not Yet Included

* full coverage closure
* full UVM environments
* deep formal proof workflows
* timing signoff or implementation signoff

## 11. Initial Domain Pack for MVP

The first domain pack should focus on structured digital subsystem design.

### Recommended Initial Support

* valid/ready streaming interfaces
* simple memory-mapped control interfaces
* FIFO-based buffering
* arbitration and control blocks
* controller + datapath compositions
* parameterized block templates

This domain pack is narrow enough for a meaningful MVP while broad enough to demonstrate real product value.

## 12. Extension Strategy

The platform must support future expansion without redesigning the core.

### Future Extension Axes

* more protocol packs
* more block libraries
* multi-clock support
* SoC fabric planning
* HLS-backed generation paths
* stronger verification backends
* synthesis/QoR feedback loops
* vendor IP integration
* collaboration features

### Extension Rule

New capabilities should be added as plugins, packs, or generators on top of the semantic core rather than as special-case logic in the workflow.

## 13. Non-Functional Requirements

The MVP should aim for the following qualities:

* deterministic semantic updates
* stable synchronization between views
* explainable architecture decisions
* reviewable generated artifacts
* modular backend integration
* traceable design changes

Performance and scale requirements should remain moderate in v1, favoring correctness of the co-design loop over raw throughput.

## 14. Key Risks

### Risk 1 — Ambiguous specifications

Mitigation: require structured clarification before committing to architecture.

### Risk 2 — Diagram drift from design intent

Mitigation: keep the semantic core as the only source of truth.

### Risk 3 — Overly ambitious HDL generation

Mitigation: constrain v1 generation targets to structured patterns.

### Risk 4 — Architecture lock-in

Mitigation: keep protocols, generators, and block libraries plugin-based.

### Risk 5 — Weak trust from engineers

Mitigation: prioritize transparency, traceability, and explicit review gates.

## 15. Success Criteria for MVP

The MVP is successful if it demonstrates the following:

1. A user can describe a hardware subsystem in natural language.
2. The platform can produce a structured semantic representation.
3. The platform can jointly decompose the system into a meaningful hierarchy of modules and sub-modules using a top-down planning flow.
4. The platform can propose a valid block architecture and diagram.
5. The user can refine the design through both chat and visual editing.
6. The platform can identify leaf modules suitable for bounded implementation work.
7. The platform can produce coherent implementation-ready packages for approved leaf modules.
8. These packages are precise enough to improve downstream HDL generation quality in a bottom-up implementation flow.
9. The conversation, diagram, hierarchy, and module packages remain synchronized through the same design model.

## 16. Leaf Module Definition v1

A leaf module is the unit that marks the transition point between top-down planning and bottom-up implementation preparation.

The system should not define a leaf module purely as the smallest possible block. A leaf module should instead be the smallest meaningful implementation unit that has a clear responsibility, a bounded interface, and sufficient semantic independence to be implemented and reviewed on its own.

### 16.1 Core Definition

A module may be considered a leaf module when all of the following conditions are sufficiently satisfied:

1. **Single clear responsibility**
   The module performs one coherent function or one tightly related set of functions.

2. **Stable external interface**
   Its inputs, outputs, protocol expectations, and parameter boundaries are already understood well enough.

3. **Bounded behavioral intent**
   The system can describe what the module does in a concise and implementation-relevant way.

4. **No required internal architectural decomposition**
   Further decomposition is not currently necessary to improve understanding, implementation precision, or interface clarity.

5. **Implementation readiness**
   The module is small and focused enough that downstream HDL generation or manual implementation can be performed without excessive ambiguity.

6. **Meaningful engineering identity**
   The module is not merely an arbitrary fragment of code. It corresponds to a recognizable engineering unit such as a controller, buffer wrapper, arbiter, register block, protocol adapter, datapath stage, or similar meaningful block.

### 16.2 Decomposition Stopping Logic

The platform should support two complementary stopping signals.

#### A. Engineer-declared stop

The engineer may explicitly decide that a module should be treated as a leaf module.

This is appropriate when the engineer determines that:

* the block is already sufficiently well-defined
* additional decomposition would not improve quality
* the module should remain intact for implementation, reuse, or ownership reasons

#### B. System-recommended stop

The system may recommend that decomposition should stop.

This is appropriate when the system determines that:

* the module already has a coherent purpose
* the interface is sufficiently bounded
* further splitting would produce artificial fragments rather than meaningful design units
* downstream implementation would likely be clearer if the module remains whole

The final authority should remain with the engineer.

### 16.3 Anti-Patterns for Further Decomposition

The system should actively avoid over-decomposition. A module should generally not be decomposed further when additional splitting would create:

* blocks with no clear standalone purpose
* fragments that only mirror lines of code rather than engineering intent
* overly fine-grained glue-only units without stable abstraction value
* blocks whose boundaries are difficult to explain semantically
* decomposition that harms readability or future integration

### 16.4 Guiding Principle

The preferred decomposition rule for the MVP is:

**Decompose until each resulting unit is the smallest meaningful engineering block, not the smallest syntactic code fragment.**

### 16.5 Examples of Likely Leaf Modules in v1

Examples may include:

* FIFO wrapper
* register bank
* arbitration block
* protocol adapter
* simple FSM controller
* parameterized datapath stage
* interrupt aggregation block
* buffering/control helper block

### 16.6 Role in Workflow

Leaf module identification is the gateway between the two main workflow phases:

* top-down planning continues until leaf candidacy is reached
* bottom-up implementation preparation starts from approved leaf modules

This definition should be used by the platform when deciding whether to continue decomposition, request clarification, or prepare a module package for downstream implementation.

## 17. Module Package Role in the System

The Module Package is a central system artifact. It is the formal definition unit used throughout the hierarchy and the formal handoff unit between semantic hardware planning and downstream HDL generation.

The platform does not generate value merely by decomposing a system into blocks. Its core value comes from converting each defined module into a precise, semantically rich package that captures architectural intent, interface meaning, and implementation context with minimal ambiguity.

### 17.1 Scope

A Module Package is required for every module in the hierarchy, not only for the smallest leaf modules.

This means:

* high-level modules have Module Packages
* intermediate modules have Module Packages
* leaf modules have Module Packages

The content depth may differ by hierarchy level, but the package concept applies to the entire design tree.

### 17.2 Purpose

The purpose of a Module Package is to transform a module from a design concept into a structured engineering definition.

A valid Module Package must:

* preserve the design intent of the module
* preserve its architectural context
* define its interfaces and behavioral expectations
* capture relevant constraints and assumptions
* support decomposition into children when the module is composite
* reduce ambiguity for downstream HDL generation when the module is a leaf or implementation-ready unit
* support consistent bottom-up implementation across the hierarchy

### 17.3 Collaborative Definition

A Module Package is not expected to be authored manually from scratch in all cases. It is created collaboratively between the engineer and the AI system.

The platform should support AI-assisted package definition through:

* suggested templates for common module types
* suggested field values based on system context
* auto-filled hierarchy and interface context
* decomposition-aware package drafting
* clarification prompts when required fields remain ambiguous

The Module Package should also support incremental construction. It does not need to appear only after a module is fully defined. Instead, it should begin forming as soon as meaningful module information becomes available.

For example, once a module has a name, hierarchy context, or initial inputs and outputs, those elements may already be added to its Module Package. Additional fields are then refined progressively as planning continues.

This makes the Module Package both a design artifact and an interaction mechanism.

### 17.4 Position in the Workflow

All modules may receive a Module Package during planning, but leaf-module packages have an additional role as implementation handoff artifacts.

This means that the workflow transition for implementation is not:

**approved leaf module -> HDL generation**

but rather:

**approved leaf module -> leaf Module Package -> downstream HDL generation**

This distinction is important because the Module Package is the mechanism that converts semantic planning quality into generation quality.

### 17.5 Product Importance

The Module Package should be treated as one of the most critical artifacts in the system.

Its quality directly affects:

* correctness and clarity of generated HDL
* consistency across independently generated modules
* ease of parent-level integration
* traceability between architecture and implementation
* future verification readiness
* quality of module decomposition decisions across the hierarchy

### 17.6 Design Requirement

Because every module passes through this stage, the Module Package format must be:

* structured
* semantically rich
* deterministic enough for reliable downstream use
* compact enough to remain implementation-focused
* extensible for future verification and integration needs
* usable both for composite modules and for leaf implementation units
* incrementally fillable during the planning process

The exact schema of the Module Package should therefore be considered a first-class architectural decision.

## 18. Module Package Schema v1

This section defines the structured schema of the Module Package. The schema is designed to support all hierarchy levels, while allowing a subset of modules to reach leaf-ready status for downstream HDL generation handoff.

The schema should be organized into three top-level groups:

1. Structural Definition
2. Functional Definition
3. Execution Readiness

The Module Package is an incrementally filled artifact. Fields may begin partially populated and become more complete as design planning progresses.

### 18.1 Package Metadata

These fields identify the package itself and its lifecycle state.

Required fields:

* package_id
* module_id
* package_version
* package_status
* last_updated_at
* last_updated_by

Recommended package_status values:

* draft
* partially_defined
* under_review
* approved
* leaf_ready
* handed_off

### 18.2 Structural Definition

This group defines where the module sits in the system and how it connects to its environment.

#### 18.2.1 Identity

Required fields:

* module_name
* module_type
* hierarchy_path

Optional fields:

* aliases
* module_tags
* template_type

#### 18.2.2 Hierarchy

Required fields:

* parent_module_id
* child_module_ids
* hierarchy_level
* is_leaf_candidate

Optional fields:

* sibling_modules
* top_context_summary

#### 18.2.3 Interfaces

Required fields:

* input_ports
* output_ports
* interface_summary
* clock_reset_definition

Each port entry should support:

* port_name
* direction
* width
* data_type
* protocol_role
* description

Optional fields:

* grouped_interfaces
* handshake_rules
* timing_notes
* default_values

#### 18.2.4 Dependencies and Interactions

Required fields:

* upstream_dependencies
* downstream_dependencies
* interaction_summary

Optional fields:

* shared_resources
* ordering_constraints
* backpressure_relationships
* synchronization_notes
* external_assumptions

### 18.3 Functional Definition

This group defines what the module is intended to do.

#### 18.3.1 Purpose

Required fields:

* purpose_summary
* responsibility
* in_scope
* out_of_scope

Optional fields:

* design_role
* engineering_rationale

#### 18.3.2 Behavior

Required fields:

* behavior_summary
* operational_description

Optional fields:

* state_behavior
* event_response_rules
* dataflow_rules
* control_rules
* mode_behavior
* error_behavior

#### 18.3.3 Constraints

Required fields:

* timing_constraints
* latency_constraints
* throughput_constraints

Optional fields:

* area_priority
* power_priority
* buffering_constraints
* parameter_constraints
* implementation_limits

### 18.4 Execution Readiness

This group defines whether the module is ready for further decomposition or ready for downstream implementation handoff.

#### 18.4.1 Decomposition Status

Required fields:

* decomposition_status
* decomposition_rationale

Recommended decomposition_status values:

* composite
* under_decomposition
* candidate_leaf
* approved_leaf

Optional fields:

* stop_reason
* stop_recommended_by
* further_decomposition_notes

#### 18.4.2 Implementation Intent

Required fields:

* implementation_style
* implementation_summary
* generation_guidance

Optional fields:

* preferred_template
* reuse_candidates
* coding_style_notes
* expected_internal_structure
* known_non_goals

### 18.5 Traceability and Planning Support

These fields support explainability and future verification/integration quality.

Required fields:

* source_requirements
* design_decisions

Optional fields:

* open_questions
* unresolved_risks
* engineer_confirmation_points
* linked_constraints
* related_modules
* verification_intent

### 18.6 Leaf-Ready Extension

A module that reaches leaf-ready status must include additional minimum detail before downstream HDL generation handoff.

Required leaf-ready fields:

* final_interface_definition
* final_behavior_summary
* final_constraints_summary
* dependency_boundary_summary
* implementation_handoff_prompt

Optional leaf-ready fields:

* suggested_test_intent
* suggested_assertions
* template_instance_hints
* integration_notes_for_parent

### 18.7 AI-Assisted Population Rules

The platform should support collaborative filling of the Module Package.

The AI system may:

* suggest package templates based on module type
* prefill hierarchy-derived fields
* infer interface context from connected modules
* propose behavior summaries
* highlight missing required fields
* ask clarification questions before advancing package status

The engineer remains the final authority for approval.

### 18.8 Schema Design Rules

The schema should obey the following rules:

* all modules must have a Module Package
* all packages must be incrementally fillable
* required fields must remain minimal but meaningful
* leaf-ready packages must satisfy stricter completeness rules
* composite modules and leaf modules share the same base schema
* downstream HDL generation must consume only approved leaf-ready packages

## 19. Generation Payload Minimal v1

The MVP should distinguish between the full internal Module Package and the compact payload sent to downstream AI code generation.

The full Module Package remains the internal semantic artifact used by the platform during planning and refinement. However, downstream HDL generation should consume only a minimal generation-focused payload in order to reduce token usage, improve prompt clarity, and avoid passing non-essential planning data.

### 19.1 Purpose

The purpose of the Generation Payload Minimal v1 is to provide only the information required for bounded HDL generation of a specific module.

### 19.2 Required Fields

The Generation Payload Minimal v1 should contain the following fields:

* module_name
* ports
* purpose
* basic_constraints
* relevant_dependencies
* behavior_rules
* clock_reset_notes

### 19.3 Field Meaning

#### module_name

The exact name of the module to be implemented.

#### ports

A compact definition of all required input and output ports.

#### purpose

A concise statement of what the module is expected to do.

#### basic_constraints

A minimal set of implementation-relevant constraints such as timing, latency, or throughput.

#### relevant_dependencies

Only the dependencies that matter for correct module behavior or integration.

#### behavior_rules

A compact list of functional rules that the generated HDL must satisfy.

#### clock_reset_notes

Any required clocking or reset behavior relevant to implementation.

### 19.4 Design Rule

The Generation Payload Minimal v1 must be derived from the Module Package, but it must not duplicate the full package structure.

The payload should be:

* compact
* generation-focused
* stable in format
* sufficient for downstream HDL generation in the MVP

### 19.5 MVP Principle

For the MVP, downstream AI code generation should consume only the Generation Payload Minimal v1 rather than the full Module Package.

This keeps the architecture lightweight while preserving the richer internal planning model.

## 20. Review and Approval State Machine v1

This section defines the lifecycle states for module planning artifacts in the MVP.

The purpose of the state machine is to control how a module progresses from early definition through review and, when appropriate, to implementation handoff readiness. The state machine should remain lightweight in v1 and should focus on decision clarity rather than process overhead.

### 20.1 Scope

The state machine applies to Module Packages throughout the hierarchy.

All modules may pass through planning and review states. Only modules that become approved leaf modules may continue into leaf-ready and handed-off states.

### 20.2 State List

The MVP should support the following states:

* draft
* partially_defined
* under_review
* approved
* leaf_ready
* handed_off

### 20.3 State Meaning

#### draft

The Module Package has been created, but only minimal information is available.

Typical characteristics:

* module identity may exist
* hierarchy placement may exist
* interfaces may be missing or incomplete
* behavior is not yet sufficiently defined

#### partially_defined

The Module Package contains meaningful information, but key required sections are still incomplete or ambiguous.

Typical characteristics:

* module purpose is partially defined
* some ports may already exist
* hierarchy context is present
* decomposition status is not yet fully settled

#### under_review

The current module definition is considered coherent enough for explicit engineer review.

Typical characteristics:

* required MVP fields are populated at a reasonable level
* major ambiguities have been reduced
* the module can be evaluated as a design unit

#### approved

The module definition has been accepted as a valid architectural unit in the design.

Typical characteristics:

* the module purpose, ports, behavior, constraints, and dependencies are accepted
* the module may still be composite
* the module is considered stable enough inside the hierarchy

#### leaf_ready

The module is both approved and classified as an implementation-ready leaf module.

Typical characteristics:

* the module is an approved leaf
* the leaf-ready extension is complete enough for downstream HDL generation handoff
* no additional decomposition is currently required

#### handed_off

The module has already been packaged and sent to the downstream AI code engine for HDL generation.

Typical characteristics:

* the generation payload has been produced
* a handoff event has occurred
* future changes may require reopening the package

### 20.4 Allowed Transitions

The MVP should support the following forward transitions:

* draft -> partially_defined
* partially_defined -> under_review
* under_review -> approved
* approved -> leaf_ready
* leaf_ready -> handed_off

The MVP should also support controlled backward transitions when changes are introduced:

* partially_defined -> draft
* under_review -> partially_defined
* approved -> partially_defined
* leaf_ready -> partially_defined
* handed_off -> partially_defined

Backward movement should occur when significant edits invalidate prior approval or implementation readiness.

### 20.5 Transition Conditions

#### draft -> partially_defined

Occurs when the package contains enough initial information to represent a meaningful module fragment.

Minimum indicators may include:

* module identity exists
* hierarchy context exists
* at least partial interface or purpose information exists

#### partially_defined -> under_review

Occurs when the required MVP sections are sufficiently populated for engineer review.

Minimum indicators may include:

* identity is defined
* hierarchy is defined
* ports are defined at a usable level
* purpose is defined
* behavior is defined at a basic level
* constraints are present at a basic level
* dependencies/interactions are present

#### under_review -> approved

Occurs when the engineer accepts the module definition as valid for the current architecture.

#### approved -> leaf_ready

Occurs only when both of the following are true:

* the module is classified as an approved leaf
* the leaf-ready extension is complete enough for downstream generation

#### leaf_ready -> handed_off

Occurs when the system produces the Generation Payload Minimal v1 and sends it to the downstream HDL generation engine.

### 20.6 Reopen Rule

Any approved, leaf_ready, or handed_off module may be reopened if structural or functional edits materially affect its definition.

Examples include:

* port changes
* behavior changes
* constraint changes
* dependency changes
* renewed decomposition of the module

When reopened, the module should return to partially_defined unless a lighter review policy is introduced in a future version.

### 20.7 Approval Authority

The engineer is the final approval authority in the MVP.

The AI system may:

* suggest readiness for review
* suggest approval readiness
* suggest leaf readiness
* warn about missing information
* recommend reopening after major edits

The AI system must not silently advance a module into approved or leaf_ready without engineer confirmation.

### 20.8 MVP Design Principle

The review and approval state machine should stay intentionally simple in v1.

Its purpose is to:

* create clear transition points
* support human trust
* prevent premature HDL handoff
* keep module readiness explicit and inspectable

It is not intended in v1 to model complex enterprise workflow, multi-user governance, or approval delegation.

## 21. UI/State Model for Incremental Module Package Filling v1

This section defines how the user interface and package lifecycle should support gradual construction of Module Packages during planning.

The purpose of this model is to let the engineer and AI define modules progressively without forcing full package completion upfront. The UI should make partial progress visible, highlight missing required information, and allow package definition to evolve naturally as the design becomes clearer.

### 21.1 Core Principle

A Module Package should be treated as a living design object rather than a static form.

The user should be able to start with minimal information such as module name, rough role, or initial ports, and then refine the package step by step. The AI system should assist by proposing fields, filling obvious context, and identifying what information is still missing for the next readiness level.

### 21.2 UI Model

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

* ask the AI to propose missing fields
* ask the AI to summarize module purpose or behavior
* request template suggestions for common module types
* request clarification questions when the package remains ambiguous
* accept, reject, or edit AI suggestions before committing them

### 21.3 Incremental Filling States

The UI should represent package completeness at the section level, not only at the full-package level.

Each section may have a local status such as:

* empty
* partial
* complete
* needs_review

This allows the engineer to understand which parts of the Module Package are already usable and which still require attention.

### 21.4 Package Creation Events

A Module Package may begin forming from multiple entry points.

Supported MVP triggers should include:

* creating a new block in the diagram
* decomposing a parent block into children
* defining ports for a module
* assigning a module purpose in chat
* accepting an AI-proposed module definition

The system should create or update the Module Package immediately when one of these events occurs.

### 21.5 Autofill Rules

The AI system and platform logic should prefill fields whenever the information is already implied by existing design context.

Examples:

* hierarchy_path may be inferred from diagram placement
* parent_module_id may be inferred from decomposition context
* child_module_ids may be inferred from block creation
* dependencies may be inferred from connections
* ports may be inferred from explicit port editing

Autofill should reduce manual work, but filled values should remain visible and editable.

### 21.6 Missing Information Guidance

The UI should help the engineer understand what is missing for the next readiness transition.

Examples:

* to move from draft to partially_defined, the system may request module purpose or initial ports
* to move from partially_defined to under_review, the system may request missing behavior or dependency information
* to move from approved to leaf_ready, the system may request leaf-specific completion items

The system should present this as guidance rather than as a rigid form-validation experience.

### 21.7 Suggestion Handling Model

AI-generated suggestions should not overwrite package content silently.

The MVP should support a simple suggestion workflow:

* AI proposes content
* the proposal is shown inline or in a suggestion area
* the engineer may accept, edit, or reject the proposal
* accepted content updates the Module Package

This preserves transparency and engineer trust.

### 21.8 Section Ordering Strategy

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

### 21.9 Leaf-Ready Preparation Flow

When a module becomes an approved leaf candidate, the UI should shift into leaf-readiness preparation mode.

In this mode, the interface should:

* highlight the remaining leaf-ready fields
* show the future generation payload preview
* allow the engineer to review the final compact handoff content
* make the handoff decision explicit

### 21.10 MVP Design Principle

The UI/state model should remain lightweight in v1.

The goal is not to create a heavy enterprise requirements tool. The goal is to make semantic module definition easy, progressive, and visible while preserving a natural co-design experience.


