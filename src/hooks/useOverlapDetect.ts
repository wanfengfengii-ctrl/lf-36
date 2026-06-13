import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { OverlapInfo, EdgeFitScore } from '../types';

export function useOverlapDetect() {
  const conflicts = useAppStore((s) => s.conflicts);
  const edgeFits = useAppStore((s) => s.edgeFits);
  const threshold = useAppStore((s) => s.conflictThreshold);
  const setThreshold = useAppStore((s) => s.setConflictThreshold);
  const activeSchemeId = useAppStore((s) => s.activeSchemeId);
  const schemes = useAppStore((s) => s.schemes);
  const selectedFragmentId = useAppStore((s) => s.selectedFragmentId);

  const activeScheme = activeSchemeId ? schemes[activeSchemeId] : null;

  const conflictCount = useMemo(
    () => conflicts.filter((c) => c.isConflict).length,
    [conflicts]
  );

  const conflictsForSelected = useMemo((): OverlapInfo[] => {
    if (!selectedFragmentId) return [];
    return conflicts.filter(
      (c) => c.fragmentAId === selectedFragmentId || c.fragmentBId === selectedFragmentId
    );
  }, [conflicts, selectedFragmentId]);

  const edgeFitsForSelected = useMemo((): EdgeFitScore[] => {
    if (!selectedFragmentId) return [];
    return edgeFits.filter(
      (e) => e.fragmentAId === selectedFragmentId || e.fragmentBId === selectedFragmentId
    );
  }, [edgeFits, selectedFragmentId]);

  const getFragmentLabel = useCallback(
    (id: string): string => {
      const f = activeScheme?.fragmentMap[id];
      return f ? `#${f.fragmentNo}` : id;
    },
    [activeScheme]
  );

  return {
    conflicts,
    edgeFits,
    threshold,
    setThreshold,
    conflictCount,
    conflictsForSelected,
    edgeFitsForSelected,
    getFragmentLabel,
  };
}
