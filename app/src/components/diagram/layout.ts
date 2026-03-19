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
  connection: Connection;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  signal: string;
};

export type DiagramLayout = {
  width: number;
  height: number;
  nodes: DiagramNodeLayout[];
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

export function createDiagramLayout(
  moduleList: ModuleNode[],
  packageContentByModuleId: Record<string, ModulePackage>,
  connections: Connection[]
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
  const edgeLayouts: DiagramEdgeLayout[] = connections.flatMap((connection, index) => {
    const fromNode = nodeMap.get(connection.fromModuleId);
    const toNode = nodeMap.get(connection.toModuleId);

    if (!fromNode || !toNode) {
      return [];
    }

    const forward = fromNode.centerX <= toNode.centerX;
    return [{
      key: `${connection.fromModuleId}-${connection.toModuleId}-${connection.signal}-${index}`,
      connection,
      fromX: forward ? fromNode.x + fromNode.width : fromNode.x,
      fromY: fromNode.centerY,
      toX: forward ? toNode.x : toNode.x + toNode.width,
      toY: toNode.centerY,
      signal: connection.signal
    }];
  });

  const maxLevel = sortedLevels[sortedLevels.length - 1] ?? 0;
  const maxRows = Math.max(1, ...sortedLevels.map((level) => modulesByLevel.get(level)?.length ?? 0));

  return {
    width: PADDING_X * 2 + (maxLevel + 1) * NODE_WIDTH + maxLevel * HORIZONTAL_GAP,
    height: PADDING_Y * 2 + maxRows * NODE_HEIGHT + Math.max(0, maxRows - 1) * VERTICAL_GAP,
    nodes: nodeLayouts,
    edges: edgeLayouts
  };
}
