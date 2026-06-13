import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
  styled,
  Divider,
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  RadioButtonUnchecked as UnalignedIcon,
} from '@mui/icons-material';
import type { Fragment } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps, useSelectedFragment } from '../../hooks/useFragmentOps';

const StyledListItem = styled(ListItemButton)<{ selected: boolean; inconflict: string }>(
  ({ theme, selected, inconflict }) => ({
    borderRadius: theme.shape.borderRadius,
    mb: 4,
    border: selected
      ? `2px solid ${theme.palette.info.main}`
      : inconflict === 'true'
      ? `2px solid ${theme.palette.error.main}`
      : `1px solid ${theme.palette.divider}`,
    background: selected
      ? `linear-gradient(135deg, ${theme.palette.info.main}15 0%, ${theme.palette.info.main}08 100%)`
      : theme.palette.background.paper,
    transition: 'all 0.2s ease',
    animation: inconflict === 'true' ? 'conflictPulse 1.5s ease-in-out infinite' : 'none',
    '@keyframes conflictPulse': {
      '0%, 100%': { boxShadow: `0 0 0 0 ${theme.palette.error.main}50` },
      '50%': { boxShadow: `0 0 8px 2px ${theme.palette.error.main}60` },
    },
    '&:hover': {
      transform: 'translateX(2px)',
      background: selected ? undefined : theme.palette.action.hover,
    },
  })
);

const ThumbnailAvatar = styled(Avatar)<{ locked: string }>(({ theme, locked }) => ({
  width: 52,
  height: 52,
  borderRadius: theme.shape.borderRadius,
  border: locked === 'true' ? `2px solid ${theme.palette.warning.light}` : `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.default,
  opacity: locked === 'true' ? 0.75 : 1,
}));

const FragmentList: React.FC = () => {
  const { fragments, toggleLock, toggleAligned, removeFragment, selectAndFocus } = useFragmentOps();
  const selected = useSelectedFragment();
  const conflicts = useAppStore((s) => s.conflicts);

  const conflictIds = new Set<string>();
  conflicts.forEach((c) => {
    if (c.isConflict) {
      conflictIds.add(c.fragmentAId);
      conflictIds.add(c.fragmentBId);
    }
  });

  const sorted = [...fragments].sort((a, b) => a.fragmentNo - b.fragmentNo);

  const getStatusChip = (f: Fragment) => {
    if (f.locked) {
      return (
        <Chip
          icon={<LockIcon fontSize="inherit" />}
          label="已锁定"
          size="small"
          color="warning"
          variant="outlined"
          sx={{ height: 20, fontSize: 10, '& .MuiChip-icon': { fontSize: 12 } }}
        />
      );
    }
    if (f.aligned) {
      return (
        <Chip
          icon={<CheckIcon fontSize="inherit" />}
          label="已对位"
          size="small"
          color="success"
          variant="outlined"
          sx={{ height: 20, fontSize: 10, '& .MuiChip-icon': { fontSize: 12 } }}
        />
      );
    }
    return (
      <Chip
        icon={<UnalignedIcon fontSize="inherit" />}
        label="待处理"
        size="small"
        color="default"
        variant="outlined"
        sx={{ height: 20, fontSize: 10, '& .MuiChip-icon': { fontSize: 12 } }}
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 0.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Noto Serif SC, serif' }}>
          碎片列表
        </Typography>
        <Chip
          label={`${fragments.length} 张`}
          size="small"
          sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
        />
      </Box>
      <Divider sx={{ mb: 1 }} />
      {sorted.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.disabled">
            暂无碎片，请先导入扫描图像
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
          {sorted.map((fragment) => (
            <ListItem key={fragment.id} disablePadding dense>
              <StyledListItem
                selected={selected?.id === fragment.id}
                inconflict={conflictIds.has(fragment.id).toString()}
                onClick={() => selectAndFocus(fragment.id)}
              >
                <ListItemAvatar sx={{ minWidth: 60 }}>
                  <ThumbnailAvatar
                    variant="rounded"
                    locked={fragment.locked.toString()}
                    src={fragment.imageSrc}
                    alt={`#${fragment.fragmentNo}`}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontFamily: 'Noto Serif SC, serif',
                          fontWeight: 700,
                          color: conflictIds.has(fragment.id) ? 'error.main' : 'text.primary',
                        }}
                      >
                        #{fragment.fragmentNo}
                      </Typography>
                      {getStatusChip(fragment)}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.3 }}>
                      <Typography variant="caption" color="text.disabled">
                        {fragment.originalWidth}×{fragment.originalHeight} · 旋转 {fragment.rotation.toFixed(0)}°
                      </Typography>
                    </Box>
                  }
                  disableTypography
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                  <Tooltip title={fragment.locked ? '解锁' : '锁定'}>
                    <IconButton
                      size="small"
                      color={fragment.locked ? 'warning' : 'default'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(fragment.id);
                      }}
                      sx={{ p: 0.5 }}
                    >
                      {fragment.locked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={
                    conflictIds.has(fragment.id)
                      ? '存在重叠冲突，需先解决冲突'
                      : fragment.aligned
                      ? '取消对位'
                      : '标记已对位'
                  }>
                    <span>
                      <IconButton
                        size="small"
                        color={fragment.aligned ? 'success' : 'default'}
                        disabled={conflictIds.has(fragment.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAligned(fragment.id);
                        }}
                        sx={{ p: 0.5 }}
                      >
                        {fragment.aligned ? <CheckIcon fontSize="small" /> : <UnalignedIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={fragment.locked}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFragment(fragment.id);
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </StyledListItem>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FragmentList;
