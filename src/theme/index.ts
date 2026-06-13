import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3E2723',
      light: '#5D4037',
      dark: '#1B0000',
      contrastText: '#F5F0E1',
    },
    secondary: {
      main: '#B8860B',
      light: '#D4A832',
      dark: '#8B6508',
      contrastText: '#3E2723',
    },
    background: {
      default: '#F5F0E1',
      paper: '#FDFAF3',
    },
    error: {
      main: '#C62828',
      light: '#E53935',
      dark: '#8E0000',
    },
    success: {
      main: '#2E7D32',
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    warning: {
      main: '#E65100',
      light: '#FF6D00',
      dark: '#AC1900',
    },
    info: {
      main: '#1E3A5F',
      light: '#2C5282',
      dark: '#0D2137',
    },
    text: {
      primary: '#3E2723',
      secondary: '#5D4037',
      disabled: '#A0826D',
    },
    divider: '#D7CCC8',
  },
  typography: {
    fontFamily: '"Noto Sans SC", "Noto Serif SC", serif',
    h5: {
      fontFamily: '"Noto Serif SC", serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Noto Serif SC", serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: '"Noto Serif SC", serif',
      fontWeight: 500,
    },
    body2: {
      fontSize: '0.8125rem',
    },
    caption: {
      fontSize: '0.7rem',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: '0 1px 2px rgba(62,39,35,0.15)',
          '&:hover': {
            boxShadow: '0 2px 6px rgba(62,39,35,0.25)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #D7CCC8',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        thumb: {
          '&:hover': {
            boxShadow: '0 0 0 8px rgba(184,134,11,0.16)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
