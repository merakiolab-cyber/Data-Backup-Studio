import { alpha, createTheme, type PaletteOptions, type Theme } from '@mui/material/styles';
import { type DesignTokens, darkTokens, lightTokens } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    ds: DesignTokens;
  }
  interface PaletteOptions {
    ds?: DesignTokens;
  }
}

/** Design tokens resolved as CSS variables, so they follow the active color scheme. */
export function ds(theme: Theme): DesignTokens {
  return (theme.vars ?? theme).palette.ds;
}

function paletteFrom(t: DesignTokens, inverse: string): PaletteOptions {
  return {
    ds: t,
    primary: { main: t.ink, contrastText: inverse },
    secondary: { main: t.inkMuted, contrastText: inverse },
    error: { main: '#D9534A', contrastText: '#FFFFFF' },
    warning: { main: '#B88A00' },
    success: { main: '#2E9D57' },
    background: { default: '#00000000', paper: t.surface },
    text: { primary: t.ink, secondary: t.inkMuted, disabled: t.inkFaint },
    divider: t.outline,
    action: { hover: alpha(t.ink, 0.04), selected: alpha(t.ink, 0.08) },
  };
}

const easing = 'cubic-bezier(0.2, 0, 0, 1)';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: paletteFrom(lightTokens, '#FFFFFF') },
    dark: { palette: paletteFrom(darkTokens, '#121417') },
  },
  shape: { borderRadius: 16 },
  spacing: 8,
  typography: {
    fontFamily: '"Urbanist Variable", "Segoe UI Variable", system-ui, sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15 },
    h2: { fontSize: '1.75rem', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.2 },
    h3: { fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.3 },
    subtitle1: { fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.45 },
    button: { fontSize: '0.9375rem', fontWeight: 600, textTransform: 'none' },
    caption: { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.35 },
  },
  transitions: {
    easing: { easeInOut: easing, easeOut: easing },
    duration: { shortest: 150, shorter: 200, short: 250, standard: 300 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: { background: ds(theme).backdrop, backgroundAttachment: 'fixed' },
        '::selection': { background: ds(theme).lemon, color: ds(theme).onAccent },
        'svg.lucide': { strokeWidth: 1.6 },
        code: {
          fontFamily: 'Consolas, monospace',
          fontSize: '0.85em',
          padding: '1px 6px',
          borderRadius: 6,
          background: ds(theme).muted,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            transitionDuration: '0.01ms !important',
          },
        },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, minHeight: 44, paddingInline: 22 },
        sizeSmall: { minHeight: 34, paddingInline: 16, fontSize: '0.8125rem' },
        outlined: ({ theme }) => ({
          border: 'none',
          backgroundColor: ds(theme).muted,
          color: ds(theme).ink,
          '&:hover': { border: 'none', backgroundColor: ds(theme).mutedHover },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          width: 44,
          height: 44,
          backgroundColor: ds(theme).surface,
          border: `1px solid ${ds(theme).outline}`,
          color: ds(theme).ink,
          '&:hover': { backgroundColor: ds(theme).muted },
        }),
        sizeSmall: { width: 36, height: 36 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 24,
          backgroundColor: ds(theme).surface,
          boxShadow: ds(theme).shadow,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 28,
          backgroundColor: ds(theme).surface,
          padding: 8,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: '1.375rem', fontWeight: 600 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 20,
          marginTop: 6,
          boxShadow: '0 8px 24px rgba(18, 20, 23, 0.08)',
          border: `1px solid ${ds(theme).outline}`,
        }),
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { borderRadius: 14, minHeight: 42, fontWeight: 500 } },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 999,
          height: 32,
          fontWeight: 600,
          backgroundColor: ds(theme).muted,
          color: ds(theme).ink,
        }),
        outlined: ({ theme }) => ({
          backgroundColor: 'transparent',
          borderColor: ds(theme).outline,
        }),
        icon: { marginLeft: 10 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          backgroundColor: ds(theme).muted,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: ds(theme).outline },
        }),
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: ({ theme }) => ({ height: 8, borderRadius: 999, backgroundColor: ds(theme).muted }),
        bar: { borderRadius: 999 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 20,
          alignItems: 'center',
          color: ds(theme).onAccent,
          '& .MuiAlert-icon': { color: ds(theme).onAccent, opacity: 0.8 },
          '&.MuiAlert-colorWarning': { backgroundColor: ds(theme).lemon },
          '&.MuiAlert-colorError': { backgroundColor: ds(theme).peach },
          '&.MuiAlert-colorInfo': { backgroundColor: ds(theme).sky },
          '&.MuiAlert-colorSuccess': { backgroundColor: ds(theme).mint },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 999,
          padding: '6px 12px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          backgroundColor: '#121417',
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: ds(theme).muted,
          borderRadius: 999,
          padding: 4,
          gap: 4,
        }),
        grouped: { border: 'none !important', borderRadius: '999px !important', margin: 0 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: 16,
          gap: 8,
          color: ds(theme).inkMuted,
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: ds(theme).surface,
            color: ds(theme).ink,
            boxShadow: ds(theme).shadow,
          },
        }),
      },
    },
  },
});
