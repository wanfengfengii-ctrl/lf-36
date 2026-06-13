import React, { useRef, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip,
  Divider,
  Button,
  styled,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  FileDownload as ExportIcon,
  UploadFile as ImportIcon,
  Help as HelpIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import SchemeSelector from './SchemeSelector';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';
import { exportSchemeToJSON, downloadJSON } from '../../utils/storage';
import { validateExportReadiness } from '../../utils/validators';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: `
    linear-gradient(180deg, #5D4037 0%, #4E342E 50%, #3E2723 100%)
  `,
  boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
  borderBottom: '1px solid #2C1810',
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: 56,
  gap: theme.spacing(1),
}));

const LogoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  paddingRight: theme.spacing(2),
  borderRight: '1px solid rgba(255,255,255,0.15)',
  marginRight: theme.spacing(1),
}));

const ToolbarDivider = styled(Divider)(({ theme }) => ({
  background: 'rgba(255,255,255,0.15)',
  height: 28,
  mx: theme.spacing(0.5),
}));

const AppToolbar: React.FC = () => {
  const { undo, redo, history, historyIndex, toasts, addToast, persist, schemes, activeSchemeId } = useAppStore();
  const { importFiles } = useFragmentOps();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportResult, setExportResult] = useState<{ ready: boolean; message?: string; unalignedCount?: number } | null>(null);

  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      importFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    persist();
    addToast('success', '方案已保存');
  };

  const handleExportClick = () => {
    if (!scheme) return;
    const result = validateExportReadiness(scheme);
    setExportResult({
      ready: result.ready,
      message: result.message,
      unalignedCount: result.unalignedFragments.length,
    });
    setExportDialogOpen(true);
  };

  const handleExportConfirm = () => {
    if (!scheme) return;
    const json = exportSchemeToJSON(scheme);
    const filename = `${scheme.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    downloadJSON(json, filename);
    addToast('success', `方案已导出: ${filename}`);
    setExportDialogOpen(false);
  };

  return (
    <>
      <StyledAppBar position="static">
        <StyledToolbar variant="dense">
          <LogoBox>
            <MapIcon sx={{ fontSize: 28, color: '#B8860B' }} />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Noto Serif SC, serif',
                  fontWeight: 700,
                  color: '#F5F0E1',
                  fontSize: 16,
                  lineHeight: 1.2,
                }}
              >
                古地图拼接工作台
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#A0826D',
                  fontSize: 10,
                }}
              >
                Ancient Map Fragment Assembler
              </Typography>
            </Box>
          </LogoBox>

          <SchemeSelector />

          <ToolbarDivider orientation="vertical" flexItem />

          <Tooltip title="撤销 (Ctrl+Z)">
            <span>
              <IconButton
                size="small"
                onClick={undo}
                disabled={!canUndo}
                sx={{
                  color: '#F5F0E1',
                  '&:hover': { background: 'rgba(255,255,255,0.1)' },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
                }}
              >
                <UndoIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="重做 (Ctrl+Y)">
            <span>
              <IconButton
                size="small"
                onClick={redo}
                disabled={!canRedo}
                sx={{
                  color: '#F5F0E1',
                  '&:hover': { background: 'rgba(255,255,255,0.1)' },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
                }}
              >
                <RedoIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </span>
          </Tooltip>

          <ToolbarDivider orientation="vertical" flexItem />

          <Tooltip title="保存方案">
            <IconButton
              size="small"
              onClick={handleSave}
              sx={{
                color: '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              <SaveIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="导入碎片">
            <Button
              size="small"
              startIcon={<ImportIcon sx={{ fontSize: 18 }} />}
              onClick={handleImportClick}
              sx={{
                color: '#F5F0E1',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.08)',
                },
              }}
              variant="outlined"
            >
              导入
            </Button>
          </Tooltip>

          <Tooltip title="导出方案">
            <Button
              size="small"
              startIcon={<ExportIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportClick}
              sx={{
                background: 'linear-gradient(135deg, #B8860B 0%, #8B6508 100%)',
                color: '#3E2723',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #D4A832 0%, #B8860B 100%)',
                },
              }}
              variant="contained"
            >
              导出
            </Button>
          </Tooltip>

          <ToolbarDivider orientation="vertical" flexItem />

          <Tooltip title="使用帮助">
            <IconButton
              size="small"
              sx={{
                color: '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              <HelpIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </StyledToolbar>
      </StyledAppBar>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          导出拼接方案
        </DialogTitle>
        <DialogContent>
          {exportResult && (
            <>
              {exportResult.ready ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  所有碎片已完成对位，可以导出方案
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {exportResult.message}
                </Alert>
              )}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  方案名称：<strong>{scheme?.name}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  碎片数量：{scheme ? Object.keys(scheme.fragmentMap).length : 0} 张
                </Typography>
              </Box>
              {!exportResult.ready && exportResult.unalignedCount && exportResult.unalignedCount > 0 && (
                <Box>
                  <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5, display: 'block' }}>
                    未完成对位的碎片：
                  </Typography>
                  <List dense disablePadding>
                    {scheme && Object.values(scheme.fragmentMap)
                      .filter((f) => !f.aligned)
                      .slice(0, 5)
                      .map((f) => (
                        <ListItem key={f.id} dense disableGutters>
                          <ListItemText
                            primary={
                              <Chip
                                label={`#${f.fragmentNo}`}
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ height: 20, fontSize: 10 }}
                              />
                            }
                          />
                        </ListItem>
                      ))}
                    {exportResult.unalignedCount > 5 && (
                      <ListItem dense disableGutters>
                        <ListItemText
                          primary={
                            <Typography variant="caption" color="text.disabled">
                              ...还有 {exportResult.unalignedCount - 5} 个
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)} size="small">
            取消
          </Button>
          <Button
            onClick={handleExportConfirm}
            variant="contained"
            size="small"
            disabled={!exportResult?.ready}
            startIcon={<ExportIcon sx={{ fontSize: 16 }} />}
          >
            确认导出
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AppToolbar;
