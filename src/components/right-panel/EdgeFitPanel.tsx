import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  styled,
  Divider,
  Chip,
  Stack,
  Rating,
  LinearProgress,
} from '@mui/material';
import {
  JoinInner as EdgeIcon,
  ArrowForward as ArrowIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';
import type { EdgeType } from '../../types';

const StyledListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  mb: 4,
  p: 1.2,
  display: 'block',
  border: `1px solid ${theme.palette.divider}`,
  background: `linear-gradient(135deg, ${theme.palette.success.main}08 0%, transparent 100%)`,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.success.main,
    background: `linear-gradient(135deg, ${theme.palette.success.main}15 0%, transparent 100%)`,
  },
}));

const FragmentTag = styled(Box)<{ variant?: 'primary' | 'secondary' }>(({ theme, variant = 'primary' }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  px: 1.2,
  py: 0.4,
  borderRadius: 4,
  background: variant === 'primary' ? theme.palette.success.dark : theme.palette.info.dark,
  color: '#fff',
  fontFamily: 'Noto Serif SC, serif',
  fontWeight: 700,
  fontSize: 12,
  minWidth: 44,
  justifyContent: 'center',
}));

const EdgeLabel = styled(Chip)<{ edge: EdgeType }>(({ theme, edge }) => {
  const colors: Record<EdgeType, string> = {
    top: theme.palette.primary.main,
    right: theme.palette.info.main,
    bottom: theme.palette.warning.dark,
    left: theme.palette.secondary.dark,
  };
  return {
    backgroundColor: colors[edge],
    color: '#fff',
    fontWeight: 700,
    height: 18,
    fontSize: 9,
    '& .MuiChip-label': { px: 1 },
  };
});

const edgeNames: Record<EdgeType, string> = {
  top: '上',
  right: '右',
  bottom: '下',
  left: '左',
};

const EdgeFitPanel: React.FC = () => {
  const { edgeFits } = useAppStore();
  const { scheme, selectAndFocus } = useFragmentOps();

  if (!scheme) return null;

  const sorted = [...edgeFits].sort((a, b) => b.score - a.score || a.gapPixels - b.gapPixels);
  const avgScore = sorted.length > 0
    ? (sorted.reduce((s, e) => s + e.score, 0) / sorted.length).toFixed(1)
    : '—';

  const getFragmentNo = (id: string) => scheme.fragmentMap[id]?.fragmentNo ?? '?';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, px: 0.5 }}>
        <EdgeIcon sx={{ color: 'secondary.dark', fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600, flex: 1 }}>
          边缘吻合度
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, alignItems: 'center' }}>
          <Rating
            value={parseFloat(avgScore) || 0}
            readOnly
            precision={0.1}
            size="small"
            sx={{
              '& .MuiRating-iconFilled': { color: '#B8860B' },
              '& .MuiRating-iconEmpty': { color: '#D7CCC8' },
            }}
          />
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: 'secondary.dark' }}>
            {avgScore}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ mb: 1 }} />
      <Typography variant="caption" color="text.disabled" sx={{ px: 0.5, mb: 1, display: 'block', fontSize: 10 }}>
        基于边缘中点距离 + 角度差计算 · 5星最佳
      </Typography>
      {sorted.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3, px: 1 }}>
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
            将碎片移近相邻边缘可检测吻合度
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
            提示：对齐后可先标记"已对位"
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
          {sorted.map((e, idx) => (
            <StyledListItem key={idx}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, alignItems: 'center' }}>
                    <FragmentTag
                      variant="primary"
                      onClick={() => selectAndFocus(e.fragmentAId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      #{getFragmentNo(e.fragmentAId)}
                    </FragmentTag>
                    <EdgeLabel label={edgeNames[e.edgeA]} edge={e.edgeA} size="small" />
                  </Box>
                  <ArrowIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, alignItems: 'center' }}>
                    <EdgeLabel label={edgeNames[e.edgeB]} edge={e.edgeB} size="small" />
                    <FragmentTag
                      variant="secondary"
                      onClick={() => selectAndFocus(e.fragmentBId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      #{getFragmentNo(e.fragmentBId)}
                    </FragmentTag>
                  </Box>
                  <Box sx={{ flex: 1 }} />
                  <Rating
                    value={e.score}
                    readOnly
                    size="small"
                    sx={{
                      fontSize: 14,
                      '& .MuiRating-iconFilled': { color: e.score >= 4 ? '#2E7D32' : '#B8860B' },
                      '& .MuiRating-iconEmpty': { color: '#D7CCC8' },
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>
                        吻合度
                      </Typography>
                      <Typography variant="caption" color="text.primary" sx={{ fontSize: 10, fontWeight: 700 }}>
                        {Math.round((e.score / 5) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(e.score / 5) * 100}
                      color={e.score >= 4 ? 'success' : e.score >= 3 ? 'warning' : 'error'}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                  <Chip
                    icon={<ThumbUpIcon sx={{ fontSize: 10, mr: -0.3 }} />}
                    label={`间距 ${e.gapPixels}px`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: 10, minWidth: 74 }}
                  />
                </Box>
              </Stack>
            </StyledListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default EdgeFitPanel;
