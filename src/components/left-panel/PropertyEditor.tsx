import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Slider,
  InputAdornment,
  Stack,
  Divider,
  Alert,
  styled,
  FormControl,
  InputLabel,
  OutlinedInput,
  Grid,
} from '@mui/material';
import {
  CenterFocusStrong as PositionIcon,
  RotateRight as RotateIcon,
  Opacity as OpacityIcon,
  ContentCut as CropIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import type { CropEdges } from '../../types';
import { useFragmentOps, useSelectedFragment } from '../../hooks/useFragmentOps';
import { useDebounce } from '../../hooks/useFragmentOps';

const SectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1.5),
  '& svg': {
    color: theme.palette.secondary.dark,
    fontSize: 18,
  },
}));

const SectionWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
}));

const PropertyEditor: React.FC = () => {
  const fragment = useSelectedFragment();
  const {
    changeFragmentNo,
    changePosition,
    changeRotation,
    changeOpacity,
    changeCrop,
    finalizeTransform,
  } = useFragmentOps();

  const [localNo, setLocalNo] = useState(fragment?.fragmentNo ?? 1);
  const [localX, setLocalX] = useState(0);
  const [localY, setLocalY] = useState(0);
  const [localRotation, setLocalRotation] = useState(0);
  const [localOpacity, setLocalOpacity] = useState(1);
  const [localCrop, setLocalCrop] = useState<CropEdges>({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    if (fragment) {
      setLocalNo(fragment.fragmentNo);
      setLocalX(fragment.x);
      setLocalY(fragment.y);
      setLocalRotation(fragment.rotation);
      setLocalOpacity(fragment.opacity);
      setLocalCrop({ ...fragment.crop });
    }
  }, [fragment?.id]);

  const debouncedPush = useDebounce(finalizeTransform, 400);

  const handleNoChange = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) setLocalNo(n);
  };
  const handleNoBlur = () => {
    if (fragment && localNo !== fragment.fragmentNo) {
      changeFragmentNo(fragment.id, localNo);
    }
  };

  const handleXChange = (value: number) => {
    setLocalX(value);
    if (fragment) changePosition(fragment.id, value, localY);
    debouncedPush();
  };
  const handleYChange = (value: number) => {
    setLocalY(value);
    if (fragment) changePosition(fragment.id, localX, value);
    debouncedPush();
  };

  const handleRotationChange = (value: number) => {
    setLocalRotation(value);
    if (fragment) changeRotation(fragment.id, value);
    debouncedPush();
  };

  const handleOpacityChange = (value: number) => {
    setLocalOpacity(value);
    if (fragment) changeOpacity(fragment.id, value);
    debouncedPush();
  };

  const handleCropChange = useCallback((edge: keyof CropEdges, value: number) => {
    if (!fragment) return;
    const newCrop = { ...localCrop, [edge]: Math.max(0, value) };
    setLocalCrop(newCrop);
    changeCrop(fragment.id, newCrop);
    debouncedPush();
  }, [fragment, localCrop, changeCrop, debouncedPush]);

  if (!fragment) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info" variant="outlined" sx={{ fontSize: 12 }}>
          请在画布或列表中选择一个碎片以编辑属性
        </Alert>
      </Box>
    );
  }

  const maxCropTop = fragment.originalHeight - localCrop.bottom - 1;
  const maxCropBottom = fragment.originalHeight - localCrop.top - 1;
  const maxCropLeft = fragment.originalWidth - localCrop.right - 1;
  const maxCropRight = fragment.originalWidth - localCrop.left - 1;

  return (
    <Box sx={{ p: 0.5 }}>
      <SectionWrapper>
        <SectionTitle>
          <TagIcon />
          <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
            碎片编号
          </Typography>
        </SectionTitle>
        <FormControl fullWidth size="small" variant="outlined">
          <InputLabel>编号</InputLabel>
          <OutlinedInput
            type="number"
            value={localNo}
            onChange={(e) => handleNoChange(e.target.value)}
            onBlur={handleNoBlur}
            endAdornment={<InputAdornment position="end">#</InputAdornment>}
            label="编号"
            disabled={fragment.locked}
            inputProps={{ min: 1, step: 1 }}
          />
        </FormControl>
      </SectionWrapper>

      <Divider sx={{ my: 1.5 }} />

      <SectionWrapper>
        <SectionTitle>
          <PositionIcon />
          <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
            坐标位置
          </Typography>
        </SectionTitle>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ flex: '1 1 calc(50% - 6px)', minWidth: 0 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="X"
                value={Math.round(localX)}
                onChange={(e) => handleXChange(parseInt(e.target.value) || 0)}
                disabled={fragment.locked}
                slotProps={{ htmlInput: { step: 1 } }}
              />
            </Box>
            <Box sx={{ flex: '1 1 calc(50% - 6px)', minWidth: 0 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Y"
                value={Math.round(localY)}
                onChange={(e) => handleYChange(parseInt(e.target.value) || 0)}
                disabled={fragment.locked}
                slotProps={{ htmlInput: { step: 1 } }}
              />
            </Box>
          </Box>
        </Stack>
      </SectionWrapper>

      <Divider sx={{ my: 1.5 }} />

      <SectionWrapper>
        <SectionTitle>
          <RotateIcon />
          <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
            旋转角度
          </Typography>
        </SectionTitle>
        <Stack spacing={1}>
          <Slider
            value={localRotation}
            min={-180}
            max={180}
            step={0.5}
            onChange={(_, v) => handleRotationChange(v as number)}
            disabled={fragment.locked}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}°`}
            marks={[
              { value: -180, label: '-180°' },
              { value: -90, label: '-90°' },
              { value: 0, label: '0°' },
              { value: 90, label: '90°' },
              { value: 180, label: '180°' },
            ]}
            sx={{ px: 0.5 }}
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            value={localRotation.toFixed(1)}
            onChange={(e) => handleRotationChange(parseFloat(e.target.value) || 0)}
            disabled={fragment.locked}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">°</InputAdornment>,
              },
              htmlInput: { step: 0.5, min: -180, max: 180 },
            }}
          />
        </Stack>
      </SectionWrapper>

      <Divider sx={{ my: 1.5 }} />

      <SectionWrapper>
        <SectionTitle>
          <OpacityIcon />
          <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
            透明度
          </Typography>
        </SectionTitle>
        <Stack spacing={1}>
          <Slider
            value={localOpacity}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(_, v) => handleOpacityChange(v as number)}
            disabled={fragment.locked}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
            sx={{ px: 0.5 }}
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            value={Math.round(localOpacity * 100)}
            onChange={(e) => handleOpacityChange((parseInt(e.target.value) || 0) / 100)}
            disabled={fragment.locked}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              },
              htmlInput: { step: 1, min: 10, max: 100 },
            }}
          />
        </Stack>
      </SectionWrapper>

      <Divider sx={{ my: 1.5 }} />

      <SectionWrapper>
        <SectionTitle>
          <CropIcon />
          <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
            边缘裁剪
          </Typography>
        </SectionTitle>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="顶部裁边"
                value={localCrop.top}
                onChange={(e) => handleCropChange('top', parseInt(e.target.value) || 0)}
                disabled={fragment.locked}
                helperText={`最大: ${Math.max(0, maxCropTop)} px`}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">px</InputAdornment>,
                  },
                  htmlInput: { min: 0, max: maxCropTop, step: 1 },
                  formHelperText: { sx: { fontSize: 10 } },
                }}
              />
            </Box>
            <Box sx={{ flex: '1 1 calc(50% - 6px)', minWidth: 0 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="左侧裁边"
                value={localCrop.left}
                onChange={(e) => handleCropChange('left', parseInt(e.target.value) || 0)}
                disabled={fragment.locked}
                helperText={`最大: ${Math.max(0, maxCropLeft)}`}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">px</InputAdornment>,
                  },
                  htmlInput: { min: 0, max: maxCropLeft, step: 1 },
                  formHelperText: { sx: { fontSize: 10 } },
                }}
              />
            </Box>
            <Box sx={{ flex: '1 1 calc(50% - 6px)', minWidth: 0 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="右侧裁边"
                value={localCrop.right}
                onChange={(e) => handleCropChange('right', parseInt(e.target.value) || 0)}
                disabled={fragment.locked}
                helperText={`最大: ${Math.max(0, maxCropRight)}`}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">px</InputAdornment>,
                  },
                  htmlInput: { min: 0, max: maxCropRight, step: 1 },
                  formHelperText: { sx: { fontSize: 10 } },
                }}
              />
            </Box>
            <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="底部裁边"
                value={localCrop.bottom}
                onChange={(e) => handleCropChange('bottom', parseInt(e.target.value) || 0)}
                disabled={fragment.locked}
                helperText={`最大: ${Math.max(0, maxCropBottom)} px`}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">px</InputAdornment>,
                  },
                  htmlInput: { min: 0, max: maxCropBottom, step: 1 },
                  formHelperText: { sx: { fontSize: 10 } },
                }}
              />
            </Box>
          </Box>
        </Stack>
      </SectionWrapper>

      {fragment.locked && (
        <Alert severity="warning" variant="outlined" sx={{ fontSize: 11, py: 0 }}>
          🔒 该碎片已锁定，拖动、旋转、裁边已禁用
        </Alert>
      )}
    </Box>
  );
};

export default PropertyEditor;
