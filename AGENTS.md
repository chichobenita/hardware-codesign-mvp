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

## Task completion summary rule

After completing any non-trivial task, always be ready to provide a post-task architecture summary when asked.

The summary must:
- be based on the actual repository state
- reference exact files and folders
- clearly separate what changed, what improved, and what still remains risky
- identify architectural impact, state/domain impact, and testing impact
- end with recommended next engineering tasks in priority order

When summarizing, keep the output concise, professional, and implementation-focused.
Do not guess when repository evidence is missing.

## Definition of done addendum

A non-trivial task is not fully complete until:
- the implementation works
- relevant tests pass
- documentation is updated if needed
- a clear post-task summary can be produced on request
