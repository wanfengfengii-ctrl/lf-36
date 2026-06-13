import type { Point, Fragment, CropEdges, EdgeType } from '../types';

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
