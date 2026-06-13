import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  styled,
  Divider,
  Chip,
  LinearProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  StackedLineChart as OverlapIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';

const StyledListItem = styled(ListItem)<{ conflict: string }>(({ theme, conflict }) => ({
  borderRadius: theme.shape.borderRadius,
  mb: 4,
  p: 1.2,
  display: 'block',
  border: conflict === 'true'
    ? `2px solid ${theme.palette.error.main}`
    : `1px solid ${theme.palette.divider}`,
  background: conflict === 'true'
    ? `linear-gradient(135deg, ${theme.palette.error.main}10 0%, transparent 100%)`
    : theme.palette.background.paper,
  animation: conflict === 'true' ? 'shake 0.6s ease-in-out' : 'none',
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%': { transform: 'translateX(-4px)' },
    '40%': { transform: 'translateX(4px)' },
    '60%': { transform: 'translateX(-2px)' },
    '80%': { transform: 'translateX(2px)' },
  },
}));

const FragmentTag = styled(Box)<{ variant?: 'primary' | 'secondary' }>(({ theme, variant = 'primary' }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  px: 1.2,
  py: 0.4,
  borderRadius: 4,
  background: variant === 'primary'
    ? theme.palette.primary.main
    : theme.palette.info.main,
  color: '#fff',
  fontFamily: 'Noto Serif SC, serif',
  fontWeight: 700,
  fontSize: 12,
  minWidth: 44,
  justifyContent: 'center',
}));

const OverlapList: React.FC = () => {
  const { conflicts, conflictThreshold } = useAppStore();
  const { scheme, selectAndFocus } = useFragmentOps();

  if (!scheme) return null;

  const conflictCount = conflicts.filter((c) => c.isConflict).length;
  const sortedConflicts = [...conflicts].sort((a, b) => {
    if (a.isConflict !== b.isConflict) return a.isConflict ? -1 : 1;
    return Math.max(b.overlapRatioA, b.overlapRatioB) - Math.max(a.overlapRatioA, a.overlapRatioB);
  });

  const getFragmentNo = (id: string) => scheme.fragmentMap[id]?.fragmentNo ?? '?';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, px: 0.5 }}>
        <OverlapIcon sx={{ color: 'secondary.dark', fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600, flex: 1 }}>
          重叠区域
        </Typography>
        {conflictCount > 0 ? (
          <Chip
            icon={<WarningIcon sx={{ fontSize: 12, mr: -0.3 }} />}
            label={`${conflictCount} 冲突`}
            size="small"
            color="error"
            sx={{ height: 22, fontSize: 10, fontWeight: 600 }}
          />
        ) : (
          <Chip
            icon={<CheckIcon sx={{ fontSize: 12, mr: -0.3 }} />}
            label="正常"
            size="small"
            color="success"
            variant="outlined"
            sx={{ height: 22, fontSize: 10 }}
          />
        )}
      </Box>
      <Divider sx={{ mb: 1 }} />
      <Typography variant="caption" color="text.disabled" sx={{ px: 0.5, mb: 1, display: 'block', fontSize: 10 }}>
        阈值: {(conflictThreshold * 100).toFixed(0)}% · 超出将提示冲突
      </Typography>
      {conflicts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3, px: 1 }}>
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
            当前没有检测到碎片重叠
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
            将碎片移近可检测重叠
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
          {sortedConflicts.map((c, idx) => {
            const maxRatio = Math.max(c.overlapRatioA, c.overlapRatioB);
            const pct = (maxRatio * 100).toFixed(1);
            return (
              <StyledListItem key={idx} conflict={c.isConflict.toString()}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <FragmentTag
                      variant="primary"
                      onClick={() => selectAndFocus(c.fragmentAId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      #{getFragmentNo(c.fragmentAId)}
                    </FragmentTag>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      ⟷
                    </Typography>
                    <FragmentTag
                      variant="secondary"
                      onClick={() => selectAndFocus(c.fragmentBId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      #{getFragmentNo(c.fragmentBId)}
                    </FragmentTag>
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      label={c.isConflict ? '冲突⚠️' : '轻微重叠'}
                      size="small"
                      color={c.isConflict ? 'error' : 'default'}
                      variant={c.isConflict ? 'filled' : 'outlined'}
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        animation: c.isConflict ? 'pulse 1.5s infinite' : 'none',
                      }}
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                        最大占比
                      </Typography>
                      <Typography variant="caption" color="text.primary" sx={{ fontSize: 10, fontWeight: 700 }}>
                        {pct}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, maxRatio * 100)}
                      color={c.isConflict ? 'error' : 'warning'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={`A: ${(c.overlapRatioA * 100).toFixed(1)}%`}
                      size="small"
                      sx={{ height: 16, fontSize: 9, backgroundColor: 'primary.main', color: '#fff' }}
                    />
                    <Chip
                      label={`B: ${(c.overlapRatioB * 100).toFixed(1)}%`}
                      size="small"
                      sx={{ height: 16, fontSize: 9, backgroundColor: 'info.main', color: '#fff' }}
                    />
                    <Chip
                      label={`面积: ${Math.round(c.overlapArea)}px²`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: 9 }}
                    />
                  </Stack>
                </Stack>
              </StyledListItem>
            );
          })}
        </List>
      )}
      {conflictCount > 0 && (
        <Alert severity="error" variant="outlined" sx={{ mt: 1, fontSize: 11, py: 0.5 }} icon={<WarningIcon fontSize="inherit" />}>
          请移动冲突碎片或降低重叠面积至 {(conflictThreshold * 100).toFixed(0)}% 以下
        </Alert>
      )}
    </Box>
  );
};

export default OverlapList;
