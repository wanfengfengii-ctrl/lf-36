import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Fragment, CropEdges } from '../types';
import {
  validateFragmentNo,
  validateCrop,
  validateRotation,
  validateOpacity,
  getNextAvailableFragmentNo,
} from '../utils/validators';
import { fileToBase64, loadImageInfo } from '../utils/storage';

export function useFragmentOps() {
  const {
    activeSchemeId,
    schemes,
    updateFragment,
    updateFragmentCrop,
    addFragment,
    removeFragment,
    toggleLock,
    toggleAligned,
    selectFragment,
    addToast,
    pushHistory,
    persist,
    recalculateConflicts,
    recalculateEdgeFits,
  } = useAppStore();

  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const fragments = scheme ? Object.values(scheme.fragmentMap) : [];

  const changeFragmentNo = useCallback((fragmentId: string, newNo: number) => {
    const s = useAppStore.getState();
    const sc = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!sc) return;
    const frag = sc.fragmentMap[fragmentId];
    if (frag?.locked) {
      s.addToast('warning', '锁定的碎片无法修改编号');
      return;
    }
    const all = Object.values(sc.fragmentMap);
    const result = validateFragmentNo(newNo, fragmentId, all);
    if (!result.valid) {
      s.addToast('error', result.message!);
      return;
    }
    pushHistory();
    updateFragment(fragmentId, { fragmentNo: newNo });
    persist();
    s.addToast('success', `编号已更新为 #${newNo}`);
  }, [updateFragment, persist, pushHistory]);

  const changePosition = useCallback((fragmentId: string, x: number, y: number) => {
    const s = useAppStore.getState();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (frag?.locked) {
      s.addToast('warning', '锁定的碎片无法移动');
      return;
    }
    updateFragment(fragmentId, { x, y });
  }, [updateFragment]);

  const changeRotation = useCallback((fragmentId: string, rotation: number) => {
    const s = useAppStore.getState();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (frag?.locked) {
      s.addToast('warning', '锁定的碎片无法旋转');
      return;
    }
    updateFragment(fragmentId, { rotation: validateRotation(rotation) });
  }, [updateFragment]);

  const changeOpacity = useCallback((fragmentId: string, opacity: number) => {
    const s = useAppStore.getState();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (frag?.locked) {
      s.addToast('warning', '锁定的碎片无法调整透明度');
      return;
    }
    updateFragment(fragmentId, { opacity: validateOpacity(opacity) });
  }, [updateFragment]);

  const changeCrop = useCallback((fragmentId: string, crop: CropEdges) => {
    const s = useAppStore.getState();
    const sc = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!sc) return;
    const frag = sc.fragmentMap[fragmentId];
    if (!frag) return;
    if (frag.locked) {
      s.addToast('warning', '锁定的碎片无法修改裁边');
      return;
    }
    const result = validateCrop(crop, frag.originalWidth, frag.originalHeight);
    if (!result.valid) {
      s.addToast('warning', result.message!);
    }
    updateFragmentCrop(fragmentId, result.clamped);
  }, [updateFragmentCrop]);

  const prepareTransform = useCallback((description?: string, action?: 'move' | 'rotate' | 'opacity' | 'crop') => {
    pushHistory(description || '调整碎片', action || 'batch');
  }, [pushHistory]);

  const finalizeTransform = useCallback((description?: string, action?: 'move' | 'rotate' | 'opacity' | 'crop') => {
    persist();
    recalculateConflicts();
    recalculateEdgeFits();
  }, [persist, recalculateConflicts, recalculateEdgeFits]);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      addToast('error', '请选择图片文件');
      return;
    }
    for (const file of imageFiles) {
      try {
        const src = await fileToBase64(file);
        const info = await loadImageInfo(src);
        addFragment({
          imageSrc: info.src,
          originalWidth: info.width,
          originalHeight: info.height,
        });
      } catch (e) {
        console.error('导入失败:', e);
        addToast('error', `导入 ${file.name} 失败`);
      }
    }
  }, [addFragment, addToast]);

  const getNextNo = useCallback(() => {
    return getNextAvailableFragmentNo(fragments);
  }, [fragments]);

  const selectAndFocus = useCallback((fragmentId: string) => {
    selectFragment(fragmentId);
  }, [selectFragment]);

  return {
    fragments,
    scheme,
    changeFragmentNo,
    changePosition,
    changeRotation,
    changeOpacity,
    changeCrop,
    prepareTransform,
    finalizeTransform,
    importFiles,
    getNextNo,
    removeFragment,
    toggleLock,
    toggleAligned,
    selectAndFocus,
  };
}

export function useDebounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  const timerRef = useRef<number | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export function useAutoRecalculate(fragmentIds: string[]) {
  const finalizeTransform = useFragmentOps().finalizeTransform;
  const debouncedFinalize = useDebounce(finalizeTransform, 300);
  const idsKey = fragmentIds.join(',');
  const prevKeyRef = useRef(idsKey);

  useEffect(() => {
    if (prevKeyRef.current !== idsKey) {
      prevKeyRef.current = idsKey;
      debouncedFinalize();
    }
  }, [idsKey, debouncedFinalize]);
}

export function useSelectedFragment(): Fragment | null {
  const { selectedFragmentId, activeSchemeId, schemes } = useAppStore();
  return useMemo(() => {
    if (!selectedFragmentId || !activeSchemeId) return null;
    const scheme = schemes[activeSchemeId];
    return scheme?.fragmentMap[selectedFragmentId] || null;
  }, [selectedFragmentId, activeSchemeId, schemes]);
}
