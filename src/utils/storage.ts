import type { Scheme, SchemeSnapshot } from '../types';

const STORAGE_KEY = 'ancient_map_workbench';

export interface StorageData {
  schemes: Record<string, Scheme>;
  activeSchemeId: string | null;
  snapshots?: Record<string, SchemeSnapshot[]>;
}

export function loadFromStorage(): StorageData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StorageData;
    Object.values(data.schemes).forEach(scheme => {
      if (!scheme.history) scheme.history = [];
      if (typeof scheme.historyIndex !== 'number') scheme.historyIndex = -1;
    });
    return data;
  } catch {
    return null;
  }
}

export function saveToStorage(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('保存到 localStorage 失败:', e);
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportSchemeToJSON(scheme: Scheme): string {
  const allFragments = Object.values(scheme.fragmentMap);
  const alignedFragments = allFragments.filter(f => f.aligned);
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    scheme: {
      id: scheme.id,
      name: scheme.name,
      createdAt: scheme.createdAt,
      updatedAt: scheme.updatedAt,
      totalFragments: allFragments.length,
      exportedFragments: alignedFragments.length,
      fragments: alignedFragments.map((f) => ({
        ...f,
        imageSrc: f.imageSrc,
      })),
      fragmentOrder: scheme.fragmentOrder.filter(id => scheme.fragmentMap[id]?.aligned),
    },
  };
  return JSON.stringify(exportData, null, 2);
}

export function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface ImageInfo {
  src: string;
  width: number;
  height: number;
}

export function loadImageInfo(src: string): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        src,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = src;
  });
}
