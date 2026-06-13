import React, { useCallback } from 'react';
import { Group, Rect, Text, Circle, Tag, Label } from 'react-konva';
import type Konva from 'konva';
import type { Annotation, AnnotationType, AnnotationPriority } from '../../types';
import { useAppStore } from '../../store/useAppStore';

function getAnnotationColor(type: AnnotationType): string {
  const colors: Record<AnnotationType, string> = {
    research: '#B8860B',
    issue: '#C62828',
    suggestion: '#2E7D32',
    question: '#1565C0',
    info: '#6A1B9A',
  };
  return colors[type];
}

function getAnnotationLabel(type: AnnotationType): string {
  const labels: Record<AnnotationType, string> = {
    research: '考',
    issue: '题',
    suggestion: '建',
    question: '问',
    info: '注',
  };
  return labels[type];
}

function getPriorityColor(priority: AnnotationPriority): string {
  const colors: Record<AnnotationPriority, string> = {
    low: '#9E9E9E',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#B71C1C',
  };
  return colors[priority];
}

interface AnnotationMarkerProps {
  annotation: Annotation;
  isSelected: boolean;
  onClick: () => void;
}

const AnnotationMarker: React.FC<AnnotationMarkerProps> = ({ annotation, isSelected, onClick }) => {
  const color = getAnnotationColor(annotation.type);
  const label = getAnnotationLabel(annotation.type);
  const priorityColor = getPriorityColor(annotation.priority);

  if (annotation.bounds) {
    const { x, y, width, height } = annotation.bounds;
    return (
      <Group onClick={onClick}>
        <Rect
          x={x - width / 2}
          y={y - height / 2}
          width={width}
          height={height}
          stroke={color}
          strokeWidth={isSelected ? 3 : 2}
          dash={[6, 4]}
          opacity={annotation.status === 'resolved' || annotation.status === 'closed' ? 0.4 : 0.9}
          fill={color}
          fillOpacity={isSelected ? 0.1 : 0.05}
          cornerRadius={4}
        />
        <Label x={x + width / 2 - 8} y={y - height / 2 - 24}>
          <Tag
            fill={color}
            cornerRadius={4}
            shadowBlur={isSelected ? 8 : 4}
            shadowOpacity={0.3}
            shadowOffset={{ x: 1, y: 2 }}
          />
          <Text
            text={label}
            fill="#F5F0E1"
            fontSize={12}
            fontStyle="bold"
            fontFamily="Noto Serif SC, serif"
            padding={4}
          />
        </Label>
        {annotation.priority === 'high' || annotation.priority === 'critical' ? (
          <Circle
            x={x - width / 2 + 8}
            y={y - height / 2 + 8}
            radius={5}
            fill={priorityColor}
            stroke="#F5F0E1"
            strokeWidth={1.5}
          />
        ) : null}
      </Group>
    );
  }

  if (annotation.fragmentId) {
    return null;
  }

  return null;
};

interface FragmentAnnotationBadgeProps {
  annotation: Annotation;
  fragmentX: number;
  fragmentY: number;
  fragmentWidth: number;
  fragmentHeight: number;
  isSelected: boolean;
  onClick: () => void;
}

const FragmentAnnotationBadge: React.FC<FragmentAnnotationBadgeProps> = ({
  annotation,
  fragmentX,
  fragmentY,
  fragmentWidth,
  fragmentHeight,
  isSelected,
  onClick,
}) => {
  const color = getAnnotationColor(annotation.type);
  const label = getAnnotationLabel(annotation.type);
  const badgeSize = 22;
  const badgeX = fragmentX + fragmentWidth / 2 - badgeSize / 2;
  const badgeY = fragmentY - fragmentHeight / 2 - badgeSize - 6;

  return (
    <Group onClick={onClick}>
      <Circle
        x={badgeX + badgeSize / 2}
        y={badgeY + badgeSize / 2}
        radius={badgeSize / 2}
        fill={color}
        stroke={isSelected ? '#F5F0E1' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        shadowBlur={isSelected ? 8 : 4}
        shadowOpacity={0.4}
        shadowOffset={{ x: 1, y: 2 }}
        opacity={annotation.status === 'resolved' || annotation.status === 'closed' ? 0.5 : 1}
      />
      <Text
        text={label}
        x={badgeX}
        y={badgeY + 5}
        width={badgeSize}
        height={badgeSize}
        align="center"
        verticalAlign="middle"
        fontSize={11}
        fontStyle="bold"
        fontFamily="Noto Serif SC, serif"
        fill="#F5F0E1"
        listening={false}
      />
    </Group>
  );
};

const AnnotationLayer: React.FC = () => {
  const {
    activeSchemeId,
    schemes,
    selectedAnnotationId,
    selectAnnotation,
    annotationMode,
    getFilteredAnnotations,
  } = useAppStore();

  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const annotations = getFilteredAnnotations();

  const handleAnnotationClick = useCallback((annotationId: string) => {
    selectAnnotation(annotationId);
  }, [selectAnnotation]);

  if (!annotationMode || !scheme || annotations.length === 0) {
    return null;
  }

  const fragmentAnnotations = annotations.filter((a) => a.fragmentId && !a.bounds);
  const areaAnnotations = annotations.filter((a) => a.bounds);

  const fragmentBadges = fragmentAnnotations.map((annotation) => {
    const fragment = scheme.fragmentMap[annotation.fragmentId!];
    if (!fragment) return null;

    const croppedW = fragment.originalWidth - fragment.crop.left - fragment.crop.right;
    const croppedH = fragment.originalHeight - fragment.crop.top - fragment.crop.bottom;

    return (
      <FragmentAnnotationBadge
        key={annotation.id}
        annotation={annotation}
        fragmentX={fragment.x}
        fragmentY={fragment.y}
        fragmentWidth={croppedW}
        fragmentHeight={croppedH}
        isSelected={selectedAnnotationId === annotation.id}
        onClick={() => handleAnnotationClick(annotation.id)}
      />
    );
  });

  const areaMarkers = areaAnnotations.map((annotation) => (
    <AnnotationMarker
      key={annotation.id}
      annotation={annotation}
      isSelected={selectedAnnotationId === annotation.id}
      onClick={() => handleAnnotationClick(annotation.id)}
    />
  ));

  return (
    <>
      {fragmentBadges}
      {areaMarkers}
    </>
  );
};

export default AnnotationLayer;
