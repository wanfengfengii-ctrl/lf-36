import { useRef, useEffect, useCallback } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';
import { getCroppedDimensions } from '../../utils/geometry';

interface CanvasTransformerProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function CanvasTransformer({ stageRef }: CanvasTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedFragmentId = useAppStore((s) => s.selectedFragmentId);
  const schemes = useAppStore((s) => s.schemes);
  const activeSchemeId = useAppStore((s) => s.activeSchemeId);
  const { changeRotation, finalizeTransform } = useFragmentOps();

  const fragment = selectedFragmentId && activeSchemeId
    ? schemes[activeSchemeId]?.fragmentMap[selectedFragmentId]
    : null;

  const updateTransformer = useCallback(() => {
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (!stage || !tr) return;

    if (!fragment) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const stageContainer = stage.findOne(`#${fragment.id}`) as Konva.Group;
    if (!stageContainer) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const imageNode = stageContainer.findOne('Image') as Konva.Image;
    if (!imageNode) return;

    tr.nodes([imageNode]);
    tr.enabledAnchors(fragment.locked ? [] : ['middle-left', 'middle-right', 'top-center', 'bottom-center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']);
    tr.rotateEnabled(!fragment.locked);
    tr.borderStroke(fragment.locked ? '#C62828' : '#1E3A5F');
    tr.anchorStroke('#1E3A5F');
    tr.anchorFill('#F5F0E1');
    tr.borderDash(fragment.locked ? [6, 3] : undefined);
    tr.getLayer()?.batchDraw();
  }, [fragment, stageRef]);

  useEffect(() => {
    updateTransformer();
  }, [updateTransformer, selectedFragmentId]);

  const handleTransformEnd = useCallback(() => {
    if (!fragment || fragment.locked) return;
    const node = transformerRef.current?.nodes()[0];
    if (!node) return;

    const parent = node.getParent();
    if (!parent) return;

    const newRotation = parent.rotation() % 360;
    if (newRotation !== fragment.rotation) {
      changeRotation(fragment.id, newRotation < 0 ? newRotation + 360 : newRotation);
    }

    parent.rotation(newRotation);
    finalizeTransform();
  }, [fragment, changeRotation, finalizeTransform]);

  return (
    <Transformer
      ref={transformerRef}
      onTransformEnd={handleTransformEnd}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      }}
      padding={4}
      borderStrokeWidth={2}
      anchorSize={8}
      anchorCornerRadius={2}
    />
  );
}
