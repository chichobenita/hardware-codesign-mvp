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

## React hook usage rule

Avoid `useState`, `useEffect`, and `useMemo` in application logic and feature implementation.

Project policy:
- Do not introduce new `useState`, `useEffect`, or `useMemo` usage in app code unless explicitly requested.
- Prefer centralized reducer/store-driven state updates.
- Prefer pure helper functions and selectors over memoization hooks.
- Prefer explicit event-driven updates over effect-driven synchronization.
- Keep derived values in selectors or pure computation helpers, not in `useMemo`.
- Keep persistence, normalization, and domain synchronization outside React effect logic whenever practical.

If existing code still uses `useState`, `useEffect`, or `useMemo`, refactor it away gradually without changing visible behavior.

When a task touches files that still use these hooks:
- first try to remove them
- preserve current behavior
- do not replace them with another hidden source of complexity
- explain any place where removing them is not practical within the task scope

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
