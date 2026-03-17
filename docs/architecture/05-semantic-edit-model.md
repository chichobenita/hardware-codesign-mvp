# Semantic Edit Model

This document defines how chat and diagram interactions map to controlled semantic updates.

## 1. Semantic Edit Model

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

## 9. Semantic Validation Layer (MVP v1)

A lightweight semantic validation pass runs on the current in-memory design state.

Validation is deterministic and local (no backend or AI dependency), and produces explicit issues with:
- `code`
- `message`
- `severity` (`error | warning`)
- `moduleId` when applicable

MVP v1 checks include duplicate ports, invalid connections, leaf completeness checks, and simple dependency/connection consistency checks.

UI surfaces these issues in the Module Package panel so engineers can correct design semantics before review and handoff.

