import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Book as BookIcon,
  BugReport as BugIcon,
  Lightbulb as SuggestionIcon,
  Help as HelpIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../store/useAppStore';
import type {
  Annotation,
  AnnotationType,
  AnnotationStatus,
  AnnotationPriority,
} from '../../types';

interface AnnotationEditorDialogProps {
  open: boolean;
  onClose: () => void;
  annotation?: Annotation | null;
  defaultFragmentId?: string | null;
}

const AnnotationEditorDialog: React.FC<AnnotationEditorDialogProps> = ({
  open,
  onClose,
  annotation,
  defaultFragmentId,
}) => {
  const {
    addAnnotation,
    updateAnnotation,
    activeSchemeId,
    schemes,
    selectedFragmentId,
  } = useAppStore();

  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const fragments = scheme ? Object.values(scheme.fragmentMap) : [];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<AnnotationType>('info');
  const [status, setStatus] = useState<AnnotationStatus>('open');
  const [priority, setPriority] = useState<AnnotationPriority>('medium');
  const [fragmentId, setFragmentId] = useState<string | null>(null);
  const [assignee, setAssignee] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [versionTag, setVersionTag] = useState('');

  const isEdit = Boolean(annotation);

  useEffect(() => {
    if (open) {
      if (annotation) {
        setTitle(annotation.title);
        setContent(annotation.content);
        setType(annotation.type);
        setStatus(annotation.status);
        setPriority(annotation.priority);
        setFragmentId(annotation.fragmentId);
        setAssignee(annotation.assignee || '');
        setTags(annotation.tags);
        setTagsInput('');
        setVersionTag(annotation.versionTag || '');
      } else {
        setTitle('');
        setContent('');
        setType('info');
        setStatus('open');
        setPriority('medium');
        setFragmentId(defaultFragmentId || selectedFragmentId || null);
        setAssignee('');
        setTags([]);
        setTagsInput('');
        setVersionTag('');
      }
    }
  }, [open, annotation, defaultFragmentId, selectedFragmentId]);

  const handleSave = () => {
    if (!title.trim()) return;

    if (annotation) {
      updateAnnotation(annotation.id, {
        title: title.trim(),
        content: content.trim(),
        type,
        status,
        priority,
        fragmentId,
        assignee: assignee.trim() || null,
        tags,
        versionTag: versionTag.trim() || null,
      });
    } else {
      addAnnotation({
        fragmentId,
        type,
        title: title.trim(),
        content: content.trim(),
        priority,
        tags,
        assignee: assignee.trim() || null,
      });
    }
    onClose();
  };

  const handleAddTag = () => {
    const tag = tagsInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagsInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const typeOptions: { value: AnnotationType; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'research', label: '考据批注', icon: <BookIcon sx={{ fontSize: 18 }} />, color: '#B8860B' },
    { value: 'issue', label: '问题标签', icon: <BugIcon sx={{ fontSize: 18 }} />, color: '#C62828' },
    { value: 'suggestion', label: '修复建议', icon: <SuggestionIcon sx={{ fontSize: 18 }} />, color: '#2E7D32' },
    { value: 'question', label: '疑问', icon: <HelpIcon sx={{ fontSize: 18 }} />, color: '#1565C0' },
    { value: 'info', label: '备注', icon: <InfoIcon sx={{ fontSize: 18 }} />, color: '#6A1B9A' },
  ];

  const statusOptions: { value: AnnotationStatus; label: string }[] = [
    { value: 'open', label: '待处理' },
    { value: 'in_progress', label: '处理中' },
    { value: 'resolved', label: '已解决' },
    { value: 'closed', label: '已关闭' },
  ];

  const priorityOptions: { value: AnnotationPriority; label: string }[] = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
    { value: 'critical', label: '紧急' },
  ];

  const commonPeople = ['整理人员', '审核人员', '项目负责人', '修复师', '文史研究员'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16, pb: 1 }}>
        {isEdit ? '编辑批注' : '添加批注'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="批注标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            size="small"
            placeholder="简要描述此批注的内容"
          />

          <TextField
            fullWidth
            label="详细内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            margin="normal"
            size="small"
            multiline
            rows={4}
            placeholder="详细描述考据内容、问题、修复建议等..."
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>批注类型</InputLabel>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as AnnotationType)}
                label="批注类型"
              >
                {typeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: opt.color }}>{opt.icon}</Box>
                      {opt.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>优先级</InputLabel>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnotationPriority)}
                label="优先级"
              >
                {priorityOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {isEdit && (
            <FormControl size="small" fullWidth sx={{ mt: 2 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as AnnotationStatus)}
                label="状态"
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" fullWidth sx={{ mt: 2 }}>
            <InputLabel>关联碎片</InputLabel>
            <Select
              value={fragmentId || ''}
              onChange={(e) => setFragmentId(e.target.value || null)}
              label="关联碎片"
            >
              <MenuItem value="">
                <em>不关联具体碎片（全局批注）</em>
              </MenuItem>
              {fragments.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  碎片 #{f.fragmentNo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            freeSolo
            options={commonPeople}
            value={assignee}
            onChange={(_e, newValue) => setAssignee(newValue || '')}
            onInputChange={(_e, newValue) => setAssignee(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="责任人"
                margin="normal"
                size="small"
                placeholder="选择或输入责任人"
              />
            )}
            sx={{ mt: 2 }}
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              标签
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => handleRemoveTag(tag)}
                  sx={{ height: 24 }}
                />
              ))}
            </Box>
            <TextField
              size="small"
              fullWidth
              placeholder="输入标签后按回车添加"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              onBlur={handleAddTag}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              版本标记
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="关联审阅版本号，如 v1.0"
              value={versionTag}
              onChange={(e) => setVersionTag(e.target.value)}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small" startIcon={<CloseIcon />}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          disabled={!title.trim()}
        >
          {isEdit ? '保存修改' : '添加批注'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnnotationEditorDialog;
