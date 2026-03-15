# MVP Roadmap and Open Decisions

This document gathers remaining MVP planning items that are not specific to one architecture subsystem.

## 1. Module Packaging and HDL Generation Scope for v1

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

## 2. Verification Scope for v1

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

## 3. Initial Domain Pack for MVP

The first domain pack should focus on structured digital subsystem design.

### Recommended Initial Support

* valid/ready streaming interfaces
* simple memory-mapped control interfaces
* FIFO-based buffering
* arbitration and control blocks
* controller + datapath compositions
* parameterized block templates

This domain pack is narrow enough for a meaningful MVP while broad enough to demonstrate real product value.

## 4. Extension Strategy

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

## 5. Non-Functional Requirements

The MVP should aim for the following qualities:

* deterministic semantic updates
* stable synchronization between views
* explainable architecture decisions
* reviewable generated artifacts
* modular backend integration
* traceable design changes

Performance and scale requirements should remain moderate in v1, favoring correctness of the co-design loop over raw throughput.

## 6. Key Risks and Recommended Next Design Decisions

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

## 7. MVP Success Criteria

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
