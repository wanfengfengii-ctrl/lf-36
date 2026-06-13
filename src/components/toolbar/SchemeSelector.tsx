import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  styled,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../store/useAppStore';

const StyledSelector = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1.5),
  background: 'rgba(62, 39, 35, 0.06)',
  border: '1px solid rgba(62, 39, 35, 0.15)',
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  minWidth: 260,
  transition: 'all 0.2s ease',
  '&:hover': {
    background: 'rgba(62, 39, 35, 0.1)',
    borderColor: 'rgba(62, 39, 35, 0.25)',
  },
}));

const SchemeSelector: React.FC = () => {
  const { schemes, activeSchemeId, setActiveScheme, createScheme, renameScheme, deleteScheme } = useAppStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeScheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const schemeList = Object.values(schemes).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (schemeId: string) => {
    setActiveScheme(schemeId);
    handleClose();
  };

  const handleCreate = () => {
    createScheme();
    handleClose();
  };

  const handleRenameClick = (schemeId: string, currentName: string) => {
    setEditingId(schemeId);
    setNewName(currentName);
    setRenameDialogOpen(true);
    handleClose();
  };

  const handleRenameConfirm = () => {
    if (editingId && newName.trim()) {
      renameScheme(editingId, newName.trim());
    }
    setRenameDialogOpen(false);
    setEditingId(null);
    setNewName('');
  };

  const handleDeleteClick = (schemeId: string) => {
    setEditingId(schemeId);
    setDeleteDialogOpen(true);
    handleClose();
  };

  const handleDeleteConfirm = () => {
    if (editingId) {
      deleteScheme(editingId);
    }
    setDeleteDialogOpen(false);
    setEditingId(null);
  };

  useEffect(() => {
    if (renameDialogOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renameDialogOpen]);

  return (
    <>
      <Tooltip title="切换方案" placement="bottom">
        <StyledSelector onClick={handleClick}>
          <FolderIcon sx={{ fontSize: 20, color: 'secondary.dark' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'Noto Serif SC, serif',
                fontWeight: 600,
                color: 'primary.main',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeScheme?.name || '无方案'}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
              {schemeList.length} 个方案 · {activeScheme ? Object.keys(activeScheme.fragmentMap).length : 0} 张碎片
            </Typography>
          </Box>
          <ArrowDropDownIcon sx={{ color: 'text.secondary' }} />
        </StyledSelector>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              minWidth: 280,
              mt: 0.5,
            },
          },
        }}
      >
        <MenuItem onClick={handleCreate}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                新建方案
              </Typography>
            }
          />
        </MenuItem>
        <Divider />
        {schemeList.map((scheme) => (
          <MenuItem
            key={scheme.id}
            selected={scheme.id === activeSchemeId}
            onClick={() => handleSelect(scheme.id)}
            sx={{ py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {scheme.id === activeSchemeId ? (
                <CheckIcon fontSize="small" color="primary" />
              ) : (
                <FolderIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Noto Serif SC, serif',
                    fontWeight: scheme.id === activeSchemeId ? 700 : 500,
                  }}
                >
                  {scheme.name}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.disabled">
                  {Object.keys(scheme.fragmentMap).length} 张碎片
                </Typography>
              }
              disableTypography
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameClick(scheme.id, scheme.name);
                }}
                sx={{ p: 0.5 }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(scheme.id);
                }}
                sx={{ p: 0.5 }}
                disabled={schemeList.length <= 1}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          重命名方案
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            inputRef={inputRef}
            margin="dense"
            label="方案名称"
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameConfirm();
            }}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)} size="small">
            取消
          </Button>
          <Button onClick={handleRenameConfirm} variant="contained" size="small" disabled={!newName.trim()}>
            确定
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16 }}>
          删除方案
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            确定要删除此方案吗？此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} size="small">
            取消
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" size="small">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SchemeSelector;
