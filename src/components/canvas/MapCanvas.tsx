import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import type Konva from 'konva';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';
import FragmentLayer from './FragmentLayer';

const GRID_SIZE = 40;

const MapCanvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const { activeSchemeId, schemes, selectedFragmentId, conflicts } = useAppStore();
  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const { selectAndFocus } = useFragmentOps();

  const selectFragment = useAppStore((s) => s.selectFragment);

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

  const sortedFragments = scheme
    ? scheme.fragmentOrder
        .map((id) => scheme.fragmentMap[id])
        .filter(Boolean)
        .sort((a, b) => a.zIndex - b.zIndex)
    : [];

  const handleResetView = () => {
    setScale(1);
    setOffset({ x: size.width / 2, y: size.height / 2 });
  };

  useEffect(() => {
    handleResetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, activeSchemeId]);

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
        <div>👆 空白处点击 取消选中</div>
      </div>

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={offset.x}
        y={offset.y}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        draggable={!selectedFragmentId}
        onDragEnd={(e) => {
          setOffset({ x: e.target.x(), y: e.target.y() });
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
          {gridLines}
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

        <Layer>
          {sortedFragments.map((fragment) => (
            <FragmentLayer
              key={fragment.id}
              fragment={fragment}
              isSelected={selectedFragmentId === fragment.id}
              onSelect={() => selectAndFocus(fragment.id)}
              isInConflict={conflictIds.has(fragment.id)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default MapCanvas;
