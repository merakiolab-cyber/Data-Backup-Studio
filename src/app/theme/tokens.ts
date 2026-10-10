/**
 * Design tokens of the "soft pastel" visual style (see docs/UI-UX.md).
 * Pastel accents keep dark ink text in both color schemes.
 */
export interface DesignTokens {
  /** Full-window mesh gradient behind everything. */
  backdrop: string;
  /** Translucent content sheet placed on the backdrop. */
  sheet: string;
  sheetBorder: string;
  /** Cards and list rows inside the sheet. */
  surface: string;
  /** Pill groups, secondary buttons, inputs. */
  muted: string;
  mutedHover: string;
  outline: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  /** Text and icons drawn on pastel accents. */
  onAccent: string;
  /** Primary button placed on a pastel accent (dark in both schemes). */
  accentButton: string;
  onAccentButton: string;
  mint: string;
  lemon: string;
  lilac: string;
  peach: string;
  sky: string;
  badge: string;
  shadow: string;
  /** Shadow of a card lifted under the pointer. */
  shadowRaised: string;
}

export const lightTokens: DesignTokens = {
  backdrop: [
    'radial-gradient(60% 70% at 0% 0%, #B4F0DC 0%, transparent 70%)',
    'radial-gradient(55% 60% at 100% 0%, #E2DBF8 0%, transparent 70%)',
    'radial-gradient(60% 60% at 100% 100%, #D9EAFB 0%, transparent 70%)',
    'radial-gradient(50% 60% at 0% 100%, #E3F6EE 0%, transparent 70%)',
    '#EEF2F3',
  ].join(', '),
  sheet: 'rgba(255, 255, 255, 0.58)',
  sheetBorder: 'rgba(255, 255, 255, 0.8)',
  surface: '#FFFFFF',
  muted: '#EEF0F3',
  mutedHover: '#E4E7EB',
  outline: '#E2E5EA',
  ink: '#121417',
  inkMuted: '#7D848D',
  inkFaint: '#B4BAC1',
  onAccent: '#121417',
  accentButton: '#121417',
  onAccentButton: '#FFFFFF',
  mint: '#8FF2AA',
  lemon: '#F1F47F',
  lilac: '#D4BDF4',
  peach: '#F6A88E',
  sky: '#AEE3F4',
  badge: '#F2877C',
  shadow: '0 1px 2px rgba(18, 20, 23, 0.04), 0 4px 14px rgba(18, 20, 23, 0.035)',
  shadowRaised: '0 2px 4px rgba(18, 20, 23, 0.04), 0 12px 28px rgba(18, 20, 23, 0.07)',
};

export const darkTokens: DesignTokens = {
  backdrop: [
    'radial-gradient(60% 70% at 0% 0%, #12403A 0%, transparent 70%)',
    'radial-gradient(55% 60% at 100% 0%, #2D2547 0%, transparent 70%)',
    'radial-gradient(60% 60% at 100% 100%, #16283D 0%, transparent 70%)',
    '#0D1013',
  ].join(', '),
  sheet: 'rgba(22, 26, 30, 0.62)',
  sheetBorder: 'rgba(255, 255, 255, 0.06)',
  surface: '#1C2126',
  muted: '#262C32',
  mutedHover: '#2F363D',
  outline: '#30373E',
  ink: '#F2F4F5',
  inkMuted: '#98A1AB',
  inkFaint: '#5D6670',
  onAccent: '#121417',
  accentButton: '#121417',
  onAccentButton: '#FFFFFF',
  mint: '#7FE29A',
  lemon: '#E3E673',
  lilac: '#C2AAE6',
  peach: '#E99A80',
  sky: '#9BD3E4',
  badge: '#F2877C',
  shadow: '0 1px 2px rgba(0, 0, 0, 0.25), 0 4px 14px rgba(0, 0, 0, 0.18)',
  shadowRaised: '0 2px 4px rgba(0, 0, 0, 0.3), 0 12px 28px rgba(0, 0, 0, 0.3)',
};
