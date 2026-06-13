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
  Menu,
  MenuItem,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  FileDownload as ExportIcon,
  UploadFile as ImportIcon,
  Help as HelpIcon,
  Map as MapIcon,
  Link as MagnetIcon,
  LinkOff as MagnetOffIcon,
  Straighten as RulerIcon,
  ZoomIn as ZoomInIcon,
  Add as AddIcon,
  PhotoCamera as SnapshotIcon,
  Restore as RestoreIcon,
  CheckCircle as CheckCircleIcon,
  Difference as DiffIcon,
  HorizontalRule as HorizontalLineIcon,
  VerticalAlignCenter as VerticalLineIcon,
  Clear as ClearIcon,
  Settings as SettingsIcon,
  Comment as CommentIcon,
  RateReview as ReviewIcon,
  Description as ReportIcon,
} from '@mui/icons-material';
import SchemeSelector from './SchemeSelector';
import { useAppStore } from '../../store/useAppStore';
import { useFragmentOps } from '../../hooks/useFragmentOps';
import { exportSchemeToJSON, downloadJSON } from '../../utils/storage';
import { validateExportReadiness } from '../../utils/validators';
import ReviewCenterDialog from '../common/ReviewCenterDialog';
import type { DiffResult, AlignmentVerification } from '../../types';

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

interface AppToolbarProps {
  onOpenReviewCenter?: () => void;
}

const AppToolbar: React.FC<AppToolbarProps> = ({ onOpenReviewCenter }) => {
  const {
    undo, redo, toasts, addToast, persist, schemes, activeSchemeId, conflicts,
    snapEnabled, setSnapEnabled, snapThreshold, setSnapThreshold,
    ruler, setRulerVisible,
    magnifier, setMagnifierEnabled, setMagnifierZoom,
    referenceLines, addReferenceLine, clearReferenceLines,
    createSnapshot, getSnapshots, restoreSnapshot, deleteSnapshot,
    verifyCurrentAlignment, compareWithSnapshot, compareSchemes,
  } = useAppStore();
  const { importFiles } = useFragmentOps();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportResult, setExportResult] = useState<{
    ready: boolean;
    message?: string;
    unalignedCount?: number;
    conflictCount?: number;
  } | null>(null);

  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [snapshotListDialogOpen, setSnapshotListDialogOpen] = useState(false);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AlignmentVerification | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [compareType, setCompareType] = useState<'snapshot' | 'scheme'>('snapshot');
  const [compareTargetId, setCompareTargetId] = useState('');

  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const canUndo = scheme ? scheme.historyIndex > 0 : false;
  const canRedo = scheme ? scheme.historyIndex < scheme.history.length - 1 : false;
  const snapshots = getSnapshots();

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
    const result = validateExportReadiness(scheme, conflicts);
    setExportResult({
      ready: result.ready,
      message: result.message,
      unalignedCount: result.unalignedFragments.length,
      conflictCount: result.conflictFragments.length,
    });
    setExportDialogOpen(true);
  };

  const handleExportConfirm = () => {
    if (!scheme) return;
    const result = validateExportReadiness(scheme, conflicts);
    if (!result.ready) {
      addToast('error', result.message || '导出校验失败');
      setExportResult({
        ready: result.ready,
        message: result.message,
        unalignedCount: result.unalignedFragments.length,
        conflictCount: result.conflictFragments.length,
      });
      return;
    }
    const json = exportSchemeToJSON(scheme);
    const filename = `${scheme.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    downloadJSON(json, filename);
    addToast('success', `方案已导出: ${filename}`);
    setExportDialogOpen(false);
  };

  const handleToolsMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setToolsMenuAnchor(e.currentTarget);
  };

  const handleToolsMenuClose = () => {
    setToolsMenuAnchor(null);
  };

  const handleCreateSnapshot = () => {
    if (!snapshotName.trim()) {
      addToast('warning', '请输入快照名称');
      return;
    }
    createSnapshot(snapshotName.trim(), snapshotDescription.trim());
    setSnapshotDialogOpen(false);
    setSnapshotName('');
    setSnapshotDescription('');
    handleToolsMenuClose();
  };

  const handleVerifyAlignment = () => {
    const result = verifyCurrentAlignment();
    if (result) {
      setVerificationResult(result);
      setVerificationDialogOpen(true);
    }
    handleToolsMenuClose();
  };

  const handleAddVerticalGuide = () => {
    addReferenceLine('vertical', 0);
    handleToolsMenuClose();
  };

  const handleAddHorizontalGuide = () => {
    addReferenceLine('horizontal', 0);
    handleToolsMenuClose();
  };

  const handleClearGuides = () => {
    clearReferenceLines();
    handleToolsMenuClose();
  };

  const handleShowSnapshots = () => {
    setSnapshotListDialogOpen(true);
    handleToolsMenuClose();
  };

  const handleShowDiff = () => {
    if (snapshots.length > 0) {
      setCompareTargetId(snapshots[0].id);
      const result = compareWithSnapshot(snapshots[0].id);
      setDiffResult(result);
    }
    setDiffDialogOpen(true);
    handleToolsMenuClose();
  };

  const handleCompareChange = () => {
    if (compareType === 'snapshot' && compareTargetId) {
      const result = compareWithSnapshot(compareTargetId);
      setDiffResult(result);
    } else if (compareType === 'scheme' && compareTargetId) {
      const result = compareSchemes(activeSchemeId!, compareTargetId);
      setDiffResult(result);
    }
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
                人工对位辅助系统 v2.0
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

          <Tooltip title={snapEnabled ? '关闭边缘吸附' : '开启边缘吸附'}>
            <IconButton
              size="small"
              onClick={() => setSnapEnabled(!snapEnabled)}
              sx={{
                color: snapEnabled ? '#4CAF50' : '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              {snapEnabled ? <MagnetIcon sx={{ fontSize: 20 }} /> : <MagnetOffIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title={ruler.visible ? '隐藏标尺' : '显示标尺'}>
            <IconButton
              size="small"
              onClick={() => setRulerVisible(!ruler.visible)}
              sx={{
                color: ruler.visible ? '#4CAF50' : '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              <RulerIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={magnifier.enabled ? '关闭放大镜' : '开启放大镜'}>
            <IconButton
              size="small"
              onClick={() => setMagnifierEnabled(!magnifier.enabled)}
              sx={{
                color: magnifier.enabled ? '#4CAF50' : '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ZoomInIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="工具菜单">
            <IconButton
              size="small"
              onClick={handleToolsMenuOpen}
              sx={{
                color: '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              <SettingsIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={toolsMenuAnchor}
            open={Boolean(toolsMenuAnchor)}
            onClose={handleToolsMenuClose}
            slotProps={{ paper: { sx: { minWidth: 240 } } }}
          >
            <MenuItem onClick={() => { setSnapshotDialogOpen(true); }}>
              <ListItemIcon><SnapshotIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="创建快照" />
            </MenuItem>
            <MenuItem onClick={handleShowSnapshots}>
              <ListItemIcon><RestoreIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={`快照管理 (${snapshots.length})`} />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleVerifyAlignment}>
              <ListItemIcon><CheckCircleIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="对位校验" />
            </MenuItem>
            <MenuItem onClick={handleShowDiff}>
              <ListItemIcon><DiffIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="差异对比" />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleAddVerticalGuide}>
              <ListItemIcon><VerticalLineIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="添加垂直参考线" />
            </MenuItem>
            <MenuItem onClick={handleAddHorizontalGuide}>
              <ListItemIcon><HorizontalLineIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="添加水平参考线" />
            </MenuItem>
            <MenuItem onClick={handleClearGuides}>
              <ListItemIcon><ClearIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={`清除所有参考线 (${referenceLines.length})`} />
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setSettingsDialogOpen(true); handleToolsMenuClose(); }}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="偏好设置" />
            </MenuItem>
          </Menu>

          <Tooltip title="考据批注与版本审阅中心 (Ctrl+Shift+R)">
            <IconButton
              size="small"
              onClick={onOpenReviewCenter}
              sx={{
                color: '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ReviewIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="批注模式 (Ctrl+M)">
            <IconButton
              size="small"
              onClick={() => {
                const { annotationMode, setAnnotationMode, addToast } = useAppStore.getState();
                setAnnotationMode(!annotationMode);
                addToast('info', `批注模式已${annotationMode ? '关闭' : '开启'}`);
              }}
              sx={{
                color: '#F5F0E1',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              <CommentIcon sx={{ fontSize: 20 }} />
            </IconButton>
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
                <Box sx={{ mb: 2 }}>
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
              {!exportResult.ready && exportResult.conflictCount && exportResult.conflictCount > 0 && (
                <Box>
                  <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5, display: 'block' }}>
                    存在重叠冲突的碎片：
                  </Typography>
                  <List dense disablePadding>
                    {conflicts
                      .filter((c) => c.isConflict)
                      .slice(0, 5)
                      .map((c, i) => {
                        const fragA = scheme?.fragmentMap[c.fragmentAId];
                        const fragB = scheme?.fragmentMap[c.fragmentBId];
                        return (
                          <ListItem key={`${c.fragmentAId}-${c.fragmentBId}-${i}`} dense disableGutters>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                  <Chip
                                    label={`#${fragA?.fragmentNo ?? '?'}`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: 10 }}
                                  />
                                  <Typography variant="caption" color="text.disabled">↔</Typography>
                                  <Chip
                                    label={`#${fragB?.fragmentNo ?? '?'}`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: 10 }}
                                  />
                                </Box>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    {exportResult.conflictCount > 5 && (
                      <ListItem dense disableGutters>
                        <ListItemText
                          primary={
                            <Typography variant="caption" color="text.disabled">
                              ...还有更多冲突
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

      <Dialog
        open={snapshotDialogOpen}
        onClose={() => setSnapshotDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          创建方案快照
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="快照名称"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              margin="normal"
              size="small"
              placeholder="例如：初始对位完成"
            />
            <TextField
              fullWidth
              label="描述（可选）"
              value={snapshotDescription}
              onChange={(e) => setSnapshotDescription(e.target.value)}
              margin="normal"
              size="small"
              multiline
              rows={2}
              placeholder="记录此快照的状态说明..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotDialogOpen(false)} size="small">
            取消
          </Button>
          <Button
            onClick={handleCreateSnapshot}
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            disabled={!snapshotName.trim()}
          >
            创建快照
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={snapshotListDialogOpen}
        onClose={() => setSnapshotListDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          方案快照管理
        </DialogTitle>
        <DialogContent>
          {snapshots.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                暂无快照，点击"创建快照"保存当前方案状态
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {[...snapshots].reverse().map((snap) => (
                <ListItem
                  key={snap.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                  secondaryAction={
                    <Box>
                      <Tooltip title="恢复此快照">
                        <IconButton
                          size="small"
                          onClick={() => {
                            restoreSnapshot(snap.id);
                            setSnapshotListDialogOpen(false);
                          }}
                          color="primary"
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除此快照">
                        <IconButton
                          size="small"
                          onClick={() => deleteSnapshot(snap.id)}
                          color="error"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    <SnapshotIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {snap.name}
                        </Typography>
                        <Chip
                          label={`${Object.keys(snap.fragmentMap).length} 碎片`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {snap.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {snap.description}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled">
                          创建于 {new Date(snap.createdAt).toLocaleString('zh-CN')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotListDialogOpen(false)} size="small">
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={verificationDialogOpen}
        onClose={() => setVerificationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          对位完成校验
        </DialogTitle>
        <DialogContent>
          {verificationResult && (
            <>
              {verificationResult.allAligned ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  ✅ 所有碎片已完成对位，无重叠冲突，可以导出
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  ❌ 存在未解决的问题，请先处理后再导出
                </Alert>
              )}

              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                    {verificationResult.alignedCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    已对位
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {verificationResult.totalFragments}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总计
                  </Typography>
                </Box>
              </Box>

              {verificationResult.issues.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 1, fontWeight: 600 }}>
                    存在问题：
                  </Typography>
                  {verificationResult.issues.map((issue, idx) => (
                    <Alert key={idx} severity="warning" sx={{ mb: 1, py: 0, fontSize: 12 }} icon={false}>
                      • {issue}
                    </Alert>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialogOpen(false)} size="small">
            关闭
          </Button>
          {verificationResult?.allAligned && (
            <Button
              onClick={() => {
                setVerificationDialogOpen(false);
                handleExportClick();
              }}
              variant="contained"
              size="small"
              startIcon={<ExportIcon sx={{ fontSize: 16 }} />}
            >
              导出方案
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={diffDialogOpen}
        onClose={() => setDiffDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          差异对比
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              label="与快照对比"
              color={compareType === 'snapshot' ? 'primary' : 'default'}
              onClick={() => setCompareType('snapshot')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="与其他方案对比"
              color={compareType === 'scheme' ? 'primary' : 'default'}
              onClick={() => setCompareType('scheme')}
              sx={{ cursor: 'pointer' }}
            />
            <Box sx={{ flex: 1 }}>
              <TextField
                select
                fullWidth
                size="small"
                value={compareTargetId}
                onChange={(e) => setCompareTargetId(e.target.value)}
                slotProps={{
                  select: {
                    native: true,
                  },
                }}
              >
                <option value="">选择对比目标...</option>
                {compareType === 'snapshot' ? snapshots.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                )) : Object.values(schemes).filter(s => s.id !== activeSchemeId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </TextField>
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={handleCompareChange}
              disabled={!compareTargetId}
            >
              对比
            </Button>
          </Box>

          {diffResult ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  label={`新增: ${diffResult.added.length}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`删除: ${diffResult.removed.length}`}
                  color="error"
                  variant="outlined"
                />
                <Chip
                  label={`修改: ${diffResult.modified.length}`}
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  label={`未变: ${diffResult.unchanged.length}`}
                  color="default"
                  variant="outlined"
                />
              </Box>

              {diffResult.added.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, fontWeight: 600 }}>
                    新增的碎片
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {diffResult.added.map((f) => (
                      <Chip key={f.id} label={`#${f.fragmentNo}`} color="success" size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              {diffResult.removed.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error.main" sx={{ mb: 1, fontWeight: 600 }}>
                    删除的碎片
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {diffResult.removed.map((f) => (
                      <Chip key={f.id} label={`#${f.fragmentNo}`} color="error" size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              {diffResult.modified.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 600 }}>
                    修改的碎片
                  </Typography>
                  <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {diffResult.modified.map((change, idx) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <Chip
                          label={`#${change.fragmentNo}`}
                          size="small"
                          color="warning"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2">
                          <strong>{change.field}:</strong>{' '}
                          <span style={{ color: 'error.main' }}>
                            {JSON.stringify(change.oldValue)}
                          </span>
                          {' → '}
                          <span style={{ color: 'success.main' }}>
                            {JSON.stringify(change.newValue)}
                          </span>
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {diffResult.added.length === 0 && diffResult.removed.length === 0 && diffResult.modified.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">
                    两个版本完全一致，没有差异
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                选择对比目标后点击"对比"按钮查看差异
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiffDialogOpen(false)} size="small">
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          偏好设置
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={snapEnabled}
                  onChange={(e) => setSnapEnabled(e.target.checked)}
                />
              }
              label="边缘吸附"
              sx={{ display: 'block', mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                吸附阈值: {snapThreshold}px
              </Typography>
              <Slider
                value={snapThreshold}
                onChange={(_, v) => setSnapThreshold(v as number)}
                min={1}
                max={30}
                step={1}
                valueLabelDisplay="auto"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={ruler.visible}
                  onChange={(e) => setRulerVisible(e.target.checked)}
                />
              }
              label="显示标尺"
              sx={{ display: 'block', mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={magnifier.enabled}
                  onChange={(e) => setMagnifierEnabled(e.target.checked)}
                />
              }
              label="放大镜"
              sx={{ display: 'block', mb: 2 }}
            />

            {magnifier.enabled && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  放大镜倍数: {magnifier.zoom.toFixed(1)}x
                </Typography>
                <Slider
                  value={magnifier.zoom}
                  onChange={(_, v) => setMagnifierZoom(v as number)}
                  min={1.5}
                  max={8}
                  step={0.5}
                  valueLabelDisplay="auto"
                />
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                重叠冲突阈值: {(conflicts.length > 0 ? useAppStore.getState().conflictThreshold : 0.3) * 100}%
              </Typography>
              <Slider
                value={useAppStore.getState().conflictThreshold * 100}
                onChange={(_, v) => useAppStore.getState().setConflictThreshold((v as number) / 100)}
                min={10}
                max={80}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)} size="small">
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AppToolbar;
