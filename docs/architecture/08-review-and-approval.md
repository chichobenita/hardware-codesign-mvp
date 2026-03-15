# Review and Approval

This document defines the MVP state machine for module review, approval, and implementation handoff readiness.

## 1. Review and Approval State Machine v1

This section defines the lifecycle states for module planning artifacts in the MVP.

The purpose of the state machine is to control how a module progresses from early definition through review and, when appropriate, to implementation handoff readiness. The state machine should remain lightweight in v1 and should focus on decision clarity rather than process overhead.

### 1.1 Scope

The state machine applies to Module Packages throughout the hierarchy.

All modules may pass through planning and review states. Only modules that become approved leaf modules may continue into leaf-ready and handed-off states.

### 1.2 State List

The MVP should support the following states:

* draft
* partially_defined
* under_review
* approved
* leaf_ready
* handed_off

### 1.3 State Meaning

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

### 1.4 Allowed Transitions

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

### 1.5 Transition Conditions

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

### 1.6 Reopen Rule

Any approved, leaf_ready, or handed_off module may be reopened if structural or functional edits materially affect its definition.

Examples include:

* port changes
* behavior changes
* constraint changes
* dependency changes
* renewed decomposition of the module

When reopened, the module should return to partially_defined unless a lighter review policy is introduced in a future version.

### 1.7 Approval Authority

The engineer is the final approval authority in the MVP.

The AI system may:

* suggest readiness for review
* suggest approval readiness
* suggest leaf readiness
* warn about missing information
* recommend reopening after major edits

The AI system must not silently advance a module into approved or leaf_ready without engineer confirmation.

### 1.8 MVP Design Principle

The review and approval state machine should stay intentionally simple in v1.

Its purpose is to:

* create clear transition points
* support human trust
* prevent premature HDL handoff
* keep module readiness explicit and inspectable

It is not intended in v1 to model complex enterprise workflow, multi-user governance, or approval delegation.
