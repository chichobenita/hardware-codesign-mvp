# AGENTS.md

## Product goal
Build an MVP for an interactive hardware co-design platform.
The MVP focuses on:
- top-down module decomposition
- module package editing
- visual hierarchy planning
- generation payload creation for downstream HDL AI generation

## Working rules
- Do not over-engineer.
- Prefer minimal working vertical slices.
- Keep the UI simple and focused.
- Preserve alignment with docs in `docs/`.
- Ask for clarification only when a blocking ambiguity exists.
- Do not introduce backend complexity unless requested.

## Repository structure
- `docs/` contains product and architecture docs
- `app/` contains the frontend MVP
- `shared/` contains shared types and models
- `examples/` contains example payloads and package structures

## Implementation priorities
1. main co-design workspace
2. local data model
3. module package editing
4. review state flow
5. generation payload creation

## Conventions
- Use TypeScript
- Keep components modular
- Prefer explicit types
- Keep state model understandable
- Keep UI copy concise

## Definition of done
A task is done only if:
- code builds
- changed behavior is reflected in docs when needed
- no unnecessary abstractions were added
