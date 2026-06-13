import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  TextField,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  Slider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipPrevious as PrevIcon,
  SkipNext as NextIcon,
  Edit as EditNoteIcon,
  History as HistoryIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  Speed as SpeedIcon,
  Layers as LayersIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  PendingActions as PendingIcon,
  Flag as FlagIcon,
  Book as BookIcon,
  BugReport as BugIcon,
  Lightbulb as SuggestionIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  ArrowForward as ArrowIcon,
  Timeline as TimelineIcon,
  AssignmentTurnedIn as DoneIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../store/useAppStore';
import type {
  ReviewVersion,
  ReviewDecision,
  DiffResult,
  DiffChange,
  AnnotationType,
  AnnotationStatus,
  UserRole,
} from '../../types';

interface ReviewCenterDialogProps {
  open: boolean;
  onClose: () => void;
}

function getDecisionLabel(decision: ReviewDecision): string {
  const labels: Record<ReviewDecision, string> = {
    approved: '审核通过',
    rejected: '已驳回',
    pending: '待审核',
    needs_revision: '需修改',
  };
  return labels[decision];
}

function getDecisionColor(decision: ReviewDecision): 'success' | 'error' | 'warning' | 'default' {
  const colors: Record<ReviewDecision, 'success' | 'error' | 'warning' | 'default'> = {
    approved: 'success',
    rejected: 'error',
    pending: 'warning',
    needs_revision: 'warning',
  };
  return colors[decision];
}

function getDecisionIcon(decision: ReviewDecision): React.ReactElement {
  const icons: Record<ReviewDecision, React.ReactElement> = {
    approved: <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />,
    rejected: <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />,
    pending: <PendingIcon sx={{ fontSize: 16, color: 'warning.main' }} />,
    needs_revision: <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />,
  };
  return icons[decision];
}

function getTypeLabel(type: AnnotationType): string {
  const labels: Record<AnnotationType, string> = {
    research: '考据',
    issue: '问题',
    suggestion: '修复建议',
    question: '疑问',
    info: '备注',
  };
  return labels[type];
}

function getTypeColor(type: AnnotationType): string {
  const colors: Record<AnnotationType, string> = {
    research: '#B8860B',
    issue: '#C62828',
    suggestion: '#2E7D32',
    question: '#1565C0',
    info: '#6A1B9A',
  };
  return colors[type];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computeVersionDiff(prevVersion: ReviewVersion, currentVersion: ReviewVersion): DiffResult {
  const prevMap = prevVersion.fragmentMap;
  const currMap = currentVersion.fragmentMap;

  const added: DiffResult['added'] = [];
  const removed: DiffResult['removed'] = [];
  const modified: DiffResult['modified'] = [];
  const unchanged: string[] = [];

  const allIds = new Set([...Object.keys(prevMap), ...Object.keys(currMap)]);

  allIds.forEach((id) => {
    const inPrev = id in prevMap;
    const inCurr = id in currMap;

    if (inPrev && !inCurr) {
      removed.push(prevMap[id]);
    } else if (!inPrev && inCurr) {
      added.push(currMap[id]);
    } else {
      const prevFrag = prevMap[id];
      const currFrag = currMap[id];
      const changes: DiffChange[] = [];

      const fieldsToCompare: (keyof typeof prevFrag)[] = [
        'x', 'y', 'rotation', 'opacity', 'locked', 'aligned', 'zIndex',
      ];

      fieldsToCompare.forEach((field) => {
        if (JSON.stringify(prevFrag[field]) !== JSON.stringify(currFrag[field])) {
          changes.push({
            fragmentId: id,
            fragmentNo: currFrag.fragmentNo,
            field,
            oldValue: prevFrag[field],
            newValue: currFrag[field],
          });
        }
      });

      if (JSON.stringify(prevFrag.crop) !== JSON.stringify(currFrag.crop)) {
        changes.push({
          fragmentId: id,
          fragmentNo: currFrag.fragmentNo,
          field: 'crop',
          oldValue: prevFrag.crop,
          newValue: currFrag.crop,
        });
      }

      if (changes.length > 0) {
        modified.push(...changes);
      } else {
        unchanged.push(id);
      }
    }
  });

  return { added, removed, modified, unchanged };
}

const ROLE_LABELS: Record<UserRole, string> = {
  curator: '整理人员',
  reviewer: '审核人员',
  project_lead: '项目负责人',
};

const CreateVersionDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, changeSummary: string) => void;
}> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [changeSummary, setChangeSummary] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setChangeSummary('');
    }
  }, [open]);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim(), changeSummary.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
        创建审阅版本
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="版本名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            size="small"
            placeholder="例如：初稿完成、第二版修订"
          />
          <TextField
            fullWidth
            label="版本说明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            size="small"
            multiline
            rows={2}
            placeholder="描述此版本的整体状态..."
          />
          <TextField
            fullWidth
            label="变更摘要"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            margin="normal"
            size="small"
            multiline
            rows={3}
            placeholder="记录此版本相对于上一版的主要调整..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">
          取消
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          disabled={!name.trim()}
        >
          创建版本
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ReviewDialog: React.FC<{
  open: boolean;
  version: ReviewVersion | null;
  onClose: () => void;
  onReview: (decision: ReviewDecision, comment: string) => void;
}> = ({ open, version, onClose, onReview }) => {
  const [decision, setDecision] = useState<ReviewDecision>('approved');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open && version) {
      setDecision(version.reviewDecision === 'pending' ? 'approved' : version.reviewDecision);
      setComment(version.reviewComment || '');
    }
  }, [open, version]);

  const handleSubmit = () => {
    onReview(decision, comment.trim());
    onClose();
  };

  if (!version) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
        审核版本 {version.versionNo}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {version.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {version.description || '暂无描述'}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            审核结论
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {(['approved', 'rejected', 'needs_revision', 'pending'] as ReviewDecision[]).map((d) => (
              <Chip
                key={d}
                label={getDecisionLabel(d)}
                color={decision === d ? getDecisionColor(d) : 'default'}
                variant={decision === d ? 'filled' : 'outlined'}
                onClick={() => setDecision(d)}
                icon={getDecisionIcon(d)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>

          <TextField
            fullWidth
            label="审核意见"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            size="small"
            multiline
            rows={4}
            placeholder="请输入审核意见..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">
          取消
        </Button>
        <Button onClick={handleSubmit} variant="contained" size="small">
          提交审核
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DiffPlaybackPanel: React.FC<{ versions: ReviewVersion[] }> = ({ versions }) => {
  const {
    diffPlayback,
    setDiffPlaybackPlaying,
    setDiffPlaybackIndex,
    setDiffPlaybackSpeed,
    setDiffPlaybackVersions,
  } = useAppStore();

  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const timerRef = useRef<number | null>(null);

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => a.createdAt - b.createdAt),
    [versions]
  );

  useEffect(() => {
    setDiffPlaybackVersions(sortedVersions);
    return () => {
      setDiffPlaybackVersions([]);
    };
  }, [sortedVersions, setDiffPlaybackVersions]);

  useEffect(() => {
    if (diffPlayback.playing && diffPlayback.versions.length > 1) {
      timerRef.current = window.setInterval(() => {
        const nextIndex = diffPlayback.currentVersionIndex + 1;
        if (nextIndex >= diffPlayback.versions.length) {
          setDiffPlaybackPlaying(false);
        } else {
          setDiffPlaybackIndex(nextIndex);
        }
      }, 2000 / diffPlayback.speed);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [diffPlayback.playing, diffPlayback.currentVersionIndex, diffPlayback.versions.length, diffPlayback.speed, setDiffPlaybackPlaying, setDiffPlaybackIndex]);

  const currentVersion = diffPlayback.versions[diffPlayback.currentVersionIndex];
  const prevVersion = diffPlayback.currentVersionIndex > 0
    ? diffPlayback.versions[diffPlayback.currentVersionIndex - 1]
    : null;

  useEffect(() => {
    if (prevVersion && currentVersion) {
      const diff = computeVersionDiff(prevVersion, currentVersion);
      setDiffResult(diff);
    } else {
      setDiffResult(null);
    }
  }, [prevVersion, currentVersion]);

  if (versions.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
        <TimelineIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2">暂无版本，无法进行差异回放</Typography>
        <Typography variant="caption" color="text.disabled">
          创建审阅版本后即可在此回放版本差异
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TimelineIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
            版本回放控制
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SpeedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              {diffPlayback.speed.toFixed(1)}x
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <IconButton
            size="small"
            onClick={() => setDiffPlaybackIndex(diffPlayback.currentVersionIndex - 1)}
            disabled={diffPlayback.currentVersionIndex <= 0}
          >
            <PrevIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setDiffPlaybackPlaying(!diffPlayback.playing)}
            sx={{
              bgcolor: diffPlayback.playing ? 'error.main' : 'success.main',
              color: '#fff',
              '&:hover': {
                bgcolor: diffPlayback.playing ? 'error.dark' : 'success.dark',
              },
            }}
          >
            {diffPlayback.playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayIcon sx={{ fontSize: 18 }} />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setDiffPlaybackIndex(diffPlayback.currentVersionIndex + 1)}
            disabled={diffPlayback.currentVersionIndex >= diffPlayback.versions.length - 1}
          >
            <NextIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Slider
              size="small"
              value={diffPlayback.currentVersionIndex}
              onChange={(_e, v) => setDiffPlaybackIndex(v as number)}
              min={0}
              max={Math.max(0, diffPlayback.versions.length - 1)}
              step={1}
              marks={diffPlayback.versions.map((ver, i) => ({
                value: i,
                label: i === diffPlayback.currentVersionIndex ? ver.versionNo : '',
              }))}
            />
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          回放速度
        </Typography>
        <Slider
          size="small"
          value={diffPlayback.speed}
          onChange={(_e, v) => setDiffPlaybackSpeed(v as number)}
          min={0.5}
          max={4}
          step={0.5}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}x`}
        />
      </Paper>

      {prevVersion && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Chip label={prevVersion.versionNo} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
            <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Chip label={currentVersion?.versionNo} size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              版本间差异
            </Typography>
          </Box>

          {diffResult && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`新增: ${diffResult.added.length}`}
                color="success"
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
              <Chip
                label={`删除: ${diffResult.removed.length}`}
                color="error"
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
              <Chip
                label={`修改: ${diffResult.modified.length}`}
                color="warning"
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
              <Chip
                label={`未变: ${diffResult.unchanged.length}`}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            </Box>
          )}

          {diffResult && diffResult.modified.length > 0 && (
            <Box sx={{ mt: 1, maxHeight: 120, overflow: 'auto' }}>
              {diffResult.modified.slice(0, 8).map((change, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                  <Chip label={`#${change.fragmentNo}`} size="small" sx={{ height: 16, fontSize: 9 }} />
                  <Typography variant="caption" color="text.secondary">
                    {String(change.field)}:
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'error.main', textDecoration: 'line-through' }}>
                    {JSON.stringify(change.oldValue)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'success.main' }}>
                    {JSON.stringify(change.newValue)}
                  </Typography>
                </Box>
              ))}
              {diffResult.modified.length > 8 && (
                <Typography variant="caption" color="text.disabled">
                  ...还有 {diffResult.modified.length - 8} 处修改
                </Typography>
              )}
            </Box>
          )}

          {diffResult && diffResult.added.length === 0 && diffResult.removed.length === 0 && diffResult.modified.length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 0.5 }}>
              此版本与上一版无碎片差异
            </Typography>
          )}
        </Paper>
      )}

      {currentVersion && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={currentVersion.versionNo}
              color="primary"
              size="small"
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
              {currentVersion.name}
            </Typography>
            <Chip
              label={getDecisionLabel(currentVersion.reviewDecision)}
              color={getDecisionColor(currentVersion.reviewDecision)}
              size="small"
              variant="outlined"
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {currentVersion.description || '暂无描述'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LayersIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {Object.keys(currentVersion.fragmentMap).length} 个碎片
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CommentIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {currentVersion.annotations.length} 条批注
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {currentVersion.author}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              {formatTime(currentVersion.createdAt)}
            </Typography>
          </Box>

          {currentVersion.changeSummary && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                变更摘要
              </Typography>
              <Paper variant="outlined" sx={{ p: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2">
                  {currentVersion.changeSummary}
                </Typography>
              </Paper>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};

const AnnotationTimelineTab: React.FC = () => {
  const {
    getAnnotations,
    getReviewVersions,
    activeSchemeId,
    schemes,
  } = useAppStore();

  const annotations = getAnnotations();
  const versions = getReviewVersions();
  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;

  const timelineEvents = useMemo(() => {
    const events: { type: 'annotation' | 'version'; timestamp: number; data: any }[] = [];

    annotations.forEach((anno) => {
      events.push({ type: 'annotation', timestamp: anno.createdAt, data: anno });
      if (anno.resolvedAt) {
        events.push({
          type: 'annotation',
          timestamp: anno.resolvedAt,
          data: { ...anno, isResolve: true },
        });
      }
    });

    versions.forEach((ver) => {
      events.push({ type: 'version', timestamp: ver.createdAt, data: ver });
      if (ver.reviewedAt) {
        events.push({
          type: 'version',
          timestamp: ver.reviewedAt,
          data: { ...ver, isReview: true },
        });
      }
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [annotations, versions]);

  const getFragmentNo = (fragmentId: string | null) => {
    if (!fragmentId || !scheme) return null;
    const frag = scheme.fragmentMap[fragmentId];
    return frag ? frag.fragmentNo : null;
  };

  if (timelineEvents.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
        <TimelineIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2">暂无活动记录</Typography>
        <Typography variant="caption">添加批注或创建审阅版本后将在此显示时间线</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TimelineIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          批注与版本历史追踪
        </Typography>
        <Chip label={`${timelineEvents.length} 条记录`} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
      </Box>

      <Box sx={{ position: 'relative', pl: 3 }}>
        <Box sx={{
          position: 'absolute',
          left: 11,
          top: 0,
          bottom: 0,
          width: 2,
          bgcolor: 'divider',
        }} />

        {timelineEvents.slice(0, 50).map((event, idx) => {
          const isAnnotation = event.type === 'annotation';
          const isResolve = event.data.isResolve;
          const isReview = event.data.isReview;

          return (
            <Box
              key={idx}
              sx={{
                position: 'relative',
                mb: 2,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: -22,
                  top: 8,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: isAnnotation
                    ? (isResolve ? 'success.main' : getTypeColor(event.data.type))
                    : (isReview ? 'info.main' : 'secondary.main'),
                  border: '2px solid',
                  borderColor: 'background.paper',
                },
              }}
            >
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  {isAnnotation ? (
                    <>
                      <Chip
                        label={isResolve ? '已解决' : getTypeLabel(event.data.type)}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 10,
                          bgcolor: isResolve ? 'success.main' : getTypeColor(event.data.type),
                          color: '#fff',
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                        {event.data.title}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Chip
                        label={isReview ? '审核' : '版本'}
                        size="small"
                        color={isReview ? 'info' : 'secondary'}
                        sx={{ height: 18, fontSize: 10 }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                        {event.data.name || event.data.versionNo}
                      </Typography>
                      {isReview && (
                        <Chip
                          label={getDecisionLabel(event.data.reviewDecision)}
                          size="small"
                          color={getDecisionColor(event.data.reviewDecision)}
                          sx={{ height: 16, fontSize: 9 }}
                        />
                      )}
                    </>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <PersonIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">
                    {event.data.author}
                  </Typography>
                  <ScheduleIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">
                    {formatTime(event.timestamp)}
                  </Typography>
                  {isAnnotation && event.data.fragmentId && (
                    <>
                      <FlagIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        碎片 #{getFragmentNo(event.data.fragmentId)}
                      </Typography>
                    </>
                  )}
                </Box>
              </Paper>
            </Box>
          );
        })}

        {timelineEvents.length > 50 && (
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', display: 'block' }}>
            还有 {timelineEvents.length - 50} 条记录未显示
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const ReviewReportTab: React.FC = () => {
  const {
    generateReviewReport,
    exportReviewReport,
    getReviewVersions,
    getAnnotations,
  } = useAppStore();

  const versions = getReviewVersions();
  const annotations = getAnnotations();
  const report = generateReviewReport();

  const approvedCount = versions.filter((v) => v.reviewDecision === 'approved').length;
  const rejectedCount = versions.filter((v) => v.reviewDecision === 'rejected').length;
  const pendingCount = versions.filter((v) => v.reviewDecision === 'pending' || v.reviewDecision === 'needs_revision').length;

  const openAnnoCount = annotations.filter((a) => a.status === 'open').length;
  const resolvedAnnoCount = annotations.filter((a) => a.status === 'resolved' || a.status === 'closed').length;
  const criticalAnnoCount = annotations.filter((a) => a.priority === 'critical' || a.priority === 'high').length;

  const resolutionRate = annotations.length > 0
    ? Math.round(((resolvedAnnoCount) / annotations.length) * 100)
    : 0;

  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          审阅报告包含当前方案的所有批注和版本记录，可导出为 JSON 格式用于归档或分享。
        </Typography>
      </Alert>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          版本审核概览
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
              {versions.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              版本数
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
              {approvedCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              已通过
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
              {rejectedCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              已驳回
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main" sx={{ fontWeight: 700 }}>
              {pendingCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              待处理
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          批注处理进度
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {annotations.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              总批注
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
              {openAnnoCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              待处理
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
              {resolvedAnnoCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              已解决
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main" sx={{ fontWeight: 700 }}>
              {criticalAnnoCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              紧急/高优先
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              批注解决率
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {resolutionRate}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={resolutionRate}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: resolutionRate >= 80 ? 'success.main' : resolutionRate >= 50 ? 'warning.main' : 'error.main',
              },
            }}
          />
        </Box>
      </Paper>

      {report && report.summary && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            批注类型分布
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(Object.entries(report.summary.byType) as [AnnotationType, number][]).map(([type, count]) => (
              <Chip
                key={type}
                label={`${getTypeLabel(type)}: ${count}`}
                size="small"
                sx={{
                  bgcolor: getTypeColor(type),
                  color: '#fff',
                  height: 24,
                  fontSize: 11,
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {report && report.versionSummaries && report.versionSummaries.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            版本审核记录
          </Typography>
          <List dense disablePadding>
            {report.versionSummaries.map((vs) => (
              <ListItem key={vs.versionId} disableGutters sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {getDecisionIcon(vs.decision)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip label={vs.versionNo} size="small" sx={{ height: 18, fontSize: 10 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {vs.name}
                      </Typography>
                      <Chip
                        label={getDecisionLabel(vs.decision)}
                        size="small"
                        color={getDecisionColor(vs.decision)}
                        variant="outlined"
                        sx={{ height: 16, fontSize: 9 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.disabled">
                      {vs.fragmentCount} 碎片 · {vs.annotationCount} 批注
                      {vs.reviewedBy ? ` · 审核: ${vs.reviewedBy}` : ' · 待审核'}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<ExportIcon />}
          onClick={exportReviewReport}
        >
          导出审阅报告
        </Button>
      </Box>
    </Box>
  );
};

const ReviewCenterDialog: React.FC<ReviewCenterDialogProps> = ({ open, onClose }) => {
  const {
    getReviewVersions,
    createReviewVersion,
    deleteReviewVersion,
    reviewVersion,
    restoreReviewVersion,
    currentUser,
    userRole,
    setUserRole,
    setCurrentUser,
  } = useAppStore();

  const versions = getReviewVersions();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || null;

  useEffect(() => {
    if (open && versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versions[versions.length - 1].id);
    }
  }, [open, versions, selectedVersionId]);

  const handleCreateVersion = (name: string, description: string, changeSummary: string) => {
    createReviewVersion({ name, description, changeSummary });
  };

  const handleReview = (decision: ReviewDecision, comment: string) => {
    if (selectedVersionId) {
      reviewVersion(selectedVersionId, decision, comment);
    }
  };

  const handleDelete = (versionId: string) => {
    if (confirm('确定要删除此审阅版本吗？')) {
      deleteReviewVersion(versionId);
      if (selectedVersionId === versionId) {
        setSelectedVersionId(null);
      }
    }
  };

  const handleRestore = (versionId: string) => {
    if (confirm('确定要恢复到此版本吗？当前未保存的更改将丢失。')) {
      restoreReviewVersion(versionId);
    }
  };

  const sortedVersions = [...versions].sort((a, b) => b.createdAt - a.createdAt);

  const getFragmentNo = (fragmentId: string | null) => {
    if (!fragmentId) return null;
    const scheme = useAppStore.getState().activeSchemeId
      ? useAppStore.getState().schemes[useAppStore.getState().activeSchemeId!]
      : null;
    if (!scheme) return null;
    const frag = scheme.fragmentMap[fragmentId];
    return frag ? frag.fragmentNo : null;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16, pb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 700, flex: 1, fontSize: 16 }}>
              考据批注与版本审阅中心
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={ROLE_LABELS[userRole]}
                size="small"
                color={userRole === 'project_lead' ? 'secondary' : userRole === 'reviewer' ? 'info' : 'default'}
                sx={{ height: 22, fontSize: 11 }}
              />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ fontSize: 11 }}>角色</InputLabel>
                <Select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  label="角色"
                  sx={{ height: 28, fontSize: 12 }}
                >
                  <MenuItem value="curator" sx={{ fontSize: 12 }}>整理人员</MenuItem>
                  <MenuItem value="reviewer" sx={{ fontSize: 12 }}>审核人员</MenuItem>
                  <MenuItem value="project_lead" sx={{ fontSize: 12 }}>项目负责人</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogTitle>

        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="版本审阅" sx={{ minHeight: 40, fontSize: 13 }} />
          <Tab label={`差异回放 (${versions.length})`} sx={{ minHeight: 40, fontSize: 13 }} />
          <Tab label="历史追踪" sx={{ minHeight: 40, fontSize: 13 }} />
          <Tab label="审阅报告" sx={{ minHeight: 40, fontSize: 13 }} />
        </Tabs>

        <DialogContent sx={{ p: 0, minHeight: 500, maxHeight: 700 }}>
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', height: '100%', minHeight: 500 }}>
              <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider' }}>
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Button
                    size="small"
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    创建新版本
                  </Button>
                </Box>
                <List dense sx={{ overflow: 'auto', maxHeight: 460 }}>
                  {sortedVersions.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="暂无审阅版本"
                        secondary="创建第一个版本以开始审阅流程"
                        primaryTypographyProps={{ variant: 'body2', color: 'text.disabled' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ) : (
                    sortedVersions.map((version) => (
                      <ListItem
                        key={version.id}
                        button
                        selected={selectedVersionId === version.id}
                        onClick={() => setSelectedVersionId(version.id)}
                        sx={{
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&.Mui-selected': {
                            bgcolor: 'action.selected',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Chip
                            label={version.versionNo}
                            size="small"
                            color={getDecisionColor(version.reviewDecision)}
                            sx={{ height: 20, fontSize: 10, minWidth: 40 }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {version.name}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.disabled" display="block">
                                {formatTime(version.createdAt)}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                <Chip
                                  size="small"
                                  label={getDecisionLabel(version.reviewDecision)}
                                  color={getDecisionColor(version.reviewDecision)}
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: 9 }}
                                />
                                <Chip
                                  size="small"
                                  label={`${version.annotations.length}批注`}
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: 9 }}
                                />
                              </Box>
                            </Box>
                          }
                          sx={{ my: 0.5 }}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>

              <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
                {selectedVersion ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        label={selectedVersion.versionNo}
                        color="primary"
                        size="small"
                      />
                      <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, fontSize: 16 }}>
                        {selectedVersion.name}
                      </Typography>
                      <Chip
                        label={getDecisionLabel(selectedVersion.reviewDecision)}
                        color={getDecisionColor(selectedVersion.reviewDecision)}
                        size="small"
                        icon={getDecisionIcon(selectedVersion.reviewDecision)}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {selectedVersion.description || '暂无版本描述'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption">
                          创建者：{selectedVersion.author}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption">
                          {formatTime(selectedVersion.createdAt)}
                        </Typography>
                      </Box>
                    </Box>

                    {selectedVersion.reviewedBy && (
                      <Alert severity="info" sx={{ mb: 2 }} icon={false}>
                        <Typography variant="caption" display="block">
                          <strong>审核人：</strong>{selectedVersion.reviewedBy}
                        </Typography>
                        <Typography variant="caption" display="block">
                          <strong>审核时间：</strong>{selectedVersion.reviewedAt ? formatTime(selectedVersion.reviewedAt) : '-'}
                        </Typography>
                        {selectedVersion.reviewComment && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            <strong>审核意见：</strong>{selectedVersion.reviewComment}
                          </Typography>
                        )}
                      </Alert>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={`${Object.keys(selectedVersion.fragmentMap).length} 个碎片`}
                        variant="outlined"
                        size="small"
                        icon={<LayersIcon sx={{ fontSize: 14 }} />}
                      />
                      <Chip
                        label={`${selectedVersion.annotations.length} 条批注`}
                        variant="outlined"
                        size="small"
                        icon={<CommentIcon sx={{ fontSize: 14 }} />}
                      />
                    </Box>

                    {selectedVersion.changeSummary && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          变更摘要
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                          <Typography variant="body2">
                            {selectedVersion.changeSummary}
                          </Typography>
                        </Paper>
                      </Box>
                    )}

                    {selectedVersion.annotations.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          此版本包含的批注
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {selectedVersion.annotations.slice(0, 5).map((anno) => (
                            <Paper key={anno.id} variant="outlined" sx={{ p: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={getTypeLabel(anno.type)}
                                  size="small"
                                  sx={{ height: 18, fontSize: 10, bgcolor: getTypeColor(anno.type), color: '#fff' }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                                  {anno.title}
                                </Typography>
                                {anno.assignee && (
                                  <Chip
                                    label={anno.assignee}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: 9 }}
                                    icon={<PersonIcon sx={{ fontSize: 10 }} />}
                                  />
                                )}
                              </Box>
                            </Paper>
                          ))}
                          {selectedVersion.annotations.length > 5 && (
                            <Typography variant="caption" color="text.disabled">
                              ...还有 {selectedVersion.annotations.length - 5} 条批注
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {userRole !== 'curator' && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<EditNoteIcon />}
                          onClick={() => setReviewDialogOpen(true)}
                        >
                          审核版本
                        </Button>
                      )}
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleRestore(selectedVersion.id)}
                      >
                        恢复此版本
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(selectedVersion.id)}
                      >
                        删除
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
                    <HistoryIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2">选择一个版本查看详情</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 2 }}>
              <DiffPlaybackPanel versions={sortedVersions} />
            </Box>
          )}

          {activeTab === 2 && (
            <AnnotationTimelineTab />
          )}

          {activeTab === 3 && (
            <ReviewReportTab />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} size="small" startIcon={<CloseIcon />}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <CreateVersionDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateVersion}
      />

      <ReviewDialog
        open={reviewDialogOpen}
        version={selectedVersion}
        onClose={() => setReviewDialogOpen(false)}
        onReview={handleReview}
      />
    </>
  );
};

export default ReviewCenterDialog;
