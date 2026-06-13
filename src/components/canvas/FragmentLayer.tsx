import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Image, Rect, Group, Text, Transformer as KonvaTransformer } from 'react-konva';
import type Konva from 'konva';
import type { Fragment } from '../../types';
import { getCroppedDimensions } from '../../utils/geometry';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';
import { detectConflictAtPosition } from '../../utils/geometry';

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

interface FragmentLayerProps {
  fragment: Fragment;
  isSelected: boolean;
  onSelect: () => void;
  isInConflict: boolean;
}

const FragmentLayer: React.FC<FragmentLayerProps> = ({ fragment, isSelected, onSelect, isInConflict }) => {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const groupRef = useRef<Konva.Group>(null);
  const [image] = useImage(fragment.imageSrc);
  const isDragging = useRef(false);

  const { changePosition, changeRotation, prepareTransform, finalizeTransform, selectAndFocus } = useFragmentOps();
  const { toggleLock, calculateSnap, clearSnapLines, snapEnabled, conflictThreshold, schemes, activeSchemeId, addToast } = useAppStore();

  const { width: croppedW, height: croppedH } = getCroppedDimensions(
    fragment.originalWidth,
    fragment.originalHeight,
    fragment.crop
  );

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current && !fragment.locked) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else if (trRef.current) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, fragment.locked]);

  const handleDragStart = () => {
    isDragging.current = true;
    prepareTransform('移动碎片', 'move');
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (fragment.locked) return;
    const topLeftX = e.target.x();
    const topLeftY = e.target.y();
    const centerX = topLeftX + croppedW / 2;
    const centerY = topLeftY + croppedH / 2;

    if (snapEnabled) {
      const result = calculateSnap(fragment.id, centerX, centerY);
      if (result.snapped) {
        e.target.x(result.x - croppedW / 2);
        e.target.y(result.y - croppedH / 2);
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    isDragging.current = false;
    if (fragment.locked) {
      e.target.to({ x: fragment.x - croppedW / 2, y: fragment.y - croppedH / 2, duration: 0.1 });
      return;
    }

    let finalX = e.target.x();
    let finalY = e.target.y();
    const centerX = finalX + croppedW / 2;
    const centerY = finalY + croppedH / 2;

    if (snapEnabled) {
      const result = calculateSnap(fragment.id, centerX, centerY);
      finalX = result.x - croppedW / 2;
      finalY = result.y - croppedH / 2;
      e.target.x(finalX);
      e.target.y(finalY);
    }

    const newX = finalX + croppedW / 2;
    const newY = finalY + croppedH / 2;

    const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
    if (scheme) {
      const others = Object.values(scheme.fragmentMap).filter(f => f.id !== fragment.id);
      const conflict = detectConflictAtPosition(fragment, newX, newY, others, conflictThreshold);
      if (conflict.hasConflict) {
        e.target.to({
          x: fragment.x - croppedW / 2,
          y: fragment.y - croppedH / 2,
          duration: 0.2,
        });
        clearSnapLines();
        addToast('error', `碎片 #${fragment.fragmentNo} 与其他碎片重叠过大，已回弹`);
        return;
      }
    }

    changePosition(fragment.id, newX, newY);
    clearSnapLines();
    finalizeTransform();
  };

  const handleTransformEnd = () => {
    if (fragment.locked || !shapeRef.current) return;
    const node = shapeRef.current;
    const rotation = node.rotation();
    const topLeftX = node.x();
    const topLeftY = node.y();
    const centerX = topLeftX + croppedW / 2;
    const centerY = topLeftY + croppedH / 2;
    changeRotation(fragment.id, rotation);
    changePosition(fragment.id, centerX, centerY);
    node.scaleX(1);
    node.scaleY(1);
    clearSnapLines();
    finalizeTransform();
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect();
    selectAndFocus(fragment.id);
  };

  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    e.cancelBubble = true;
    onSelect();
    selectAndFocus(fragment.id);
  };

  const handleTransformStart = () => {
    prepareTransform('旋转碎片', 'rotate');
  };

  const handleDblClick = () => {
    toggleLock(fragment.id);
  };

  const strokeColor = isInConflict
    ? '#C62828'
    : isSelected
    ? '#1E3A5F'
    : fragment.aligned
    ? '#2E7D32'
    : fragment.locked
    ? '#8D6E63'
    : '#8B7355';

  const strokeWidth = isInConflict ? 4 : isSelected ? 3 : 1.5;

  return (
    <Group
      ref={groupRef}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
    >
      <Rect
        ref={shapeRef}
        x={fragment.x - croppedW / 2}
        y={fragment.y - croppedH / 2}
        width={croppedW}
        height={croppedH}
        rotation={fragment.rotation}
        offsetX={0}
        offsetY={0}
        draggable={!fragment.locked}
        opacity={fragment.locked ? fragment.opacity * 0.85 : fragment.opacity}
        fillPatternImage={image}
        fillPatternOffset={{ x: fragment.crop.left, y: fragment.crop.top }}
        fillPatternRepeat="no-repeat"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        shadowBlur={isSelected ? 12 : 4}
        shadowColor={isInConflict ? '#C62828' : isSelected ? '#1E3A5F' : '#000000'}
        shadowOpacity={isSelected ? 0.35 : 0.15}
        shadowOffset={{ x: 2, y: 3 }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
      />
      <Group
        x={fragment.x}
        y={fragment.y}
        rotation={fragment.rotation}
        listening={false}
      >
        <Rect
          x={-croppedW / 2 + 6}
          y={-croppedH / 2 + 6}
          width={Math.min(46, croppedW - 12)}
          height={24}
          fill={strokeColor}
          opacity={0.92}
          cornerRadius={3}
        />
        <Text
          text={`#${fragment.fragmentNo}`}
          x={-croppedW / 2 + 6}
          y={-croppedH / 2 + 10}
          width={Math.min(46, croppedW - 12)}
          height={16}
          align="center"
          verticalAlign="middle"
          fontSize={12}
          fontStyle="bold"
          fontFamily="Noto Serif SC, serif"
          fill="#F5F0E1"
        />
        {fragment.locked && (
          <Text
            text="🔒"
            x={croppedW / 2 - 28}
            y={-croppedH / 2 + 8}
            fontSize={14}
          />
        )}
        {fragment.aligned && !fragment.locked && (
          <Text
            text="✓"
            x={croppedW / 2 - 24}
            y={-croppedH / 2 + 9}
            fontSize={14}
            fontStyle="bold"
            fill="#2E7D32"
          />
        )}
      </Group>
      {isSelected && !fragment.locked && trRef.current && (
        <KonvaTransformer
          ref={trRef}
          node={shapeRef.current}
          boundBoxFunc={(oldBox, newBox) => newBox}
          rotateEnabled={true}
          enabledAnchors={[
            'top-left', 'top-right', 'bottom-left', 'bottom-right',
            'middle-left', 'middle-right', 'top-center', 'bottom-center',
          ]}
          rotationSnaps={[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345]}
          rotationSnapTolerance={8}
          rotateAnchorOffset={36}
          anchorSize={10}
          borderStroke="#1E3A5F"
          borderStrokeWidth={2}
          anchorStroke="#1E3A5F"
          anchorFill="#F5F0E1"
          anchorCornerRadius={2}
          anchorStrokeWidth={1.5}
        />
      )}
    </Group>
  );
};

export default FragmentLayer;
