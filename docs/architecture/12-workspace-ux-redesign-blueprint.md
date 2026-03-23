# Workspace UX Redesign Blueprint

This document defines the target UX architecture for the next workspace redesign phase.

It is intentionally a product and interaction blueprint, not an implementation spec. It should guide staged frontend changes without forcing an immediate runtime rewrite or diagram-engine replacement.

## 1. Purpose and scope

The current MVP workspace proves the semantic-core synchronization loop, but its screen allocation no longer matches the intended product direction. Today, the app keeps AI collaboration on the left, the diagram in the center, and a dense package/review/handoff surface on the right. That is useful for MVP validation, but it over-anchors deep-work utilities in the primary canvas and weakens the hardware-design mental model.

The redesign direction for the next roadmap phase is:

* a top ribbon / command bar for global actions and creation flows
* a left sidebar dedicated to chat and AI collaboration
* a center-first diagram workspace that remains the dominant surface
* secondary screens for deep-work tasks such as package editing, review, handoff, validation, and project JSON
* a stronger hierarchy model centered on parent, child, and sibling semantics
* a more readable connection model with explicit edge visibility and grouped-edge behavior

This blueprint must remain aligned with the current product architecture:

* the semantic model remains the source of truth
* the reducer/store-driven synchronization model remains intact initially
* the current lightweight diagram engine remains in place for early migration stages
* review, handoff, validation, and export remain supported, but should move out of the always-visible primary canvas

## 2. Current-state baseline from the codebase

The current application shell renders three fixed workspace regions in one screen: a left AI suggestions panel, a center diagram workspace, and a right module package panel. The center workspace already supports hierarchy scope, breadcrumbs, enter-composite behavior, and parent navigation. The right panel currently mixes package editing, review previews, handoff execution, validation, decomposition actions, and project transfer controls into one persistent surface. Workspace mode is currently coarse-grained (`design | review | handoff`) and is primarily consumed by the right-side package flow. The visible diagram scope is already reducer-owned through `currentHierarchyModuleId`, and visible nodes/connections are derived from selectors rather than local component state. These current behaviors should be treated as the migration starting point, not discarded assumptions. 

## 3. Source-of-truth rules for the redesign

The redesign should follow these rules throughout implementation:

1. **Semantic-source rule**: hierarchy, block identity, ports, connections, package data, validation, and handoff artifacts continue to derive from the shared semantic state.
2. **Diagram-scope rule**: the center workspace always represents one explicit hierarchy scope at a time.
3. **Main-vs-secondary rule**: the primary workspace is for architecture navigation and structural editing; deep-work utilities open as contextual secondary workspaces rather than occupying permanent main-screen columns.
4. **Hierarchy-first rule**: visual and interaction decisions should reinforce hardware hierarchy semantics before they optimize for generic diagram freedom.
5. **Staged-migration rule**: the redesign should first reorganize shell and flows, then improve visual grammar, then improve edge density behavior, while preserving current reducer-owned data flow.

## 4. Target app shell

## 4.1 Primary shell regions

The target shell should have four coordinated regions.

### A. Top ribbon / command surface

The top ribbon is the global command layer for the project.

It should:

* expose project-level actions, creation commands, navigation entry points, and view controls
* make major workspace modes discoverable without permanently allocating screen width to them
* become the eventual home for shortcut discoverability and command search
* remain stable while the center workspace changes scope

The ribbon is not a dense settings form. It is a command surface.

### B. Left AI collaboration sidebar

The left sidebar is dedicated to AI collaboration and design conversation.

It should:

* remain visible during most architecture work
* stay context-aware to the current diagram scope and current selection
* allow design questions, proposals, decomposition suggestions, and command-like AI actions
* show proposal review/accept/reject flows without becoming the main editing surface for package details

### C. Center diagram workspace

The center workspace is the product core.

It should:

* dominate the screen visually
* show the current hierarchy scope as a hardware block workspace
* support block creation, selection, connection, and hierarchy navigation
* preserve focus on architecture planning before review/handoff utilities

### D. Contextual secondary workspace

Secondary deep-work experiences should open from the ribbon or directly from a context-specific action.

These include:

* module package editing
* review / approval
* handoff / export
* semantic validation details
* project JSON / import-export inspection

A secondary workspace may appear as a docked inspector, wide drawer, modal workspace, or dedicated route, but it should behave as a focused task surface rather than as a permanent third column in the main shell.

## 4.2 Shell behavior principles

* The top ribbon and left AI sidebar are persistent shell elements.
* The center diagram remains the default focus target after navigation and command completion.
* Secondary workspaces are contextual and dismissible.
* Entering a secondary workspace should not destroy the user’s current hierarchy scope or selection unless the task explicitly changes it.
* The shell should feel like one professional design environment, not a stack of unrelated forms.

## 5. Workspace mode model

## 5.1 Main workspace responsibilities

The main workspace should keep only the tasks that are fundamental to architecture planning and structural editing:

* browsing the current hierarchy scope
* selecting modules and understanding parent/child/sibling relationships
* creating blocks/modules
* entering composite scopes and exiting back to parent scopes
* creating/editing connections at the diagram level
* viewing lightweight module summary context
* invoking commands for deeper work

The main workspace should not remain responsible for long-form package editing, review checklists, handoff artifact inspection, validation triage, or raw JSON browsing as permanently visible regions.

## 5.2 Secondary deep-work screens

The following should move into secondary deep-work screens opened from the ribbon and relevant contextual actions:

* **Package Editor** — detailed module package authoring and structured field editing
* **Review Workspace** — readiness review, approval, derived payload preview, and prompt preview
* **Handoff Workspace** — provider selection, artifact history, artifact export, and handoff execution
* **Validation Workspace** — semantic issue list, issue grouping, and issue-to-module navigation
* **Project Data Workspace** — import/export, JSON inspection, and snapshot diagnostics

## 5.3 Mode entry and exit

Recommended rules:

* Ribbon commands open the corresponding secondary workspace.
* Contextual buttons may open the same workspace already focused on the selected module.
* Closing a secondary workspace returns the user to the main diagram workspace with the prior hierarchy scope and selection preserved.
* If a secondary workspace changes the selected module, the diagram should reflect that selection when the user returns.
* Review and handoff should remain gated by readiness/validation rules already present in the product, but those rules should move with the focused workspace rather than remain embedded in the main canvas layout.

## 5.4 Recommended workspace mode terminology

The redesign should separate **shell location** from **task mode**.

Recommended conceptual model:

* **Primary mode**: `diagram_workspace`
* **Secondary workspaces**: `package_editor`, `review`, `handoff`, `validation`, `project_data`

This is deliberately more explicit than the current coarse `design | review | handoff` mode model and better matches the intended ribbon-driven navigation.

## 6. Navigation model

## 6.1 Hardware hierarchy semantics

The navigation model should make the following relationships explicit at all times:

* **Root module**: the topmost design scope for the project
* **Parent module**: the composite that owns the current visible scope
* **Child module**: a module directly contained by the current parent scope
* **Sibling modules**: modules that share the same parent scope

The user should never have to infer these relationships from placement alone.

## 6.2 Scope model

The center workspace should always represent one current scope:

* the current parent/composite module defines the visible child workspace
* direct children of that scope are the primary visible blocks
* the current scope header should clearly label which module the user is inside
* root scope is the special case where the user is viewing the top-level module’s direct children

## 6.3 Breadcrumbs

Breadcrumbs should become a first-class navigation aid.

They should:

* show the full root-to-current scope path
* allow deterministic jump-back to any ancestor scope
* reflect hardware hierarchy, not navigation history noise
* visually distinguish the current scope node from ancestor nodes

## 6.4 Entry and exit behaviors

Recommended scope transitions:

* **Enter composite**: available from double-click, explicit “Enter” affordance, context menu, and ribbon command when a composite block is selected
* **Back to parent**: available from breadcrumb click, dedicated back/up affordance, and keyboard shortcut later
* **Jump to root**: available from breadcrumb root item or ribbon navigation group

## 6.5 Selection and focus behavior

Selection and focus should be treated separately.

* **Selection** identifies the active block/module for commands and side-context.
* **Focus** identifies the active task surface, such as the diagram, chat input, or a secondary workspace.

Rules:

* A single primary module selection is the default interaction model.
* Changing scope should preserve selection when the selected module remains visible; otherwise selection should fall back predictably to the scope module or first visible child.
* Opening a secondary workspace should carry the active selection with it.
* Validation or review flows may temporarily focus a different module, but that focus change should still update the shared selected-module state.

## 7. Diagram interaction model

## 7.1 Core interaction set

The diagram workspace should support the following primary interactions:

* select block
* multi-step create block flow
* initiate connection flow
* enter composite scope
* move back to parent scope
* pan and zoom
* inspect lightweight hierarchy and connection context

## 7.2 Selection behavior

Recommended baseline behavior:

* single click selects a block
* repeated click or Enter action opens lightweight quick actions
* keyboard selection traversal can be added later
* marquee multi-select is optional and should not be a phase-one requirement unless it materially simplifies bundling or bulk operations

## 7.3 Enter composite

A composite block should have explicit enter affordances:

* double-click on block body
* Enter button/icon on block card
* ribbon command when selected

Entering a composite changes the current scope rather than opening a detached screen.

## 7.4 Return to parent

Returning to parent scope should be fast and predictable:

* visible Up action near the scope header
* breadcrumb ancestor click
* future keyboard shortcut

This interaction should feel as fundamental as directory navigation in an IDE.

## 7.5 Zoom and pan expectations

The redesigned workspace should adopt professional diagram-tool expectations:

* mouse/trackpad pan for large diagrams
* smooth zoom centered on viewport intent
* fit-to-scope action in the ribbon
* stable readability at common zoom levels
* optional mini-map only if density later proves it necessary

Zoom and pan are viewport behaviors, not substitutes for hierarchy navigation.

## 7.6 Surfacing hierarchy awareness

Hierarchy awareness should be visible through multiple redundant cues:

* scope title and breadcrumb path
* composite/leaf visual differences
* child-count or decomposition indicators on composite blocks
* explicit parent-boundary indicators for cross-scope connectivity
* lightweight relationship language in status text, e.g. “3 child modules in `mem_subsystem`”

## 8. Block visual-system model

## 8.1 Block types

The visual system should distinguish at minimum between:

* **Composite / parent-capable blocks**: modules with children or intended decomposition
* **Leaf blocks**: modules treated as bounded implementation units
* **Undecided blocks**: modules still under decomposition or without a settled role

## 8.2 Visual differentiation

Recommended distinctions:

* composite blocks use a stronger frame, nested-layer cue, or contained-scope affordance
* leaf blocks use a simpler terminal visual treatment
* undecided blocks use a neutral state with explicit decomposition-needed cue

The user should be able to read “can enter”, “final leaf”, and “still unresolved” quickly without opening the package editor.

## 8.3 Sibling readability

Sibling modules should read as peers under the same parent.

Guidance:

* prefer stable alignment and spacing for direct children of the current scope
* avoid arbitrary freeform placement in early phases if it obscures sibling relationships
* use layout rules that reinforce shared parentage first, then edge readability second

## 8.4 Metadata density guidance

The default diagram view should remain low-to-medium density.

Show by default:

* module name
* role badge or kind cue
* minimal port hints when useful
* child count or composite indicator
* validation/review status only as small badges when necessary

Avoid default overloading with full package text, long constraint summaries, or large dependency prose.

Detailed metadata belongs in hover, selection summary, or secondary workspaces.

## 8.5 Recommended block affordances

Composite blocks should support:

* enter-scope affordance
* add-child affordance
* connection affordances on visible ports/edges
* quick status badge for decomposition state

Leaf blocks should support:

* package/edit affordance
* review readiness affordance
* handoff/readiness indicator when applicable

All blocks should support:

* selection
* rename/edit entry point
* context menu or quick actions entry point

## 9. Connection and edge model

## 9.1 Principles

Connections should communicate hardware intent, not merely graph adjacency.

The edge model should therefore become:

* more intentionally visible when density is manageable
* grouped when density makes individual lines unreadable
* aware of ports and boundary crossings
* explicit about whether two blocks are siblings or whether a boundary crossing is involved

## 9.2 Connection visibility rules

Recommended defaults:

* show all individual edges when the current scope remains readable
* suppress only when edge overlap materially harms comprehension
* prefer routing and ordering improvements before hiding information
* never silently hide semantically important connectivity without an alternate grouped representation

## 9.3 Individual edges vs grouped edges

Use **individual edges** when:

* the number of connections between visible modules is low to moderate
* ports can be read without clutter
* each signal matters individually for design understanding

Use **grouped/bundled edges** when:

* many edges share the same source/target relationship
* multiple signals travel between the same sibling modules
* cross-boundary fan-in/fan-out would otherwise overwhelm the current scope

Grouped edges are a readability device, not a loss of semantics. The underlying individual connections remain the data truth.

## 9.4 Expand/collapse behavior

Grouped connections should support explicit disclosure.

Recommended behavior:

* default collapsed state when density threshold is exceeded
* visible count badge, e.g. “8 signals”
* click or command expands the bundle into individual edges in-place when readable
* collapse returns to the compact representation
* expanded state is view-local and should not mutate semantic connection data

## 9.5 Port-aware representation

The connection model should increasingly become port-aware:

* edges should attach to explicit port regions when port data is available
* bundled edges should summarize port groups or interface groups when possible
* connection labels should prefer signal/interface names over generic edge IDs
* future interface grouping can build on the same representation without changing semantic ownership

## 9.6 Sibling vs cross-boundary semantics

The diagram should distinguish:

* **Sibling connections**: connections between children of the same current parent scope
* **Boundary-crossing connections**: connections that enter or leave the current scope or connect across hierarchy levels

Recommended UX treatment:

* sibling connections are first-class in the current canvas
* cross-boundary connections should show boundary indicators, stubs, or summarized ingress/egress markers
* cross-boundary details can open in a focused inspector or expanded edge view rather than cluttering the main sibling workspace

## 9.7 Initial migration guidance for edges

Because the current engine already derives visible connections from reducer selectors, the first redesign phase should improve connection grammar before attempting advanced routing or a new rendering engine.

## 10. Command model

## 10.1 Ribbon group recommendations

Recommended top-ribbon groups:

### A. Project

* new / open / import / export
* project JSON
* snapshot actions

### B. Navigate

* go to root
* back/up one scope
* breadcrumb/command search entry
* fit to scope

### C. Create

* add module/block
* add child module
* duplicate block later if needed
* start connection flow

### D. Structure

* enter composite
* decompose selected module
* mark decomposition status
* manage ports/interfaces entry

### E. Review

* open package editor
* open review workspace
* open validation workspace
* open handoff workspace

### F. View

* zoom in/out
* toggle edge density mode
* toggle grouped connections
* future layout controls

### G. AI

* ask AI for decomposition
* ask AI for ports/interfaces
* ask AI for review summary
* open command/help palette later

## 10.2 Keyboard shortcut categories

Shortcuts should be introduced after ribbon commands exist and are learnable.

Recommended categories:

* **Navigation**: back/up, go to root, enter composite, focus breadcrumb
* **Creation**: add block, add child, connect blocks
* **View**: zoom in/out, fit to scope, toggle edge grouping
* **Edit**: rename selected, delete selected, open package editor
* **Review/Handoff**: open review workspace, open validation, open handoff
* **AI**: focus chat input, request AI action for selection

## 10.3 UX-level creation flows

### Create block flow

1. Invoke Create > Add module/block from ribbon.
2. Place or confirm creation in current scope.
3. Name the block and choose initial role/kind.
4. Auto-select the new block.
5. Offer quick follow-up commands: add sibling, add child, connect, open package editor.

### Connect flow

1. Invoke Create > Connect or use a port affordance.
2. Choose source block/port and target block/port within current scope.
3. Enter signal/interface label.
4. Commit and show the resulting edge immediately in the diagram.

### Edit flow

1. Select block.
2. Use quick actions or ribbon command.
3. Open the relevant focused workspace if the task is detailed.
4. Preserve selection and scope on return.

## 11. Secondary workspace blueprints

## 11.1 Package Editor

The package editor should become a focused structured editing workspace for the selected module, rather than a permanently visible right rail.

It should emphasize:

* section-based editing
* missing-information guidance
* lightweight structural context (module name, hierarchy path, kind)

## 11.2 Review Workspace

The review workspace should present:

* module summary
* readiness state
* validation blockers/warnings
* derived payload preview
* derived prompt preview
* approve / send-back actions

## 11.3 Handoff Workspace

The handoff workspace should present:

* eligible leaf-ready modules
* provider selection
* artifact preview/history
* handoff execution state
* export actions

## 11.4 Validation Workspace

The validation workspace should centralize:

* issue list
* severity grouping
* module jump-to navigation
* issue explanation and fix context

## 11.5 Project Data Workspace

The project data workspace should contain:

* import/export controls
* raw snapshot / JSON inspection
* versioning or migration diagnostics when relevant

## 12. Transition and staged implementation strategy

## 12.1 Stage 0 — Documentation and alignment

Deliver this blueprint and align all upcoming implementation tasks to it.

Keep untouched:

* semantic model
* reducer/store architecture
* current diagram engine
* current review/handoff logic

## 12.2 Stage 1 — App shell reallocation

Goal: introduce the new shell without rewriting feature logic.

Scope:

* add top ribbon / command surface
* keep left AI sidebar
* make the center diagram dominant
* move the current right-side package surface behind a focused secondary workspace entry

Keep untouched initially:

* reducer actions
* selectors for hierarchy scope and visible connections
* existing validation and handoff semantics

## 12.3 Stage 2 — Workspace mode restructuring

Goal: replace the coarse always-visible package/review/handoff layout with explicit secondary workspaces.

Scope:

* formalize secondary workspace entry/exit behavior
* separate package editor, review, handoff, validation, and project-data surfaces
* preserve current selection/scope synchronization across them

## 12.4 Stage 3 — Hierarchy-forward diagram interaction polish

Goal: make the center workspace read like a professional hardware hierarchy tool.

Scope:

* strengthen scope headers and breadcrumbs
* improve composite vs leaf affordances
* refine quick actions for enter/add/connect
* improve viewport controls and fit-to-scope behavior

## 12.5 Stage 4 — Edge readability improvements

Goal: make connectivity more intentional without changing the semantic engine.

Scope:

* improve edge labeling and routing clarity
* add grouped/bundled edge representations
* add expand/collapse interactions
* distinguish sibling vs boundary-crossing connection treatment

## 12.6 Stage 5 — Shortcut and command acceleration

Goal: make the redesign efficient for power users after the visual model is stable.

Scope:

* add keyboard shortcuts
* add command palette/search later if useful
* keep ribbon as the discoverable source of commands

## 13. Major risks and tradeoffs

## 13.1 Risk: shell churn without interaction clarity

If the team moves panels around without defining main-vs-secondary responsibilities, the redesign will create a different layout but not a better workflow.

Mitigation: treat this document as the source of truth for shell responsibility boundaries.

## 13.2 Risk: over-building a generic diagram tool

A generic freeform editor would dilute the hardware hierarchy advantage.

Mitigation: keep hierarchy scope, parent/child semantics, and port-aware connectivity central.

## 13.3 Risk: premature engine replacement

Swapping the diagram engine too early would mix architecture change with rendering change.

Mitigation: preserve the current derived-selector + lightweight-diagram foundation through early stages.

## 13.4 Risk: deep-work fragmentation

Moving review/package/handoff into secondary workspaces could make them feel disconnected if state handoff is weak.

Mitigation: preserve selected-module state and current hierarchy scope across entry/exit.

## 13.5 Tradeoff: persistent package visibility vs diagram focus

The current right panel makes editing always available. The redesign intentionally sacrifices constant package visibility in exchange for stronger diagram focus and a more professional workspace shell.

This is acceptable if opening the package editor remains one action away and preserves context.

## 14. Decisions intentionally left open

The following should remain unresolved until implementation planning for their specific stage:

* whether secondary workspaces ship first as drawers, docked panes, modals, or routes
* exact edge-density thresholds for switching to grouped connections
* whether multi-select is needed before grouped-edge workflows
* whether mini-map, search palette, or advanced layout controls belong in the first redesign release
* whether project-data and validation become separate ribbon entries or one shared utilities entry

## 15. Recommended next implementation tasks

1. Introduce the top ribbon and define explicit secondary workspace slots without changing semantic behavior.
2. Move package editing out of the permanent right column into a focused Package Editor workspace.
3. Separate review, handoff, validation, and project-data flows into explicit secondary workspaces with preserved selection/scope state.
4. Refine the diagram header, breadcrumbs, and composite/leaf affordances so hierarchy semantics become visually dominant.
5. Improve connection readability and then add grouped-edge behavior.
6. Add keyboard shortcuts only after the ribbon command model is stable.
