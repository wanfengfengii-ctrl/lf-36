import { create } from 'zustand';
import type {
  AppState, Fragment, Scheme, OverlapInfo, EdgeFitScore, HistoryEntry, ToastMessage, CropEdges,
  SnapLine, ReferenceLine, SchemeSnapshot, DiffResult, AlignmentVerification, UndoRedoAction,
  MagnifierState, RulerState, Point
} from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { createMockScheme, createEmptyScheme } from '../utils/mockData';
import {
  generateId, generateReferenceLineId, generateSnapshotId, calculateEdgeSnap,
  calculateSchemesDiff, verifyAlignment, getFragmentEdges
} from '../utils/geometry';
import {
  calculateOverlapSAT, getFragmentArea, calculateEdgeFitScore,
} from '../utils/geometry';
import type { EdgeType } from '../types';
import { validateFragmentUpdates, validateAllFragments, validateExportReadiness } from '../utils/validators';

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

  pushHistory: (description?: string, action?: UndoRedoAction) => void;
  undo: () => void;
  redo: () => void;

  setSnapEnabled: (enabled: boolean) => void;
  setSnapThreshold: (threshold: number) => void;
  setActiveSnapLines: (lines: SnapLine[]) => void;
  clearSnapLines: () => void;
  calculateSnap: (fragmentId: string, targetX: number, targetY: number) => { x: number; y: number; snapped: boolean };

  setRulerVisible: (visible: boolean) => void;
  setRulerUnit: (unit: RulerState['unit']) => void;
  setRulerOrigin: (origin: Point) => void;

  addReferenceLine: (type: 'vertical' | 'horizontal', position: number) => void;
  updateReferenceLine: (id: string, updates: Partial<ReferenceLine>) => void;
  removeReferenceLine: (id: string) => void;
  clearReferenceLines: () => void;

  setMagnifierEnabled: (enabled: boolean) => void;
  setMagnifierPosition: (position: Point | null) => void;
  setMagnifierZoom: (zoom: number) => void;

  createSnapshot: (name: string, description?: string) => string;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  getSnapshots: () => SchemeSnapshot[];

  compareWithSnapshot: (snapshotId: string) => DiffResult | null;
  compareSchemes: (schemeAId: string, schemeBId: string) => DiffResult | null;

  verifyCurrentAlignment: () => AlignmentVerification | null;
  validateAndFixAllFragments: () => void;

  persist: () => void;
}

const HISTORY_LIMIT = 100;

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

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  schemes: {},
  activeSchemeId: null,
  selectedFragmentId: null,
  conflicts: [],
  edgeFits: [],
  toasts: [],
  conflictThreshold: 0.3,
  snapEnabled: true,
  snapThreshold: 8,
  activeSnapLines: [],
  ruler: {
    visible: true,
    unit: 'px',
    origin: { x: 0, y: 0 },
  },
  referenceLines: [],
  magnifier: {
    enabled: false,
    position: null,
    zoom: 3,
    size: 200,
  },
  snapshots: {},
  lastAction: null,

  init: () => {
    const stored = loadFromStorage();
    if (stored && Object.keys(stored.schemes).length > 0) {
      const firstId = stored.activeSchemeId || Object.keys(stored.schemes)[0];
      const firstScheme = stored.schemes[firstId];
      set({
        schemes: stored.schemes,
        activeSchemeId: firstId,
        referenceLines: firstScheme?.referenceLines || [],
      });
    } else {
      const mock = createMockScheme();
      set({
        schemes: { [mock.id]: mock },
        activeSchemeId: mock.id,
        referenceLines: mock.referenceLines || [],
      });
      get().persist();
    }
    setTimeout(() => {
      get().recalculateConflicts();
      get().recalculateEdgeFits();
      get().validateAndFixAllFragments();
    }, 0);
  },

  validateAndFixAllFragments: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;

    const fragments = Object.values(scheme.fragmentMap);
    const result = validateAllFragments(fragments);

    if (!result.valid) {
      result.issues.forEach(msg => s.addToast('warning', msg));

      const newFragmentMap: Record<string, Fragment> = {};
      result.fixedFragments.forEach(f => {
        newFragmentMap[f.id] = f;
      });

      const updatedScheme = {
        ...scheme,
        fragmentMap: newFragmentMap,
        updatedAt: Date.now(),
      };

      set({
        schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      });
      s.persist();
    }
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
      referenceLines: scheme.referenceLines || [],
      activeSnapLines: [],
    }));
    get().persist();
    get().addToast('success', `已创建方案：${scheme.name}`);
  },

  setActiveScheme: (schemeId) => {
    const s = get();
    if (!s.schemes[schemeId]) return;
    const targetScheme = s.schemes[schemeId];
    set({
      activeSchemeId: schemeId,
      selectedFragmentId: null,
      referenceLines: targetScheme.referenceLines || [],
      activeSnapLines: [],
    });
    get().recalculateConflicts();
    get().recalculateEdgeFits();
    get().validateAndFixAllFragments();
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

    const snapshots = { ...s.snapshots };
    delete snapshots[schemeId];

    const remainingIds = Object.keys(schemes);
    const nextActive = s.activeSchemeId === schemeId
      ? remainingIds[0] || null
      : s.activeSchemeId;
    set({
      schemes,
      snapshots,
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

    s.pushHistory('导入碎片', 'import');

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
    s.recalculateConflicts();
    s.recalculateEdgeFits();
    s.persist();
    s.addToast('success', `碎片 #${nextNo} 已导入`);
  },

  removeFragment: (fragmentId) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;
    if (frag.locked) {
      s.addToast('warning', '锁定的碎片无法删除');
      return;
    }
    s.pushHistory('删除碎片', 'remove');
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
    s.recalculateConflicts();
    s.recalculateEdgeFits();
    s.persist();
    s.addToast('info', `碎片 #${frag.fragmentNo} 已删除`);
  },

  updateFragment: (fragmentId, updates) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;

    if (frag.locked) {
      const allowedFields: (keyof Fragment)[] = ['locked'];
      const hasDisallowedUpdate = Object.keys(updates).some(key => !allowedFields.includes(key as keyof Fragment));
      if (hasDisallowedUpdate) {
        s.addToast('warning', '锁定的碎片无法修改');
        return;
      }
    }

    const allFragments = Object.values(scheme.fragmentMap);
    const validation = validateFragmentUpdates(fragmentId, updates, allFragments);

    if (!validation.valid && validation.message) {
      s.addToast('warning', validation.message);
    }

    const updated = { ...frag, ...validation.clamped };
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
    if (frag.locked) {
      s.addToast('warning', '锁定的碎片无法修改裁边');
      return;
    }

    const validation = validateFragmentUpdates(fragmentId, { crop }, Object.values(scheme.fragmentMap));
    if (!validation.valid && validation.message) {
      s.addToast('warning', validation.message);
    }

    const updated = { ...frag, ...validation.clamped };
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
    s.pushHistory('调整层次顺序', 'reorder');
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
    s.persist();
  },

  moveFragmentZIndex: (fragmentId, direction) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const order = [...scheme.fragmentOrder];
    const idx = order.indexOf(fragmentId);
    if (idx === -1) return;
    s.pushHistory('调整层次', 'reorder');
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
    s.reorderFragments(newOrder);
  },

  toggleLock: (fragmentId) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;
    s.pushHistory(frag.locked ? '解锁碎片' : '锁定碎片', 'lock');
    const updated = { ...frag, locked: !frag.locked };
    const updatedScheme = {
      ...scheme,
      fragmentMap: { ...scheme.fragmentMap, [fragmentId]: updated },
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
    });
    s.persist();
    s.addToast(updated.locked ? 'success' : 'info',
      `碎片 #${frag.fragmentNo} 已${updated.locked ? '锁定' : '解锁'}`);
  },

  toggleAligned: (fragmentId) => {
    const s = get();
    const scheme = s.schemes[s.activeSchemeId!];
    if (!scheme) return;
    const frag = scheme.fragmentMap[fragmentId];
    if (!frag) return;
    if (frag.locked) {
      s.addToast('warning', '锁定的碎片无法修改对位状态');
      return;
    }

    if (!frag.aligned) {
      const hasConflict = s.conflicts.some(
        (c) => c.isConflict && (c.fragmentAId === fragmentId || c.fragmentBId === fragmentId)
      );
      if (hasConflict) {
        s.addToast('error', `碎片 #${frag.fragmentNo} 存在重叠冲突，无法标记为已对位`);
        return;
      }
    }

    s.pushHistory(frag.aligned ? '取消对位标记' : '标记已对位', 'align');
    const updated = { ...frag, aligned: !frag.aligned };
    const updatedScheme = {
      ...scheme,
      fragmentMap: { ...scheme.fragmentMap, [fragmentId]: updated },
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
    });
    s.persist();
    if (updated.aligned) {
      s.addToast('success', `碎片 #${frag.fragmentNo} 标记为已对位`);
    } else {
      s.addToast('info', `碎片 #${frag.fragmentNo} 已取消对位标记`);
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
        if (f && f.aligned && !f.locked) {
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
        s.addToast('warning', '存在重叠冲突的碎片已自动取消对位标记');
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

  pushHistory: (description = '操作', action: UndoRedoAction = 'batch') => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const entry: HistoryEntry = {
      schemeId: scheme.id,
      fragmentMap: deepClone(scheme.fragmentMap),
      fragmentOrder: [...scheme.fragmentOrder],
      referenceLines: deepClone(scheme.referenceLines),
      timestamp: Date.now(),
      description,
    };
    const newHistory = scheme.history.slice(0, scheme.historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > HISTORY_LIMIT) {
      newHistory.shift();
    }
    const updatedScheme = {
      ...scheme,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      lastAction: action,
    });
  },

  undo: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) {
      s.addToast('warning', '没有可撤销的操作');
      return;
    }
    if (scheme.historyIndex <= 0) {
      s.addToast('warning', '没有可撤销的操作');
      return;
    }
    const newIndex = scheme.historyIndex - 1;
    const entry = scheme.history[newIndex];
    const updatedScheme = {
      ...scheme,
      fragmentMap: deepClone(entry.fragmentMap),
      fragmentOrder: [...entry.fragmentOrder],
      referenceLines: deepClone(entry.referenceLines || []),
      historyIndex: newIndex,
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      referenceLines: deepClone(entry.referenceLines || []),
    });
    s.recalculateConflicts();
    s.recalculateEdgeFits();
    s.persist();
    s.addToast('info', `已撤销: ${entry.description}`);
  },

  redo: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) {
      s.addToast('warning', '没有可重做的操作');
      return;
    }
    if (scheme.historyIndex >= scheme.history.length - 1) {
      s.addToast('warning', '没有可重做的操作');
      return;
    }
    const newIndex = scheme.historyIndex + 1;
    const entry = scheme.history[newIndex];
    const updatedScheme = {
      ...scheme,
      fragmentMap: deepClone(entry.fragmentMap),
      fragmentOrder: [...entry.fragmentOrder],
      referenceLines: deepClone(entry.referenceLines || []),
      historyIndex: newIndex,
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      referenceLines: deepClone(entry.referenceLines || []),
    });
    s.recalculateConflicts();
    s.recalculateEdgeFits();
    s.persist();
    s.addToast('info', `已重做: ${entry.description}`);
  },

  setSnapEnabled: (enabled) => {
    set({ snapEnabled: enabled });
    get().addToast('info', `边缘吸附已${enabled ? '开启' : '关闭'}`);
  },

  setSnapThreshold: (threshold) => {
    set({ snapThreshold: Math.max(1, Math.min(50, threshold)) });
  },

  setActiveSnapLines: (lines) => {
    set({ activeSnapLines: lines });
  },

  clearSnapLines: () => {
    set({ activeSnapLines: [] });
  },

  calculateSnap: (fragmentId, targetX, targetY) => {
    const s = get();
    if (!s.snapEnabled) {
      return { x: targetX, y: targetY, snapped: false };
    }

    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return { x: targetX, y: targetY, snapped: false };

    const dragging = scheme.fragmentMap[fragmentId];
    if (!dragging) return { x: targetX, y: targetY, snapped: false };

    const otherFragments = Object.values(scheme.fragmentMap).filter(f => f.id !== fragmentId);
    const result = calculateEdgeSnap(dragging, targetX, targetY, otherFragments, s.snapThreshold);

    if (result.snapped) {
      s.setActiveSnapLines(result.lines);
    } else {
      s.clearSnapLines();
    }

    return { x: result.x, y: result.y, snapped: result.snapped };
  },

  setRulerVisible: (visible) => {
    set((s) => ({ ruler: { ...s.ruler, visible } }));
  },

  setRulerUnit: (unit) => {
    set((s) => ({ ruler: { ...s.ruler, unit } }));
  },

  setRulerOrigin: (origin) => {
    set((s) => ({ ruler: { ...s.ruler, origin } }));
  },

  addReferenceLine: (type, position) => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const line: ReferenceLine = {
      id: generateReferenceLineId(),
      type,
      position,
      color: '#B8860B',
      locked: false,
    };
    s.pushHistory('添加参考线', 'reference');
    const newLines = [...scheme.referenceLines, line];
    const updatedScheme = {
      ...scheme,
      referenceLines: newLines,
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      referenceLines: newLines,
    });
    s.persist();
    s.addToast('success', '已添加参考线');
  },

  updateReferenceLine: (id, updates) => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    const newLines = scheme.referenceLines.map(line =>
      line.id === id ? { ...line, ...updates } : line
    );
    const updatedScheme = {
      ...scheme,
      referenceLines: newLines,
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      referenceLines: newLines,
    });
  },

  removeReferenceLine: (id) => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    s.pushHistory('删除参考线', 'reference');
    const newLines = scheme.referenceLines.filter(line => line.id !== id);
    const updatedScheme = {
      ...scheme,
      referenceLines: newLines,
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      referenceLines: newLines,
    });
    s.persist();
  },

  clearReferenceLines: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return;
    if (scheme.referenceLines.length === 0) return;
    s.pushHistory('清除所有参考线', 'reference');
    const updatedScheme = {
      ...scheme,
      referenceLines: [],
      updatedAt: Date.now(),
    };
    set({
      schemes: { ...s.schemes, [scheme.id]: updatedScheme },
      referenceLines: [],
    });
    s.persist();
    s.addToast('info', '已清除所有参考线');
  },

  setMagnifierEnabled: (enabled) => {
    set((s) => ({
      magnifier: { ...s.magnifier, enabled, position: enabled ? s.magnifier.position : null },
    }));
    get().addToast('info', `放大镜已${enabled ? '开启' : '关闭'}`);
  },

  setMagnifierPosition: (position) => {
    set((s) => ({ magnifier: { ...s.magnifier, position } }));
  },

  setMagnifierZoom: (zoom) => {
    set((s) => ({ magnifier: { ...s.magnifier, zoom: Math.max(1.5, Math.min(8, zoom)) } }));
  },

  createSnapshot: (name, description = '') => {
    const s = get();
    const schemeId = s.activeSchemeId;
    if (!schemeId) {
      s.addToast('error', '没有活动方案');
      return '';
    }
    const scheme = s.schemes[schemeId];
    if (!scheme) return '';

    const snapshot: SchemeSnapshot = {
      id: generateSnapshotId(),
      schemeId,
      name,
      description,
      createdAt: Date.now(),
      fragmentMap: deepClone(scheme.fragmentMap),
      fragmentOrder: [...scheme.fragmentOrder],
    };

    const schemeSnapshots = s.snapshots[schemeId] || [];
    set({
      snapshots: {
        ...s.snapshots,
        [schemeId]: [...schemeSnapshots, snapshot],
      },
    });
    s.persist();
    s.addToast('success', `已创建快照: ${name}`);
    return snapshot.id;
  },

  restoreSnapshot: (snapshotId) => {
    const s = get();
    const schemeId = s.activeSchemeId;
    if (!schemeId) return;

    const schemeSnapshots = s.snapshots[schemeId] || [];
    const snapshot = schemeSnapshots.find(snap => snap.id === snapshotId);
    if (!snapshot) {
      s.addToast('error', '快照不存在');
      return;
    }

    s.pushHistory(`恢复快照: ${snapshot.name}`, 'batch');

    const scheme = s.schemes[schemeId];
    if (!scheme) return;

    const updatedScheme = {
      ...scheme,
      fragmentMap: deepClone(snapshot.fragmentMap),
      fragmentOrder: [...snapshot.fragmentOrder],
      updatedAt: Date.now(),
    };

    set({
      schemes: { ...s.schemes, [schemeId]: updatedScheme },
    });
    s.recalculateConflicts();
    s.recalculateEdgeFits();
    s.persist();
    s.addToast('success', `已恢复快照: ${snapshot.name}`);
  },

  deleteSnapshot: (snapshotId) => {
    const s = get();
    const schemeId = s.activeSchemeId;
    if (!schemeId) return;

    const schemeSnapshots = s.snapshots[schemeId] || [];
    const snapshot = schemeSnapshots.find(snap => snap.id === snapshotId);

    set({
      snapshots: {
        ...s.snapshots,
        [schemeId]: schemeSnapshots.filter(snap => snap.id !== snapshotId),
      },
    });
    s.persist();
    if (snapshot) {
      s.addToast('info', `已删除快照: ${snapshot.name}`);
    }
  },

  getSnapshots: () => {
    const s = get();
    const schemeId = s.activeSchemeId;
    if (!schemeId) return [];
    return s.snapshots[schemeId] || [];
  },

  compareWithSnapshot: (snapshotId) => {
    const s = get();
    const schemeId = s.activeSchemeId;
    if (!schemeId) return null;

    const scheme = s.schemes[schemeId];
    if (!scheme) return null;

    const schemeSnapshots = s.snapshots[schemeId] || [];
    const snapshot = schemeSnapshots.find(snap => snap.id === snapshotId);
    if (!snapshot) return null;

    return calculateSchemesDiff(snapshot.fragmentMap, scheme.fragmentMap);
  },

  compareSchemes: (schemeAId, schemeBId) => {
    const s = get();
    const schemeA = s.schemes[schemeAId];
    const schemeB = s.schemes[schemeBId];
    if (!schemeA || !schemeB) return null;

    return calculateSchemesDiff(schemeA.fragmentMap, schemeB.fragmentMap);
  },

  verifyCurrentAlignment: () => {
    const s = get();
    const scheme = s.activeSchemeId ? s.schemes[s.activeSchemeId] : null;
    if (!scheme) return null;

    const fragments = Object.values(scheme.fragmentMap);
    return verifyAlignment(fragments, s.conflicts);
  },

  persist: () => {
    const s = get();
    saveToStorage({
      schemes: s.schemes,
      activeSchemeId: s.activeSchemeId,
      snapshots: s.snapshots,
    });
  },
}));
