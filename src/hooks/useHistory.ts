import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useHistory() {
  const history = useAppStore((s) => s.history);
  const historyIndex = useAppStore((s) => s.historyIndex);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  return {
    history,
    historyIndex,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  };
}
