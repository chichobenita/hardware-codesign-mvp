# App (Frontend MVP)

Minimal frontend for MVP v1 co-design workspace.

## Run locally

```bash
cd app
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

## Build

```bash
cd app
npm run build
```

## Main workspace note

The right panel now uses an 8-section Module Package editor (Identity, Hierarchy, Interfaces, Purpose, Behavior, Constraints, Dependencies and Interactions, Decomposition Status) with local completeness states per section (`empty`, `partial`, `complete`, `needs_review`).


## Package lifecycle checks

The right panel includes a lightweight lifecycle card with local readiness checks for:

- `draft -> partially_defined`
- `partially_defined -> under_review`
- `under_review -> approved`
- `approved -> leaf_ready`

`approved` and `leaf_ready` still require explicit user clicks; no auto-approval is performed.
