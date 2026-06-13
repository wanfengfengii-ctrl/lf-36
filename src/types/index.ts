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
  updatedAt: number;
  createdAt: number;
  fragmentMap: Record<string, Fragment>;
  fragmentOrder: string[];
  referenceLines: ReferenceLine[];
  history: HistoryEntry[];
  historyIndex: number;
  thumbnail?: string;
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
  referenceLines: ReferenceLine[];
  timestamp: number;
  description: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;
  sourceFragmentId: string;
  targetFragmentId: string;
  edge: EdgeType;
}

export interface SnapResult {
  snapped: boolean;
  x: number;
  y: number;
  lines: SnapLine[];
}

export interface RulerState {
  visible: boolean;
  unit: 'px' | 'cm' | 'in';
  origin: Point;
}

export interface ReferenceLine {
  id: string;
  type: 'vertical' | 'horizontal';
  position: number;
  color: string;
  locked: boolean;
}

export interface MagnifierState {
  enabled: boolean;
  position: Point | null;
  zoom: number;
  size: number;
}

export interface SchemeSnapshot {
  id: string;
  schemeId: string;
  name: string;
  description: string;
  createdAt: number;
  fragmentMap: Record<string, Fragment>;
  fragmentOrder: string[];
  thumbnail?: string;
}

export interface DiffChange {
  fragmentId: string;
  fragmentNo: number;
  field: keyof Fragment;
  oldValue: unknown;
  newValue: unknown;
}

export interface DiffResult {
  added: Fragment[];
  removed: Fragment[];
  modified: DiffChange[];
  unchanged: string[];
}

export interface AlignmentVerification {
  allAligned: boolean;
  totalFragments: number;
  alignedCount: number;
  unalignedFragments: string[];
  conflictFragments: string[];
  issues: string[];
}

export type UndoRedoAction =
  | 'move'
  | 'rotate'
  | 'opacity'
  | 'crop'
  | 'add'
  | 'remove'
  | 'lock'
  | 'align'
  | 'reorder'
  | 'import'
  | 'reference'
  | 'batch';

export interface AppState {
  schemes: Record<string, Scheme>;
  activeSchemeId: string | null;
  selectedFragmentId: string | null;
  conflicts: OverlapInfo[];
  edgeFits: EdgeFitScore[];
  toasts: ToastMessage[];
  conflictThreshold: number;
  snapEnabled: boolean;
  snapThreshold: number;
  activeSnapLines: SnapLine[];
  ruler: RulerState;
  referenceLines: ReferenceLine[];
  magnifier: MagnifierState;
  snapshots: Record<string, SchemeSnapshot[]>;
  lastAction: UndoRedoAction | null;
}
