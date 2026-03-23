import type { ModulePackage } from '../../../../shared/src';
import type { Connection, PackageSectionStatus, SectionKey } from '../../types';
import { ModulePackageSection } from './shared';

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyList(values: string[]): string {
  return values.join(', ');
}

function portsForDirection(modulePackage: ModulePackage, direction: 'input' | 'output' | 'inout'): string[] {
  return (modulePackage.interfaces?.ports ?? []).filter((port) => port.direction === direction).map((port) => port.name);
}

function replaceDirectionPorts(modulePackage: ModulePackage, direction: 'input' | 'output' | 'inout', names: string[]): ModulePackage {
  const existingPorts = modulePackage.interfaces?.ports ?? [];
  const untouched = existingPorts.filter((port) => port.direction !== direction);
  const nextDirectionPorts = names.map((name, index) => ({
    id: `${direction}_${index}`,
    name,
    direction,
    width: '1',
    description: ''
  }));

  return {
    ...modulePackage,
    interfaces: {
      ...modulePackage.interfaces,
      ports: [...untouched, ...nextDirectionPorts]
    }
  };
}

type PackageEditorSectionProps = {
  currentPackageContent: ModulePackage;
  currentSectionStatuses: Record<SectionKey, PackageSectionStatus>;
  moduleConnections: Connection[];
  updateCurrentPackage: (updater: (current: ModulePackage) => ModulePackage) => void;
};

export function PackageEditorSection({
  currentPackageContent,
  currentSectionStatuses,
  moduleConnections,
  updateCurrentPackage
}: PackageEditorSectionProps): JSX.Element {
  return (
    <>
      <ModulePackageSection title="Identity" status={currentSectionStatuses.identity}>
        <label>
          Name
          <input value={currentPackageContent.identity?.name ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, identity: { ...current.identity, name: event.target.value } }))} placeholder="module name" />
        </label>
        <label>
          Description
          <textarea value={currentPackageContent.identity?.description ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, identity: { ...current.identity, description: event.target.value } }))} rows={2} placeholder="short identity description" />
        </label>
      </ModulePackageSection>

      <ModulePackageSection title="Hierarchy" status={currentSectionStatuses.hierarchy}>
        <label>
          Parent module id
          <input value={currentPackageContent.hierarchy?.parentModuleId ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, parentModuleId: event.target.value } }))} placeholder="root" />
        </label>
        <label>
          Child module ids (comma-separated)
          <input value={stringifyList(currentPackageContent.hierarchy?.childModuleIds ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, childModuleIds: parseList(event.target.value) } }))} placeholder="child_a, child_b" />
        </label>
        <label>
          Hierarchy path (comma-separated)
          <input value={stringifyList(currentPackageContent.hierarchy?.hierarchyPath ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, hierarchyPath: parseList(event.target.value) } }))} placeholder="top_controller, module_name" />
        </label>
      </ModulePackageSection>

      <ModulePackageSection title="Interfaces" status={currentSectionStatuses.interfaces}>
        <label>
          Input ports (comma-separated)
          <input value={stringifyList(portsForDirection(currentPackageContent, 'input'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'input', parseList(event.target.value)))} placeholder="in_a, in_b" />
        </label>
        <label>
          Output ports (comma-separated)
          <input value={stringifyList(portsForDirection(currentPackageContent, 'output'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'output', parseList(event.target.value)))} placeholder="out_a, out_b" />
        </label>
        <label>
          Inout ports (comma-separated)
          <input value={stringifyList(portsForDirection(currentPackageContent, 'inout'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'inout', parseList(event.target.value)))} placeholder="io_bus" />
        </label>
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> origin/main
        <label>
          Interface notes
          <textarea value={currentPackageContent.interfaces?.interfaceNotes ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, interfaces: { ...current.interfaces, interfaceNotes: event.target.value } }))} rows={2} placeholder="integration notes for the exposed ports" />
        </label>
<<<<<<< HEAD
=======
=======
>>>>>>> origin/main
>>>>>>> origin/main
      </ModulePackageSection>

      <ModulePackageSection title="Purpose" status={currentSectionStatuses.purpose}>
        <label>
          Purpose summary
          <textarea value={currentPackageContent.purpose?.summary ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, purpose: { ...current.purpose, summary: event.target.value } }))} rows={3} placeholder="what does this module do?" />
        </label>
      </ModulePackageSection>

      <ModulePackageSection title="Behavior" status={currentSectionStatuses.behavior}>
        <label>
          Behavior summary
          <textarea value={currentPackageContent.behavior?.behaviorSummary ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, behaviorSummary: event.target.value } }))} rows={2} placeholder="high-level behavior" />
        </label>
        <label>
          Behavior rules (comma-separated)
          <input value={stringifyList(currentPackageContent.behavior?.behaviorRules ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, behaviorRules: parseList(event.target.value) } }))} placeholder="rule_a, rule_b" />
        </label>
        <label>
          Clock / reset notes
          <textarea value={currentPackageContent.behavior?.clockResetNotes ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, clockResetNotes: event.target.value } }))} rows={2} placeholder="clock and reset behavior" />
        </label>
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> origin/main
        <label>
          Corner cases (comma-separated)
          <input value={stringifyList(currentPackageContent.behavior?.cornerCases ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, cornerCases: parseList(event.target.value) } }))} placeholder="invalid frame, reset mid-transaction" />
        </label>
        <label>
          Implementation notes (comma-separated)
          <input value={stringifyList(currentPackageContent.behavior?.implementationNotes ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, implementationNotes: parseList(event.target.value) } }))} placeholder="single-clocked FSM, shared counter" />
        </label>
<<<<<<< HEAD
=======
=======
>>>>>>> origin/main
>>>>>>> origin/main
      </ModulePackageSection>

      <ModulePackageSection title="Constraints" status={currentSectionStatuses.constraints}>
        <label>
          Basic constraints (comma-separated)
          <input value={stringifyList(currentPackageContent.constraints?.basicConstraints ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, constraints: { ...current.constraints, basicConstraints: parseList(event.target.value) } }))} placeholder="constraint_a, constraint_b" />
        </label>
        <label>
          Timing constraints (comma-separated)
          <input value={stringifyList(currentPackageContent.constraints?.timingConstraints ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, constraints: { ...current.constraints, timingConstraints: parseList(event.target.value) } }))} placeholder="setup < 2ns" />
        </label>
      </ModulePackageSection>

      <ModulePackageSection title="Dependencies and Interactions" status={currentSectionStatuses.dependenciesAndInteractions}>
        <label>
          Relevant dependencies (comma-separated)
          <input value={stringifyList(currentPackageContent.dependencies?.relevantDependencies ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, dependencies: { ...current.dependencies, relevantDependencies: parseList(event.target.value) } }))} placeholder="system clock, upstream block" />
        </label>
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> origin/main
        <label>
          Integration assumptions (comma-separated)
          <input value={stringifyList(currentPackageContent.dependencies?.integrationAssumptions ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, dependencies: { ...current.dependencies, integrationAssumptions: parseList(event.target.value) } }))} placeholder="upstream honors ready/valid, reset is synchronous" />
        </label>
<<<<<<< HEAD
=======
=======
>>>>>>> origin/main
>>>>>>> origin/main
        <div className="connection-list">
          <strong>Current interactions from connections</strong>
          {moduleConnections.length === 0 ? <p className="muted">No connections for this module.</p> : (
            <ul>
              {moduleConnections.map((connection, index) => (
                <li key={`${connection.fromModuleId}-${connection.toModuleId}-${connection.signal}-${index}`}>{connection.fromModuleId} → {connection.toModuleId} ({connection.signal})</li>
              ))}
            </ul>
          )}
        </div>
      </ModulePackageSection>

      <ModulePackageSection title="Decomposition Status" status={currentSectionStatuses.decompositionStatus}>
        <label>
          Decomposition status
          <select
            value={currentPackageContent.decompositionStatus?.decompositionStatus ?? 'under_decomposition'}
            onChange={(event) =>
              updateCurrentPackage((current) => ({
                ...current,
                decompositionStatus: {
                  decompositionStatus: event.target.value as NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus'],
                  decompositionRationale: current.decompositionStatus?.decompositionRationale ?? '',
                  stopReason: current.decompositionStatus?.stopReason,
                  stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy,
                  furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes
                }
              }))
            }
          >
            <option value="composite">composite</option>
            <option value="under_decomposition">under_decomposition</option>
            <option value="candidate_leaf">candidate_leaf</option>
            <option value="approved_leaf">approved_leaf</option>
          </select>
        </label>
        <label>
          Rationale
          <textarea value={currentPackageContent.decompositionStatus?.decompositionRationale ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, decompositionStatus: { decompositionStatus: current.decompositionStatus?.decompositionStatus ?? 'under_decomposition', decompositionRationale: event.target.value, stopReason: current.decompositionStatus?.stopReason, stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy, furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes } }))} rows={2} placeholder="why this decomposition state?" />
        </label>
      </ModulePackageSection>
    </>
  );
}
