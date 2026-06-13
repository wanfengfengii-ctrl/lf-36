import React, { useState, useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Collapse,
  Button,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemButton,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Label as LabelIcon,
  Book as BookIcon,
  BugReport as BugIcon,
  Lightbulb as SuggestionIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  ChatBubble as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../store/useAppStore';
import type {
  Annotation,
  AnnotationType,
  AnnotationStatus,
  AnnotationPriority,
} from '../../types';

function getTypeIcon(type: AnnotationType) {
  const icons: Record<AnnotationType, React.ReactNode> = {
    research: <BookIcon fontSize="small" />,
    issue: <BugIcon fontSize="small" />,
    suggestion: <SuggestionIcon fontSize="small" />,
    question: <HelpIcon fontSize="small" />,
    info: <InfoIcon fontSize="small" />,
  };
  return icons[type];
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

function getStatusLabel(status: AnnotationStatus): string {
  const labels: Record<AnnotationStatus, string> = {
    open: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  };
  return labels[status];
}

function getStatusColor(status: AnnotationStatus): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  const colors: Record<AnnotationStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    open: 'error',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'default',
  };
  return colors[status];
}

function getPriorityLabel(priority: AnnotationPriority): string {
  const labels: Record<AnnotationPriority, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急',
  };
  return labels[priority];
}

function getPriorityColor(priority: AnnotationPriority): 'default' | 'primary' | 'warning' | 'error' {
  const colors: Record<AnnotationPriority, 'default' | 'primary' | 'warning' | 'error'> = {
    low: 'default',
    medium: 'primary',
    high: 'warning',
    critical: 'error',
  };
  return colors[priority];
}

interface AnnotationPanelProps {
  onAddAnnotation: () => void;
  onEditAnnotation: (annotation: Annotation) => void;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ onAddAnnotation, onEditAnnotation }) => {
  const {
    getFilteredAnnotations,
    getAnnotations,
    annotationFilter,
    setAnnotationFilter,
    resetAnnotationFilter,
    selectedAnnotationId,
    selectAnnotation,
    deleteAnnotation,
    changeAnnotationStatus,
    activeSchemeId,
    schemes,
    addAnnotationComment,
    deleteAnnotationComment,
    currentUser,
  } = useAppStore();

  const [filterExpanded, setFilterExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);

  const annotations = getFilteredAnnotations();
  const allAnnotations = getAnnotations();
  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;

  const allAuthors = useMemo(() => {
    const authors = new Set<string>();
    allAnnotations.forEach((a) => authors.add(a.author));
    return Array.from(authors);
  }, [allAnnotations]);

  const allAssignees = useMemo(() => {
    const assignees = new Set<string>();
    allAnnotations.forEach((a) => a.assignee && assignees.add(a.assignee));
    return Array.from(assignees);
  }, [allAnnotations]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allAnnotations.forEach((a) => a.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [allAnnotations]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    setAnnotationFilter({ searchText: value });
  };

  const toggleTypeFilter = (type: AnnotationType) => {
    const current = annotationFilter.types;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setAnnotationFilter({ types: next });
  };

  const toggleStatusFilter = (status: AnnotationStatus) => {
    const current = annotationFilter.statuses;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setAnnotationFilter({ statuses: next });
  };

  const togglePriorityFilter = (priority: AnnotationPriority) => {
    const current = annotationFilter.priorities;
    const next = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    setAnnotationFilter({ priorities: next });
  };

  const handleStatusMenuOpen = (e: React.MouseEvent<HTMLElement>, annotationId: string) => {
    e.stopPropagation();
    setStatusMenuAnchor({ el: e.currentTarget, id: annotationId });
  };

  const handleStatusChange = (status: AnnotationStatus) => {
    if (statusMenuAnchor) {
      changeAnnotationStatus(statusMenuAnchor.id, status);
      setStatusMenuAnchor(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, annotationId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条批注吗？')) {
      deleteAnnotation(annotationId);
    }
  };

  const handleAddComment = (annotationId: string) => {
    if (commentInput.trim()) {
      addAnnotationComment(annotationId, commentInput.trim());
      setCommentInput('');
    }
  };

  const handleToggleComments = (annotationId: string) => {
    setExpandedCommentId(expandedCommentId === annotationId ? null : annotationId);
    setCommentInput('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFragmentNo = (fragmentId: string | null) => {
    if (!fragmentId || !scheme) return null;
    const frag = scheme.fragmentMap[fragmentId];
    return frag ? frag.fragmentNo : null;
  };

  const stats = useMemo(() => {
    const total = allAnnotations.length;
    const open = allAnnotations.filter((a) => a.status === 'open').length;
    const inProgress = allAnnotations.filter((a) => a.status === 'in_progress').length;
    const resolved = allAnnotations.filter((a) => a.status === 'resolved' || a.status === 'closed').length;
    return { total, open, inProgress, resolved };
  }, [allAnnotations]);

  const types: AnnotationType[] = ['research', 'issue', 'suggestion', 'question', 'info'];
  const statuses: AnnotationStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
  const priorities: AnnotationPriority[] = ['low', 'medium', 'high', 'critical'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`总计 ${stats.total}`}
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
          <Chip
            size="small"
            label={`待处理 ${stats.open}`}
            color="error"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
          <Chip
            size="small"
            label={`已解决 ${stats.resolved}`}
            color="success"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
        </Box>
        <Tooltip title="添加批注">
          <IconButton size="small" onClick={onAddAnnotation} color="primary">
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={filterExpanded ? '收起筛选' : '展开筛选'}>
          <IconButton
            size="small"
            onClick={() => setFilterExpanded(!filterExpanded)}
            color={filterExpanded ? 'primary' : 'default'}
          >
            <FilterIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={filterExpanded} timeout="auto">
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          <TextField
            size="small"
            fullWidth
            placeholder="搜索批注..."
            value={searchText}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} />,
            }}
            sx={{ mb: 1.5 }}
          />

          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            类型筛选
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
            {types.map((type) => (
              <Chip
                key={type}
                size="small"
                label={getTypeLabel(type)}
                variant={annotationFilter.types.includes(type) ? 'filled' : 'outlined'}
                onClick={() => toggleTypeFilter(type)}
                sx={{
                  fontSize: 11,
                  height: 22,
                  borderColor: getTypeColor(type),
                  color: annotationFilter.types.includes(type) ? '#fff' : getTypeColor(type),
                  bgcolor: annotationFilter.types.includes(type) ? getTypeColor(type) : 'transparent',
                  '&:hover': { bgcolor: annotationFilter.types.includes(type) ? getTypeColor(type) : 'action.hover' },
                }}
              />
            ))}
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            状态筛选
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
            {statuses.map((status) => (
              <Chip
                key={status}
                size="small"
                label={getStatusLabel(status)}
                color={annotationFilter.statuses.includes(status) ? getStatusColor(status) : 'default'}
                variant={annotationFilter.statuses.includes(status) ? 'filled' : 'outlined'}
                onClick={() => toggleStatusFilter(status)}
                sx={{ fontSize: 11, height: 22 }}
              />
            ))}
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            优先级筛选
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {priorities.map((priority) => (
              <Chip
                key={priority}
                size="small"
                label={getPriorityLabel(priority)}
                color={annotationFilter.priorities.includes(priority) ? getPriorityColor(priority) : 'default'}
                variant={annotationFilter.priorities.includes(priority) ? 'filled' : 'outlined'}
                onClick={() => togglePriorityFilter(priority)}
                sx={{ fontSize: 11, height: 22 }}
              />
            ))}
          </Box>

          <Button
            size="small"
            fullWidth
            onClick={resetAnnotationFilter}
            sx={{ fontSize: 11 }}
          >
            重置筛选
          </Button>
        </Box>
      </Collapse>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {annotations.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              暂无批注
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={onAddAnnotation}>
              添加第一条批注
            </Button>
          </Box>
        ) : (
          <List dense disablePadding>
            {[...annotations]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((annotation) => {
                const isSelected = selectedAnnotationId === annotation.id;
                const fragmentNo = getFragmentNo(annotation.fragmentId);

                return (
                  <ListItem
                    key={annotation.id}
                    disablePadding
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: isSelected ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemButton
                      onClick={() => selectAnnotation(annotation.id)}
                      sx={{ py: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: getTypeColor(annotation.type) }}>
                        {getTypeIcon(annotation.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
                              {annotation.title}
                            </Typography>
                            <Chip
                              size="small"
                              label={getTypeLabel(annotation.type)}
                              sx={{
                                height: 18,
                                fontSize: 10,
                                bgcolor: getTypeColor(annotation.type),
                                color: '#fff',
                              }}
                            />
                            {annotation.priority === 'high' || annotation.priority === 'critical' ? (
                              <Chip
                                size="small"
                                label={getPriorityLabel(annotation.priority)}
                                color={getPriorityColor(annotation.priority)}
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            ) : null}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 0.5 }}>
                              {annotation.content}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                label={getStatusLabel(annotation.status)}
                                color={getStatusColor(annotation.status)}
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10 }}
                                onClick={(e) => handleStatusMenuOpen(e, annotation.id)}
                              />
                              {fragmentNo && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <LabelIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="text.disabled">
                                    碎片 #{fragmentNo}
                                  </Typography>
                                </Box>
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.disabled">
                                  {annotation.author}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ScheduleIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.disabled">
                                  {formatTime(annotation.createdAt)}
                                </Typography>
                              </Box>
                              {annotation.comments.length > 0 && (
                                <Chip
                                  size="small"
                                  icon={<ChatIcon sx={{ fontSize: 10 }} />}
                                  label={annotation.comments.length}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleComments(annotation.id);
                                  }}
                                  sx={{ height: 18, fontSize: 10, cursor: 'pointer' }}
                                />
                              )}
                              {annotation.assignee && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PersonIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="text.disabled">
                                    → {annotation.assignee}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        }
                        sx={{ my: 0 }}
                      />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Tooltip title="评论">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComments(annotation.id);
                            }}
                            color={expandedCommentId === annotation.id ? 'primary' : 'default'}
                          >
                            <ChatIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAnnotation(annotation);
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => handleDelete(e, annotation.id)}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemButton>
                    <Collapse in={expandedCommentId === annotation.id} timeout="auto">
                      <Box sx={{ px: 2, pb: 1.5, bgcolor: 'action.hover' }}>
                        {annotation.comments.length > 0 && (
                          <Box sx={{ mb: 1, maxHeight: 120, overflow: 'auto' }}>
                            {annotation.comments.map((comment) => (
                              <Paper key={comment.id} variant="outlined" sx={{ p: 0.75, mb: 0.5, bgcolor: 'background.paper' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                                  <PersonIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
                                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 10 }}>
                                    {comment.author}
                                  </Typography>
                                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>
                                    {formatTime(comment.createdAt)}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    sx={{ ml: 'auto', p: 0 }}
                                    onClick={() => deleteAnnotationComment(annotation.id, comment.id)}
                                  >
                                    <CloseIcon sx={{ fontSize: 10 }} />
                                  </IconButton>
                                </Box>
                                <Typography variant="caption" sx={{ fontSize: 11 }}>
                                  {comment.content}
                                </Typography>
                              </Paper>
                            ))}
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end' }}>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="添加评论..."
                            value={expandedCommentId === annotation.id ? commentInput : ''}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(annotation.id);
                              }
                            }}
                            multiline
                            maxRows={2}
                            sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.5 } }}
                          />
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleAddComment(annotation.id)}
                            disabled={!commentInput.trim()}
                          >
                            <SendIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Collapse>
                  </ListItem>
                );
              })}
          </List>
        )}
      </Box>

      <Menu
        anchorEl={statusMenuAnchor?.el || null}
        open={Boolean(statusMenuAnchor)}
        onClose={() => setStatusMenuAnchor(null)}
      >
        {statuses.map((status) => (
          <MenuItem key={status} onClick={() => handleStatusChange(status)}>
            <CheckCircleIcon sx={{ mr: 1, fontSize: 18, color: getStatusColor(status) === 'success' ? 'success.main' : 'inherit' }} />
            {getStatusLabel(status)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default AnnotationPanel;
