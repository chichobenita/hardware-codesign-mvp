# Core Data Model

This document captures the MVP semantic entities that form the internal design representation.

## 1. Core Data Model

The MVP should define a stable internal schema for the following entities.

### 1.1 Design

Represents one hardware system or subsystem under construction.

### 1.2 Block

Represents a logical hardware component. A block may be composite or leaf-level.

### 1.3 Port

Represents a typed ingress or egress endpoint of a block.

### 1.4 Interface

Represents a grouped interaction contract, including signal semantics and protocol rules.

### 1.5 Connection

Represents a semantic relationship between source and destination ports or interfaces.

### 1.6 Constraint

Represents throughput, latency, clock target, buffering, parameter, or policy requirements.

### 1.7 Decision Record

Represents why a design choice was made and what requirement it satisfies.

### 1.8 Artifact

Represents generated outputs such as HDL files, assertions, block-level specs, or diagram snapshots.

## 2. Related Internal Semantic Entities

The following internal semantic components are also part of the MVP model kernel and support persistence, consistency, and controlled updates:

* System IR / Semantic Model
* Graph Engine
* Interface Contract Engine
* Constraint Engine
* Traceability Engine
* Semantic Edit Engine
