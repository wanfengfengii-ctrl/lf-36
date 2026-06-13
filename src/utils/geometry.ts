import type { Point, Fragment, CropEdges, EdgeType, SnapLine, SnapResult, DiffResult, DiffChange, AlignmentVerification, OverlapInfo } from '../types';

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function getCroppedDimensions(
  originalWidth: number,
  originalHeight: number,
  crop: CropEdges
): { width: number; height: number } {
  return {
    width: Math.max(1, originalWidth - crop.left - crop.right),
    height: Math.max(1, originalHeight - crop.top - crop.bottom),
  };
}

export function getFragmentCorners(fragment: Fragment): Point[] {
  const { width: croppedW, height: croppedH } = getCroppedDimensions(
    fragment.originalWidth,
    fragment.originalHeight,
    fragment.crop
  );
  const cx = fragment.x;
  const cy = fragment.y;
  const halfW = croppedW / 2;
  const halfH = croppedH / 2;

  const localCorners: Point[] = [
    { x: cx - halfW, y: cy - halfH },
    { x: cx + halfW, y: cy - halfH },
    { x: cx + halfW, y: cy + halfH },
    { x: cx - halfW, y: cy + halfH },
  ];

  return localCorners.map((p) => rotatePoint(p, { x: cx, y: cy }, fragment.rotation));
}

function getAxes(corners: Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % corners.length];
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
    const len = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
    if (len > 0) {
      axes.push({ x: -edge.y / len, y: edge.x / len });
    }
  }
  return axes;
}

function projectOntoAxis(corners: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const corner of corners) {
    const proj = corner.x * axis.x + corner.y * axis.y;
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return { min, max };
}

function overlapOnAxis(
  a: { min: number; max: number },
  b: { min: number; max: number }
): number {
  return Math.max(0, Math.min(a.max, b.max) - Math.max(a.min, b.min));
}

export function calculateOverlapSAT(a: Fragment, b: Fragment): number {
  const cornersA = getFragmentCorners(a);
  const cornersB = getFragmentCorners(b);
  const axes = [...getAxes(cornersA), ...getAxes(cornersB)];

  let minOverlap = Infinity;

  for (const axis of axes) {
    const projA = projectOntoAxis(cornersA, axis);
    const projB = projectOntoAxis(cornersB, axis);
    const overlap = overlapOnAxis(projA, projB);
    if (overlap === 0) return 0;
    if (overlap < minOverlap) minOverlap = overlap;
  }

  const { width: wa, height: ha } = getCroppedDimensions(a.originalWidth, a.originalHeight, a.crop);
  const { width: wb, height: hb } = getCroppedDimensions(b.originalWidth, b.originalHeight, b.crop);
  const areaA = wa * ha;
  const areaB = wb * hb;
  const smallerArea = Math.min(areaA, areaB);

  const estimatedOverlap = minOverlap * minOverlap * 0.785;
  return Math.min(estimatedOverlap, smallerArea * 0.95);
}

export function getFragmentArea(fragment: Fragment): number {
  const { width, height } = getCroppedDimensions(
    fragment.originalWidth,
    fragment.originalHeight,
    fragment.crop
  );
  return width * height;
}

export function getEdgeMidpoint(fragment: Fragment, edge: EdgeType): Point {
  const { width: croppedW, height: croppedH } = getCroppedDimensions(
    fragment.originalWidth,
    fragment.originalHeight,
    fragment.crop
  );
  const cx = fragment.x;
  const cy = fragment.y;
  const halfW = croppedW / 2;
  const halfH = croppedH / 2;

  let localMid: Point;
  switch (edge) {
    case 'top':
      localMid = { x: cx, y: cy - halfH };
      break;
    case 'right':
      localMid = { x: cx + halfW, y: cy };
      break;
    case 'bottom':
      localMid = { x: cx, y: cy + halfH };
      break;
    case 'left':
      localMid = { x: cx - halfW, y: cy };
      break;
  }
  return rotatePoint(localMid, { x: cx, y: cy }, fragment.rotation);
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function getEdgeAngle(fragment: Fragment, edge: EdgeType): number {
  const baseAngles: Record<EdgeType, number> = {
    top: 0,
    right: 90,
    bottom: 180,
    left: 270,
  };
  return (fragment.rotation + baseAngles[edge] + 360) % 360;
}

export function calculateEdgeFitScore(
  a: Fragment,
  b: Fragment,
  edgeA: EdgeType,
  edgeB: EdgeType
): { score: number; gapPixels: number } {
  const midA = getEdgeMidpoint(a, edgeA);
  const midB = getEdgeMidpoint(b, edgeB);
  const gapPixels = distance(midA, midB);

  const angleA = getEdgeAngle(a, edgeA);
  const angleB = (getEdgeAngle(b, edgeB) + 180) % 360;
  const angleDiff = Math.min(Math.abs(angleA - angleB), 360 - Math.abs(angleA - angleB));

  const gapScore = Math.max(0, 100 - gapPixels * 0.5);
  const angleScore = Math.max(0, 100 - angleDiff * 2);

  const score = Math.round((gapScore * 0.6 + angleScore * 0.4) / 20);
  return { score: Math.min(5, Math.max(1, score)), gapPixels: Math.round(gapPixels) };
}

export function generateId(): string {
  return 'frag_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function generateSchemeId(): string {
  return 'scheme_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function generateReferenceLineId(): string {
  return 'rline_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function generateSnapshotId(): string {
  return 'snap_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function generateAnnotationId(): string {
  return 'anno_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function generateReviewVersionId(): string {
  return 'rver_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export interface FragmentEdges {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function getFragmentEdges(fragment: Fragment): FragmentEdges {
  const { width: croppedW, height: croppedH } = getCroppedDimensions(
    fragment.originalWidth,
    fragment.originalHeight,
    fragment.crop
  );
  const halfW = croppedW / 2;
  const halfH = croppedH / 2;

  if (fragment.rotation === 0 || fragment.rotation === 180 || fragment.rotation === -180) {
    return {
      left: fragment.x - halfW,
      right: fragment.x + halfW,
      top: fragment.y - halfH,
      bottom: fragment.y + halfH,
      centerX: fragment.x,
      centerY: fragment.y,
    };
  } else if (fragment.rotation === 90 || fragment.rotation === -90 || fragment.rotation === 270) {
    const temp = halfW;
    const rotatedHalfW = halfH;
    const rotatedHalfH = temp;
    return {
      left: fragment.x - rotatedHalfW,
      right: fragment.x + rotatedHalfW,
      top: fragment.y - rotatedHalfH,
      bottom: fragment.y + rotatedHalfH,
      centerX: fragment.x,
      centerY: fragment.y,
    };
  } else {
    const corners = getFragmentCorners(fragment);
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
      centerX: fragment.x,
      centerY: fragment.y,
    };
  }
}

export function calculateEdgeSnap(
  draggingFragment: Fragment,
  targetX: number,
  targetY: number,
  otherFragments: Fragment[],
  threshold: number = 8
): SnapResult {
  const dragFrag = { ...draggingFragment, x: targetX, y: targetY };
  const dragEdges = getFragmentEdges(dragFrag);

  let snappedX = targetX;
  let snappedY = targetY;
  const lines: SnapLine[] = [];
  let snapped = false;

  for (const other of otherFragments) {
    if (other.id === draggingFragment.id) continue;

    const otherEdges = getFragmentEdges(other);

    const snapPoints = [
      { drag: dragEdges.left, other: otherEdges.left, type: 'vertical' as const, dragEdge: 'left' as EdgeType, otherEdge: 'left' as EdgeType },
      { drag: dragEdges.left, other: otherEdges.right, type: 'vertical' as const, dragEdge: 'left' as EdgeType, otherEdge: 'right' as EdgeType },
      { drag: dragEdges.left, other: otherEdges.centerX, type: 'vertical' as const, dragEdge: 'left' as EdgeType, otherEdge: 'left' as EdgeType },
      { drag: dragEdges.right, other: otherEdges.left, type: 'vertical' as const, dragEdge: 'right' as EdgeType, otherEdge: 'left' as EdgeType },
      { drag: dragEdges.right, other: otherEdges.right, type: 'vertical' as const, dragEdge: 'right' as EdgeType, otherEdge: 'right' as EdgeType },
      { drag: dragEdges.right, other: otherEdges.centerX, type: 'vertical' as const, dragEdge: 'right' as EdgeType, otherEdge: 'left' as EdgeType },
      { drag: dragEdges.centerX, other: otherEdges.left, type: 'vertical' as const, dragEdge: 'left' as EdgeType, otherEdge: 'left' as EdgeType },
      { drag: dragEdges.centerX, other: otherEdges.right, type: 'vertical' as const, dragEdge: 'left' as EdgeType, otherEdge: 'right' as EdgeType },
      { drag: dragEdges.centerX, other: otherEdges.centerX, type: 'vertical' as const, dragEdge: 'left' as EdgeType, otherEdge: 'left' as EdgeType },

      { drag: dragEdges.top, other: otherEdges.top, type: 'horizontal' as const, dragEdge: 'top' as EdgeType, otherEdge: 'top' as EdgeType },
      { drag: dragEdges.top, other: otherEdges.bottom, type: 'horizontal' as const, dragEdge: 'top' as EdgeType, otherEdge: 'bottom' as EdgeType },
      { drag: dragEdges.top, other: otherEdges.centerY, type: 'horizontal' as const, dragEdge: 'top' as EdgeType, otherEdge: 'top' as EdgeType },
      { drag: dragEdges.bottom, other: otherEdges.top, type: 'horizontal' as const, dragEdge: 'bottom' as EdgeType, otherEdge: 'top' as EdgeType },
      { drag: dragEdges.bottom, other: otherEdges.bottom, type: 'horizontal' as const, dragEdge: 'bottom' as EdgeType, otherEdge: 'bottom' as EdgeType },
      { drag: dragEdges.bottom, other: otherEdges.centerY, type: 'horizontal' as const, dragEdge: 'bottom' as EdgeType, otherEdge: 'top' as EdgeType },
      { drag: dragEdges.centerY, other: otherEdges.top, type: 'horizontal' as const, dragEdge: 'top' as EdgeType, otherEdge: 'top' as EdgeType },
      { drag: dragEdges.centerY, other: otherEdges.bottom, type: 'horizontal' as const, dragEdge: 'top' as EdgeType, otherEdge: 'bottom' as EdgeType },
      { drag: dragEdges.centerY, other: otherEdges.centerY, type: 'horizontal' as const, dragEdge: 'top' as EdgeType, otherEdge: 'top' as EdgeType },
    ];

    for (const point of snapPoints) {
      const diff = point.drag - point.other;
      if (Math.abs(diff) <= threshold) {
        snapped = true;
        if (point.type === 'vertical') {
          snappedX = targetX - diff;
          lines.push({
            type: 'vertical',
            position: point.other,
            sourceFragmentId: draggingFragment.id,
            targetFragmentId: other.id,
            edge: point.dragEdge,
          });
        } else {
          snappedY = targetY - diff;
          lines.push({
            type: 'horizontal',
            position: point.other,
            sourceFragmentId: draggingFragment.id,
            targetFragmentId: other.id,
            edge: point.dragEdge,
          });
        }
      }
    }
  }

  const uniqueLines: SnapLine[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = `${line.type}-${line.position}-${line.targetFragmentId}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLines.push(line);
    }
  }

  return {
    snapped,
    x: snappedX,
    y: snappedY,
    lines: uniqueLines,
  };
}

export function calculateSchemesDiff(
  schemeA: Record<string, Fragment>,
  schemeB: Record<string, Fragment>
): DiffResult {
  const idsA = new Set(Object.keys(schemeA));
  const idsB = new Set(Object.keys(schemeB));

  const added: Fragment[] = [];
  const removed: Fragment[] = [];
  const modified: DiffChange[] = [];
  const unchanged: string[] = [];

  for (const id of idsB) {
    if (!idsA.has(id)) {
      added.push(schemeB[id]);
    }
  }

  for (const id of idsA) {
    if (!idsB.has(id)) {
      removed.push(schemeA[id]);
    }
  }

  const fieldsToCompare: (keyof Fragment)[] = [
    'x', 'y', 'rotation', 'opacity', 'fragmentNo', 'locked', 'aligned', 'zIndex',
  ];

  for (const id of idsA) {
    if (!idsB.has(id)) continue;
    const fragA = schemeA[id];
    const fragB = schemeB[id];
    let hasChanges = false;

    for (const field of fieldsToCompare) {
      const valA = fragA[field];
      const valB = fragB[field];
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        modified.push({
          fragmentId: id,
          fragmentNo: fragA.fragmentNo,
          field,
          oldValue: valA,
          newValue: valB,
        });
        hasChanges = true;
      }
    }

    const cropFields: (keyof CropEdges)[] = ['top', 'right', 'bottom', 'left'];
    for (const field of cropFields) {
      if (fragA.crop[field] !== fragB.crop[field]) {
        modified.push({
          fragmentId: id,
          fragmentNo: fragA.fragmentNo,
          field: 'crop',
          oldValue: fragA.crop,
          newValue: fragB.crop,
        });
        hasChanges = true;
        break;
      }
    }

    if (!hasChanges) {
      unchanged.push(id);
    }
  }

  return { added, removed, modified, unchanged, annotationDiff: [] };
}

export function verifyAlignment(
  fragments: Fragment[],
  conflicts: OverlapInfo[]
): AlignmentVerification {
  const totalFragments = fragments.length;
  const alignedCount = fragments.filter(f => f.aligned).length;
  const unalignedFragments = fragments.filter(f => !f.aligned).map(f => f.id);

  const conflictIds = new Set<string>();
  conflicts.forEach(c => {
    if (c.isConflict) {
      conflictIds.add(c.fragmentAId);
      conflictIds.add(c.fragmentBId);
    }
  });
  const conflictFragments = Array.from(conflictIds);

  const issues: string[] = [];
  if (unalignedFragments.length > 0) {
    issues.push(`${unalignedFragments.length} 个碎片未完成对位`);
  }
  if (conflictFragments.length > 0) {
    issues.push(`${conflictFragments.length} 个碎片存在重叠冲突`);
  }

  const duplicateNos = new Set<number>();
  const seenNos = new Set<number>();
  fragments.forEach(f => {
    if (seenNos.has(f.fragmentNo)) {
      duplicateNos.add(f.fragmentNo);
    }
    seenNos.add(f.fragmentNo);
  });
  if (duplicateNos.size > 0) {
    issues.push(`存在重复的碎片编号: ${Array.from(duplicateNos).join(', ')}`);
  }

  const invalidCropFragments = fragments.filter(f => {
    const maxTop = f.originalHeight - f.crop.bottom - 1;
    const maxBottom = f.originalHeight - f.crop.top - 1;
    const maxLeft = f.originalWidth - f.crop.right - 1;
    const maxRight = f.originalWidth - f.crop.left - 1;
    return f.crop.top > maxTop || f.crop.bottom > maxBottom || f.crop.left > maxLeft || f.crop.right > maxRight;
  });
  if (invalidCropFragments.length > 0) {
    issues.push(`${invalidCropFragments.length} 个碎片裁边越界`);
  }

  const invalidIdFragments = fragments.filter(f => f.fragmentNo <= 0 || !Number.isInteger(f.fragmentNo));
  if (invalidIdFragments.length > 0) {
    issues.push(`${invalidIdFragments.length} 个碎片编号无效`);
  }

  return {
    allAligned: issues.length === 0,
    totalFragments,
    alignedCount,
    unalignedFragments,
    conflictFragments,
    issues,
  };
}

export function validateFragmentIdUniqueness(fragments: Fragment[]): { valid: boolean; duplicates: string[] } {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  fragments.forEach(f => {
    if (seen.has(f.id)) {
      duplicates.push(f.id);
    }
    seen.add(f.id);
  });
  return { valid: duplicates.length === 0, duplicates };
}

export function getRotationSnap(rotation: number, snapAngle: number = 15): number {
  return Math.round(rotation / snapAngle) * snapAngle;
}

export function detectConflictAtPosition(
  fragment: Fragment,
  newX: number,
  newY: number,
  otherFragments: Fragment[],
  threshold: number
): { hasConflict: boolean; conflictWith: string[] } {
  const movedFrag = { ...fragment, x: newX, y: newY };
  const conflictWith: string[] = [];

  for (const other of otherFragments) {
    if (other.id === fragment.id) continue;
    const overlapArea = calculateOverlapSAT(movedFrag, other);
    if (overlapArea <= 0) continue;
    const areaA = getFragmentArea(movedFrag);
    const areaB = getFragmentArea(other);
    const ratioA = overlapArea / areaA;
    const ratioB = overlapArea / areaB;
    if (ratioA > threshold || ratioB > threshold) {
      conflictWith.push(other.id);
    }
  }

  return { hasConflict: conflictWith.length > 0, conflictWith };
}
