import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  styled,
  Divider,
  Chip,
  LinearProgress,
  Stack,
  Button,
} from '@mui/material';
import {
  HourglassEmpty as PendingIcon,
  CheckCircle as CheckIcon,
  Flag as FlagIcon,
  PlayArrow as FocusIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';

const StyledListItem = styled(ListItemButton)<{ urgency: 'high' | 'normal' }>(({ theme, urgency }) => ({
  borderRadius: theme.shape.borderRadius,
  mb: 3,
  border: urgency === 'high'
    ? `1.5px dashed ${theme.palette.warning.main}`
    : `1px solid ${theme.palette.divider}`,
  background: urgency === 'high'
    ? `linear-gradient(135deg, ${theme.palette.warning.main}10 0%, transparent 100%)`
    : theme.palette.background.paper,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateX(2px)',
    borderColor: theme.palette.primary.main,
  },
}));

const PendingFragments: React.FC = () => {
  const { fragments, toggleAligned, selectAndFocus } = useFragmentOps();
  const conflicts = useAppStore((s) => s.conflicts);

  const conflictIds = new Set<string>();
  conflicts.forEach((c) => {
    if (c.isConflict) {
      conflictIds.add(c.fragmentAId);
      conflictIds.add(c.fragmentBId);
    }
  });

  const pending = fragments.filter((f) => !f.aligned).sort((a, b) => a.fragmentNo - b.fragmentNo);
  const aligned = fragments.filter((f) => f.aligned);
  const progress = fragments.length > 0 ? (aligned.length / fragments.length) * 100 : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, px: 0.5 }}>
        <PendingIcon sx={{ color: 'secondary.dark', fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600, flex: 1 }}>
          未处理碎片
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, alignItems: 'center' }}>
          <Chip
            icon={<PendingIcon sx={{ fontSize: 10, mr: -0.3 }} />}
            label={`${pending.length}`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
          />
          <Chip
            icon={<CheckIcon sx={{ fontSize: 10, mr: -0.3 }} />}
            label={`${aligned.length}`}
            size="small"
            color="success"
            sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
          />
        </Box>
      </Box>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ px: 0.5, mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
            对位进度
          </Typography>
          <Typography variant="caption" color="text.primary" sx={{ fontSize: 10, fontWeight: 700 }}>
            {aligned.length} / {fragments.length} ({progress.toFixed(0)}%)
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={progress === 100 ? 'success' : 'primary'}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
      {fragments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
            请先导入碎片
          </Typography>
        </Box>
      ) : pending.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            px: 2,
            background: 'success.main',
            borderRadius: 1,
            color: '#fff',
            mb: 1,
          }}
        >
          <CheckIcon sx={{ fontSize: 28, mb: 0.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'Noto Serif SC, serif' }}>
            全部完成！
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            所有碎片已完成对位，可导出方案
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
          {pending.map((fragment) => {
            const hasConflict = conflictIds.has(fragment.id);
            const urgency = hasConflict || fragment.zIndex === 1 ? 'high' : 'normal';
            return (
              <ListItem key={fragment.id} disablePadding dense>
                <StyledListItem
                  urgency={urgency}
                  onClick={() => selectAndFocus(fragment.id)}
                >
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar
                      variant="rounded"
                      src={fragment.imageSrc}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        border: hasConflict
                          ? `2px solid error.main`
                          : `1px solid divider`,
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontFamily: 'Noto Serif SC, serif',
                            fontWeight: 700,
                            fontSize: 13,
                            color: hasConflict ? 'error.main' : 'text.primary',
                          }}
                        >
                          #{fragment.fragmentNo}
                        </Typography>
                        {hasConflict && (
                          <Chip
                            icon={<FlagIcon sx={{ fontSize: 8, mr: -0.3 }} />}
                            label="冲突"
                            size="small"
                            color="error"
                            sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
                          />
                        )}
                        {fragment.locked && (
                          <Chip
                            label="🔒"
                            size="small"
                            sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                        位置: ({fragment.x.toFixed(0)}, {fragment.y.toFixed(0)}) · {fragment.rotation.toFixed(0)}° · 图层 {fragment.zIndex}
                      </Typography>
                    }
                    disableTypography
                  />
                  <Button
                    size="small"
                    variant="text"
                    color="success"
                    startIcon={<FocusIcon sx={{ fontSize: 12 }} />}
                    disabled={fragment.locked}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAligned(fragment.id);
                    }}
                    sx={{
                      p: 0.5,
                      minWidth: 'auto',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    标记
                  </Button>
                </StyledListItem>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default PendingFragments;
