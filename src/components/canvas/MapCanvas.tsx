import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Text, Circle, Group } from 'react-konva';
import type Konva from 'konva';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';
import FragmentLayer from './FragmentLayer';
import AnnotationLayer from './AnnotationLayer';
import { getCroppedDimensions } from '../../utils/geometry';

const GRID_SIZE = 40;
const RULER_SIZE = 24;
const RULER_TICK_INTERVAL = 40;
const RULER_MAJOR_INTERVAL = 200;

function useImage(src: string): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setLoaded(true);
    };
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  return [image, loaded];
}

const MapCanvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [imageCache, setImageCache] = useState<Record<string, HTMLImageElement | null>>({});

  const {
    activeSchemeId, schemes, selectedFragmentId, conflicts,
    activeSnapLines, referenceLines, ruler, magnifier,
    clearSnapLines, setMagnifierPosition,
  } = useAppStore();
  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const { selectAndFocus } = useFragmentOps();

  const selectFragment = useAppStore((s) => s.selectFragment);

  const sortedFragments = scheme
    ? scheme.fragmentOrder
        .map((id) => scheme.fragmentMap[id])
        .filter(Boolean)
        .sort((a, b) => a.zIndex - b.zIndex)
    : [];

  useEffect(() => {
    sortedFragments.forEach((fragment) => {
      if (!imageCache[fragment.imageSrc]) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setImageCache((prev) => ({ ...prev, [fragment.imageSrc]: img }));
        };
        img.src = fragment.imageSrc;
      }
    });
  }, [sortedFragments, imageCache]);

  const conflictIds = new Set<string>();
  conflicts.forEach((c) => {
    if (c.isConflict) {
      conflictIds.add(c.fragmentAId);
      conflictIds.add(c.fragmentBId);
    }
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      selectFragment(null);
    }
  };

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.current) return;
    const pos = stageRef.current.getPointerPosition();
    if (pos) {
      const x = (pos.x - offset.x) / scale;
      const y = (pos.y - offset.y) / scale;
      setMousePos({ x, y });

      if (magnifier.enabled) {
        setMagnifierPosition({ x, y });
      }
    }
  }, [offset, scale, magnifier.enabled, setMagnifierPosition]);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
    if (magnifier.enabled) {
      setMagnifierPosition(null);
    }
  }, [magnifier.enabled, setMagnifierPosition]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (!stageRef.current) return;
    const stage = stageRef.current;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(4, oldScale * delta));

    const mousePointTo = {
      x: (pointer.x - offset.x) / oldScale,
      y: (pointer.y - offset.y) / oldScale,
    };

    const newOffset = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setOffset(newOffset);
  }, [scale, offset]);

  const handleResetView = () => {
    setScale(1);
    setOffset({ x: size.width / 2, y: size.height / 2 });
  };

  useEffect(() => {
    handleResetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, activeSchemeId]);

  const handleDragEnd = () => {
    clearSnapLines();
  };

  const gridLines: React.ReactElement[] = [];
  const gridRange = 3000;
  for (let i = -gridRange; i <= gridRange; i += GRID_SIZE) {
    const isMajor = i % (GRID_SIZE * 5) === 0;
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[i, -gridRange, i, gridRange]}
        stroke={isMajor ? '#6D5D4E' : '#5A4E42'}
        strokeWidth={isMajor ? 0.7 : 0.3}
        opacity={isMajor ? 0.35 : 0.2}
      />,
      <Line
        key={`h-${i}`}
        points={[-gridRange, i, gridRange, i]}
        stroke={isMajor ? '#6D5D4E' : '#5A4E42'}
        strokeWidth={isMajor ? 0.7 : 0.3}
        opacity={isMajor ? 0.35 : 0.2}
      />
    );
  }

  const renderRulers = () => {
    if (!ruler.visible) return null;

    const rulerElements: React.ReactElement[] = [];
    const start = -gridRange;
    const end = gridRange;

    for (let i = start; i <= end; i += RULER_TICK_INTERVAL) {
      const isMajor = i % RULER_MAJOR_INTERVAL === 0;
      const tickHeight = isMajor ? 12 : 6;

      rulerElements.push(
        <Line
          key={`rt-${i}`}
          points={[i, RULER_SIZE, i, RULER_SIZE - tickHeight]}
          stroke="#8B7355"
          strokeWidth={isMajor ? 1 : 0.5}
          opacity={0.6}
        />
      );

      if (isMajor && i !== 0) {
        rulerElements.push(
          <Text
            key={`rtl-${i}`}
            text={i.toString()}
            x={i + 2}
            y={2}
            fontSize={10}
            fill="#A0826D"
            fontFamily="Noto Sans SC, sans-serif"
          />
        );
      }

      rulerElements.push(
        <Line
          key={`rl-${i}`}
          points={[RULER_SIZE, i, RULER_SIZE - tickHeight, i]}
          stroke="#8B7355"
          strokeWidth={isMajor ? 1 : 0.5}
          opacity={0.6}
        />
      );

      if (isMajor && i !== 0) {
        rulerElements.push(
          <Text
            key={`rll-${i}`}
            text={i.toString()}
            x={2}
            y={i + 2}
            fontSize={10}
            fill="#A0826D"
            fontFamily="Noto Sans SC, sans-serif"
            rotation={-90}
          />
        );
      }
    }

    return (
      <>
        <Rect
          x={-gridRange}
          y={-gridRange}
          width={gridRange * 2}
          height={RULER_SIZE}
          fill="#2A231C"
          opacity={0.95}
          stroke="#4A3C30"
          strokeWidth={0.5}
        />
        <Rect
          x={-gridRange}
          y={-gridRange}
          width={RULER_SIZE}
          height={gridRange * 2}
          fill="#2A231C"
          opacity={0.95}
          stroke="#4A3C30"
          strokeWidth={0.5}
        />
        {rulerElements}
        <Rect
          x={-gridRange}
          y={RULER_SIZE}
          width={gridRange * 2}
          height={1}
          fill="#4A3C30"
        />
        <Rect
          x={RULER_SIZE}
          y={-gridRange}
          width={1}
          height={gridRange * 2}
          fill="#4A3C30"
        />
      </>
    );
  };

  const renderReferenceLines = () => {
    return referenceLines.map((line) => (
      <Line
        key={line.id}
        points={
          line.type === 'vertical'
            ? [line.position, -gridRange, line.position, gridRange]
            : [-gridRange, line.position, gridRange, line.position]
        }
        stroke={line.color}
        strokeWidth={1.5}
        opacity={0.7}
        dash={[8, 4]}
      />
    ));
  };

  const renderSnapLines = () => {
    return activeSnapLines.map((line, idx) => (
      <Line
        key={`snap-${idx}`}
        points={
          line.type === 'vertical'
            ? [line.position, -gridRange, line.position, gridRange]
            : [-gridRange, line.position, gridRange, line.position]
        }
        stroke="#E91E63"
        strokeWidth={2}
        opacity={0.9}
        dash={[6, 3]}
      />
    ));
  };

  const renderMagnifier = () => {
    if (!magnifier.enabled || !magnifier.position || !stageRef.current) return null;

    const { x, y } = magnifier.position;
    const magSize = magnifier.size;
    const halfSize = magSize / 2;
    const zoom = magnifier.zoom;

    const magnifierFragments = sortedFragments.map((fragment) => {
      const { width: croppedW, height: croppedH } = getCroppedDimensions(
        fragment.originalWidth,
        fragment.originalHeight,
        fragment.crop
      );
      const img = imageCache[fragment.imageSrc];
      const offsetX = (x - fragment.x) * zoom;
      const offsetY = (y - fragment.y) * zoom;
      const newX = x - offsetX;
      const newY = y - offsetY;

      return (
        <Group key={`mag-${fragment.id}`}>
          <Rect
            x={newX - (croppedW * zoom) / 2}
            y={newY - (croppedH * zoom) / 2}
            width={croppedW * zoom}
            height={croppedH * zoom}
            rotation={fragment.rotation}
            offsetX={0}
            offsetY={0}
            opacity={fragment.opacity}
            fillPatternImage={img || undefined}
            fillPatternOffset={{ x: fragment.crop.left * zoom, y: fragment.crop.top * zoom }}
            fillPatternRepeat="no-repeat"
            fillPatternScale={{ x: zoom, y: zoom }}
            stroke={selectedFragmentId === fragment.id ? '#1E3A5F' : fragment.aligned ? '#2E7D32' : '#8B7355'}
            strokeWidth={selectedFragmentId === fragment.id ? 2 : 1}
            listening={false}
          />
        </Group>
      );
    });

    return (
      <Group clipFunc={(ctx) => {
        ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      }}>
        <Circle
          x={x}
          y={y}
          radius={halfSize}
          fill="#1E1813"
          opacity={1}
          listening={false}
        />
        {magnifierFragments}
        <Circle
          x={x}
          y={y}
          radius={halfSize}
          stroke="#B8860B"
          strokeWidth={2}
          opacity={0.9}
          listening={false}
        />
        <Circle
          x={x}
          y={y}
          radius={halfSize}
          strokeDasharray={[8, 4]}
          stroke="#8B7355"
          strokeWidth={1}
          opacity={0.5}
          listening={false}
        />
        <Line
          points={[x - halfSize + 10, y, x + halfSize - 10, y]}
          stroke="#B8860B"
          strokeWidth={0.5}
          opacity={0.6}
          listening={false}
        />
        <Line
          points={[x, y - halfSize + 10, x, y + halfSize - 10]}
          stroke="#B8860B"
          strokeWidth={0.5}
          opacity={0.6}
          listening={false}
        />
        <Text
          text={`${Math.round(x)}, ${Math.round(y)}`}
          x={x - 30}
          y={y + halfSize + 5}
          fontSize={11}
          fill="#B8860B"
          fontFamily="Noto Sans SC, sans-serif"
          listening={false}
        />
        <Text
          text={`${(zoom * 100).toFixed(0)}%`}
          x={x - 20}
          y={y - halfSize - 20}
          fontSize={11}
          fill="#B8860B"
          fontFamily="Noto Sans SC, sans-serif"
          fontStyle="bold"
          listening={false}
        />
      </Group>
    );
  };

  const stageWidth = size.width - (ruler.visible ? RULER_SIZE : 0);
  const stageHeight = size.height - (ruler.visible ? RULER_SIZE : 0);
  const stageX = ruler.visible ? RULER_SIZE : 0;
  const stageY = ruler.visible ? RULER_SIZE : 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: `
          radial-gradient(ellipse at center, #3A332A 0%, #2A231C 60%, #1E1813 100%)
        `,
        overflow: 'hidden',
        borderRadius: '6px',
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.03)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          display: 'flex',
          gap: 6,
          background: 'rgba(30, 24, 19, 0.75)',
          border: '1px solid rgba(139,115,85,0.35)',
          borderRadius: 6,
          padding: '6px 8px',
          backdropFilter: 'blur(4px)',
        }}
      >
        <button
          onClick={handleResetView}
          title="重置视图"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#D7CCC8',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 13,
            fontFamily: 'Noto Sans SC, sans-serif',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(184,134,11,0.25)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ⟳ 重置
        </button>
        {mousePos && (
          <div
            style={{
              color: '#A0826D',
              fontSize: 11,
              padding: '4px 8px',
              fontFamily: 'monospace',
              borderLeft: '1px solid rgba(139,115,85,0.35)',
            }}
          >
            {Math.round(mousePos.x)}, {Math.round(mousePos.y)}
          </div>
        )}
        <div
          style={{
            color: '#B8860B',
            fontSize: 12,
            padding: '4px 8px',
            fontFamily: 'Noto Sans SC, sans-serif',
            borderLeft: '1px solid rgba(139,115,85,0.35)',
          }}
        >
          {(scale * 100).toFixed(0)}%
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(30, 24, 19, 0.75)',
          border: '1px solid rgba(139,115,85,0.35)',
          borderRadius: 6,
          padding: '8px 12px',
          backdropFilter: 'blur(4px)',
          color: '#A0826D',
          fontSize: 11,
          fontFamily: 'Noto Sans SC, sans-serif',
          lineHeight: 1.6,
        }}
      >
        <div>🖱️ 左键拖动碎片 · Shift+旋转 15° 步进</div>
        <div>🖲️ 滚轮缩放画布 · 双击碎片 锁定/解锁</div>
        <div>👆 空白处点击 取消选中 · 边缘自动吸附</div>
      </div>

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={0}
        y={0}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        draggable={!selectedFragmentId}
        onDragEnd={(e) => {
          setOffset({ x: e.target.x(), y: e.target.y() });
          handleDragEnd();
        }}
      >
        <Layer>
          <Rect
            x={-gridRange}
            y={-gridRange}
            width={gridRange * 2}
            height={gridRange * 2}
            fill="transparent"
          />
          {renderRulers()}
        </Layer>

        <Layer
          x={stageX + offset.x}
          y={stageY + offset.y}
          scaleX={scale}
          scaleY={scale}
        >
          {gridLines}
          {renderReferenceLines()}
          {renderSnapLines()}
          <Line
            points={[-gridRange, 0, gridRange, 0]}
            stroke="#B8860B"
            strokeWidth={1}
            opacity={0.5}
          />
          <Line
            points={[0, -gridRange, 0, gridRange]}
            stroke="#B8860B"
            strokeWidth={1}
            opacity={0.5}
          />
          <Text
            text="古地图工作台 · 原点 (0, 0)"
            x={8}
            y={-20}
            fontSize={12}
            fill="#8B7355"
            fontFamily="Noto Serif SC, serif"
            opacity={0.6}
          />
        </Layer>

        <Layer
          x={stageX + offset.x}
          y={stageY + offset.y}
          scaleX={scale}
          scaleY={scale}
        >
          {sortedFragments.map((fragment) => (
            <FragmentLayer
              key={fragment.id}
              fragment={fragment}
              isSelected={selectedFragmentId === fragment.id}
              onSelect={() => selectAndFocus(fragment.id)}
              isInConflict={conflictIds.has(fragment.id)}
            />
          ))}
          <AnnotationLayer />
          {renderMagnifier()}
        </Layer>
      </Stage>
    </div>
  );
};

export default MapCanvas;
