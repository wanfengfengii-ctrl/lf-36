export interface CropEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Fragment {
  id: string;
  schemeId: string;
  fragmentNo: number;
  imageSrc: string;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  crop: CropEdges;
  locked: boolean;
  aligned: boolean;
  zIndex: number;
}

export interface Scheme {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  fragmentMap: Record<string, Fragment>;
  fragmentOrder: string[];
}

export interface Point {
  x: number;
  y: number;
}

export interface OverlapInfo {
  fragmentAId: string;
  fragmentBId: string;
  overlapArea: number;
  overlapRatioA: number;
  overlapRatioB: number;
  isConflict: boolean;
}

export type EdgeType = 'top' | 'right' | 'bottom' | 'left';

export interface EdgeFitScore {
  fragmentAId: string;
  fragmentBId: string;
  edgeA: EdgeType;
  edgeB: EdgeType;
  score: number;
  gapPixels: number;
}

export interface HistoryEntry {
  schemeId: string;
  fragmentMap: Record<string, Fragment>;
  fragmentOrder: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface AppState {
  schemes: Record<string, Scheme>;
  activeSchemeId: string | null;
  selectedFragmentId: string | null;
  conflicts: OverlapInfo[];
  edgeFits: EdgeFitScore[];
  history: HistoryEntry[];
  historyIndex: number;
  toasts: ToastMessage[];
  conflictThreshold: number;
}
