import type { Fragment, CropEdges, Scheme, OverlapInfo } from '../types';
import { validateFragmentIdUniqueness } from './geometry';

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
  if (unaligned.length > 0) issues.push(`${unaligned.length} 个碎片未完成对位（将不会包含在导出中）`);
  if (conflictFragments.length > 0) issues.push(`${conflictFragments.length} 个碎片存在重叠冲突，必须先解决才能导出`);

  const usedNos = new Map<number, string[]>();
  fragments.forEach(f => {
    if (!usedNos.has(f.fragmentNo)) usedNos.set(f.fragmentNo, []);
    usedNos.get(f.fragmentNo)!.push(f.id);
  });
  const duplicateNos = Array.from(usedNos.entries()).filter(([, ids]) => ids.length > 1);
  if (duplicateNos.length > 0) {
    issues.push(`碎片编号重复: ${duplicateNos.map(([no]) => `#${no}`).join(', ')}`);
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

  if (conflictFragments.length > 0 || duplicateNos.length > 0 || invalidCropFragments.length > 0) {
    return {
      ready: false,
      unalignedFragments: unaligned,
      conflictFragments,
      message: `${issues.join('；')}，无法导出`,
    };
  }
  return { ready: true, unalignedFragments: unaligned, conflictFragments: [] };
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

export function validateFragmentUpdates(
  fragmentId: string,
  updates: Partial<Fragment>,
  fragments: Fragment[]
): { valid: boolean; clamped: Partial<Fragment>; message?: string } {
  const fragment = fragments.find(f => f.id === fragmentId);
  if (!fragment) {
    return { valid: false, clamped: {}, message: '碎片不存在' };
  }

  const clamped: Partial<Fragment> = { ...updates };
  const messages: string[] = [];

  if (updates.fragmentNo !== undefined) {
    const noResult = validateFragmentNo(updates.fragmentNo, fragmentId, fragments);
    if (!noResult.valid) {
      delete clamped.fragmentNo;
      messages.push(noResult.message!);
    }
  }

  if (updates.rotation !== undefined) {
    clamped.rotation = validateRotation(updates.rotation);
  }

  if (updates.opacity !== undefined) {
    clamped.opacity = validateOpacity(updates.opacity);
  }

  if (updates.crop !== undefined) {
    const cropResult = validateCrop(updates.crop, fragment.originalWidth, fragment.originalHeight);
    clamped.crop = cropResult.clamped;
    if (!cropResult.valid) {
      messages.push(cropResult.message!);
    }
  }

  return {
    valid: messages.length === 0,
    clamped,
    message: messages.length > 0 ? messages.join('；') : undefined,
  };
}

export function validateAllFragments(fragments: Fragment[]): {
  valid: boolean;
  issues: string[];
  fixedFragments: Fragment[];
} {
  const issues: string[] = [];
  const fixedFragments = [...fragments];

  const { valid: idsValid, duplicates } = validateFragmentIdUniqueness(fragments);
  if (!idsValid) {
    issues.push(`存在重复的碎片ID: ${duplicates.join(', ')}`);
  }

  const usedNos = new Map<number, string[]>();
  fragments.forEach(f => {
    if (!usedNos.has(f.fragmentNo)) {
      usedNos.set(f.fragmentNo, []);
    }
    usedNos.get(f.fragmentNo)!.push(f.id);
  });

  usedNos.forEach((ids, no) => {
    if (ids.length > 1) {
      issues.push(`碎片编号 #${no} 被多个碎片使用: ${ids.join(', ')}`);
    }
  });

  fragments.forEach((f, idx) => {
    if (f.fragmentNo <= 0 || !Number.isInteger(f.fragmentNo)) {
      issues.push(`碎片 ${f.id} 的编号 ${f.fragmentNo} 无效，必须为正整数`);
      const nextNo = getNextAvailableFragmentNo(fixedFragments);
      fixedFragments[idx] = { ...f, fragmentNo: nextNo };
    }

    const cropResult = validateCrop(f.crop, f.originalWidth, f.originalHeight);
    if (!cropResult.valid) {
      issues.push(`碎片 #${f.fragmentNo} 的裁边超出边界，已自动调整`);
      fixedFragments[idx] = { ...f, crop: cropResult.clamped };
    }

    if (f.rotation !== validateRotation(f.rotation)) {
      fixedFragments[idx] = { ...f, rotation: validateRotation(f.rotation) };
    }

    if (f.opacity !== validateOpacity(f.opacity)) {
      fixedFragments[idx] = { ...f, opacity: validateOpacity(f.opacity) };
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    fixedFragments,
  };
}
