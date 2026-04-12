import type { ModulePackage } from '../../../../shared/src';
import type { ModuleNode } from '../../../../shared/src';
import type { Connection } from '../../types';

export type DiagramNodeLayout = {
  module: ModuleNode;
  packageContent?: ModulePackage;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  level: number;
  row: number;
  depthLabel: string;
  hierarchyLabel: string;
  relationshipBadge: string;
};

export type DiagramEdgeLayout = {
  key: string;
  groupKey: string;
  connections: Connection[];
  kind: 'sibling' | 'cross_boundary';
  isBundle: boolean;
  isExpanded: boolean;
  label: string;
  path: string;
  labelX: number;
  labelY: number;
  badgeX: number;
  badgeY: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type DiagramEdgeGroupLayout = {
  groupKey: string;
  fromModuleId: string;
  toModuleId: string;
  fromLabel: string;
  toLabel: string;
  kind: 'sibling' | 'cross_boundary';
  connections: Connection[];
  isExpanded: boolean;
};

export type DiagramLayout = {
  width: number;
  height: number;
  nodes: DiagramNodeLayout[];
  edgeGroups: DiagramEdgeGroupLayout[];
  edges: DiagramEdgeLayout[];
};

const NODE_WIDTH = 204;
const NODE_HEIGHT = 96;
const HORIZONTAL_GAP = 76;
const VERTICAL_GAP = 56;
const PADDING_X = 36;
const PADDING_Y = 36;

function hierarchyDepth(moduleNode: ModuleNode, packageContent?: ModulePackage): number {
  const hierarchyPathLength = packageContent?.hierarchy?.hierarchyPath?.filter((segment) => segment.trim().length > 0).length ?? 0;
  if (hierarchyPathLength > 0) {
    return Math.max(0, hierarchyPathLength - 1);
  }

  if ((packageContent?.hierarchy?.parentModuleId ?? '').trim().length > 0) {
    return 1;
  }

  return moduleNode.id === 'root' ? 0 : 1;
}

function relationshipBadge(moduleNode: ModuleNode, packageContent?: ModulePackage): string {
  const childCount = packageContent?.hierarchy?.childModuleIds?.filter((item) => item.trim().length > 0).length ?? 0;
  const hasParent = (packageContent?.hierarchy?.parentModuleId ?? '').trim().length > 0;

  if (childCount > 0) {
    return `${childCount} child${childCount === 1 ? '' : 'ren'}`;
  }

  if (hasParent) {
    return 'child';
  }

  return moduleNode.kind === 'composite' ? 'top' : 'leaf';
}

function hierarchyLabel(packageContent?: ModulePackage): string {
  const hierarchyPath = packageContent?.hierarchy?.hierarchyPath?.filter((segment) => segment.trim().length > 0) ?? [];
  if (hierarchyPath.length > 1) {
    return hierarchyPath.join(' / ');
  }

  const parentModuleId = packageContent?.hierarchy?.parentModuleId?.trim();
  if (parentModuleId) {
    return `parent: ${parentModuleId}`;
  }

  return 'root scope';
}

function classifyEdgeKind(
  currentHierarchyModuleId: string | undefined,
  fromNode: DiagramNodeLayout,
  toNode: DiagramNodeLayout,
  packageContentByModuleId: Record<string, ModulePackage>
): 'sibling' | 'cross_boundary' {
  if (fromNode.module.id === currentHierarchyModuleId || toNode.module.id === currentHierarchyModuleId) {
    return 'cross_boundary';
  }

  const fromParentId = packageContentByModuleId[fromNode.module.id]?.hierarchy?.parentModuleId?.trim();
  const toParentId = packageContentByModuleId[toNode.module.id]?.hierarchy?.parentModuleId?.trim();
  return fromParentId && fromParentId === toParentId ? 'sibling' : 'cross_boundary';
}

function createEdgePath(fromX: number, fromY: number, toX: number, toY: number, offset: number, kind: 'sibling' | 'cross_boundary') {
  const controlX = fromX + (toX - fromX) / 2;
  const verticalBias = kind === 'cross_boundary' ? 28 : 14;
  const controlY = (fromY + toY) / 2 + (offset * 18) - (fromY === toY ? verticalBias : 0);
  return {
    path: `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`,
    labelX: controlX,
    labelY: controlY - 8,
    badgeX: controlX,
    badgeY: controlY - 24
  };
}

export function createDiagramLayout(
  moduleList: ModuleNode[],
  packageContentByModuleId: Record<string, ModulePackage>,
  connections: Connection[],
  currentHierarchyModuleId?: string,
  expandedEdgeBundleKeys: string[] = []
): DiagramLayout {
  const modulesByLevel = new Map<number, ModuleNode[]>();

  moduleList.forEach((moduleNode) => {
    const level = hierarchyDepth(moduleNode, packageContentByModuleId[moduleNode.id]);
    const modules = modulesByLevel.get(level) ?? [];
    modules.push(moduleNode);
    modulesByLevel.set(level, modules);
  });

  const sortedLevels = [...modulesByLevel.keys()].sort((left, right) => left - right);
  const nodeLayouts: DiagramNodeLayout[] = [];

  sortedLevels.forEach((level) => {
    const modules = (modulesByLevel.get(level) ?? []).slice().sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
    modules.forEach((moduleNode, row) => {
      const x = PADDING_X + level * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = PADDING_Y + row * (NODE_HEIGHT + VERTICAL_GAP);
      const packageContent = packageContentByModuleId[moduleNode.id];
      nodeLayouts.push({
        module: moduleNode,
        packageContent,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        centerX: x + NODE_WIDTH / 2,
        centerY: y + NODE_HEIGHT / 2,
        level,
        row,
        depthLabel: level === 0 ? 'L0' : `L${level}`,
        hierarchyLabel: hierarchyLabel(packageContent),
        relationshipBadge: relationshipBadge(moduleNode, packageContent)
      });
    });
  });

  const nodeMap = new Map(nodeLayouts.map((node) => [node.module.id, node]));
  const groupedConnections = new Map<string, DiagramEdgeGroupLayout>();

  connections.forEach((connection) => {
    const fromNode = nodeMap.get(connection.fromModuleId);
    const toNode = nodeMap.get(connection.toModuleId);

    if (!fromNode || !toNode) {
      return;
    }

    const kind = classifyEdgeKind(currentHierarchyModuleId, fromNode, toNode, packageContentByModuleId);
    const groupKey = `${kind}:${connection.fromModuleId}->${connection.toModuleId}`;
    const existing = groupedConnections.get(groupKey);
    const nextConnections = [...(existing?.connections ?? []), connection].sort((left, right) => left.signal.localeCompare(right.signal));

    groupedConnections.set(groupKey, {
      groupKey,
      fromModuleId: connection.fromModuleId,
      toModuleId: connection.toModuleId,
      fromLabel: fromNode.module.name,
      toLabel: toNode.module.name,
      kind,
      connections: nextConnections,
      isExpanded: expandedEdgeBundleKeys.includes(groupKey)
    });
  });

  const edgeGroups = [...groupedConnections.values()];
  const edgeLayouts: DiagramEdgeLayout[] = edgeGroups.flatMap<DiagramEdgeLayout>((group) => {
    const fromNode = nodeMap.get(group.fromModuleId);
    const toNode = nodeMap.get(group.toModuleId);

    if (!fromNode || !toNode) {
      return [];
    }

    const forward = fromNode.centerX <= toNode.centerX;
    const fromX = forward ? fromNode.x + fromNode.width : fromNode.x;
    const toX = forward ? toNode.x : toNode.x + toNode.width;

    if (group.connections.length > 1 && !group.isExpanded) {
      const routed = createEdgePath(fromX, fromNode.centerY, toX, toNode.centerY, 0, group.kind);
      return [{
        key: `${group.groupKey}:bundle`,
        groupKey: group.groupKey,
        connections: group.connections,
        kind: group.kind,
        isBundle: true,
        isExpanded: false,
        label: `${group.connections.length} signals`,
        fromX,
        fromY: fromNode.centerY,
        toX,
        toY: toNode.centerY,
        ...routed
      }];
    }

    return group.connections.map((connection, index) => {
      const offsetIndex = index - (group.connections.length - 1) / 2;
      const routed = createEdgePath(fromX, fromNode.centerY, toX, toNode.centerY, offsetIndex, group.kind);
      return {
        key: `${group.groupKey}:${connection.signal}:${index}`,
        groupKey: group.groupKey,
        connections: [connection],
        kind: group.kind,
        isBundle: false,
        isExpanded: group.isExpanded,
        label: connection.signal,
        fromX,
        fromY: fromNode.centerY,
        toX,
        toY: toNode.centerY,
        ...routed
      };
    });
  });

  const maxLevel = sortedLevels[sortedLevels.length - 1] ?? 0;
  const maxRows = Math.max(1, ...sortedLevels.map((level) => modulesByLevel.get(level)?.length ?? 0));

  return {
    width: PADDING_X * 2 + (maxLevel + 1) * NODE_WIDTH + maxLevel * HORIZONTAL_GAP,
    height: PADDING_Y * 2 + maxRows * NODE_HEIGHT + Math.max(0, maxRows - 1) * VERTICAL_GAP,
    nodes: nodeLayouts,
    edgeGroups,
    edges: edgeLayouts
  };
}
