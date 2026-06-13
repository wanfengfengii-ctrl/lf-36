import type { Fragment, CropEdges, Scheme, OverlapInfo } from '../types';

export function validateFragmentNo(
  fragmentNo: number,
  currentFragmentId: string | null,
  fragments: Fragment[]
): { valid: boolean; message?: string } {
  if (!Number.isInteger(fragmentNo) || fragmentNo <= 0) {
    return { valid: false, message: '碎片编号必须为正整数' };
  }
  const duplicate = fragments.find(
    (f) => f.fragmentNo === fragmentNo && f.id !== currentFragmentId
  );
  if (duplicate) {
    return { valid: false, message: `碎片编号 ${fragmentNo} 已存在，请使用唯一编号` };
  }
  return { valid: true };
}

export function validateCrop(
  crop: CropEdges,
  originalWidth: number,
  originalHeight: number
): { valid: boolean; clamped: CropEdges; message?: string } {
  const maxTop = originalHeight - crop.bottom - 1;
  const maxBottom = originalHeight - crop.top - 1;
  const maxLeft = originalWidth - crop.right - 1;
  const maxRight = originalWidth - crop.left - 1;

  const clamped: CropEdges = {
    top: Math.max(0, Math.min(crop.top, maxTop)),
    bottom: Math.max(0, Math.min(crop.bottom, maxBottom)),
    left: Math.max(0, Math.min(crop.left, maxLeft)),
    right: Math.max(0, Math.min(crop.right, maxRight)),
  };

  const changed =
    clamped.top !== crop.top ||
    clamped.bottom !== crop.bottom ||
    clamped.left !== crop.left ||
    clamped.right !== crop.right;

  if (changed) {
    return {
      valid: false,
      clamped,
      message: '裁边超出原图边界，已自动调整',
    };
  }
  return { valid: true, clamped };
}

export function validateExportReadiness(
  scheme: Scheme,
  conflicts: OverlapInfo[] = []
): {
  ready: boolean;
  unalignedFragments: Fragment[];
  conflictFragments: Fragment[];
  message?: string;
} {
  const fragments = Object.values(scheme.fragmentMap);
  if (fragments.length === 0) {
    return {
      ready: false,
      unalignedFragments: [],
      conflictFragments: [],
      message: '方案中没有碎片，无法导出',
    };
  }

  const unaligned = fragments.filter((f) => !f.aligned);
  const conflictingIds = new Set<string>();
  conflicts.forEach((c) => {
    if (c.isConflict) {
      conflictingIds.add(c.fragmentAId);
      conflictingIds.add(c.fragmentBId);
    }
  });
  const conflictFragments = fragments.filter((f) => conflictingIds.has(f.id));

  const issues: string[] = [];
  if (unaligned.length > 0) issues.push(`${unaligned.length} 个碎片未完成对位`);
  if (conflictFragments.length > 0) issues.push(`${conflictFragments.length} 个碎片存在重叠冲突`);

  if (issues.length > 0) {
    return {
      ready: false,
      unalignedFragments: unaligned,
      conflictFragments,
      message: `${issues.join('，')}，无法导出`,
    };
  }
  return { ready: true, unalignedFragments: [], conflictFragments: [] };
}

export function getNextAvailableFragmentNo(fragments: Fragment[]): number {
  if (fragments.length === 0) return 1;
  const usedNos = new Set(fragments.map((f) => f.fragmentNo));
  let nextNo = 1;
  while (usedNos.has(nextNo)) {
    nextNo++;
  }
  return nextNo;
}

export function validateRotation(rotation: number): number {
  let r = rotation % 360;
  if (r < 0) r += 360;
  return r;
}

export function validateOpacity(opacity: number): number {
  return Math.max(0.1, Math.min(1, opacity));
}
