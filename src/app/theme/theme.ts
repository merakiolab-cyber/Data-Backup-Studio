import { createTheme, type PaletteOptions } from '@mui/material/styles';
import { darkScheme, lightScheme, type M3Scheme } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    m3: M3Scheme;
  }
  interface PaletteOptions {
    m3?: M3Scheme;
  }
}

function paletteFrom(s: M3Scheme): PaletteOptions {
  return {
    m3: s,
    primary: { main: s.primary, contrastText: s.onPrimary },
    secondary: { main: s.secondary, contrastText: s.onSecondary },
    error: { main: s.error, contrastText: s.onError },
    success: { main: s.success },
    warning: { main: s.warning },
    background: { default: s.surface, paper: s.surfaceContainerLow },
    text: { primary: s.onSurface, secondary: s.onSurfaceVariant },
    divider: s.outlineVariant,
  };
}

const emphasized = 'cubic-bezier(0.2, 0, 0, 1)';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: paletteFrom(lightScheme) },
    dark: { palette: paletteFrom(darkScheme) },
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  typography: {
    fontFamily: '"Roboto Flex Variable", "Segoe UI Variable", system-ui, sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 500, lineHeight: 1.22 },
    h2: { fontSize: '1.75rem', fontWeight: 500, lineHeight: 1.29 },
    h3: { fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.33 },
    h4: { fontSize: '1.375rem', fontWeight: 500, lineHeight: 1.27 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.43 },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
    caption: { fontSize: '0.75rem', lineHeight: 1.33 },
  },
  transitions: {
    easing: { easeInOut: emphasized, easeOut: emphasized },
    duration: { shortest: 150, shorter: 200, short: 250, standard: 300 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 24, minHeight: 40 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          backgroundColor: theme.vars.palette.m3.surfaceContainerLow,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          paddingInline: 16,
          '&.Mui-selected': {
            backgroundColor: theme.vars.palette.m3.secondaryContainer,
            color: theme.vars.palette.m3.onSecondaryContainer,
          },
        }),
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { borderRadius: 999 }, grouped: { borderRadius: 999 } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
  },
});
