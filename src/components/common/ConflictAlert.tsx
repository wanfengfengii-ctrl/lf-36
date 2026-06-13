import { Alert, Collapse, IconButton, Box } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

export default function ConflictAlert() {
  const conflicts = useAppStore((s) => s.conflicts);
  const scheme = useAppStore((s) => {
    const aid = s.activeSchemeId;
    return aid ? s.schemes[aid] : null;
  });
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const conflictFrags = conflicts.filter((c) => c.isConflict);

  useEffect(() => {
    if (conflictFrags.length > 0 && !dismissed) {
      setVisible(true);
    } else {
      setVisible(false);
      setDismissed(false);
    }
  }, [conflictFrags.length, dismissed]);

  if (!scheme || conflictFrags.length === 0) return null;

  const fragNames = conflictFrags.map((c) => {
    const a = scheme.fragmentMap[c.fragmentAId];
    const b = scheme.fragmentMap[c.fragmentBId];
    return `#${a?.fragmentNo || '?'} ↔ #${b?.fragmentNo || '?'}`;
  });

  return (
    <Collapse in={visible}>
      <Box sx={{ px: 2, pb: 1 }}>
        <Alert
          severity="error"
          variant="outlined"
          action={
            <IconButton
              size="small"
              onClick={() => {
                setDismissed(true);
                setVisible(false);
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          sx={{
            animation: 'pulse-border 2s ease-in-out infinite',
            '& .MuiAlert-message': { fontSize: '0.8125rem' },
          }}
        >
          重叠冲突：{fragNames.slice(0, 3).join('、')}
          {fragNames.length > 3 ? ` 等${fragNames.length}处` : ''}
        </Alert>
      </Box>
    </Collapse>
  );
}
