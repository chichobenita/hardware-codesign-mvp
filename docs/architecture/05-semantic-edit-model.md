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
