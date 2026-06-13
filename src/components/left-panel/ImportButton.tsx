import React, { useRef } from 'react';
import { Button, styled } from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { useFragmentOps } from '../../hooks/useFragmentOps';

const StyledButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.primary.dark,
  fontWeight: 600,
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`,
  },
}));

const ImportButton: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { importFiles } = useFragmentOps();

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      importFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <StyledButton
        variant="contained"
        startIcon={<UploadFile fontSize="small" />}
        fullWidth
        onClick={handleClick}
        size="large"
      >
        导入扫描碎片
      </StyledButton>
    </>
  );
};

export default ImportButton;
