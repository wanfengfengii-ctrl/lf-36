import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { exportSchemeToJSON, downloadJSON } from '../utils/storage';
import { validateExportReadiness } from '../utils/validators';

export function useSchemeManager() {
  const schemes = useAppStore((s) => s.schemes);
  const activeSchemeId = useAppStore((s) => s.activeSchemeId);
  const createScheme = useAppStore((s) => s.createScheme);
  const setActiveScheme = useAppStore((s) => s.setActiveScheme);
  const renameScheme = useAppStore((s) => s.renameScheme);
  const deleteScheme = useAppStore((s) => s.deleteScheme);
  const addToast = useAppStore((s) => s.addToast);

  const schemeList = useMemo(
    () =>
      Object.values(schemes).sort((a, b) => b.updatedAt - a.updatedAt),
    [schemes]
  );

  const activeScheme = activeSchemeId ? schemes[activeSchemeId] : null;

  const fragmentCounts = useMemo(() => {
    const counts: Record<string, { total: number; aligned: number }> = {};
    Object.values(schemes).forEach((scheme) => {
      const frags = Object.values(scheme.fragmentMap);
      counts[scheme.id] = {
        total: frags.length,
        aligned: frags.filter((f) => f.aligned).length,
      };
    });
    return counts;
  }, [schemes]);

  const handleExport = useCallback(() => {
    if (!activeScheme) {
      addToast('error', '没有可导出的方案');
      return;
    }
    const check = validateExportReadiness(activeScheme);
    if (!check.ready) {
      addToast('error', check.message!);
      return;
    }
    try {
      const json = exportSchemeToJSON(activeScheme);
      const filename = `${activeScheme.name.replace(/[\\/:\*\?"<>\|]/g, '_')}_${Date.now()}.json`;
      downloadJSON(json, filename);
      addToast('success', `方案已导出：${filename}`);
    } catch {
      addToast('error', '导出失败');
    }
  }, [activeScheme, addToast]);

  const handleImportJSON = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.scheme || !data.scheme.fragments) {
          throw new Error('无效的方案文件');
        }
        const imported = data.scheme;
        const name = `${imported.name || '导入方案'} (导入)`;
        createScheme(name);
        addToast('success', '方案已导入');
      } catch (e) {
        addToast('error', '导入失败：无效的 JSON 格式');
      }
    },
    [createScheme, addToast]
  );

  return {
    schemeList,
    activeScheme,
    activeSchemeId,
    fragmentCounts,
    createScheme,
    setActiveScheme,
    renameScheme,
    deleteScheme,
    handleExport,
    handleImportJSON,
  };
}
