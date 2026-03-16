# MVP v1 Minimal Implementation Plan

This plan translates the architecture docs into a minimal first implementation focused on:

1. frontend app shell
2. local data model
3. module package types
4. main co-design workspace layout

The objective is to ship a small but coherent vertical slice quickly, without backend complexity.

## 1. Recommended Tech Stack (MVP-minimal)

- **Runtime/build:** Vite + React + TypeScript
- **Styling:** Plain CSS (or CSS Modules) with a small design token file
- **State management:** React state + Context + `useReducer` for deterministic local updates
- **Diagram (initial):** lightweight custom SVG/canvas rendering (no graph framework yet)
- **Validation/types:** TypeScript-first interfaces in `app/src/types`
- **Persistence:** browser `localStorage` only (single-project snapshot)
- **Testing:** Vitest + React Testing Library for smoke tests of core state transitions

### Why this stack

- Keeps the MVP in a single frontend app, aligned with the docs' local-first and semantic-core-first direction.
- Reduces setup and dependency overhead while preserving type safety and deterministic updates.
- Leaves room to swap in richer tools later without rewriting domain types.

## 2. Folder Structure inside `app/`

```text
app/
  public/
  src/
    app/
      App.tsx
      routes.tsx
    components/
      layout/
        AppShell.tsx
        LeftPanel.tsx
        CenterCanvas.tsx
        RightPanel.tsx
      workspace/
        ModuleTree.tsx
        ModulePackagePanel.tsx
        AiCollabPanel.tsx
    features/
      design-store/
        designStore.ts
        designReducer.ts
        actions.ts
        selectors.ts
        seedDesign.ts
      module-package/
        packageCompletion.ts
        packageStatus.ts
    types/
      design.ts
      module.ts
      connection.ts
      modulePackage.ts
      uiState.ts
    utils/
      ids.ts
      storage.ts
    styles/
      tokens.css
      app.css
    main.tsx
```

### Scope guardrails

- Keep all domain types and reducer actions explicit.
- No backend client, no auth, no multi-user/session logic in v1.
- No plugin system in code yet; only keep extension points in type shape.

## 3. Local Data Model (minimal schema)

Use a single `DesignDocument` in local state and `localStorage`:

- `design`: id, name, description, rootModuleId, timestamps
- `modules`: normalized map keyed by `moduleId`
- `connections`: normalized map keyed by `connectionId`
- `modulePackages`: normalized map keyed by `moduleId`
- `ui`: selectedModuleId, activePanelTab, draftSuggestionState

### Minimal module fields

- `id`, `name`, `parentId`, `childIds[]`
- `portIds[]`
- `kind`: `composite | leaf | undecided`
- `status`: `draft | refining | approved | leaf_ready`

### Minimal package section status

Per section status enum: `empty | partial | complete | needs_review`.

This directly supports incremental filling and readiness guidance in the UI.

## 4. Module Package Types (MVP subset)

Define a strict type for v1 that mirrors doc section ordering:

- `identity`
- `hierarchy`
- `interfaces`
- `purpose`
- `behavior`
- `constraints`
- `dependencies`
- `decompositionStatus`

Also include package metadata:

- `packageId`, `moduleId`, `packageVersion`
- `packageStatus`: `draft | partially_defined | under_review | approved | leaf_ready`
- `lastUpdatedAt`, `lastUpdatedBy`

Keep every section optional-but-typed to support incremental completion.

## 5. Main Co-Design Workspace Layout (MVP shell)

Implement one page with 3 fixed columns:

- **Left:** AI Collaboration Panel (placeholder chat log + suggestion actions)
- **Center:** Diagram Workspace (module boxes + parent/child tree + selection)
- **Right:** Module Package Panel (section cards for selected module)

### Required interactions

- Select module in center -> right panel loads its package.
- Add child module in center -> creates module + draft package.
- Edit a field in right panel -> updates package and section status.
- “Apply suggestion” in left panel -> updates selected package fields.

## 6. First Vertical Slice to Implement

**User story:**

> As an engineer, I can create a module decomposition skeleton and fill key package sections for one selected module in a single workspace.

### Vertical slice scope

1. Load seed design from local data or default template.
2. Render 3-panel app shell.
3. Show module hierarchy in center with selectable nodes.
4. Show package sections on right for selected module.
5. Allow editing `identity.name`, `purpose.summary`, and one interface row.
6. Show per-section completion status badges (`empty/partial/complete`).
7. Persist state to `localStorage`.

### Acceptance criteria

- App boots to workspace with at least one root module.
- Selecting modules always keeps center/right/left synchronized.
- Editing package fields updates status deterministically.
- Reloading page restores prior local snapshot.

## 7. Minimal Implementation Sequence

1. **Scaffold app shell** (layout only, static placeholders).
2. **Add types** for design/module/package/ui state.
3. **Implement reducer store** with seed design + selection action.
4. **Bind right panel form fields** to package state.
5. **Add add-child action** in center panel.
6. **Persist/rehydrate** from `localStorage`.
7. **Add smoke tests** for reducer transitions.

This keeps momentum high while proving the semantic-core synchronization loop in a minimal, reviewable form.
