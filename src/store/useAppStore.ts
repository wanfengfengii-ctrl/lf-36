import { create } from 'zustand';
import type {
  AppState, Fragment, Scheme, OverlapInfo, EdgeFitScore, HistoryEntry, ToastMessage, CropEdges } from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { createMockScheme, createEmptyScheme } from '../utils/mockData';
import { generateId } from '../utils/geometry';
import {
  calculateOverlapSAT,
  getFragmentArea,
  calculateEdgeFitScore,
} from '../utils/geometry';
import type { EdgeType } from '../types';

const EDGES: EdgeType[] = ['top', 'right', 'bottom', 'left'];

interface AppActions {
  init: () => void;
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;

  createScheme: (name?: string) => void;
  setActiveScheme: (schemeId: string) => void;
  renameScheme: (schemeId: string, name: string) => void;
  deleteScheme: (schemeId: string) => void;

  selectFragment: (fragmentId: string | null) => void;

  addFragment: (data: {
    imageSrc: string;
    originalWidth: number;
    originalHeight: number;
  }) => void;
  removeFragment: (fragmentId: string) => void;
  updateFragment: (fragmentId: string, updates: Partial<Fragment>) => void;
  updateFragmentCrop: (fragmentId: string, crop: CropEdges) => void;

  reorderFragments: (orderedIds: string[]) => void;
  moveFragmentZIndex: (fragmentId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  toggleLock: (fragmentId: string) => void;
  toggleAligned: (fragmentId: string) => void;

  recalculateConflicts: () => void;
  recalculateEdgeFits: () => void;
  setConflictThreshold: (threshold: number) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  persist: () => void;
}

const HISTORY_LIMIT = 50;

function computeConflicts(
  scheme: Scheme | null,
  threshold: number
): OverlapInfo[] {
  if (!scheme) return [];
  const fragments = Object.values(scheme.fragmentMap);
  const results: OverlapInfo[] = [];

  for (let i = 0; i < fragments.length; i++) {
    for (let j = i + 1; j < fragments.length; j++) {
      const a = fragments[i];
      const b = fragments[j];
      const overlapArea = calculateOverlapSAT(a, b);
      if (overlapArea <= 0) continue;
      const areaA = getFragmentArea(a);
      const areaB = getFragmentArea(b);
      const ratioA = overlapArea / areaA;
      const ratioB = overlapArea / areaB;
      const isConflict = ratioA > threshold || ratioB > threshold;
      results.push({
        fragmentAId: a.id,
        fragmentBId: b.id,
        overlapArea,
        overlapRatioA: ratioA,
        overlapRatioB: ratioB,
        isConflict,
      });
    }
  }
  return results;
}

function computeEdgeFits(scheme: Scheme | null): EdgeFitScore[] {
  if (!scheme) return [];
  const fragments = Object.values(scheme.fragmentMap);
  const results: EdgeFitScore[] = [];

  for (let i = 0; i < fragments.length; i++) {
    for (let j = i + 1; j < fragments.length; j++) {
      const a = fragments[i];
      const b = fragments[j];
      let best: EdgeFitScore | null = null;
      for (const edgeA of EDGES) {
        for (const edgeB of EDGES) {
          const { score, gapPixels } = calculateEdgeFitScore(a, b, edgeA, edgeB);
          if (!best || score > best.score || (score === best.score && gapPixels < best.gapPixels)) {
            best = {
              fragmentAId: a.id,
              fragmentBId: b.id,
              edgeA,
              edgeB,
              score,
              gapPixels,
            };
          }
        }
      }
      if (best && best.score >= 2) {
        results.push(best);
      }
    }
  }
  return results.sort((a, b) => b.score - a.score || a.gapPixels - b.gapPixels);
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  schemes: {},
  activeSchemeId: null,
  selectedFragmentId: null,
  conflicts: [],
  edgeFits: [],
  history: [],
  historyIndex: -1,
  toasts: [],
  conflictThreshold: 0.3,

  init: () => {
    const stored = loadFromStorage();
    if (stored && Object.keys(stored.schemes).length > 0) {
      const firstId = stored.activeSchemeId || Object.keys(stored.schemes)[0];
      set({
        schemes: stored.schemes,
        activeSchemeId: firstId,
      });
    } else {
      const mock = createMockScheme();
      set({
        schemes: { [mock.id]: mock },
        activeSchemeId: mock.id,
      });
      get().persist();
    }
    setTimeout(() => {
      get().recalculateConflicts();
      get().recalculateEdgeFits();
    }, 0);
  },

  addToast: (type, message) => {
    const id = generateId();
    const toast: ToastMessage = { id, type, message };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  createScheme: (name) => {
    const scheme = createEmptyScheme(name);
    set((s) => ({
      schemes: { ...s.schemes, [scheme.id]: scheme },
      activeSchemeId: scheme.id,
      selectedFragmentId: null,
      history: [],
      historyIndex: -1,
    }));
    get().persist();
    get().addToast('success', `已创建方案：${scheme.name}`);
  },

  setActiveScheme: (schemeId) => {
    const s = get();
    if (!s.schemes[schemeId]) return;
    set({
      activeSchemeId: schemeId,
      selectedFragmentId: null,
      history: [],
      historyIndex: -1,
    });
    get().recalculateConflicts();
    get().recalculateEdgeFits();
    get().addToast('info', '已切换方案');
  },

  renameScheme: (schemeId, name) => {
    set((s) => {
      const scheme = s.schemes[schemeId];
      if (!scheme) return s;
      const updated = { ...scheme, name, updatedAt: Date.now() };
      return {
        schemes: { ...s.schemes, [schemeId]: updated },
      };
    });
    get().persist();
  },

  deleteScheme: (schemeId) => {
    const s = get();
    const schemes = { ...s.schemes };
    delete schemes[schemeId];
    const remainingIds = Object.keys(schemes);
    const nextActive = s.activeSchemeId === schemeId
      ? remainingIds[0] || null
      : s.activeSchemeId;
    set({
      schemes,
      activeSchemeId: nextActive,
      selectedFragmentId: null,
    });
    if (remainingIds.length === 0) {
      const empty = createEmptyScheme('默认方案');
      set({
        schemes: { [empty.id]: empty },
        activeSchemeId: empty.id,
      });
    }
    get().persist();
    get().addToast('info', '方案已删除');
  },

  selectFragment: (fragmentId) => {
    set({ selectedFragmentId: fragmentId });
  },

  addFragment: ({ imageSrc, originalWidth, originalHeight }) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;

    const usedNos = new Set(Object.values(scheme.fragmentMap).map((f) => f.fragmentNo));
    let nextNo = 1;
    while (usedNos.has(nextNo)) nextNo++;
    const maxZ = Object.values(scheme.fragmentMap).reduce((m, f) => Math.max(m, f.zIndex), 0);

    get().pushHistory();

    const frag: Fragment = {
      id: generateId(),
      schemeId: scheme.id,
      fragmentNo: nextNo,
      imageSrc,
      originalWidth,
      originalHeight,
      x: 0,
      y: 0,
      rotation: 0,
      opacity: 1,
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      locked: false,
      aligned: false,
      zIndex: maxZ + 1,
    };

    const updatedScheme = {
      ...scheme,
      fragmentMap: { ...scheme.fragmentMap, [frag.id]: frag },
      fragmentOrder: [...scheme.fragmentOrder, frag.id],
      updatedAt: Date.now(),
    };

    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      selectedFragmentId: frag.id,
    });
    get().recalculateConflicts();
    get().recalculateEdgeFits();
    get().persist();
    get().addToast('success', `碎片 #${nextNo} 已导入`);
  },

  removeFragment: (fragmentId) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;
    if (frag.locked) {
      get().addToast('warning', '锁定的碎片无法删除');
      return;
    }
    get().pushHistory();
    const fragmentMap = { ...scheme.fragmentMap };
    delete fragmentMap[fragmentId];
    const updatedScheme = {
      ...scheme,
      fragmentMap,
      fragmentOrder: scheme.fragmentOrder.filter((id) => id !== fragmentId),
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      selectedFragmentId: s.selectedFragmentId === fragmentId ? null : s.selectedFragmentId,
    });
    get().recalculateConflicts();
    get().recalculateEdgeFits();
    get().persist();
    get().addToast('info', `碎片 #${frag.fragmentNo} 已删除`);
  },

  updateFragment: (fragmentId, updates) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;
    if (frag.locked && (
      updates.x !== undefined ||
      updates.y !== undefined ||
      updates.rotation !== undefined ||
      updates.opacity !== undefined
    )) {
      return;
    }
    const updated = { ...frag, ...updates };
    const updatedScheme = {
      ...scheme,
      fragmentMap: { ...scheme.fragmentMap, [fragmentId]: updated },
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
    });
  },

  updateFragmentCrop: (fragmentId, crop) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;
    if (frag.locked) return;
    const updated = { ...frag, crop };
    const updatedScheme = {
      ...scheme,
      fragmentMap: { ...scheme.fragmentMap, [fragmentId]: updated },
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
    });
  },

  reorderFragments: (orderedIds) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    get().pushHistory();
    const newMap: Record<string, Fragment> = {};
    orderedIds.forEach((id, idx) => {
      const f = scheme.fragmentMap[id];
      if (f) {
        newMap[id] = { ...f, zIndex: idx + 1 };
      }
    });
    const updatedScheme = {
      ...scheme,
      fragmentMap: newMap,
      fragmentOrder: orderedIds,
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
    });
    get().persist();
  },

  moveFragmentZIndex: (fragmentId, direction) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const order = [...scheme.fragmentOrder];
    const idx = order.indexOf(fragmentId);
    if (idx === -1) return;
    get().pushHistory();
    let newOrder = [...order];
    if (direction === 'up' && idx < order.length - 1) {
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    } else if (direction === 'down' && idx > 0) {
      [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
    } else if (direction === 'top') {
      newOrder = [...order.filter((id) => id !== fragmentId), fragmentId];
    } else if (direction === 'bottom') {
      newOrder = [fragmentId, ...order.filter((id) => id !== fragmentId)];
    }
    get().reorderFragments(newOrder);
  },

  toggleLock: (fragmentId) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;
    const updated = { ...frag, locked: !frag.locked };
    const updatedScheme = {
      ...scheme,
      fragmentMap: { ...scheme.fragmentMap, [fragmentId]: updated },
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
    });
    get().persist();
    get().addToast(updated.locked ? 'success' : 'info',
      `碎片 #${frag.fragmentNo} 已${updated.locked ? '锁定' : '解锁'}`);
  },

  toggleAligned: (fragmentId) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;

    if (!frag.aligned) {
      const hasConflict = s.conflicts.some(
        (c) => c.isConflict && (c.fragmentAId === fragmentId || c.fragmentBId === fragmentId)
      );
      if (hasConflict) {
        s.addToast('error', `碎片 #${frag.fragmentNo} 存在重叠冲突，无法标记为已对位`);
        return;
      }
    }

    const updated = { ...frag, aligned: !frag.aligned };
    const updatedScheme = {
      ...scheme,
      fragmentMap: { ...scheme.fragmentMap, [fragmentId]: updated },
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
    });
    get().persist();
    if (updated.aligned) {
      get().addToast('success', `碎片 #${frag.fragmentNo} 标记为已对位`);
    } else {
      get().addToast('info', `碎片 #${frag.fragmentNo} 已取消对位标记`);
    }
  },

  recalculateConflicts: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const conflicts = computeConflicts(scheme, s.conflictThreshold);

    const conflictIds = new Set<string>();
    conflicts.forEach((c) => {
      if (c.isConflict) {
        conflictIds.add(c.fragmentAId);
        conflictIds.add(c.fragmentBId);
      }
    });

    if (conflictIds.size > 0) {
      let updatedMap = scheme.fragmentMap;
      let hasChanges = false;
      conflictIds.forEach((id) => {
        const f = updatedMap[id];
        if (f && f.aligned) {
          updatedMap = {
            ...updatedMap,
            [id]: { ...f, aligned: false },
          };
          hasChanges = true;
        }
      });
      if (hasChanges) {
        const updatedScheme = {
          ...scheme,
          fragmentMap: updatedMap,
          updatedAt: Date.now(),
        };
        set({
          schemes: { ...s.schemes, [scheme.id]: updatedScheme },
        });
      }
    }

    set({ conflicts });
  },

  recalculateEdgeFits: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    set({ edgeFits: computeEdgeFits(scheme) });
  },

  setConflictThreshold: (threshold) => {
    set({ conflictThreshold: threshold });
    get().recalculateConflicts();
  },

  pushHistory: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const entry: HistoryEntry = {
      schemeId: scheme.id,
      fragmentMap: JSON.parse(JSON.stringify(scheme.fragmentMap)),
      fragmentOrder: [...scheme.fragmentOrder],
    };
    const newHistory = s.history.slice(0, s.historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > HISTORY_LIMIT) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const s = get();
    if (s.historyIndex <= 0) {
      get().addToast('warning', '没有可撤销的操作');
      return;
    }
    const newIndex = s.historyIndex - 1;
    const entry = s.history[newIndex];
    const scheme = s.schemes[entry.schemeId];
    if (!scheme) return;
    const updatedScheme = {
      ...scheme,
      fragmentMap: JSON.parse(JSON.stringify(entry.fragmentMap)),
      fragmentOrder: [...entry.fragmentOrder],
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      historyIndex: newIndex,
    });
    get().recalculateConflicts();
    get().recalculateEdgeFits();
    get().persist();
    get().addToast('info', '已撤销操作');
  },

  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) {
      get().addToast('warning', '没有可重做的操作');
      return;
    }
    const newIndex = s.historyIndex + 1;
    const entry = s.history[newIndex];
    const scheme = s.schemes[entry.schemeId];
    if (!scheme) return;
    const updatedScheme = {
      ...scheme,
      fragmentMap: JSON.parse(JSON.stringify(entry.fragmentMap)),
      fragmentOrder: [...entry.fragmentOrder],
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      historyIndex: newIndex,
    });
    get().recalculateConflicts();
    get().recalculateEdgeFits();
    get().persist();
    get().addToast('info', '已重做操作');
  },

  persist: () => {
    const s = get();
    saveToStorage({
      schemes: s.schemes,
      activeSchemeId: s.activeSchemeId,
    });
  },
}));
