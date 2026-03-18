# Leaf Modules and Handoff

This document defines leaf-module criteria, decomposition stopping logic, and the compact handoff payload used for downstream generation.

## 1. Leaf Module Definition v1

A leaf module is the unit that marks the transition point between top-down planning and bottom-up implementation preparation.

The system should not define a leaf module purely as the smallest possible block. A leaf module should instead be the smallest meaningful implementation unit that has a clear responsibility, a bounded interface, and sufficient semantic independence to be implemented and reviewed on its own.

### 1.1 Core Definition

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

### 1.2 Decomposition Stopping Logic

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

### 1.3 Anti-Patterns for Further Decomposition

The system should actively avoid over-decomposition. A module should generally not be decomposed further when additional splitting would create:

* blocks with no clear standalone purpose
* fragments that only mirror lines of code rather than engineering intent
* overly fine-grained glue-only units without stable abstraction value
* blocks whose boundaries are difficult to explain semantically
* decomposition that harms readability or future integration

### 1.4 Guiding Principle

The preferred decomposition rule for the MVP is:

**Decompose until each resulting unit is the smallest meaningful engineering block, not the smallest syntactic code fragment.**

### 1.5 Examples of Likely Leaf Modules in v1

Examples may include:

* FIFO wrapper
* register bank
* arbitration block
* protocol adapter
* simple FSM controller
* parameterized datapath stage
* interrupt aggregation block
* buffering/control helper block

### 1.6 Role in Workflow

Leaf module identification is the gateway between the two main workflow phases:

* top-down planning continues until leaf candidacy is reached
* bottom-up implementation preparation starts from approved leaf modules

This definition should be used by the platform when deciding whether to continue decomposition, request clarification, or prepare a module package for downstream implementation.

## 2. Generation Payload Minimal v1

The MVP should distinguish between the full internal Module Package and the compact payload sent to downstream AI code generation.

The full Module Package remains the internal semantic artifact used by the platform during planning and refinement. However, downstream HDL generation should consume only a minimal generation-focused payload in order to reduce token usage, improve prompt clarity, and avoid passing non-essential planning data.

### 2.1 Purpose

The purpose of the Generation Payload Minimal v1 is to provide only the information required for bounded HDL generation of a specific module.

### 2.2 Required Fields

The Generation Payload Minimal v1 should contain the following fields:

* module_name
* ports
* purpose
* basic_constraints
* relevant_dependencies
* behavior_rules
* clock_reset_notes

### 2.3 Field Meaning

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

### 2.4 Design Rule

The Generation Payload Minimal v1 must be derived from the Module Package, but it must not duplicate the full package structure.

The payload should be:

* compact
* generation-focused
* stable in format
* sufficient for downstream HDL generation in the MVP

### 2.5 MVP Principle

For the MVP, downstream AI code generation should consume only the Generation Payload Minimal v1 rather than the full Module Package.

This keeps the architecture lightweight while preserving the richer internal planning model.

## 3. Prompt Builder / Package-to-Prompt Compiler v1

The MVP may derive one deterministic HDL-generation prompt from the normalized Module Package and Generation Payload Minimal v1.

Prompt builder v1 rules:

* keep the prompt formatter pure and deterministic
* preserve the Generation Payload Minimal v1 as the compact machine-facing source
* add only lightweight hierarchy context such as parent module, hierarchy path, and leaf/composite role when that data is already stable
* present the prompt in a stable sectioned format for review and downstream handoff
* avoid provider-specific transport, orchestration, or network integration in v1

## 4. Handoff Artifact Boundary v1

The MVP should create one explicit handoff artifact whenever an engineer performs a leaf-module handoff.

### 4.1 Purpose

The handoff artifact is the first stable boundary between:

* the internal planning/review state
* the compact generation payload
* the deterministic prompt snapshot
* a future downstream provider adapter

### 4.2 Minimal artifact contents

The artifact should stay lightweight and frontend-local in v1, while capturing:

* module id
* module name
* artifact timestamp
* schema/version marker
* target provider id
* handoff status
* consistency marker derived from handoff semantics
* generation payload snapshot
* prompt snapshot

### 4.2.1 Minimal lifecycle states

The MVP handoff artifact lifecycle should stay intentionally small:

* `prepared` — a local artifact has been assembled but has not yet been treated as the current handoff record
* `handed_off` — the artifact matches current module handoff semantics and is the current local handoff record
* `stale` — the module changed after artifact creation such that the artifact no longer matches the current handoff semantics

### 4.2.2 Consistency marker

Each artifact should include one deterministic local consistency marker derived from the same normalized handoff inputs used to build the payload and prompt.

For MVP purposes, this marker may be based on the compact generation payload plus deterministic prompt snapshot. It should remain:

* local-only
* deterministic
* inexpensive to recompute
* sufficient to tell whether a prior artifact still matches the current module handoff view

### 4.3 MVP provider seam

The MVP may route the artifact through a local mock provider adapter, but it should not call a real external provider yet.

Provider integration is intentionally deferred. The purpose of the seam is only to ensure that future provider-specific transport can be added without moving prompt/payload shaping into UI code.

The reducer should still treat provider selection as validated local UI state: unknown provider ids should normalize back to the default mock provider rather than being persisted as arbitrary strings.

### 4.4 Local history

The frontend should keep a lightweight local history of created handoff artifacts so the engineer can:

* inspect the latest artifact
* review prior handoff events for a module
* export a concrete handoff record when needed

When the current module handoff inputs no longer match an older artifact's consistency marker, that artifact should be shown as stale rather than silently treated as current.

Reducer-level handoff actions should only succeed for modules that satisfy the same approved-leaf, leaf-ready, and semantic validation gate used by the review/handoff UI.
