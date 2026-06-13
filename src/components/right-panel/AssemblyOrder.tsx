import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  styled,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  VerticalAlignTop as TopIcon,
  VerticalAlignBottom as BottomIcon,
  Layers as LayerIcon,
} from '@mui/icons-material';
import type { Fragment } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';

const SortableItem = styled(ListItem)<{ 'data-is-active': boolean; 'data-selected': boolean }>(
  ({ theme, ...props }) => ({
    borderRadius: theme.shape.borderRadius,
    mb: 3,
    border: `1px solid ${props['data-selected'] ? theme.palette.info.main : theme.palette.divider}`,
    background: props['data-selected'] ? `${theme.palette.info.main}12` : theme.palette.background.paper,
    transition: 'all 0.2s ease',
    transform: props['data-is-active'] ? 'scale(1.03) rotate(-0.5deg)' : undefined,
    boxShadow: props['data-is-active'] ? theme.shadows[4] : 'none',
    opacity: props['data-is-active'] ? 0.9 : 1,
    zIndex: props['data-is-active'] ? 100 : 1,
  })
);

interface SortableFragmentItemProps {
  fragment: Fragment;
  index: number;
  isSelected: boolean;
  total: number;
  onSelect: () => void;
  onMove: (direction: 'up' | 'down' | 'top' | 'bottom') => void;
}

const SortableFragmentItem: React.FC<SortableFragmentItemProps> = ({
  fragment,
  index,
  isSelected,
  total,
  onSelect,
  onMove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fragment.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SortableItem
      ref={setNodeRef}
      style={style}
      data-is-active={isDragging}
      data-selected={isSelected}
      dense
      secondaryAction={
        <Stack direction="row" spacing={0.2} sx={{ pr: 0.5 }}>
          <Tooltip title="置于底层">
            <span>
              <IconButton
                size="small"
                disabled={index === 0 || fragment.locked}
                onClick={() => onMove('bottom')}
                sx={{ p: 0.3 }}
              >
                <BottomIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="下移">
            <span>
              <IconButton
                size="small"
                disabled={index === 0 || fragment.locked}
                onClick={() => onMove('down')}
                sx={{ p: 0.3 }}
              >
                <DownIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="上移">
            <span>
              <IconButton
                size="small"
                disabled={index === total - 1 || fragment.locked}
                onClick={() => onMove('up')}
                sx={{ p: 0.3 }}
              >
                <UpIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="置于顶层">
            <span>
              <IconButton
                size="small"
                disabled={index === total - 1 || fragment.locked}
                onClick={() => onMove('top')}
                sx={{ p: 0.3 }}
              >
                <TopIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      }
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mr: 1,
          cursor: fragment.locked ? 'not-allowed' : 'grab',
          color: fragment.locked ? 'action.disabled' : 'text.secondary',
          opacity: fragment.locked ? 0.4 : 1,
        }}
        {...(fragment.locked ? {} : { ...attributes, ...listeners })}
      >
        <DragIcon sx={{ fontSize: 18 }} />
      </Box>
      <ListItemAvatar sx={{ minWidth: 40 }}>
        <Avatar
          variant="rounded"
          src={fragment.imageSrc}
          sx={{
            width: 36,
            height: 36,
            borderRadius: 3,
            border: `1px solid ${fragment.aligned ? 'success.main' : 'divider'}`,
          }}
        />
      </ListItemAvatar>
      <ListItemText
        onClick={onSelect}
        sx={{ cursor: 'pointer', m: 0 }}
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'Noto Serif SC, serif',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              #{fragment.fragmentNo}
            </Typography>
            {fragment.aligned && (
              <Chip
                label="对位"
                size="small"
                color="success"
                variant="outlined"
                sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.7 } }}
              />
            )}
            {fragment.locked && (
              <Chip
                label="🔒"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
              />
            )}
          </Box>
        }
        secondary={
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
            图层 {index + 1} / {total} · zIndex {fragment.zIndex}
          </Typography>
        }
        disableTypography
      />
    </SortableItem>
  );
};

const AssemblyOrder: React.FC = () => {
  const { scheme, fragments, selectAndFocus } = useFragmentOps();
  const reorder = useAppStore((s) => s.reorderFragments);
  const moveZIndex = useAppStore((s) => s.moveFragmentZIndex);
  const selectedId = useAppStore((s) => s.selectedFragmentId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!scheme) return null;

  const ordered = scheme.fragmentOrder
    .map((id) => scheme.fragmentMap[id])
    .filter(Boolean) as Fragment[];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = scheme.fragmentOrder.indexOf(active.id as string);
      const newIndex = scheme.fragmentOrder.indexOf(over.id as string);
      if (oldIndex >= 0 && newIndex >= 0) {
        const newOrder = arrayMove(scheme.fragmentOrder, oldIndex, newIndex);
        reorder(newOrder);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, px: 0.5 }}>
        <LayerIcon sx={{ color: 'secondary.dark', fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600, flex: 1 }}>
          拼幅顺序 / 图层
        </Typography>
        <Chip
          label={`${fragments.length} 层`}
          size="small"
          sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
        />
      </Box>
      <Divider sx={{ mb: 1 }} />
      <Typography variant="caption" color="text.disabled" sx={{ px: 0.5, mb: 1, display: 'block', fontSize: 10 }}>
        拖拽手柄排序，顶部为最底层 · 双击碎片可锁定
      </Typography>
      {ordered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" color="text.disabled">
            暂无碎片
          </Typography>
        </Box>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={scheme.fragmentOrder} strategy={verticalListSortingStrategy}>
            <List disablePadding sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
              {ordered.map((fragment, index) => (
                <SortableFragmentItem
                  key={fragment.id}
                  fragment={fragment}
                  index={index}
                  isSelected={selectedId === fragment.id}
                  total={ordered.length}
                  onSelect={() => selectAndFocus(fragment.id)}
                  onMove={(dir) => moveZIndex(fragment.id, dir)}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>
      )}
    </Box>
  );
};

export default AssemblyOrder;
