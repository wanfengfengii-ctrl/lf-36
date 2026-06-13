import React from 'react';
import { Snackbar, Alert, Slide, styled } from '@mui/material';
import type { SnackbarProps } from '@mui/material/Snackbar';
import { useAppStore } from '../../store/useAppStore';

const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  '& .MuiAlert-root': {
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '1px solid',
    fontSize: 13,
  },
}));

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  return (
    <>
      {toasts.map((toast, index) => (
        <StyledSnackbar
          key={toast.id}
          open={true}
          autoHideDuration={4000}
          onClose={() => removeToast(toast.id)}
          slots={{ transition: Slide }}
          slotProps={{
            transition: { direction: 'down' } as any,
          }}
          sx={{
            top: 72 + index * 56,
            right: 16,
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            severity={toast.type}
            variant="filled"
            onClose={() => removeToast(toast.id)}
            sx={{
              minWidth: 240,
              '& .MuiAlert-message': {
                fontFamily: 'Noto Sans SC, sans-serif',
              },
            }}
          >
            {toast.message}
          </Alert>
        </StyledSnackbar>
      ))}
    </>
  );
};

export default ToastContainer;
